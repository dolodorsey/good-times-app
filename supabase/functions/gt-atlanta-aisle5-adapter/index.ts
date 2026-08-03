import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SOURCE_ID = "63de734f-309c-43f5-9571-a46263b2136b";
const CALENDAR_URL = "https://aisle5atl.com/calendar/";
const VENUE_NAME = "Aisle 5";
const VENUE_ADDRESS = "1123 Euclid Ave NE, Atlanta, GA 30307";
const MAX_BODY_BYTES = 32_000;
const MAX_FETCH_BYTES = 2_500_000;
const MAX_MONTHS = 18;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const clean = (value: unknown, max = 8_000): string | null => {
  if (typeof value !== "string") return null;
  const result = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

const absoluteUrl = (value: string): string | null => {
  try {
    return new URL(value.replace(/&amp;/g, "&"), CALENDAR_URL).toString();
  } catch {
    return null;
  }
};

const isTicketUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowedHost = hostname === "seetickets.us" ||
      hostname.endsWith(".seetickets.us") ||
      hostname === "eventim.us" ||
      hostname.endsWith(".eventim.us");
    return allowedHost && url.pathname.toLowerCase().includes("/event/");
  } catch {
    return false;
  }
};

const atlantaToday = (): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const inWindow = (isoDate: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const candidate = new Date(`${isoDate}T00:00:00Z`);
  const floor = new Date(`${atlantaToday()}T00:00:00Z`);
  if (Number.isNaN(candidate.getTime())) return false;
  const maximum = new Date(floor);
  maximum.setUTCMonth(maximum.getUTCMonth() + MAX_MONTHS);
  return candidate >= floor && candidate <= maximum;
};

const parseDate = (value: string): string | null => {
  const match = value.match(/\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)?\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})\b/i);
  if (!match) return null;
  const month = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ].indexOf(match[1].slice(0, 3).toLowerCase());
  if (month < 0) return null;

  const today = atlantaToday();
  let year = Number(today.slice(0, 4));
  let candidate = `${year}-${String(month + 1).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
  if (candidate < today) {
    year += 1;
    candidate = `${year}-${String(month + 1).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
  }
  return inWindow(candidate) ? candidate : null;
};

const parseClock = (value: string): string | null => {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2] ?? "00"}`;
};

const eventType = (title: string, context: string): string => {
  const text = `${title} ${context}`.toLowerCase();
  if (/comedy|stand.?up|comedian/.test(text)) return "comedy";
  if (/festival|parade|block party|showcase/.test(text)) return "festival";
  if (/hip.?hop|rap|r&b|rnb|concert|music|jazz|rock|punk|alternative|world/.test(text)) return "concert";
  if (/dj|dance|electronic|house|dubstep|party|nightlife/.test(text)) return "nightlife";
  return "concert";
};

const hash = async (value: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const fetchCalendar = async (): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(CALENDAR_URL, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "GoodTimesAisle5SourceBot/2.0 (+https://thegoodtimesworldwide.com)",
        accept: "text/html,*/*;q=0.5",
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
  showTime: string | null;
  doorsTime: string | null;
  ticketUrl: string;
  price: string | null;
  category: string | null;
  context: string;
};

type LinkCandidate = {
  index: number;
  url: string;
  name: string;
};

type ParseResult = {
  events: ParsedEvent[];
  diagnostics: {
    html_bytes: number;
    anchor_count: number;
    href_count: number;
    ticket_link_count: number;
    ticket_hosts: Record<string, number>;
    links_without_full_date: number;
  };
};

const parseCalendar = (html: string): ParseResult => {
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const rawAnchors = [...html.matchAll(anchorPattern)];
  const links: LinkCandidate[] = [];
  let hrefCount = 0;
  const ticketHosts: Record<string, number> = {};

  for (const match of rawAnchors) {
    const attributes = match[1] ?? "";
    const href = attributes.match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const rawUrl = href?.[1] ?? href?.[2] ?? href?.[3] ?? null;
    if (!rawUrl) continue;
    hrefCount += 1;
    const url = absoluteUrl(rawUrl);
    const name = clean(match[2], 300);
    if (!url || !name || !isTicketUrl(url)) continue;
    const hostname = new URL(url).hostname.toLowerCase();
    ticketHosts[hostname] = (ticketHosts[hostname] ?? 0) + 1;
    links.push({ index: match.index ?? 0, url, name });
  }

  const byTicket = new Map<string, ParsedEvent>();
  let linksWithoutFullDate = 0;

  for (let index = 0; index < links.length; index += 1) {
    const link = links[index];
    if (/^tickets?|buy tickets?$/i.test(link.name)) continue;

    const next = links.slice(index + 1).find((candidate) =>
      candidate.url !== link.url && !/^tickets?|buy tickets?$/i.test(candidate.name)
    );
    const end = Math.min(next?.index ?? link.index + 6_000, link.index + 6_000, html.length);
    const visible = clean(html.slice(link.index, end), 12_000) ?? "";
    const venueMarker = visible.toLowerCase().indexOf("at aisle 5");
    const context = venueMarker >= 0
      ? visible.slice(0, Math.min(visible.length, venueMarker + 300))
      : visible.slice(0, 2_500);
    const date = parseDate(context);
    if (!date) {
      linksWithoutFullDate += 1;
      continue;
    }

    const timeValues = [...context.matchAll(/\b(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\b/gi)]
      .map((item) => parseClock(item[1]))
      .filter((item): item is string => Boolean(item));
    const distinctTimes = [...new Set(timeValues)];
    const showTime = distinctTimes.length ? distinctTimes[distinctTimes.length - 1] : null;
    const doorsTime = distinctTimes.length > 1 ? distinctTimes[0] : null;
    const price = context.match(/(?:All Ages,\s*)?(\$\d+(?:\.\d{2})?(?:\s*-\s*\$\d+(?:\.\d{2})?)?)/i)?.[1] ?? null;
    const category = context.match(/\b(Stand-Up|R&B|Hip Hop\/Rap|DJ\/Dance|Electronic|Alternative|Jazz|World|Punk|House|Dubstep|Hyperpop)\b/i)?.[1] ?? null;
    const externalId = link.url.match(/\/(\d+)(?:\?.*)?$/)?.[1] ?? null;

    const candidate: ParsedEvent = {
      externalId,
      name: link.name,
      date,
      showTime,
      doorsTime,
      ticketUrl: link.url,
      price,
      category,
      context: context.slice(0, 2_000),
    };

    const existing = byTicket.get(link.url);
    if (!existing || (!existing.showTime && candidate.showTime) || candidate.context.length > existing.context.length) {
      byTicket.set(link.url, candidate);
    }
  }

  return {
    events: [...byTicket.values()].sort((left, right) =>
      `${left.date} ${left.showTime ?? ""}`.localeCompare(`${right.date} ${right.showTime ?? ""}`)
    ),
    diagnostics: {
      html_bytes: html.length,
      anchor_count: rawAnchors.length,
      href_count: hrefCount,
      ticket_link_count: links.length,
      ticket_hosts: ticketHosts,
      links_without_full_date: linksWithoutFullDate,
    },
  };
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "server_configuration_missing" }, 500);
  const database = createClient(supabaseUrl, serviceKey, {
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
    // Optional body.
  }
  const dryRun = body.dry_run === true;

  const { data: source, error: sourceError } = await database
    .from("gt_event_sources")
    .select("id,source_name,source_type,is_active")
    .eq("id", SOURCE_ID)
    .maybeSingle();
  if (sourceError || !source?.is_active) return json({ ok: false, error: "source_inactive_or_missing" }, 409);

  const started = new Date();
  let parsed: ParseResult = {
    events: [],
    diagnostics: {
      html_bytes: 0,
      anchor_count: 0,
      href_count: 0,
      ticket_link_count: 0,
      ticket_hosts: {},
      links_without_full_date: 0,
    },
  };
  let inserted = 0;
  let updated = 0;
  let errorText: string | null = null;

  try {
    parsed = parseCalendar(await fetchCalendar());
    if (!dryRun) {
      for (const event of parsed.events) {
        const dedupHash = await hash(`atlanta|${event.name.toLowerCase().replace(/\W+/g, " ").trim()}|${event.date}|aisle 5`);
        let { data: existing } = await database
          .from("gt_sourced_events")
          .select("id,raw_data")
          .eq("dedup_hash", dedupHash)
          .maybeSingle();
        if (!existing) {
          existing = (await database
            .from("gt_sourced_events")
            .select("id,raw_data")
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
          event_time: event.showTime,
          end_date: null,
          end_time: null,
          venue_name: VENUE_NAME,
          venue_address: VENUE_ADDRESS,
          event_type: eventType(event.name, `${event.category ?? ""} ${event.context}`),
          event_category: event.category,
          description: null,
          ticket_url: event.ticketUrl,
          ticket_price: event.price,
          image_url: null,
          organizer: null,
          source_id: source.id,
          source_url: event.ticketUrl,
          source_name: source.source_name,
          is_verified: true,
          is_published: true,
          published_to_gt: false,
          dedup_hash: dedupHash,
          legacy_quarantined_at: null,
          legacy_quarantine_reason: null,
          raw_data: {
            ...existingRaw,
            adapter: "aisle5_generic_ticket_links_v2",
            external_event_id: event.externalId,
            doors_time: event.doorsTime,
            official_calendar: CALENDAR_URL,
            source_confirmations: [...confirmations],
            collected_via: "official_venue_adapter",
            collected_at: new Date().toISOString(),
            timezone: "America/New_York",
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
      }

      await database.from("gt_event_sources").update({
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: parsed.events.length > 0 ? "success" : "empty",
        events_found_last_run: parsed.events.length,
        updated_at: new Date().toISOString(),
      }).eq("id", SOURCE_ID);
    }
  } catch (error) {
    errorText = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
    if (!dryRun) {
      await database.from("gt_event_sources").update({
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: "failed",
        events_found_last_run: 0,
        updated_at: new Date().toISOString(),
      }).eq("id", SOURCE_ID);
    }
  }

  if (!dryRun) {
    await database.from("gt_scrape_runs").insert({
      city: "atlanta",
      source_id: SOURCE_ID,
      source_type: source.source_type,
      status: errorText ? "failed" : "completed",
      run_status: errorText ? "failed" : "completed",
      events_found: parsed.events.length,
      events_new: inserted,
      events_updated: updated,
      error_message: errorText,
      sources_checked: 1,
      duration_ms: Date.now() - started.getTime(),
      started_at: started.toISOString(),
      completed_at: new Date().toISOString(),
      run_metadata: {
        collector: "gt-atlanta-aisle5-adapter-v2",
        dry_run: false,
        official_calendar: CALENDAR_URL,
        diagnostics: parsed.diagnostics,
      },
    });
  }

  let promotion: unknown = null;
  let ranking: unknown = null;
  if (!dryRun && !errorText && parsed.events.length > 0) {
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
    ok: !errorText,
    city: "atlanta",
    source: source.source_name,
    dry_run: dryRun,
    completed_at: new Date().toISOString(),
    summary: {
      found: parsed.events.length,
      inserted,
      updated,
      error: errorText,
      diagnostics: parsed.diagnostics,
      sample: parsed.events.slice(0, 5).map((event) => ({
        name: event.name,
        date: event.date,
        time: event.showTime,
        ticket_url: event.ticketUrl,
      })),
    },
    promotion,
    ranking,
  }, errorText ? 500 : 200);
});
