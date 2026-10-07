// Shared collector rules. Provider/source labels are provenance, never event facts.
export const normalizeOccurrenceText = (value) => String(value ?? '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/&amp;/g, '&').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

const text = (value) => typeof value === 'string' ? value.trim() : '';
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const values = (value) => Array.isArray(value) ? value.flatMap(values) : typeof value === 'string' ? [value] : [];


// Only facts nested on this parsed Event are evidence. A displayed price of zero
// is a price observation, never proof that all admission is free.
export function structuredObservationFacts(event) {
  const raw = object(event);
  const offers = (Array.isArray(raw.offers) ? raw.offers : [raw.offers]).map(object);
  const statuses = offers.map((offer) => text(offer.availability));
  const facts = { eventStatus: text(raw.eventStatus) || null,
    isAccessibleForFree: typeof raw.isAccessibleForFree === 'boolean' ? raw.isAccessibleForFree : null,
    availability: statuses.length && statuses.every((status) => status && status === statuses[0]) ? statuses[0] : null,
    price_min: null, price_max: null, currency: null, price_basis: null };
  const amount = (value) => {
    if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value.trim()))) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };
  const ranges = [];
  for (const offer of offers) {
    const currency = text(offer.priceCurrency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return facts;
    const hasPrice = offer.price !== undefined && offer.price !== null;
    const hasLow = offer.lowPrice !== undefined && offer.lowPrice !== null;
    const hasHigh = offer.highPrice !== undefined && offer.highPrice !== null;
    const price = amount(offer.price), low = amount(offer.lowPrice), high = amount(offer.highPrice);
    if ((!hasPrice && !hasLow && !hasHigh) || (hasPrice && price === null)
      || (hasLow && low === null) || (hasHigh && high === null)) return facts;
    // Conflicting direct and aggregate values are not a reliable price fact.
    if ((hasPrice && hasLow && low !== price) || (hasPrice && hasHigh && high !== price)
      || (hasLow && hasHigh && low > high)) return facts;
    ranges.push({ currency, low: hasPrice ? price : low, high: hasPrice ? price : high });
  }
  if (!ranges.length || ranges.some((range) => range.currency !== ranges[0].currency)) return facts;
  return { ...facts, currency: ranges[0].currency,
    price_min: ranges.every((range) => range.low !== null) ? Math.min(...ranges.map((range) => range.low)) : null,
    price_max: ranges.every((range) => range.high !== null) ? Math.max(...ranges.map((range) => range.high)) : null };
}

export function classifyEvent(title, structuredTypes = []) {
  const types = values(structuredTypes).map((v) => v.split(/[\/#]/).pop().toLowerCase());
  const structured = { sportsevent: 'sports', musicevent: 'concert', comedyevent: 'comedy',
    theaterevent: 'play', theater_event: 'play', danceevent: 'play', visualartsevent: 'play', festival: 'festival',
    sports: 'sports', concert: 'concert', music: 'concert', comedy: 'comedy', theater: 'play', theatre: 'play', nightlife: 'nightlife' };
  const name = normalizeOccurrenceText(title);
  // Exact words/known team names: "transportation", "matchmaking", "game night",
  // "artist" and a discovery feed's category must not manufacture a sports/music fact.
  if (/\b(sports?|baseball|basketball|football|soccer|boxing|ufc|wnba|nba|nfl|mlb|nhl|playoffs?)\b/.test(name)
    || /\b(atlanta (braves|hawks|falcons|dream|united(?: fc)?)|georgia bulldogs|georgia tech yellow jackets)\b/.test(name)) return 'sports';
  for (const type of types) if (Object.hasOwn(structured, type)) return structured[type];
  if (/\b(comedy|comedian|stand up)\b/.test(name)) return 'comedy';
  if (/\b(acting|actors?|theater|theatre|musical|ballet|opera|stage play)\b/.test(name)) return 'play';
  if (/\b(concerts?|music|jazz|karaoke|orchestra|symphony|world tour|concert tour)\b/.test(name)) return 'concert';
  if (/\b(festivals?|parade|block party|expo|convention)\b/.test(name)) return 'festival';
  if (/\bbrunch\b/.test(name)) return 'brunch';
  if (/\b(nightlife|party|club|lounge|dj|rooftop|after hours|hookah)\b/.test(name)) return 'nightlife';
  if (/\b(art|museum|gallery|painting)\b/.test(name)) return 'play';
  return 'special_event';
}

const atlantaParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const p = (type) => parts.find((part) => part.type === type)?.value;
  return { date: `${p('year')}-${p('month')}-${p('day')}`, time: `${p('hour')}:${p('minute')}` };
};

// Local wall times retain the provider's stated clock. Explicit UTC timestamps are
// converted to Atlanta. A date-only listing never acquires midnight as its time.
export function eventLocalParts(value) {
  const raw = text(value);
  if (!raw) return null;
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  const normalized = compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}${compact[4] ? `T${compact[4]}:${compact[5]}:${compact[6] ?? '00'}${compact[7] ?? ''}` : ''}`
    : raw.replace(/^(\d{4}-\d{2}-\d{2})(?:EDT|EST)(\d{2}:\d{2})$/i, '$1T$2');
  let result;
  if (/T.*(?:Z|[+]00:?00)$/i.test(normalized)) {
    const instant = new Date(normalized);
    if (!Number.isFinite(instant.getTime())) return null;
    result = atlantaParts(instant);
  } else {
    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:[+-]\d{2}:?\d{2})?)?$/);
    if (!match) return null;
    result = { date: match[1], time: match[2] ? `${match[2]}:${match[3]}` : null };
  }
  const day = new Date(`${result.date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== result.date) return null;
  if (result.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(result.time)) return null;
  return result;
}

export function eventDateParts(value, now = new Date(), maxMonths = 18) {
  const parts = eventLocalParts(value);
  if (!parts) return null;
  const today = atlantaParts(now).date;
  const max = new Date(`${today}T00:00:00Z`);
  max.setUTCMonth(max.getUTCMonth() + maxMonths);
  return parts.date >= today && parts.date <= max.toISOString().slice(0, 10) ? parts : null;
}

export function canonicalEventUrl(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|aff$|fbclid$|gclid$|ref$)/i.test(key)) url.searchParams.delete(key);
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    url.searchParams.sort();
    return url.toString();
  } catch { return null; }
}

const venueKey = (event) => JSON.stringify([normalizeOccurrenceText(event.venue), normalizeOccurrenceText(event.address)]);
const knownTime = (value) => {
  const match = text(value).match(/^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/);
  return match ? `${match[1]}:${match[2]}` : null;
};

export function occurrenceIdentity(event, { city = 'atlanta', sourceUrl = event.sourceUrl } = {}) {
  const raw = object(event.raw);
  const offer = object(Array.isArray(raw.offers) ? raw.offers[0] : raw.offers);
  const page = canonicalEventUrl(sourceUrl);
  const urls = [raw.url, raw['@id'], offer.url, event.ticket, event.sourceUrl].map(canonicalEventUrl).filter(Boolean);
  const eventbrite = urls.map((url) => {
    const parsed = new URL(url);
    return parsed.hostname === 'eventbrite.com'
      ? parsed.pathname.match(/(?:tickets-|\/e\/)(\d{6,})(?:\/|$)/)?.[1] : null;
  }).find(Boolean);
  // A list/calendar URL is not a provider event identifier.
  const eventUrl = urls.find((url) => url !== page) ?? (text(raw.url) && canonicalEventUrl(raw.url) !== page ? canonicalEventUrl(raw.url) : null);
  const provider = eventbrite ? 'eventbrite' : new URL(eventUrl ?? page ?? 'https://unknown.invalid').hostname;
  const providerEventId = eventbrite ?? eventUrl;
  // These explicitly denote a performance/session. An ordinary identifier, @id,
  // parent Eventbrite ticket ID, or event URL is deliberately not a native session ID.
  const native = ['occurrenceId', 'occurrence_id', 'performanceId', 'performance_id', 'sessionId', 'session_id']
    .map((field) => Number.isSafeInteger(raw[field]) && raw[field] >= 0 ? String(raw[field]) : text(raw[field])).find(Boolean) ?? null;
  const providerOccurrenceId = native ? `${provider}:${native}` : null;
  const date = event.date;
  const time = knownTime(event.time);
  const place = venueKey(event);
  const key = JSON.stringify(providerOccurrenceId
    ? ['gt-source-occurrence-v2', normalizeOccurrenceText(city), 'native', providerOccurrenceId]
    : ['gt-source-occurrence-v2', normalizeOccurrenceText(city), provider, providerEventId ?? normalizeOccurrenceText(event.name), date, time ?? 'date_only', place]);
  return { version: 2, key, provider, provider_event_id: providerEventId, provider_occurrence_id: providerOccurrenceId,
    date, time, time_precision: time ? 'exact' : 'date_only', venue_key: place };
}

export const occurrenceHash = async (key) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))]
  .map((byte) => byte.toString(16).padStart(2, '0')).join('');

export async function uniqueOccurrences(events, context) {
  const entries = new Map();
  const conflicts = new Set();
  let rejected = 0;
  for (const event of events) {
    const identity = occurrenceIdentity(event, context);
    const dedupHash = await occurrenceHash(identity.key);
    if (conflicts.has(dedupHash)) { rejected += 1; continue; }
    const prior = entries.get(dedupHash);
    if (prior && JSON.stringify([prior.identity.date, prior.identity.time, prior.identity.venue_key])
      !== JSON.stringify([identity.date, identity.time, identity.venue_key])) {
      entries.delete(dedupHash);
      conflicts.add(dedupHash);
      rejected += 2;
    } else if (!prior) entries.set(dedupHash, { event, identity });
  }
  return { entries, conflicts: conflicts.size, rejected };
}

export function legacyOccurrence(row) {
  const raw = object(row.raw_data);
  const jsonld = object(raw.jsonld);
  const start = eventLocalParts(jsonld.startDate ?? jsonld.startTime);
  return { name: row.event_name, date: start?.date ?? row.event_date, time: start ? start.time : knownTime(row.event_time),
    venue: row.venue_name, address: row.venue_address, sourceUrl: row.source_url, ticket: row.ticket_url, raw: jsonld };
}

export function matchesExistingOccurrence(row, event, identity) {
  if (normalizeOccurrenceText(row.city) !== 'atlanta') return false;
  const existing = legacyOccurrence(row);
  const stored = object(object(row.raw_data).occurrence_identity);
  const previous = occurrenceIdentity(existing, { city: row.city, sourceUrl: row.source_url });
  const previousNativeId = stored.provider_occurrence_id ?? previous.provider_occurrence_id;
  if (identity.provider_occurrence_id && previousNativeId) return identity.provider_occurrence_id === previousNativeId;
  if (existing.date !== identity.date || existing.time !== identity.time || venueKey(existing) !== identity.venue_key) return false;
  const providerId = stored.provider_event_id ?? previous.provider_event_id;
  if (identity.provider_event_id && providerId) return identity.provider === (stored.provider ?? previous.provider) && identity.provider_event_id === providerId;
  return normalizeOccurrenceText(existing.name) === normalizeOccurrenceText(event.name)
    && Boolean(normalizeOccurrenceText(event.venue) || normalizeOccurrenceText(event.address));
}

export class OccurrenceIdentityConflict extends Error {
  constructor(reason) { super(reason); this.name = 'OccurrenceIdentityConflict'; }
}

const EXISTING_FIELDS = 'id,city,event_name,event_date,event_time,venue_name,venue_address,source_id,source_name,source_url,ticket_url,raw_data,is_verified,is_published,published_to_gt,event_type,event_category,description,image_url,organizer,end_date,end_time,ticket_price,legacy_quarantined_at,legacy_quarantine_reason';

export async function findExistingOccurrence(db, event, identity, dedupHash) {
  const lookup = async (configure, limit = 101) => {
    const { data, error } = await configure(db.from('gt_sourced_events').select(EXISTING_FIELDS).ilike('city', 'atlanta')).limit(limit);
    if (error) throw error;
    if ((data ?? []).length >= limit) throw new OccurrenceIdentityConflict('identity_lookup_exceeded_safe_bound');
    return data ?? [];
  };
  const direct = await lookup((q) => q.eq('dedup_hash', dedupHash), 2);
  if (direct.length) {
    if (!matchesExistingOccurrence(direct[0], event, identity)) throw new OccurrenceIdentityConflict('stored_identity_conflicts_with_observation');
    return direct[0];
  }
  const candidates = new Map();
  const add = (rows) => rows.forEach((row) => candidates.set(row.id, row));
  if (identity.provider_occurrence_id) add(await lookup((q) => q.eq('raw_data->occurrence_identity->>provider_occurrence_id', identity.provider_occurrence_id)));
  if (identity.provider === 'eventbrite' && /^\d+$/.test(identity.provider_event_id ?? '')) {
    add(await lookup((q) => q.like('ticket_url', `%tickets-${identity.provider_event_id}%`)));
  } else if (event.ticket && canonicalEventUrl(event.ticket) !== canonicalEventUrl(event.sourceUrl)) {
    add(await lookup((q) => q.eq('ticket_url', event.ticket)));
  }
  const legacyDates = new Set([event.date]);
  const priorInstant = new Date(object(event.raw).startDate ?? '');
  if (Number.isFinite(priorInstant.getTime())) legacyDates.add(priorInstant.toISOString().slice(0, 10));
  const legacyHashes = await Promise.all([...legacyDates].map((date) => occurrenceHash(
    `atlanta|${event.name.toLowerCase().replace(/\W+/g, ' ').trim()}|${date}|${(event.venue ?? '').toLowerCase()}`)));
  add(await lookup((q) => q.in('dedup_hash', legacyHashes)));
  // Literal equality bounds the candidate read. Identity is decided below using
  // city, time/date precision, provider and full venue evidence, never LIMIT 1.
  add(await lookup((q) => q.eq('event_date', event.date).eq('event_name', event.name)));
  const matches = [...candidates.values()].filter((row) => matchesExistingOccurrence(row, event, identity));
  if (matches.length > 1) throw new OccurrenceIdentityConflict('multiple_existing_occurrence_ids');
  return matches[0] ?? null;
}

export function sourcedEventRecord({ event, source, identity, dedupHash, existing = null, observedAt, collectedVia }) {
  const raw = object(existing?.raw_data);
  const confirmations = new Set(values(raw.source_confirmations));
  confirmations.add(source.source_name);
  const sourceIds = new Set(values(raw.source_ids));
  if (existing?.source_id) sourceIds.add(existing.source_id);
  sourceIds.add(source.id);
  const observedRaw = object(event.raw);
  const record = {
    city: 'atlanta', event_name: event.name, event_date: event.date, event_time: event.time,
    end_date: event.endDate, end_time: event.endTime, venue_name: event.venue, venue_address: event.address,
    event_type: event.eventType, event_category: event.category ?? (source.source_type === 'eventbrite' ? 'eventbrite' : null),
    description: event.description, ticket_url: event.ticket, ticket_price: event.price,
    image_url: event.image, organizer: event.organizer,
    source_id: existing?.source_id ?? source.id, source_url: event.sourceUrl,
    source_name: existing?.source_name ?? source.source_name, dedup_hash: dedupHash,
    raw_data: {
      ...raw, jsonld: event.raw, collected_via: collectedVia, source_type: source.source_type,
      source_confirmations: [...confirmations], source_ids: [...sourceIds], timezone: 'America/New_York',
      occurrence_identity: identity, collected_at: observedAt,
      source_observation: { version: 2, observed_at: observedAt, source_id: source.id, source_url: event.sourceUrl,
        method: 'structured_jsonld', location_validation: event.locationReason ?? null,
        category_method: 'bounded_title_or_structured_event_type', editorial_verification: 'not_performed_by_collector',
        facts: structuredObservationFacts(observedRaw) },
    },
    updated_at: observedAt,
  };
  // Keep all existing approval, quarantine, promotion and manual/editorial state.
  // A database trigger may requeue mapped rows on substantive fact changes.
  if (!existing) Object.assign(record, { is_verified: false, is_published: false, published_to_gt: false });
  else {
    const locks = new Set([...values(raw.locked_fields), ...values(raw.manual_fields), ...values(raw.editorial_fields),
      ...Object.keys(object(raw.manual_overrides)), ...Object.keys(object(raw.editorial_overrides))]);
    if (raw.manual_lock === true || raw.editorial_lock === true) {
      Object.keys(record).filter((key) => !['raw_data', 'updated_at', 'dedup_hash'].includes(key)).forEach((key) => locks.add(key));
    }
    for (const key of locks) if (!['raw_data', 'updated_at'].includes(key)) delete record[key];
  }
  return record;
}
