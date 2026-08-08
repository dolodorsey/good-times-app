import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type CityConfig = { name: string; timezone: string; regions: string[]; localities: string[] };
const CITIES: Record<string, CityConfig> = {
  houston: { name: "Houston", timezone: "America/Chicago", regions: ["tx", "texas"], localities: ["houston", "katy", "sugar land", "pearland", "the woodlands", "spring", "stafford", "missouri city"] },
  los_angeles: { name: "Los Angeles", timezone: "America/Los_Angeles", regions: ["ca", "california"], localities: ["los angeles", "west hollywood", "hollywood", "beverly hills", "santa monica", "culver city", "inglewood", "pasadena", "glendale", "burbank", "long beach"] },
  miami: { name: "Miami", timezone: "America/New_York", regions: ["fl", "florida"], localities: ["miami", "miami beach", "coral gables", "doral", "hialeah", "aventura", "north miami", "hollywood", "fort lauderdale"] },
  charlotte: { name: "Charlotte", timezone: "America/New_York", regions: ["nc", "north carolina", "sc", "south carolina"], localities: ["charlotte", "matthews", "pineville", "concord", "huntersville", "gastonia", "fort mill"] },
  washington_dc: { name: "Washington DC", timezone: "America/New_York", regions: ["dc", "district of columbia", "va", "virginia", "md", "maryland"], localities: ["washington", "washington dc", "arlington", "alexandria", "bethesda", "silver spring", "national harbor"] },
  dallas: { name: "Dallas", timezone: "America/Chicago", regions: ["tx", "texas"], localities: ["dallas", "fort worth", "arlington", "irving", "plano", "frisco", "addison", "richardson", "grand prairie"] },
  new_york: { name: "New York", timezone: "America/New_York", regions: ["ny", "new york"], localities: ["new york", "new york city", "manhattan", "brooklyn", "queens", "bronx", "staten island", "flushing", "long island city"] },
  phoenix: { name: "Phoenix", timezone: "America/Phoenix", regions: ["az", "arizona"], localities: ["phoenix", "tempe", "mesa", "glendale", "chandler", "gilbert", "avondale"] },
  scottsdale: { name: "Scottsdale", timezone: "America/Phoenix", regions: ["az", "arizona"], localities: ["scottsdale", "paradise valley", "tempe", "phoenix"] },
  las_vegas: { name: "Las Vegas", timezone: "America/Los_Angeles", regions: ["nv", "nevada"], localities: ["las vegas", "paradise", "henderson", "north las vegas", "enterprise", "spring valley"] },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const normalize = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const clean = (value: unknown, max = 4000): string | null => {
  if (typeof value !== "string") return null;
  const out = value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#0*39;|&apos;/gi, "'").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return out ? out.slice(0, max) : null;
};
const first = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(first).find(Boolean) ?? null;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return first(o.url ?? o.contentUrl ?? o.name);
  }
  return null;
};
const typeList = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : typeof value === "string" ? [value] : [];
const secureEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
};

function localParts(timezone: string, value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}
function eventDate(value: unknown, timezone: string) {
  const raw = first(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  let parsed = match ? { date: match[1], time: match[2] ? `${match[2]}:${match[3]}` : null } : null;
  if (!parsed) {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    parsed = localParts(timezone, date);
  }
  const today = new Date(`${localParts(timezone).date}T00:00:00Z`);
  const candidate = new Date(`${parsed.date}T00:00:00Z`);
  const max = new Date(today);
  max.setUTCMonth(max.getUTCMonth() + 18);
  return candidate >= today && candidate <= max ? parsed : null;
}

type LocationEvidence = { name: string | null; address: string | null; locality: string | null; region: string | null; country: string | null; types: string[] };
function locationEvidence(value: unknown): LocationEvidence {
  if (typeof value === "string") return { name: clean(value), address: null, locality: null, region: null, country: null, types: [] };
  if (!value || typeof value !== "object") return { name: null, address: null, locality: null, region: null, country: null, types: [] };
  const o = value as Record<string, unknown>;
  const types = typeList(o["@type"]);
  if (typeof o.address === "string") return { name: clean(o.name), address: clean(o.address), locality: null, region: null, country: null, types };
  const a = o.address && typeof o.address === "object" ? o.address as Record<string, unknown> : {};
  const locality = clean(a.addressLocality, 150);
  const region = clean(a.addressRegion, 80);
  const countryValue = a.addressCountry;
  const country = typeof countryValue === "object" && countryValue ? clean((countryValue as Record<string, unknown>).name, 80) : clean(countryValue, 80);
  const address = [a.streetAddress, locality, region, a.postalCode, country].map((v) => clean(v, 250)).filter(Boolean).join(", ") || null;
  return { name: clean(o.name), address, locality, region, country, types };
}
function isPhysicalMetroEvent(event: Record<string, unknown>, location: LocationEvidence, city: CityConfig) {
  const attendance = typeList(event.eventAttendanceMode).join(" ").toLowerCase();
  if (attendance.includes("online") || location.types.join(" ").toLowerCase().includes("virtuallocation")) return false;
  if (!location.address) return false;
  const country = normalize(location.country);
  const region = normalize(location.region);
  const locality = normalize(location.locality);
  const combined = normalize(`${location.name ?? ""} ${location.address}`);
  if (country && !/(united states|usa|us)/.test(country)) return false;
  if (region && !city.regions.some((r) => region === normalize(r) || region.includes(normalize(r)))) return false;
  if (locality && city.localities.some((place) => locality === normalize(place) || locality.includes(normalize(place)))) return true;
  return city.localities.some((place) => combined.includes(normalize(place))) && city.regions.some((r) => combined.includes(normalize(r)));
}
function flattenEvents(value: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) { value.forEach((v) => flattenEvents(v, out)); return out; }
  if (!value || typeof value !== "object") return out;
  const o = value as Record<string, unknown>;
  if (typeList(o["@type"]).some((t) => t.toLowerCase().includes("event"))) out.push(o);
  for (const key of ["@graph", "itemListElement", "item", "events", "event"]) if (o[key]) flattenEvents(o[key], out);
  return out;
}
const category = (title: string) => {
  const text = title.toLowerCase();
  if (/concert|live music|dj|artist|tour|r&b|rnb|hip hop|jazz|karaoke/.test(text)) return "concert";
  if (/comedy|stand.?up|improv/.test(text)) return "comedy";
  if (/festival|parade|block party/.test(text)) return "festival";
  if (/brunch/.test(text)) return "brunch";
  if (/nightlife|party|club|rooftop|after.?hours|pool party/.test(text)) return "nightlife";
  if (/art|theat|museum|gallery|paint/.test(text)) return "play";
  if (/sport|game|match|boxing|ufc|mma/.test(text)) return "sports";
  return "special_event";
};
const digest = async (value: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function fetchPage(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; GoodTimesCityScout/4.1; +https://thegoodtimesworldwide.com)", accept: "text/html,application/ld+json,*/*;q=0.5" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > 2_000_000) throw new Error("body_too_large");
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error("body_too_large");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "server_configuration_missing" }, 500);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: credential } = await db.from("credentials").select("credential_value").eq("credential_key", "gt_atlanta_source_internal").eq("is_active", true).maybeSingle();
  const expected = typeof credential?.credential_value?.api_key === "string" ? credential.credential_value.api_key : typeof credential?.credential_value?.key === "string" ? credential.credential_value.key : "";
  if (!secureEqual(request.headers.get("x-khg-internal-key") ?? "", expected)) return json({ ok: false, error: "unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}
  const cityKey = typeof body.city_key === "string" ? body.city_key.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
  if (cityKey === "atlanta") return json({ ok: false, error: "atlanta_is_intentionally_excluded" }, 409);
  const city = CITIES[cityKey];
  if (!city) return json({ ok: false, error: "unsupported_city" }, 400);

  const limit = Math.min(Math.max(Number(body.limit ?? 4), 1), 10);
  const sourceIds = Array.isArray(body.source_ids) ? body.source_ids.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  let query = db.from("gt_event_sources").select("id,source_name,source_url,source_type").ilike("city", cityKey).eq("is_active", true).eq("source_type", "eventbrite").not("source_url", "is", null).order("last_scraped_at", { ascending: true, nullsFirst: true }).limit(limit);
  if (sourceIds.length) query = query.in("id", sourceIds);
  const { data: sources, error: sourceError } = await query;
  if (sourceError) return json({ ok: false, error: "source_query_failed", detail: sourceError.message }, 500);
  if (!sources?.length) return json({ ok: false, error: "no_eventbrite_sources", city: cityKey }, 422);

  const summary = { checked: 0, discovered: 0, accepted: 0, inserted: 0, updated: 0, errors: 0, sources: [] as unknown[] };
  for (const source of sources) {
    summary.checked++;
    let discovered = 0, accepted = 0, inserted = 0, updated = 0;
    let errorText: string | null = null;
    const started = Date.now();
    try {
      const html = await fetchPage(source.source_url);
      const objects: Record<string, unknown>[] = [];
      for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try { objects.push(...flattenEvents(JSON.parse(match[1].trim().replace(/^<!--|-->$/g, "")))); } catch {}
      }
      discovered = objects.length;
      const unique = new Map<string, Record<string, unknown>>();
      for (const event of objects) {
        const name = clean(event.name ?? event.headline);
        const start = eventDate(event.startDate ?? event.startTime, city.timezone);
        const location = locationEvidence(event.location);
        const status = (first(event.eventStatus) ?? "").toLowerCase();
        if (!name || !start || !isPhysicalMetroEvent(event, location, city) || status.includes("cancel")) continue;
        const dedupHash = await digest(`${cityKey}|${normalize(name)}|${start.date}|${normalize(location.name)}`);
        unique.set(dedupHash, { event, name, start, location });
      }
      accepted = unique.size;

      for (const [dedupHash, value] of unique) {
        const event = value.event as Record<string, unknown>;
        const name = value.name as string;
        const start = value.start as { date: string; time: string | null };
        const location = value.location as LocationEvidence;
        const end = eventDate(event.endDate ?? event.endTime, city.timezone);
        const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
        const offer = offers && typeof offers === "object" ? offers as Record<string, unknown> : {};
        const organizer = event.organizer && typeof event.organizer === "object" ? event.organizer as Record<string, unknown> : {};

        let { data: existing } = await db.from("gt_sourced_events").select("id,raw_data").eq("dedup_hash", dedupHash).maybeSingle();
        if (!existing) existing = (await db.from("gt_sourced_events").select("id,raw_data").eq("city", cityKey).eq("event_date", start.date).ilike("event_name", name).limit(1).maybeSingle()).data;
        const raw = existing?.raw_data && typeof existing.raw_data === "object" ? existing.raw_data : {};
        const record = {
          city: cityKey,
          event_name: name,
          event_date: start.date,
          event_time: start.time,
          end_date: end?.date ?? null,
          end_time: end?.time ?? null,
          venue_name: location.name,
          venue_address: location.address,
          event_type: category(name),
          event_category: "eventbrite",
          description: clean(event.description),
          ticket_url: first(offer.url ?? event.url) ?? source.source_url,
          ticket_price: clean(offer.price ?? offer.lowPrice, 100),
          image_url: first(event.image),
          organizer: clean(organizer.name ?? event.organizer, 300),
          source_id: source.id,
          source_url: first(event.url) ?? source.source_url,
          source_name: source.source_name,
          is_verified: true,
          is_published: true,
          published_to_gt: false,
          dedup_hash: dedupHash,
          legacy_quarantined_at: null,
          legacy_quarantine_reason: null,
          raw_data: { ...raw, jsonld: event, collected_via: "eventbrite_public_jsonld_multicity_v2", timezone: city.timezone, collected_at: new Date().toISOString() },
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
      await db.from("gt_event_sources").update({ last_scraped_at: new Date().toISOString(), last_scrape_status: accepted > 0 ? "success" : "empty", events_found_last_run: accepted, updated_at: new Date().toISOString() }).eq("id", source.id);
    } catch (error) {
      errorText = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      summary.errors++;
      await db.from("gt_event_sources").update({ last_scraped_at: new Date().toISOString(), last_scrape_status: "failed", events_found_last_run: 0, updated_at: new Date().toISOString() }).eq("id", source.id);
    }
    summary.discovered += discovered;
    summary.accepted += accepted;
    summary.inserted += inserted;
    summary.updated += updated;
    summary.sources.push({ name: source.source_name, discovered, accepted, inserted, updated, error: errorText });
    await db.from("gt_scrape_runs").insert({ city: cityKey, source_id: source.id, source_type: "eventbrite", status: errorText ? "failed" : "completed", run_status: errorText ? "failed" : "completed", events_found: accepted, events_new: inserted, events_updated: updated, error_message: errorText, sources_checked: 1, duration_ms: Date.now() - started, started_at: new Date(started).toISOString(), completed_at: new Date().toISOString(), run_metadata: { collector: "gt-multicity-eventbrite-refresh-v2", city: cityKey } });
  }

  let promotedTotal = 0;
  for (let i = 0; i < 6 && summary.errors === 0 && summary.accepted > 0; i++) {
    const promoted = await db.rpc("gt_promote_sourced_to_shows", { p_city_filter: cityKey, p_dry_run: false, p_limit: 500 });
    if (promoted.error) break;
    const count = Number(promoted.data?.[0]?.promoted_count ?? 0);
    promotedTotal += count;
    if (count === 0) break;
  }
  const priority = await db.rpc("gt_apply_multicity_customer_priority", { p_city_filter: cityKey });
  return json({
    ok: summary.errors === 0,
    city: cityKey,
    city_name: city.name,
    completed_at: new Date().toISOString(),
    summary,
    promotion: { promoted: promotedTotal },
    customer_priority: priority.error ? { error: priority.error.message } : priority.data,
    atlanta_touched: false,
  }, summary.errors === 0 ? 200 : 207);
});
