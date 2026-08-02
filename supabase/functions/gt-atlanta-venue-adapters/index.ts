import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AISLE_SOURCE_ID = "63de734f-309c-43f5-9571-a46263b2136b";
const VARIETY_SOURCE_ID = "289bdf4f-4be2-489c-8551-e15b6cfc3cec";
const AISLE_URL = "https://aisle5atl.com/calendar/";
const VARIETY_PAGE_URL = "https://www.variety-playhouse.com/calendar/";
const VARIETY_FEED_URL = "https://aegwebprod.blob.core.windows.net/json/events/214/events.json";
const VARIETY_VENUE_ID = "102442";
const MAX_BYTES = 2_500_000;
const MAX_MONTHS = 18;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

const stripTags = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const decoded = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  const cleaned = decoded.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || null;
};

const absoluteUrl = (value: string | null, base: string): string | null => {
  if (!value) return null;
  try {
    return new URL(value.replace(/&amp;/g, "&"), base).toString();
  } catch {
    return null;
  }
};

const extractAttribute = (chunk: string, expression: RegExp, base: string): string | null => {
  const match = chunk.match(expression);
  return absoluteUrl(match?.[1] ?? match?.[2] ?? match?.[3] ?? null, base);
};

const extractText = (chunk: string, expression: RegExp): string | null =>
  stripTags(chunk.match(expression)?.[1] ?? null);

const atlantaToday = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
};

const withinWindow = (date: Date): boolean => {
  if (Number.isNaN(date.getTime())) return false;
  const todayParts = atlantaToday();
  const today = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
  const max = new Date(today);
  max.setUTCMonth(max.getUTCMonth() + MAX_MONTHS);
  return date >= today && date <= max;
};

const parseShortOfficialDate = (value: string | null): string | null => {
  if (!value) return null;
  const match = value.match(/(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)?\s*([A-Za-z]{3,9})\s+(\d{1,2})/i);
  if (!match) return null;
  const monthIndex = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ].indexOf(match[1].slice(0, 3).toLowerCase());
  if (monthIndex < 0) return null;

  const todayParts = atlantaToday();
  let year = todayParts.year;
  let candidate = new Date(Date.UTC(year, monthIndex, Number(match[2])));
  const today = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));

  if (candidate.getTime() < today.getTime() - 86_400_000) {
    year += 1;
    candidate = new Date(Date.UTC(year, monthIndex, Number(match[2])));
  }

  return withinWindow(candidate) ? candidate.toISOString().slice(0, 10) : null;
};

const parseTime = (value: string | null): string | null => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2] ?? "00"}`;
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
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "GoodTimesAtlantaSourceBot/1.0 (+https://thegoodtimesworldwide.com)",
        accept,
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

const hash = async (value: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

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
    const titleMatch = chunk.match(
      /<p[^>]*class=["'][^"']*event-title[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=(?:["']([^"']+)["']|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/i,
    );
    const name = stripTags(titleMatch?.[3] ?? null);
    const ticket = absoluteUrl(titleMatch?.[1] ?? titleMatch?.[2] ?? null, AISLE_URL);
    const date = parseShortOfficialDate(
      extractText(chunk, /<p[^>]*class=["'][^"']*event-date[^"']*["'][^>]*>([\s\S]*?)<\/p>/i),
    );
    if (!name || !ticket || !date) continue;

    const showTime = parseTime(
      extractText(chunk, /<span[^>]*class=["'][^"']*see-showtime[^"']*["'][^>]*>([\s\S]*?)<\/span>/i),
    );
    const doorTime = parseTime(
      extractText(chunk, /<span[^>]*class=["'][^"']*see-doortime[^"']*["'][^>]*>([\s\S]*?)<\/span>/i),
    );
    const supporting = extractText(
      chunk,
      /<p[^>]*class=["'][^"']*supporting-talent[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
    );
    const category = extractText(
      chunk,
      /<p[^>]*class=["'][^"']*genre[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
    );
    const organizer = extractText(
      chunk,
      /<p[^>]*class=["'][^"']*event-header[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
    );
    const price = extractText(chunk, /<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const image = extractAttribute(
      chunk,
      /<img[^>]*class=["'][^"']*seetickets-list-view-event-image[^"']*["'][^>]*src=(?:["']([^"']+)["']|([^\s>]+))/i,
      AISLE_URL,
    );
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
        adapter: "aisle5_seetickets_cards",
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
  const record = media as Record<string, unknown>;
  for (const key of ["17", "88", "19", "1", "22", "21"]) {
    const item = record[key];
    if (item && typeof item === "object") {
      const fileName = (item as Record<string, unknown>).file_name;
      if (typeof fileName === "string" && fileName) return fileName;
    }
  }
  for (const item of Object.values(record)) {
    if (item && typeof item === "object") {
      const fileName = (item as Record<string, unknown>).file_name;
      if (typeof fileName === "string" && fileName) return fileName;
    }
  }
  return null;
};

const priceOf = (event: Record<string, unknown>): string | null => {
  const low = stripTags(event.ticketPriceLow);
  const high = stripTags(event.ticketPriceHigh);
  const usableLow = low && !/^\$?0(?:\.00)?$/.test(low) ? low : null;
  const usableHigh = high && !/^\$?0(?:\.00)?$/.test(high) ? high : null;
  if (usableLow && usableHigh && usableLow !== usableHigh) return `${usableLow}-${usableHigh}`;
  return usableLow ?? usableHigh;
};

const parseVariety = (payload: unknown): ParsedEvent[] => {
  if (!payload || typeof payload !== "object") return [];
  const events = Array.isArray((payload as Record<string, unknown>).events)
    ? (payload as Record<string, unknown>).events as unknown[]
    : [];

  return events.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const event = value as Record<string, unknown>;
    const venue = event.venue && typeof event.venue === "object"
      ? event.venue as Record<string, unknown>
      : {};
    if (String(venue.venueId ?? "") !== VARIETY_VENUE_ID) return [];
    if (event.active === false || event.private === true) return [];

    const title = event.title && typeof event.title === "object"
      ? event.title as Record<string, unknown>
      : {};
    const ticketing = event.ticketing && typeof event.ticketing === "object"
      ? event.ticketing as Record<string, unknown>
      : {};
    const name = stripTags(title.eventTitleText ?? title.headlinersText);
    const eventDateTime = typeof event.eventDateTimeISO === "string"
      ? event.eventDateTimeISO
      : typeof event.eventDateTime === "string"
      ? `${event.eventDateTime}-04:00`
      : null;
    if (!name || !eventDateTime) return [];
    const dateValue = new Date(eventDateTime);
    if (!withinWindow(dateValue)) return [];

    const supporting = stripTags(title.supportingText);
    const organizer = stripTags(title.presentedByText);
    const ticket = absoluteUrl(
      typeof ticketing.url === "string"
        ? ticketing.url
        : typeof ticketing.eventUrl === "string"
        ? ticketing.eventUrl
        : null,
      VARIETY_PAGE_URL,
    ) ?? VARIETY_PAGE_URL;
    const address = stripTags(venue.address_line) ?? "1099 Euclid Avenue NE, Atlanta, GA 30307";
    const description = stripTags(event.description)?.slice(0, 2000) ?? null;
    const ticketStatus = stripTags(ticketing.status);

    return [{
      externalId: String(event.eventId ?? "") || null,
      name,
      date: dateValue.toISOString().slice(0, 10),
      time: dateValue.toISOString().slice(11, 16),
      venue: stripTags(venue.title) ?? "Variety Playhouse",
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
        adapter: "variety_aeg_official_json",
        external_event_id: String(event.eventId ?? "") || null,
        doors_at: event.doorDateTime ?? null,
        supporting,
        age: event.age ?? null,
        ticket_status: ticketStatus,
        official_calendar: VARIETY_PAGE_URL,
        official_feed: VARIETY_FEED_URL,
      },
    } satisfies ParsedEvent];
  });
};

const loadEvents = async (sourceId: string): Promise<ParsedEvent[]> => {
  if (sourceId === AISLE_SOURCE_ID) {
    return parseAisle5(await fetchText(AISLE_URL, "text/html,*/*;q=0.5"));
  }
  if (sourceId === VARIETY_SOURCE_ID) {
    const raw = await fetchText(VARIETY_FEED_URL, "application/json,*/*;q=0.5");
    return parseVariety(JSON.parse(raw));
  }
  throw new Error("unsupported_source");
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_missing" }, 500);

  const database = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: credential } = await database
    .from("credentials")
    .select("credential_value")
    .eq("credential_key", "gt_atlanta_source_internal")
    .eq("is_active", true)
    .maybeSingle();
  const expected = credential?.credential_value?.api_key ?? credential?.credential_value?.key ?? "";
  if (!expected || request.headers.get("x-khg-internal-key") !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional.
  }
  const dryRun = body.dry_run === true;
  const requestedIds = Array.isArray(body.source_ids)
    ? body.source_ids.filter((value): value is string => typeof value === "string")
    : [AISLE_SOURCE_ID, VARIETY_SOURCE_ID];
  const sourceIds = [...new Set(requestedIds)].filter((id) =>
    id === AISLE_SOURCE_ID || id === VARIETY_SOURCE_ID
  );
  if (sourceIds.length === 0) return json({ error: "no_supported_sources" }, 400);

  const { data: sources, error: sourceError } = await database
    .from("gt_event_sources")
    .select("id,source_name,source_url,source_type,is_active")
    .in("id", sourceIds);
  if (sourceError) return json({ error: sourceError.message }, 500);

  const sourceById = new Map((sources ?? []).map((source) => [source.id, source]));
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
    const source = sourceById.get(sourceId);
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
      const events = await loadEvents(sourceId);
      const unique = new Map<string, ParsedEvent>();
      for (const event of events) {
        const dedup = await hash(
          `atlanta|${event.name.toLowerCase().replace(/\W+/g, " ").trim()}|${event.date}|${event.venue.toLowerCase()}`,
        );
        unique.set(dedup, event);
      }
      found = unique.size;

      if (!dryRun) {
        for (const [dedup, event] of unique) {
          let { data: existing } = await database
            .from("gt_sourced_events")
            .select("id,raw_data,is_verified")
            .eq("dedup_hash", dedup)
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

          const confirmations = new Set<string>(
            Array.isArray(existing?.raw_data?.source_confirmations)
              ? existing.raw_data.source_confirmations
              : [],
          );
          confirmations.add(source.source_name);
          const isVerified = true;
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
            is_verified: isVerified,
            is_published: isVerified,
            published_to_gt: false,
            dedup_hash: dedup,
            raw_data: {
              ...event.raw,
              collected_via: "official_venue_adapter",
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
          last_scrape_status: "success",
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
          collector: "gt-atlanta-venue-adapters",
          source_name: source.source_name,
          dry_run: false,
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
  if (!dryRun && summary.errors === 0) {
    const promotionResult = await database.rpc("gt_promote_sourced_to_shows", {
      p_city_filter: "atlanta",
      p_dry_run: false,
      p_limit: 500,
    });
    promotion = promotionResult.error ? { error: promotionResult.error.message } : promotionResult.data;

    const rankingResult = await database.rpc("gt_refresh_atlanta_display_priority");
    ranking = rankingResult.error ? { error: rankingResult.error.message } : rankingResult.data;
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
