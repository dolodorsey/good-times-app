import { createClient } from "npm:@supabase/supabase-js@2.110.2";
import {
  classifyEvent, eventDateParts as collectorDateParts, findExistingOccurrence,
  OccurrenceIdentityConflict, sourcedEventRecord, uniqueOccurrences,
} from "../_shared/gt-source-occurrence.mjs";

const MAX_BYTES = 2_000_000;
const MAX_MONTHS = 18;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const clean = (v: unknown) => typeof v === "string"
  ? (v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null)
  : null;
const first = (v: unknown): string | null => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(first).find(Boolean) ?? null;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return first(o.url ?? o.contentUrl ?? o.name);
  }
  return null;
};
const dateParts = (value: unknown) => collectorDateParts(first(value), new Date(), MAX_MONTHS);
const locationOf = (v: unknown) => {
  if (typeof v === "string") return { name: v, address: null };
  if (!v || typeof v !== "object") return { name: null, address: null };
  const o = v as Record<string, unknown>;
  if (typeof o.address === "string") return { name: clean(o.name), address: clean(o.address) };
  const a = o.address && typeof o.address === "object" ? o.address as Record<string, unknown> : {};
  const address = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode].map(clean).filter(Boolean).join(", ");
  return { name: clean(o.name), address: address || null };
};
const flatten = (v: unknown, out: Record<string, unknown>[] = []) => {
  if (Array.isArray(v)) { v.forEach((x) => flatten(x, out)); return out; }
  if (!v || typeof v !== "object") return out;
  const o = v as Record<string, unknown>;
  const t = Array.isArray(o["@type"]) ? o["@type"] as unknown[] : [o["@type"]];
  if (t.some((x) => typeof x === "string" && x.toLowerCase().includes("event"))) out.push(o);
  ["@graph", "itemListElement", "item", "events", "event", "subEvent", "subEvents"].forEach((k) => o[k] && flatten(o[k], out));
  return out;
};
const parseEvents = (html: string, pageUrl: string) => {
  const found: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { found.push(...flatten(JSON.parse(m[1].trim().replace(/^<!--|-->$/g, "")))); } catch { /* skip malformed JSON-LD */ }
  }
  return found.flatMap((o) => {
    const name = clean(o.name ?? o.headline);
    const start = dateParts(o.startDate ?? o.startTime);
    if (!name || !start) return [];
    const end = dateParts(o.endDate ?? o.endTime);
    const loc = locationOf(o.location);
    const offers = Array.isArray(o.offers) ? o.offers[0] : o.offers;
    const offer = offers && typeof offers === "object" ? offers as Record<string, unknown> : {};
    const org = o.organizer && typeof o.organizer === "object" ? o.organizer as Record<string, unknown> : {};
    return [{
      name, date: start.date, time: start.time, endDate: end?.date ?? null, endTime: end?.time ?? null,
      venue: loc.name, address: loc.address, eventType: classifyEvent(name, [o.eventType, o["@type"]]),
      category: clean(o.eventType), description: clean(o.description),
      ticket: first(offer.url ?? o.url) ?? pageUrl, price: clean(offer.price ?? offer.lowPrice),
      image: first(o.image), organizer: clean(org.name ?? o.organizer), sourceUrl: first(o.url) ?? pageUrl,
      raw: o,
    }];
  });
};
const fetchPage = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const r = await fetch(url, { redirect: "follow", signal: controller.signal, headers: {
      "user-agent": "GoodTimesAtlantaSourceBot/1.0 (+https://thegoodtimesworldwide.com)",
      accept: "text/html,application/ld+json,*/*;q=0.5",
    }});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const size = Number(r.headers.get("content-length") ?? 0);
    if (size > MAX_BYTES) throw new Error("body_too_large");
    const body = await r.text();
    if (body.length > MAX_BYTES) throw new Error("body_too_large");
    return body;
  } finally { clearTimeout(timer); }
};
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!url || !key) return json({ error: "server_configuration_missing" }, 500);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: credential } = await db.from("credentials").select("credential_value")
    .eq("credential_key", "gt_atlanta_source_internal").eq("is_active", true).maybeSingle();
  const expected = credential?.credential_value?.api_key ?? credential?.credential_value?.key ?? "";
  if (!expected || req.headers.get("x-khg-internal-key") !== expected) return json({ error: "unauthorized" }, 401);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* optional body */ }
  const limit = Math.min(Math.max(Number(body.limit ?? 8), 1), 12);
  const ids = Array.isArray(body.source_ids) ? body.source_ids.filter((x): x is string => typeof x === "string") : [];
  let q = db.from("gt_event_sources").select("id,source_name,source_url,source_type,scrape_priority")
    .ilike("city", "atlanta").eq("is_active", true)
    .in("source_type", ["official", "venue", "comedy_club", "blog", "aggregator"])
    .not("source_url", "is", null).order("last_scraped_at", { ascending: true, nullsFirst: true })
    .order("scrape_priority", { ascending: true, nullsFirst: true }).limit(limit);
  if (ids.length) q = q.in("id", ids);
  const { data: sources, error: sourceError } = await q;
  if (sourceError) return json({ error: sourceError.message }, 500);
  const summary = { checked: 0, found: 0, inserted: 0, updated: 0, verified: 0, identity_conflicts: 0, errors: 0, sources: [] as unknown[] };
  for (const source of sources ?? []) {
    if (/eventbrite|google/i.test(`${source.source_name} ${source.source_url}`)) continue;
    summary.checked++;
    const started = Date.now();
    let found = 0, inserted = 0, updated = 0, verified = 0, errorText: string | null = null;
    try {
      const events = parseEvents(await fetchPage(source.source_url), source.source_url);
      const unique = await uniqueOccurrences(events, { city: "atlanta", sourceUrl: source.source_url });
      found = unique.entries.size;
      let identityConflicts = unique.conflicts;
      for (const [dedupHash, { event, identity }] of unique.entries) {
        let existing;
        try {
          existing = await findExistingOccurrence(db, event, identity, dedupHash);
        } catch (error) {
          if (!(error instanceof OccurrenceIdentityConflict)) throw error;
          identityConflicts += 1;
          continue;
        }
        const record = sourcedEventRecord({ event, source, identity, dedupHash, existing,
          observedAt: new Date().toISOString(), collectedVia: "direct_jsonld_v2" });
        if (existing?.id) {
          const { error } = await db.from("gt_sourced_events").update(record).eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await db.from("gt_sourced_events").insert(record);
          if (error) throw error;
          inserted++;
        }
        if (existing?.is_verified) verified++;
      }
      summary.identity_conflicts += identityConflicts;
      if (identityConflicts) {
        errorText = `occurrence_identity_conflicts:${identityConflicts}`;
        summary.errors += 1;
      }
      await db.from("gt_event_sources").update({
        last_scraped_at: new Date().toISOString(), last_scrape_status: identityConflicts ? "failed" : found ? "success" : "empty",
        events_found_last_run: found, updated_at: new Date().toISOString(),
      }).eq("id", source.id);
    } catch (e) {
      errorText = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
      summary.errors++;
      await db.from("gt_event_sources").update({
        last_scraped_at: new Date().toISOString(), last_scrape_status: "failed",
        events_found_last_run: 0, updated_at: new Date().toISOString(),
      }).eq("id", source.id);
    }
    await db.from("gt_scrape_runs").insert({
      city: "atlanta", source_id: source.id, source_type: source.source_type,
      status: errorText ? "failed" : "completed", run_status: errorText ? "failed" : "completed",
      events_found: found, events_new: inserted, events_updated: updated, error_message: errorText,
      sources_checked: 1, duration_ms: Date.now() - started, started_at: new Date(started).toISOString(),
      completed_at: new Date().toISOString(), run_metadata: { collector: "gt-atlanta-source-refresh-v2", source_name: source.source_name },
    });
    summary.found += found;
    summary.inserted += inserted;
    summary.updated += updated;
    summary.verified += verified;
    summary.sources.push({ name: source.source_name, found, inserted, updated, verified, error: errorText });
  }
  const promotion = await db.rpc("gt_promote_sourced_to_shows", { p_city_filter: "atlanta", p_dry_run: false, p_limit: 500 });
  const ranking = await db.rpc("gt_refresh_atlanta_display_priority");
  return json({
    ok: summary.errors === 0, city: "atlanta", completed_at: new Date().toISOString(), summary,
    promotion: promotion.error ? { error: promotion.error.message } : promotion.data,
    ranking: ranking.error ? { error: ranking.error.message } : ranking.data,
  }, summary.errors === 0 ? 200 : 207);
});
