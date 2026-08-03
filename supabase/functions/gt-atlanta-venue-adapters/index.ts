import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AISLE_SOURCE_ID = "63de734f-309c-43f5-9571-a46263b2136b";
const VARIETY_SOURCE_ID = "289bdf4f-4be2-489c-8551-e15b6cfc3cec";
const SUPPORTED_SOURCE_IDS = new Set([AISLE_SOURCE_ID, VARIETY_SOURCE_ID]);

const AISLE_URL = "https://aisle5atl.com/calendar/";
const VARIETY_PAGE_URL = "https://www.variety-playhouse.com/calendar/";
const VARIETY_FEED_URL = "https://aegwebprod.blob.core.windows.net/json/events/214/events.json";
const VARIETY_VENUE_ID = "102442";

const MAX_BODY_BYTES = 64_000;
const MAX_FETCH_BYTES = 2_500_000;
const MAX_MONTHS = 18;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

const clean = (value: unknown, max = 2_000): string | null => {
  if (typeof value !== "string") return null;
  const decoded = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  const result = decoded.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return result ? result.slice(0, max) : null;
};

const secureEqual = (left: string, right: string): boolean => {
  if (!left || !right || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

const absoluteUrl = (value: unknown, base: string): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return new URL(value.replace(/&amp;/g, "&"), base).toString();
  } catch {
    return null;
  }
};

const hash = async (value: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const atlantaDateParts = (value = new Date()) => {
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
  const today = new Date(`${atlantaDateParts().date}T00:00:00Z`);
  const maximum = new Date(today);
  maximum.setUTCMonth(maximum.getUTCMonth() + MAX_MONTHS);
  return candidate >= today && candidate <= maximum;
};

const parseShortOfficialDate = (value: unknown): string | null => {
  const text = clean(value, 100);
  if (!text) return null;
  const match = text.match(/(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)?\s*([A-Za-z]{3,9})\s+(\d{1,2})/i);
  if (!match) return null;
  const month = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ].indexOf(match[1].slice(0, 3).toLowerCase());
  if (month < 0) return null;

  const today = atlantaDateParts().date;
  let year = Number(today.slice(0, 4));
  let candidate = `${year}-${String(month + 1).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
  if (candidate < today) {
    year += 1;
    candidate = `${year}-${String(month + 1).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
  }
  return dateInWindow(candidate) ? candidate : null;
};

const parseClock = (value: unknown): string | null => {
  const text = clean(value, 50);
  if (!text) return null;
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2] ?? "00"}`;
};

const parseAtlantaDateTime = (value: unknown): { date: string; time: string } | null => {
  const text = clean(value, 100);
  if (!text) return null;

  // Official venue feeds commonly encode local venue time before an offset.
  // Keep that local date/time instead of converting to UTC and shifting evenings
  // into the next calendar day.
  const localPrefix = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (localPrefix && dateInWindow(localPrefix[1])) {
    return { date: localPrefix[1], time: `${localPrefix[2]}:${localPrefix[3]}` };
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  const atlanta = atlantaDateParts(parsed);
  return dateInWindow(atlanta.date) ? atlanta : null;
};

const typeOf = (title: string, category: string | null, supporting: string | null) => {
  const text = `${title} ${category ?? ""} ${supporting ?? ""}`.toLowerCase();
  if (/comedy|stand.?up|comedian/.test(text)) return "comedy";
  if (/festival|parade|block party|expo|convention/.test(text)) return "festival";
  if (/theater|theatre|musical|stage|play/.test(text)) return "play";
  if (/sport|game|match|boxing|ufc/.test(text)) return "sports";
  if (/brunch/.test(text)) return "brunch";
  if (/club|nightlife|party|dj|lounge|hookah/.test(text)) return "nightlife";
  return "concert";
};

const fetchText = async (url: string, accept: string): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "GoodTimesAtlantaSourceBot/2.0 (+https://thegoodtimesworldwide.com)",
        accept,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_FETCH_BYTES) throw new Error("body_too_large");
    const body = await response.text();
    if (body.length > MAX_FETCH_BYTES) throw new Error("body_too_large");
    return body;
  } finally {
    clearTimeout(timeout);
  }
};

type ParsedEvent = {
  externalId: string | null;
  name: string;
  date: string;
  time: string | null;
  venue: string;
  address: string;
  eventType: string;
  category: string | null;
  description: string | null;
  ticket: string;
  price: string | null;
  image: string | null;
  organizer: string | null;
  sourceUrl: string;
  raw: Record<string, unknown>;
};

const parseAisle5 = (html: string): ParsedEvent[] => {
  const marker = /<div[^>]*class=["'][^"']*seetickets-list-event-container[^"']*["'][^>]*>/gi;
  const starts = [...html.matchAll(marker)].map((match) => match.index ?? -1).filter((index) => index >= 0);
  const events: ParsedEvent[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const chunk = html.slice(starts[index], starts[index + 1] ?? html.length);
    const title = chunk.match(/<p[^>]*class=["'][^"']*event-title[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const name = clean(title?.[2]);
    const ticket = absoluteUrl(title?.[1], AISLE_URL);
    const date = parseShortOfficialDate(chunk.match(/<p[^>]*class=["'][^"']*event-date[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]);
    if (!name || !ticket || !date) continue;

    const textFrom = (expression: RegExp) => clean(chunk.match(expression)?.[1]);
    const showTime = parseClock(textFrom(/<span[^>]*class=["'][^"']*see-showtime[^"']*["'][^>]*>([\s\S]*?)<\/span>/i));
    const doorTime = parseClock(textFrom(/<span[^>]*class=["'][^"']*see-doortime[^"']*["'][^>]*>([\s\S]*?)<\/span>/i));
    const supporting = textFrom(/<p[^>]*class=["'][^"']*supporting-talent[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const category = textFrom(/<p[^>]*class=["'][^"']*genre[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const organizer = textFrom(/<p[^>]*class=["'][^"']*event-header[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const price = textFrom(/<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const imageMatch = chunk.match(/<img[^>]*class=["'][^"']*seetickets-list-view-event-image[^"']*["'][^>]*src=["']([^"']+)["']/i);
    const image = absoluteUrl(imageMatch?.[1], AISLE_URL);
    const externalId = ticket.match(/\/event\/[^/]+\/(\d+)/i)?.[1] ?? null;

    events.push({
      externalId,
      name,
      date,
      time: showTime,
      venue: "Aisle 5",
      address: "1123 Euclid Ave NE, Atlanta, GA 30307",
      eventType: typeOf(name, category, supporting),
      category,
      description: supporting ? `With ${supporting}` : null,
      ticket,
      price,
      image,
      organizer,
      sourceUrl: ticket,
      raw: {
        adapter: "aisle5_seetickets_cards_v2",
        external_event_id: externalId,
        doors_time: doorTime,
        supporting,
        official_calendar: AISLE_URL,
      },
    });
  }
  return events;
};

const mediaUrl = (media: unknown): string | null => {
  if (!media || typeof media !== "object") return null;
  for (const value of Object.values(media as Record<string, unknown>)) {
    if (value && typeof value === "object") {
      const fileName = (value as Record<string, unknown>).file_name;
      if (typeof fileName === "string" && fileName) return fileName;
    }
  }
  return null;
};

const priceOf = (event: Record<string, unknown>): string | null => {
  const low = clean(event.ticketPriceLow, 50);
  const high = clean(event.ticketPriceHigh, 50);
  const usableLow = low && !/^\$?0(?:\.00)?$/.test(low) ? low : null;
  const usableHigh = high && !/^\$?0(?:\.00)?$/.test(high) ? high : null;
  if (usableLow && usableHigh && usableLow !== usableHigh) return `${usableLow}-${usableHigh}`;
  return usableLow ?? usableHigh;
};

const parseVariety = (payload: unknown): ParsedEvent[] => {
  if (!payload || typeof payload !== "object") return [];
  const values = Array.isArray((payload as Record<string, unknown>).events)
    ? (payload as Record<string, unknown>).events as unknown[]
    : [];

  return values.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const event = value as Record<string, unknown>;
    const venue = event.venue && typeof event.venue === "object" ? event.venue as Record<string, unknown> : {};
    if (String(venue.venueId ?? "") !== VARIETY_VENUE_ID || event.active === false || event.private === true) return [];

    const title = event.title && typeof event.title === "object" ? event.title as Record<string, unknown> : {};
    const ticketing = event.ticketing && typeof event.ticketing === "object" ? event.ticketing as Record<string, unknown> : {};
    const name = clean(title.eventTitleText ?? title.headlinersText);
    const local = parseAtlantaDateTime(event.eventDateTimeISO ?? event.eventDateTime);
    if (!name || !local) return [];

    const supporting = clean(title.supportingText);
    const organizer = clean(title.presentedByText);
    const ticket = absoluteUrl(ticketing.url ?? ticketing.eventUrl, VARIETY_PAGE_URL) ?? VARIETY_PAGE_URL;
    const address = clean(venue.address_line) ?? "1099 Euclid Avenue NE, Atlanta, GA 30307";
    const description = clean(event.description, 2_000);

    return [{
      externalId: String(event.eventId ?? "") || null,
      name,
      date: local.date,
      time: local.time,
      venue: clean(venue.title) ?? "Variety Playhouse",
      address,
      eventType: typeOf(name, null, supporting),
      category: "Live Music",
      description: supporting ? `With ${supporting}${description ? `. ${description}` : ""}` : description,
      ticket,
      price: priceOf(event),
      image: mediaUrl(event.media),
      organizer,
      sourceUrl: ticket,
      raw: {
        adapter: "variety_aeg_official_json_v2",
        external_event_id: String(event.eventId ?? "") || null,
        original_event_datetime: clean(event.eventDateTimeISO ?? event.eventDateTime, 100),
        doors_at: clean(event.doorDateTime, 100),
        supporting,
        age: clean(event.age, 100),
        ticket_status: clean(ticketing.status, 100),
        official_calendar: VARIETY_PAGE_URL,
        official_feed: VARIETY_FEED_URL,
        timezone: "America/New_York",
      },
    } satisfies ParsedEvent];
  });
};

const loadEvents = async (sourceId: string): Promise<ParsedEvent[]> => {
  if (sourceId === AISLE_SOURCE_ID) {
    return parseAisle5(await fetchText(AISLE_URL, "text/html,*/*;q=0.5"));
  }
  if (sourceId === VARIETY_SOURCE_ID) {
    return parseVariety(JSON.parse(await fetchText(VARIETY_FEED_URL, "application/json,*/*;q=0.5")));
  }
  throw new Error("unsupported_source");
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "server_configuration_missing" }, 500);

  const database = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: credential, error: credentialError } = await database
    .from("credentials")
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
    // The default supported-source run does not require a body.
  }

  const dryRun = body.dry_run === true;
  const requested = Array.isArray(body.source_ids)
    ? body.source_ids.filter((value): value is string => typeof value === "string")
    : [AISLE_SOURCE_ID, VARIETY_SOURCE_ID];
  const sourceIds = [...new Set(requested)].filter((value) => SUPPORTED_SOURCE_IDS.has(value));
  if (sourceIds.length === 0 || sourceIds.length > SUPPORTED_SOURCE_IDS.size) {
    return json({ ok: false, error: "no_supported_sources" }, 400);
  }

  const { data: sources, error: sourceError } = await database
    .from("gt_event_sources")
    .select("id,source_name,source_type,is_active")
    .in("id", sourceIds);
  if (sourceError) return json({ ok: false, error: "source_query_failed" }, 500);

  const byId = new Map((sources ?? []).map((source) => [source.id, source]));
  const summary = {
    dry_run: dryRun,
    checked: 0,
    found: 0,
    inserted: 0,
    updated: 0,
    verified: 0,
    errors: 0,
    sources: [] as unknown[],
  };

  for (const sourceId of sourceIds) {
    const source = byId.get(sourceId);
    if (!source?.is_active) {
      summary.sources.push({ source_id: sourceId, skipped: "source_inactive_or_missing" });
      continue;
    }

    summary.checked += 1;
    const startedAt = new Date();
    let found = 0;
    let inserted = 0;
    let updated = 0;
    let verified = 0;
    let errorText: string | null = null;

    try {
      const unique = new Map<string, ParsedEvent>();
      for (const event of await loadEvents(sourceId)) {
        const key = await hash(`atlanta|${event.name.toLowerCase().replace(/\W+/g, " ").trim()}|${event.date}|${event.venue.toLowerCase()}`);
        unique.set(key, event);
      }
      found = unique.size;

      if (!dryRun) {
        for (const [dedupHash, event] of unique) {
          let { data: existing } = await database
            .from("gt_sourced_events")
            .select("id,raw_data,is_verified")
            .eq("dedup_hash", dedupHash)
            .maybeSingle();
          if (!existing) {
            existing = (await database
              .from("gt_sourced_events")
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
            end_date: null,
            end_time: null,
            venue_name: event.venue,
            venue_address: event.address,
            event_type: event.eventType,
            event_category: event.category,
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
            dedup_hash: dedupHash,
            raw_data: {
              ...existingRaw,
              ...event.raw,
              collected_via: "official_venue_adapter_v2",
              source_type: source.source_type,
              source_confirmations: [...confirmations],
              collected_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          };

          if (existing?.id) {
            const { error } = await database.from("gt_sourced_events").update(record).eq("id", existing.id);
            if (error) throw error;
            updated += 1;
          } else {
            const { error } = await database.from("gt_sourced_events").insert(record);
            if (error) throw error;
            inserted += 1;
          }
          verified += 1;
        }

        await database.from("gt_event_sources").update({
          last_scraped_at: new Date().toISOString(),
          last_scrape_status: found > 0 ? "success" : "empty",
          events_found_last_run: found,
          updated_at: new Date().toISOString(),
        }).eq("id", source.id);
      }
    } catch (error) {
      errorText = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      summary.errors += 1;
      if (!dryRun) {
        await database.from("gt_event_sources").update({
          last_scraped_at: new Date().toISOString(),
          last_scrape_status: "failed",
          events_found_last_run: 0,
          updated_at: new Date().toISOString(),
        }).eq("id", source.id);
      }
    }

    if (!dryRun) {
      await database.from("gt_scrape_runs").insert({
        city: "atlanta",
        source_id: source.id,
        source_type: source.source_type,
        status: errorText ? "failed" : "completed",
        run_status: errorText ? "failed" : "completed",
        events_found: found,
        events_new: inserted,
        events_updated: updated,
        error_message: errorText,
        sources_checked: 1,
        duration_ms: Date.now() - startedAt.getTime(),
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString(),
        run_metadata: {
          collector: "gt-atlanta-venue-adapters-v2",
          source_name: source.source_name,
          dry_run: false,
          timezone: "America/New_York",
        },
      });
    }

    summary.found += found;
    summary.inserted += inserted;
    summary.updated += updated;
    summary.verified += verified;
    summary.sources.push({
      source_id: source.id,
      name: source.source_name,
      found,
      inserted,
      updated,
      verified,
      error: errorText,
    });
  }

  let promotion: unknown = null;
  let ranking: unknown = null;
  if (!dryRun && summary.errors === 0 && summary.verified > 0) {
    const promoted = await database.rpc("gt_promote_sourced_to_shows", {
      p_city_filter: "atlanta",
      p_dry_run: false,
      p_limit: 500,
    });
    promotion = promoted.error ? { error: promoted.error.message } : promoted.data;

    const ranked = await database.rpc("gt_refresh_atlanta_display_priority");
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
