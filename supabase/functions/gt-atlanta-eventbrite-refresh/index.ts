import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_BYTES = 2_000_000;
const MAX_MONTHS = 18;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});

const clean = (value: unknown): string | null => typeof value === "string"
  ? (value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null)
  : null;

const first = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(first).find(Boolean) ?? null;
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return first(item.url ?? item.contentUrl ?? item.name);
  }
  return null;
};

const dateParts = (value: unknown) => {
  const raw = first(value);
  if (!raw) return null;
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?Z?)?$/);
  const normalized = compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}${compact[4] ? `T${compact[4]}:${compact[5]}:${compact[6] ?? "00"}Z` : "T00:00:00Z"}`
    : raw;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const floor = new Date(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  const max = new Date(floor);
  max.setMonth(max.getMonth() + MAX_MONTHS);
  if (date < floor || date > max) return null;
  return {
    date: date.toISOString().slice(0, 10),
    time: /T\d{2}:?\d{2}/.test(raw) ? date.toISOString().slice(11, 16) : null,
  };
};

const locationOf = (value: unknown) => {
  if (typeof value === "string") return { name: clean(value), address: null };
  if (!value || typeof value !== "object") return { name: null, address: null };
  const location = value as Record<string, unknown>;
  if (typeof location.address === "string") return { name: clean(location.name), address: clean(location.address) };
  const addressObject = location.address && typeof location.address === "object"
    ? location.address as Record<string, unknown>
    : {};
  const address = [
    addressObject.streetAddress,
    addressObject.addressLocality,
    addressObject.addressRegion,
    addressObject.postalCode,
  ].map(clean).filter(Boolean).join(", ");
  return { name: clean(location.name), address: address || null };
};

const flattenEvents = (value: unknown, output: Record<string, unknown>[] = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenEvents(item, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const object = value as Record<string, unknown>;
  const types = Array.isArray(object["@type"]) ? object["@type"] as unknown[] : [object["@type"]];
  if (types.some((type) => typeof type === "string" && type.toLowerCase().includes("event"))) output.push(object);
  ["@graph", "itemListElement", "item", "events", "event"].forEach((key) => {
    if (object[key]) flattenEvents(object[key], output);
  });
  return output;
};

const categoryOf = (sourceName: string, sourceUrl: string, title: string) => {
  const text = `${sourceName} ${sourceUrl} ${title}`.toLowerCase();
  if (/music|concert|artist|tour/.test(text)) return "concert";
  if (/comedy|stand.?up/.test(text)) return "comedy";
  if (/festival|parade|block.?party/.test(text)) return "festival";
  if (/food|drink|brunch|dinner|tasting/.test(text)) return /brunch/.test(text) ? "brunch" : "special_event";
  if (/nightlife|party|club|lounge|dj|rooftop|after.?hours/.test(text)) return "nightlife";
  if (/art|theat|museum|gallery|paint/.test(text)) return "play";
  if (/sport|game|match|boxing|ufc/.test(text)) return "sports";
  return "special_event";
};

const parseEventbrite = (html: string, sourceName: string, pageUrl: string) => {
  const events: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      events.push(...flattenEvents(JSON.parse(match[1].trim().replace(/^<!--|-->$/g, ""))));
    } catch {
      // Ignore malformed third-party blocks and continue with valid blocks.
    }
  }
  return events.flatMap((event) => {
    const name = clean(event.name ?? event.headline);
    const start = dateParts(event.startDate ?? event.startTime);
    if (!name || !start) return [];
    const end = dateParts(event.endDate ?? event.endTime);
    const location = locationOf(event.location);
    const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
    const offer = offers && typeof offers === "object" ? offers as Record<string, unknown> : {};
    const organizer = event.organizer && typeof event.organizer === "object"
      ? event.organizer as Record<string, unknown>
      : {};
    return [{
      name,
      date: start.date,
      time: start.time,
      endDate: end?.date ?? null,
      endTime: end?.time ?? null,
      venue: location.name,
      address: location.address,
      eventType: categoryOf(sourceName, pageUrl, name),
      description: clean(event.description),
      ticket: first(offer.url ?? event.url) ?? pageUrl,
      price: clean(offer.price ?? offer.lowPrice),
      image: first(event.image),
      organizer: clean(organizer.name ?? event.organizer),
      sourceUrl: first(event.url) ?? pageUrl,
      raw: event,
    }];
  });
};

const fetchPage = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; GoodTimesEventScout/2.0; +https://thegoodtimesworldwide.com)",
        accept: "text/html,application/ld+json,*/*;q=0.5",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const size = Number(response.headers.get("content-length") ?? 0);
    if (size > MAX_BYTES) throw new Error("body_too_large");
    const body = await response.text();
    if (body.length > MAX_BYTES) throw new Error("body_too_large");
    return body;
  } finally {
    clearTimeout(timer);
  }
};

const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))]
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "server_configuration_missing" }, 500);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: credential } = await db.from("credentials")
    .select("credential_value")
    .eq("credential_key", "gt_atlanta_source_internal")
    .eq("is_active", true)
    .maybeSingle();
  const expected = credential?.credential_value?.api_key ?? credential?.credential_value?.key ?? "";
  if (!expected || request.headers.get("x-khg-internal-key") !== expected) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* optional body */ }
  const limit = Math.min(Math.max(Number(body.limit ?? 4), 1), 10);
  const sourceIds = Array.isArray(body.source_ids)
    ? body.source_ids.filter((id): id is string => typeof id === "string")
    : [];

  let sourceQuery = db.from("gt_event_sources")
    .select("id,source_name,source_url,source_type,scrape_priority")
    .ilike("city", "atlanta")
    .eq("is_active", true)
    .eq("source_type", "eventbrite")
    .not("source_url", "is", null)
    .order("last_scraped_at", { ascending: true, nullsFirst: true })
    .order("scrape_priority", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (sourceIds.length) sourceQuery = sourceQuery.in("id", sourceIds);
  const { data: sources, error: sourceError } = await sourceQuery;
  if (sourceError) return json({ error: sourceError.message }, 500);

  const summary = {
    checked: 0,
    found: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    sources: [] as unknown[],
  };

  for (const source of sources ?? []) {
    summary.checked++;
    const started = Date.now();
    let found = 0;
    let inserted = 0;
    let updated = 0;
    let errorText: string | null = null;
    try {
      const parsed = parseEventbrite(await fetchPage(source.source_url), source.source_name, source.source_url);
      const unique = new Map<string, typeof parsed[number]>();
      for (const event of parsed) {
        const dedup = await hash(`atlanta|${event.name.toLowerCase().replace(/\W+/g, " ").trim()}|${event.date}|${(event.venue ?? "").toLowerCase()}`);
        unique.set(dedup, event);
      }
      found = unique.size;

      for (const [dedup, event] of unique) {
        let { data: existing } = await db.from("gt_sourced_events")
          .select("id,raw_data,is_verified")
          .eq("dedup_hash", dedup)
          .maybeSingle();
        if (!existing) {
          existing = (await db.from("gt_sourced_events")
            .select("id,raw_data,is_verified")
            .eq("event_date", event.date)
            .ilike("event_name", event.name)
            .limit(1)
            .maybeSingle()).data;
        }
        const confirmations = new Set<string>(
          Array.isArray(existing?.raw_data?.source_confirmations)
            ? existing.raw_data.source_confirmations
            : [],
        );
        confirmations.add(source.source_name);
        const record = {
          city: "atlanta",
          event_name: event.name,
          event_date: event.date,
          event_time: event.time,
          end_date: event.endDate,
          end_time: event.endTime,
          venue_name: event.venue,
          venue_address: event.address,
          event_type: event.eventType,
          event_category: "eventbrite",
          description: event.description,
          ticket_url: event.ticket,
          ticket_price: event.price,
          image_url: event.image,
          organizer: event.organizer,
          source_id: source.id,
          source_url: event.sourceUrl,
          source_name: source.source_name,
          is_verified: true,
          is_published: true,
          published_to_gt: false,
          dedup_hash: dedup,
          raw_data: {
            jsonld: event.raw,
            collected_via: "eventbrite_public_jsonld",
            source_type: source.source_type,
            source_confirmations: [...confirmations],
            collected_at: new Date().toISOString(),
          },
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
      }

      await db.from("gt_event_sources").update({
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: "success",
        events_found_last_run: found,
        updated_at: new Date().toISOString(),
      }).eq("id", source.id);
    } catch (error) {
      errorText = error instanceof Error ? error.message.slice(0, 500) : JSON.stringify(error).slice(0, 500);
      summary.errors++;
      await db.from("gt_event_sources").update({
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: "failed",
        events_found_last_run: 0,
        updated_at: new Date().toISOString(),
      }).eq("id", source.id);
    }

    await db.from("gt_scrape_runs").insert({
      city: "atlanta",
      source_id: source.id,
      source_type: "eventbrite",
      status: errorText ? "failed" : "completed",
      run_status: errorText ? "failed" : "completed",
      events_found: found,
      events_new: inserted,
      events_updated: updated,
      error_message: errorText,
      sources_checked: 1,
      duration_ms: Date.now() - started,
      started_at: new Date(started).toISOString(),
      completed_at: new Date().toISOString(),
      run_metadata: { collector: "gt-atlanta-eventbrite-refresh", source_name: source.source_name },
    });

    summary.found += found;
    summary.inserted += inserted;
    summary.updated += updated;
    summary.sources.push({ name: source.source_name, found, inserted, updated, error: errorText });
  }

  const promotion = await db.rpc("gt_promote_sourced_to_shows", {
    p_city_filter: "atlanta",
    p_dry_run: false,
    p_limit: 1000,
  });
  const ranking = await db.rpc("gt_refresh_atlanta_display_priority");

  return json({
    ok: true,
    city: "atlanta",
    completed_at: new Date().toISOString(),
    summary,
    promotion: promotion.error ? { error: promotion.error.message } : promotion.data,
    ranking: ranking.error ? { error: ranking.error.message } : ranking.data,
  });
});
