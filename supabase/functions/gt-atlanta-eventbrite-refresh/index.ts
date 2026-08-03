import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_BODY_BYTES = 64_000;
const MAX_FETCH_BYTES = 2_000_000;
const MAX_MONTHS = 18;

const ATLANTA_METRO = new Set([
  "atlanta", "alpharetta", "austell", "avondale estates", "brookhaven",
  "chamblee", "college park", "decatur", "doraville", "duluth", "dunwoody",
  "east point", "fairburn", "forest park", "hapeville", "kennesaw", "lithonia",
  "mableton", "marietta", "norcross", "peachtree corners", "roswell",
  "sandy springs", "smyrna", "stone mountain", "tucker", "vinings",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const clean = (value: unknown, max = 4_000): string | null => {
  if (typeof value !== "string") return null;
  const output = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return output ? output.slice(0, max) : null;
};

const first = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(first).find(Boolean) ?? null;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return first(object.url ?? object.contentUrl ?? object.name);
  }
  return null;
};

const secureEqual = (left: string, right: string): boolean => {
  if (!left || !right || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

const atlantaParts = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
};

const dateInWindow = (isoDate: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const candidate = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(candidate.getTime())) return false;
  const today = new Date(`${atlantaParts().date}T00:00:00Z`);
  const maximum = new Date(today);
  maximum.setUTCMonth(maximum.getUTCMonth() + MAX_MONTHS);
  return candidate >= today && candidate <= maximum;
};

const eventDateParts = (value: unknown): { date: string; time: string | null } | null => {
  const raw = first(value);
  if (!raw) return null;

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?Z?)?$/);
  if (compact) {
    const date = `${compact[1]}-${compact[2]}-${compact[3]}`;
    return dateInWindow(date)
      ? { date, time: compact[4] ? `${compact[4]}:${compact[5]}` : null }
      : null;
  }

  // Preserve the event's stated local calendar date/time before its offset.
  const localPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (localPrefix && dateInWindow(localPrefix[1])) {
    return {
      date: localPrefix[1],
      time: localPrefix[2] ? `${localPrefix[2]}:${localPrefix[3]}` : null,
    };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const local = atlantaParts(parsed);
  return dateInWindow(local.date) ? local : null;
};

const normalizePlace = (value: unknown): string =>
  (clean(value, 200) ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const typeList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? [value] : [];
};

type LocationEvidence = {
  name: string | null;
  address: string | null;
  locality: string | null;
  region: string | null;
  country: string | null;
  types: string[];
};

const locationEvidence = (value: unknown): LocationEvidence => {
  if (typeof value === "string") {
    return { name: clean(value), address: null, locality: null, region: null, country: null, types: [] };
  }
  if (!value || typeof value !== "object") {
    return { name: null, address: null, locality: null, region: null, country: null, types: [] };
  }

  const location = value as Record<string, unknown>;
  const types = typeList(location["@type"]);
  if (typeof location.address === "string") {
    return {
      name: clean(location.name),
      address: clean(location.address),
      locality: null,
      region: null,
      country: null,
      types,
    };
  }

  const address = location.address && typeof location.address === "object"
    ? location.address as Record<string, unknown>
    : {};
  const locality = clean(address.addressLocality, 200);
  const region = clean(address.addressRegion, 100);
  const countryValue = address.addressCountry;
  const country = typeof countryValue === "object" && countryValue
    ? clean((countryValue as Record<string, unknown>).name ?? (countryValue as Record<string, unknown>)["@id"], 100)
    : clean(countryValue, 100);
  const rendered = [
    address.streetAddress,
    locality,
    region,
    address.postalCode,
    country,
  ].map((item) => clean(item, 300)).filter(Boolean).join(", ");

  return {
    name: clean(location.name),
    address: rendered || null,
    locality,
    region,
    country,
    types,
  };
};

const isOnline = (event: Record<string, unknown>, location: LocationEvidence): boolean => {
  const attendance = typeList(event.eventAttendanceMode).join(" ").toLowerCase();
  const types = location.types.join(" ").toLowerCase();
  return attendance.includes("onlineeventattendancemode") ||
    attendance.includes("virtual") ||
    types.includes("virtuallocation");
};

const isAtlantaPhysical = (event: Record<string, unknown>, location: LocationEvidence): { ok: boolean; reason: string } => {
  if (isOnline(event, location)) return { ok: false, reason: "virtual_or_online" };
  if (!location.address) return { ok: false, reason: "missing_physical_address" };

  const locality = normalizePlace(location.locality);
  const region = normalizePlace(location.region);
  const country = normalizePlace(location.country);
  const combined = normalizePlace(`${location.name ?? ""} ${location.address}`);

  if (country && !/(united states|usa|us)/.test(country)) {
    return { ok: false, reason: "non_us_country" };
  }
  if (region && !/(ga|georgia)/.test(region)) {
    return { ok: false, reason: "non_georgia_region" };
  }
  if (locality && ATLANTA_METRO.has(locality)) return { ok: true, reason: "metro_locality" };
  if (/\b(atlanta|decatur|marietta|smyrna|college park|east point|brookhaven|chamblee|doraville|dunwoody|sandy springs|roswell|alpharetta|norcross|duluth|stone mountain|tucker|kennesaw|mableton|vinings)\b/.test(combined) && /\b(ga|georgia)\b/.test(combined)) {
    return { ok: true, reason: "metro_address" };
  }
  return { ok: false, reason: "outside_atlanta_metro" };
};

const flattenEvents = (value: unknown, output: Record<string, unknown>[] = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenEvents(item, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const object = value as Record<string, unknown>;
  if (typeList(object["@type"]).some((type) => type.toLowerCase().includes("event"))) output.push(object);
  for (const key of ["@graph", "itemListElement", "item", "events", "event"]) {
    if (object[key]) flattenEvents(object[key], output);
  }
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

type ParsedEvent = {
  name: string;
  date: string;
  time: string | null;
  endDate: string | null;
  endTime: string | null;
  venue: string | null;
  address: string;
  eventType: string;
  description: string | null;
  ticket: string;
  price: string | null;
  image: string | null;
  organizer: string | null;
  sourceUrl: string;
  raw: Record<string, unknown>;
  locationReason: string;
};

type ParseResult = {
  accepted: ParsedEvent[];
  rejected: { name: string | null; reason: string; sourceUrl: string | null }[];
  discovered: number;
};

const parseEventbrite = (html: string, sourceName: string, pageUrl: string): ParseResult => {
  const objects: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      objects.push(...flattenEvents(JSON.parse(match[1].trim().replace(/^<!--|-->$/g, ""))));
    } catch {
      // Continue through malformed third-party JSON-LD blocks.
    }
  }

  const accepted: ParsedEvent[] = [];
  const rejected: ParseResult["rejected"] = [];

  for (const event of objects) {
    const name = clean(event.name ?? event.headline);
    const sourceUrl = first(event.url) ?? pageUrl;
    const start = eventDateParts(event.startDate ?? event.startTime);
    if (!name || !start) {
      rejected.push({ name, reason: "invalid_name_or_date", sourceUrl });
      continue;
    }

    const location = locationEvidence(event.location);
    const locationCheck = isAtlantaPhysical(event, location);
    if (!locationCheck.ok) {
      rejected.push({ name, reason: locationCheck.reason, sourceUrl });
      continue;
    }

    const status = first(event.eventStatus)?.toLowerCase() ?? "";
    if (status.includes("eventcancelled") || status.includes("cancelled")) {
      rejected.push({ name, reason: "cancelled_event", sourceUrl });
      continue;
    }

    const end = eventDateParts(event.endDate ?? event.endTime);
    const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
    const offer = offers && typeof offers === "object" ? offers as Record<string, unknown> : {};
    const organizer = event.organizer && typeof event.organizer === "object"
      ? event.organizer as Record<string, unknown>
      : {};

    accepted.push({
      name,
      date: start.date,
      time: start.time,
      endDate: end?.date ?? null,
      endTime: end?.time ?? null,
      venue: location.name,
      address: location.address!,
      eventType: categoryOf(sourceName, pageUrl, name),
      description: clean(event.description),
      ticket: first(offer.url ?? event.url) ?? pageUrl,
      price: clean(offer.price ?? offer.lowPrice, 100),
      image: first(event.image),
      organizer: clean(organizer.name ?? event.organizer, 300),
      sourceUrl,
      raw: event,
      locationReason: locationCheck.reason,
    });
  }

  return { accepted, rejected, discovered: objects.length };
};

const fetchPage = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; GoodTimesEventScout/3.0; +https://thegoodtimesworldwide.com)",
        accept: "text/html,application/ld+json,*/*;q=0.5",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_FETCH_BYTES) throw new Error("body_too_large");
    const body = await response.text();
    if (body.length > MAX_FETCH_BYTES) throw new Error("body_too_large");
    return body;
  } finally {
    clearTimeout(timer);
  }
};

const hash = async (value: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "server_configuration_missing" }, 500);
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: credential, error: credentialError } = await db.from("credentials")
    .select("credential_value")
    .eq("credential_key", "gt_atlanta_source_internal")
    .eq("is_active", true)
    .maybeSingle();
  const expected = typeof credential?.credential_value?.api_key === "string"
    ? credential.credential_value.api_key
    : typeof credential?.credential_value?.key === "string"
    ? credential.credential_value.key
    : "";
  if (credentialError || !secureEqual(request.headers.get("x-khg-internal-key") ?? "", expected)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Optional body.
  }
  const limit = Math.min(Math.max(Number(body.limit ?? 4), 1), 10);
  const sourceIds = Array.isArray(body.source_ids)
    ? body.source_ids.filter((id): id is string => typeof id === "string").slice(0, 10)
    : [];

  let query = db.from("gt_event_sources")
    .select("id,source_name,source_url,source_type,scrape_priority")
    .ilike("city", "atlanta")
    .eq("is_active", true)
    .eq("source_type", "eventbrite")
    .not("source_url", "is", null)
    .order("last_scraped_at", { ascending: true, nullsFirst: true })
    .order("scrape_priority", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (sourceIds.length) query = query.in("id", sourceIds);
  const { data: sources, error: sourceError } = await query;
  if (sourceError) return json({ ok: false, error: "source_query_failed" }, 500);

  const summary = {
    checked: 0,
    discovered: 0,
    accepted: 0,
    rejected: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    rejection_reasons: {} as Record<string, number>,
    sources: [] as unknown[],
  };

  for (const source of sources ?? []) {
    summary.checked += 1;
    const started = Date.now();
    let discovered = 0;
    let accepted = 0;
    let rejected = 0;
    let inserted = 0;
    let updated = 0;
    let errorText: string | null = null;
    const sourceReasons: Record<string, number> = {};

    try {
      const parsed = parseEventbrite(await fetchPage(source.source_url), source.source_name, source.source_url);
      discovered = parsed.discovered;
      rejected = parsed.rejected.length;
      for (const item of parsed.rejected) {
        sourceReasons[item.reason] = (sourceReasons[item.reason] ?? 0) + 1;
        summary.rejection_reasons[item.reason] = (summary.rejection_reasons[item.reason] ?? 0) + 1;
      }

      const unique = new Map<string, ParsedEvent>();
      for (const event of parsed.accepted) {
        const dedup = await hash(`atlanta|${event.name.toLowerCase().replace(/\W+/g, " ").trim()}|${event.date}|${(event.venue ?? "").toLowerCase()}`);
        unique.set(dedup, event);
      }
      accepted = unique.size;

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

        const existingRaw = existing?.raw_data && typeof existing.raw_data === "object"
          ? existing.raw_data as Record<string, unknown>
          : {};
        const confirmations = new Set<string>(
          Array.isArray(existingRaw.source_confirmations)
            ? existingRaw.source_confirmations.filter((value): value is string => typeof value === "string")
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
          legacy_quarantined_at: null,
          legacy_quarantine_reason: null,
          raw_data: {
            ...existingRaw,
            jsonld: event.raw,
            collected_via: "eventbrite_public_jsonld_v3",
            source_type: source.source_type,
            source_confirmations: [...confirmations],
            location_validation: event.locationReason,
            timezone: "America/New_York",
            collected_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await db.from("gt_sourced_events").update(record).eq("id", existing.id);
          if (error) throw error;
          updated += 1;
        } else {
          const { error } = await db.from("gt_sourced_events").insert(record);
          if (error) throw error;
          inserted += 1;
        }
      }

      await db.from("gt_event_sources").update({
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: accepted > 0 ? "success" : "empty",
        events_found_last_run: accepted,
        updated_at: new Date().toISOString(),
      }).eq("id", source.id);
    } catch (error) {
      errorText = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      summary.errors += 1;
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
      events_found: accepted,
      events_new: inserted,
      events_updated: updated,
      error_message: errorText,
      sources_checked: 1,
      duration_ms: Date.now() - started,
      started_at: new Date(started).toISOString(),
      completed_at: new Date().toISOString(),
      run_metadata: {
        collector: "gt-atlanta-eventbrite-refresh-v3",
        source_name: source.source_name,
        discovered,
        accepted,
        rejected,
        rejection_reasons: sourceReasons,
        physical_atlanta_required: true,
      },
    });

    summary.discovered += discovered;
    summary.accepted += accepted;
    summary.rejected += rejected;
    summary.inserted += inserted;
    summary.updated += updated;
    summary.sources.push({
      name: source.source_name,
      discovered,
      accepted,
      rejected,
      inserted,
      updated,
      rejection_reasons: sourceReasons,
      error: errorText,
    });
  }

  let promotion: unknown = null;
  let ranking: unknown = null;
  if (summary.errors === 0 && summary.accepted > 0) {
    const promoted = await db.rpc("gt_promote_sourced_to_shows", {
      p_city_filter: "atlanta",
      p_dry_run: false,
      p_limit: 1000,
    });
    promotion = promoted.error ? { error: promoted.error.message } : promoted.data;
    const ranked = await db.rpc("gt_refresh_atlanta_display_priority");
    ranking = ranked.error ? { error: ranked.error.message } : ranked.data;
  }

  return json({
    ok: summary.errors === 0,
    city: "atlanta",
    completed_at: new Date().toISOString(),
    summary,
    promotion,
    ranking,
  }, summary.errors === 0 ? 200 : 207);
});
