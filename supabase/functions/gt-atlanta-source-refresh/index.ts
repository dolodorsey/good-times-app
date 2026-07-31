import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
const dateParts = (v: unknown) => {
  const raw = first(v);
  if (!raw) return null;
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?Z?)?$/);
  const normalized = m
    ? `${m[1]}-${m[2]}-${m[3]}${m[4] ? `T${m[4]}:${m[5]}:${m[6] ?? "00"}Z` : "T00:00:00Z"}`
    : raw;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  const max = new Date(today);
  max.setMonth(max.getMonth() + MAX_MONTHS);
  if (d < new Date(today.toISOString().slice(0, 10) + "T00:00:00Z") || d > max) return null;
  return { date: d.toISOString().slice(0, 10), time: /T\d{2}:?\d{2}/.test(raw) ? d.toISOString().slice(11, 16) : null };
};
const typeOf = (title: string, raw: unknown) => {
  const text = `${title} ${first(raw) ?? ""}`.toLowerCase();
  if (/concert|music|tour|jazz|karaoke/.test(text)) return "concert";
  if (/comedy|stand.?up/.test(text)) return "comedy";
  if (/festival|parade|block party|expo|convention/.test(text)) return "festival";
  if (/theater|theatre|musical|stage|play/.test(text)) return "play";
  if (/sport|game|match|boxing|ufc/.test(text)) return "sports";
  if (/brunch/.test(text)) return "brunch";
  if (/club|nightlife|party|dj|lounge|hookah/.test(text)) return "nightlife";
  return "special_event";
};
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
  ["@graph", "itemListElement", "item", "events", "event"].forEach((k) => o[k] && flatten(o[k], out));
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
      venue: loc.name, address: loc.address, eventType: typeOf(name, o.eventType ?? o["@type"]),
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
const hash = async (v: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))]
  .map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
  const summary = { checked: 0, found: 0, inserted: 0, updated: 0, verified: 0, errors: 0, sources: [] as unknown[] };
  for (const source of sources ?? []) {
    if (/eventbrite|google/i.test(`${source.source_name} ${source.source_url}`)) continue;
    summary.checked++;
    const started = Date.now();
    let found = 0, inserted = 0, updated = 0, verified = 0, errorText: string | null = null;
    try {
      const events = parseEvents(await fetchPage(source.source_url), source.source_url);
      const unique = new Map<string, typeof events[number]>();
      for (const e of events) unique.set(await hash(`atlanta|${e.name.toLowerCase().replace(/\W+/g, " ").trim()}|${e.date}|${(e.venue ?? "").toLowerCase()}`), e);
      found = unique.size;
      for (const [dedup, e] of unique) {
        let { data: existing } = await db.from("gt_sourced_events").select("id,raw_data,is_verified").eq("dedup_hash", dedup).maybeSingle();
        if (!existing) {
          existing = (await db.from("gt_sourced_events").select("id,raw_data,is_verified")
            .eq("event_date", e.date).ilike("event_name", e.name).limit(1).maybeSingle()).data;
        }
        const confirmations = new Set<string>(Array.isArray(existing?.raw_data?.source_confirmations) ? existing.raw_data.source_confirmations : []);
        confirmations.add(source.source_name);
        const isVerified = ["official", "venue", "comedy_club"].includes(source.source_type) || confirmations.size >= 2 || Boolean(existing?.is_verified);
        const record = {
          city: "atlanta", event_name: e.name, event_date: e.date, event_time: e.time,
          end_date: e.endDate, end_time: e.endTime, venue_name: e.venue, venue_address: e.address,
          event_type: e.eventType, event_category: e.category, description: e.description,
          ticket_url: e.ticket, ticket_price: e.price, image_url: e.image, organizer: e.organizer,
          source_id: source.id, source_url: e.sourceUrl, source_name: source.source_name,
          is_verified: isVerified, is_published: isVerified, published_to_gt: false, dedup_hash: dedup,
          raw_data: { jsonld: e.raw, collected_via: "direct_jsonld", source_type: source.source_type, source_confirmations: [...confirmations], collected_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        };
        if (existing?.id) {
          const { error } = await db.from("gt_sourced_events").update(record).eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await db.from("gt_sourced_events").insert(record);
          if (error) throw error;
          inserted++;
        }
        if (isVerified) verified++;
      }
      await db.from("gt_event_sources").update({
        last_scraped_at: new Date().toISOString(), last_scrape_status: "success",
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
      completed_at: new Date().toISOString(), run_metadata: { collector: "gt-atlanta-source-refresh", source_name: source.source_name },
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
    ok: true, city: "atlanta", completed_at: new Date().toISOString(), summary,
    promotion: promotion.error ? { error: promotion.error.message } : promotion.data,
    ranking: ranking.error ? { error: ranking.error.message } : ranking.data,
  });
});
