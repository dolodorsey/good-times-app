import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// GOOD TIMES Atlanta venue sourcing (2026-11-09).
// mode=restore  : purged venues return only when their official site is live (2xx), names the venue, no closure/parked text.
// mode=discover : purged venues with no site on file — candidate official domains are tried; a match additionally needs the
//                 venue's street address or phone on the page. Nothing is guessed into the record without that proof.
// mode=signals  : live verified venues — the official site is read for brunch/late night/hookah/rooftop/live music/
//                 date-night language, reservation-platform links and the site's own og:image (the venue's photo).
// Every restore attempt is logged with prior values; SQL functions re-check eligibility under row lock.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const secureEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
};

const isPrivateIp = (host: string) => {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  const p = h.split(".").map(Number);
  if (p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = p;
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return h === "::1" || h === "::" || /^f[cd]/.test(h) || /^fe[89ab]/.test(h);
};

const safeUrl = async (value: string) => {
  try {
    const raw = value.trim();
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || isPrivateIp(host)) return null;
    const res = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
    const addrs = res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    if (!addrs.length || addrs.some(isPrivateIp)) return null;
    return url.toString();
  } catch {
    return null;
  }
};

const fold = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&amp;|&/g, " and ").replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const STOP = new Set(["the", "of", "and", "a", "an", "at", "in", "on", "atl", "atlanta", "ga", "by", "co", "llc", "inc", "restaurant", "bar", "grill", "kitchen", "cafe", "lounge", "club", "hotel"]);

const nameScore = (name: string, text: string, title: string, host: string) => {
  const full = fold(name);
  const hay = ` ${fold(title)} ${text} `;
  if (full && hay.includes(` ${full} `)) return 1;
  const compactHost = host.replace(/^www\./, "").split(".")[0].replace(/[^a-z0-9]/g, "");
  const compactName = full.replace(/ /g, "");
  if (compactName.length >= 5 && (compactHost.includes(compactName) || compactName.includes(compactHost) && compactHost.length >= 5)) return 1;
  const tokens = full.split(" ").filter((t) => t.length > 1 && !STOP.has(t));
  const use = tokens.length ? tokens : full.split(" ").filter(Boolean);
  if (!use.length) return 0;
  const hits = use.filter((t) => hay.includes(` ${t} `) || compactHost.includes(t)).length;
  return Math.round((hits / use.length) * 100) / 100;
};

const CLOSED = [
  /permanently closed/, /closed permanently/, /we (?:have|ve) (?:officially )?closed/, /has (?:officially |permanently )?closed (?:its|our) doors/,
  /clos(?:ed|ing) our doors/, /(?:last|final) day of (?:service|business)/, /no longer (?:open|in business|operating)/, /ceased operations/,
  /temporarily closed/, /closed until further notice/,
];
const PARKED = [/this domain (?:is|may be) for sale/, /buy this domain/, /domain (?:is )?parked/, /parked free/, /website coming soon/, /account (?:has been )?suspended/];

const extract = (html: string) => {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const og = html.match(/<meta[^>]+property=["']og:(?:site_name|title)["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  return { title: `${title} ${og}`.trim(), text: fold(`${og} ${body}`).slice(0, 400_000) };
};

const readCapped = async (res: Response, cap = 2_000_000) => {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < cap) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.length;
  }
  try { await reader.cancel(); } catch { /* ignore */ }
  const all = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) { all.set(c.subarray(0, Math.min(c.length, size - o)), o); o += c.length; if (o >= size) break; }
  return new TextDecoder().decode(all);
};


type Venue = { venue_id: string; name: string; website: string | null; address: string | null; phone: string | null; mode: string };
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 GoodTimesVenueVerifier/4.0";

const fetchPage = async (raw: string, timeoutMs = 12_000) => {
  const url = await safeUrl(raw);
  if (!url) return { http: 0, finalUrl: raw, html: "", error: "unsafe_or_unresolvable_url" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" } });
    const finalUrl = res.url || url;
    if (res.status < 200 || res.status > 299) { try { await res.body?.cancel(); } catch { /* */ } return { http: res.status, finalUrl, html: "", error: `http_${res.status}` }; }
    const ct = res.headers.get("content-type") ?? "";
    if (ct && !/html|xml|text/i.test(ct)) { try { await res.body?.cancel(); } catch { /* */ } return { http: res.status, finalUrl, html: "", error: "non_html" }; }
    return { http: res.status, finalUrl, html: await readCapped(res), error: null as string | null };
  } catch (e) {
    return { http: 0, finalUrl: url, html: "", error: `fetch_error:${e instanceof Error ? e.message.slice(0, 100) : "unknown"}` };
  } finally { clearTimeout(timer); }
};

const verdict = (venue: Venue, page: { http: number; finalUrl: string; html: string; error: string | null }) => {
  if (page.error) return { score: 0, closed: null as string | null, title: "", text: "", passed: false, reason: page.error };
  const { title, text } = extract(page.html);
  const host = new URL(page.finalUrl).hostname.toLowerCase();
  const score = nameScore(venue.name, ` ${text} `, title, host);
  const closedHit = CLOSED.find((r) => r.test(text))?.source ?? null;
  const parkedHit = PARKED.find((r) => r.test(text))?.source ?? null;
  const closed = closedHit ? `closed:${closedHit}` : parkedHit ? `parked:${parkedHit}` : null;
  // Script-rendered sites (Toast, Wix, Squarespace) carry little server text; the full venue name in the official
  // page title/og:site_name on a 2xx response is still first-party proof the site is live.
  const titleHit = fold(title).includes(fold(venue.name)) && fold(venue.name).length >= 4;
  const passed = !closed && ((score >= 0.6 && text.length > 200) || (titleHit && text.length > 20));
  const reason = passed ? (text.length > 200 ? "official_site_live_name_match" : "official_site_title_match") : closed ? "closure_or_parked_signal" : text.length <= 200 ? "page_has_no_readable_content" : "venue_name_not_found_on_site";
  return { score, closed, title, text, passed, reason };
};

const contactMatch = (venue: Venue, html: string, text: string) => {
  const addr = fold(venue.address ?? "");
  const m = addr.match(/^(\d{2,6}) ([a-z0-9]+)/);
  if (m && text.indexOf(` ${m[1]} ${m[2]}`) >= 0) return true;
  const digits = String(venue.phone ?? "").replace(/\D/g, "").slice(-7);
  if (digits.length === 7 && html.replace(/\D/g, "").includes(digits)) return true;
  return false;
};

const SIGNALS: [string, RegExp][] = [
  ["brunch", / brunch /], ["breakfast", / breakfast /], ["lunch", / lunch /], ["dinner", / dinner /],
  ["late_night", / late night | open late | (?:until|till|til) (?:2|3|4)(?: 00)? ?am | (?:2|3|4) 00 am /],
  ["happy_hour", / happy hour /], ["hookah", / hookah /], ["rooftop", / roof ?top /], ["patio", / patio /],
  ["live_music", / live music | live band | live entertainment | jazz night /], ["dj", / dj | djs /],
  ["date_night", / date night | romantic | intimate /], ["private_events", / private events? | private dining | buyouts? /],
  ["bottle_service", / bottle service | vip tables? /], ["birthday", / birthdays? /], ["group_dining", / large parties | group dining /],
];
const BOOKING = /https:\/\/(?:www\.)?(?:resy\.com|opentable\.com|sevenrooms\.com|exploretock\.com|tablelist\.com|yelp\.com\/reservations)[^"'\s<>)]*/i;

const absolutize = (u: string, base: string) => { try { return new URL(u.replace(/&amp;/g, "&"), base).toString(); } catch { return null; } };
const imageOk = async (u: string) => {
  const safe = await safeUrl(u);
  if (!safe) return { ok: false, why: "unsafe" };
  for (const method of ["HEAD", "GET"]) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(safe, { method, redirect: "follow", signal: ctrl.signal, headers: { "user-agent": UA, accept: "image/avif,image/webp,image/*;q=0.9", ...(method === "GET" ? { range: "bytes=0-0" } : {}) } });
      const ct = r.headers.get("content-type") ?? "";
      const total = Number((r.headers.get("content-range") ?? "").split("/")[1] || r.headers.get("content-length") || 0);
      try { await r.body?.cancel(); } catch { /* */ }
      if (r.status >= 200 && r.status < 300) {
        const typed = /^image\/(?!svg|gif)/i.test(ct) || (!ct && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(safe));
        // PNG share images are usually logos/wordmarks; only accept large PNGs (photographic) or JPEG/WebP/AVIF photos.
        const png = /png/i.test(ct) || (!ct && /\.png(\?|$)/i.test(safe));
        if (typed && (png ? total > 300_000 : (!total || total > 15_000))) return { ok: true, url: r.url || safe, why: "ok" };
        return { ok: false, why: `type:${ct}|size:${total}` };
      }
      if (method === "GET") return { ok: false, why: `http_${r.status}` };
    } catch (e) { if (method === "GET") return { ok: false, why: `err:${e instanceof Error ? e.message.slice(0, 60) : "x"}` }; } finally { clearTimeout(t); }
  }
  return { ok: false, why: "unreachable" };
};
const officialImage = async (html: string, base: string, debug: string[] = []) => {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const tags: string[] = [];
  for (const m of metas) {
    if (!/(?:property|name)=["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["']/i.test(m)) continue;
    const c = m.match(/content=["']([^"']+)["']/i)?.[1];
    if (c) tags.push(c);
  }
  for (const raw of [...new Set(tags)]) {
    const u = absolutize(raw.trim(), base);
    if (!u) { debug.push(`bad:${raw.slice(0, 60)}`); continue; }
    const https = u.replace(/^http:\/\//i, "https://");
    if (/favicon|placeholder|spacer|blank\.|logo|wordmark|brandmark|badge|merch|icon|\.svg(\?|$)|\.gif(\?|$)/i.test(https)) { debug.push(`skip:${https.slice(0, 80)}`); continue; }
    const r = await imageOk(https);
    debug.push(`${r.ok ? "ok" : "no"}:${r.why}:${https.slice(0, 80)}`);
    if (r.ok && r.url) return r.url;
  }
  if (!tags.length) debug.push("no_og_image");
  return null;
};

const readSignals = async (venue: Venue, first: { finalUrl: string; html: string }) => {
  const pages = [first.finalUrl];
  let html = first.html;
  const base = new URL(first.finalUrl);
  const links = [...first.html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi)]
    .map((m) => ({ href: absolutize(m[1], first.finalUrl), label: fold(m[2].replace(/<[^>]+>/g, " ")) }))
    .filter((l) => { try { return l.href && new URL(l.href).hostname.replace(/^www\./, "") === base.hostname.replace(/^www\./, ""); } catch { return false; } })
    .filter((l) => /menu|brunch|hours|reserv|events?|about/.test(`${l.label} ${l.href}`.toLowerCase()));
  const seen = new Set([first.finalUrl]);
  for (const l of links) {
    if (pages.length >= 3) break;
    if (!l.href || seen.has(l.href)) continue;
    seen.add(l.href);
    const p = await fetchPage(l.href, 9000);
    if (!p.error && p.html) { pages.push(p.finalUrl); html += "\n" + p.html; }
  }
  const text = ` ${extract(html).text} `;
  const signals = SIGNALS.filter(([, r]) => r.test(text)).map(([k]) => k);
  const booking = html.match(BOOKING)?.[0]?.replace(/&amp;/g, "&") ?? null;
  const debug: string[] = [];
  const image = await officialImage(first.html, first.finalUrl, debug);
  return { pages, signals, booking, image, debug };
};

const domainGuesses = (name: string) => {
  const f = fold(name).replace(/ (atlanta|atl|ga)$/, "");
  const compact = f.replace(/^the /, "").replace(/ /g, "");
  const hyphen = f.replace(/^the /, "").replace(/ /g, "-");
  if (compact.length < 4) return [];
  return [...new Set([`https://${compact}.com`, `https://www.${compact}atl.com`, `https://www.${compact}atlanta.com`, `https://${hyphen}.com`, `https://eat${compact}.com`])];
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "server_configuration_missing" }, 500);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: cred } = await db.from("credentials").select("credential_value").eq("credential_key", "gt_atlanta_source_internal").eq("is_active", true).maybeSingle();
  const expected = typeof cred?.credential_value?.api_key === "string" ? cred.credential_value.api_key : typeof cred?.credential_value?.key === "string" ? cred.credential_value.key : "";
  if (!secureEqual(req.headers.get("x-khg-internal-key") ?? "", expected)) return json({ ok: false, error: "unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  const mode = String(body.mode ?? "restore");
  const limit = Math.min(Math.max(Number(body.limit ?? 20), 1), 40);
  const rpc = mode === "signals" ? "gt_venue_signal_candidates_v1" : "gt_venue_restore_candidates_v1";
  const { data: rows, error } = await db.rpc(rpc, { p_limit: limit });
  if (error) return json({ ok: false, error: "candidate_query_failed", detail: error.message }, 500);
  let list = (rows ?? []) as Venue[];
  if (mode === "restore") list = list.filter((v) => v.mode === "restore");
  if (mode === "discover") list = list.filter((v) => v.mode === "discover");

  const applySignals = async (v: Venue, page: { finalUrl: string; html: string }) => {
    const s = await readSignals(v, page);
    const { error: e } = await db.rpc("gt_apply_venue_site_signals_v1", {
      p_venue_id: v.venue_id, p_source_url: page.finalUrl, p_pages: s.pages, p_signals: s.signals, p_booking_link: s.booking,
      p_evidence: { official_image: s.image, image_debug: s.debug.slice(0, 4), checked_by: "gt-atlanta-venue-source", pages: s.pages },
    });
    return { signals: s.signals, booking: s.booking, image: s.image, image_debug: s.debug.slice(0, 4), signal_error: e?.message ?? null };
  };

  const work = async (v: Venue) => {
    if (mode === "signals") {
      const page = await fetchPage(v.website ?? "");
      if (page.error) {
        await db.rpc("gt_apply_venue_site_signals_v1", { p_venue_id: v.venue_id, p_source_url: page.finalUrl, p_pages: [], p_signals: [], p_booking_link: null, p_evidence: { error: page.error } });
        return { name: v.name, mode, ok: false, reason: page.error };
      }
      return { name: v.name, mode, ok: true, ...(await applySignals(v, page)) };
    }
    if (v.mode === "restore") {
      const page = await fetchPage(v.website ?? "");
      const r = verdict(v, page);
      const contact = page.html ? contactMatch(v, page.html, ` ${r.text} `) : false;
      const { data, error: e } = await db.rpc("gt_apply_venue_site_restore_v1", {
        p_venue_id: v.venue_id, p_mode: "restore", p_http_status: page.http, p_final_url: page.finalUrl, p_name_match_score: r.score,
        p_closed_signal: r.closed, p_page_title: r.title, p_contact_match: contact, p_passed: r.passed, p_reason: r.reason,
      });
      const restored = Boolean((data as { ok?: boolean } | null)?.ok);
      const extra = restored ? await applySignals(v, page) : {};
      return { name: v.name, mode: "restore", restored, score: r.score, reason: e ? `apply_error:${e.message}` : r.reason, ...extra };
    }
    let last = { reason: "no_domain_candidates", http: 0, url: "", score: 0 };
    for (const guess of domainGuesses(v.name)) {
      const page = await fetchPage(guess, 8000);
      if (page.error) { last = { reason: page.error, http: page.http, url: guess, score: 0 }; continue; }
      const r = verdict(v, page);
      const contact = contactMatch(v, page.html, ` ${r.text} `);
      last = { reason: contact ? r.reason : "address_or_phone_not_on_page", http: page.http, url: page.finalUrl, score: r.score };
      if (r.passed && r.score >= 0.8 && contact) {
        const { data } = await db.rpc("gt_apply_venue_site_restore_v1", {
          p_venue_id: v.venue_id, p_mode: "discover", p_http_status: page.http, p_final_url: page.finalUrl, p_name_match_score: r.score,
          p_closed_signal: r.closed, p_page_title: r.title, p_contact_match: true, p_passed: true, p_reason: "discovered_official_site_with_contact_match",
        });
        const restored = Boolean((data as { ok?: boolean } | null)?.ok);
        const extra = restored ? await applySignals(v, page) : {};
        return { name: v.name, mode: "discover", restored, url: page.finalUrl, score: r.score, ...extra };
      }
    }
    await db.rpc("gt_apply_venue_site_restore_v1", {
      p_venue_id: v.venue_id, p_mode: "discover", p_http_status: last.http, p_final_url: last.url || null, p_name_match_score: last.score,
      p_closed_signal: null, p_page_title: null, p_contact_match: false, p_passed: false, p_reason: `discover_failed:${last.reason}`,
    });
    return { name: v.name, mode: "discover", restored: false, reason: last.reason };
  };

  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < list.length; i += 6) results.push(...await Promise.all(list.slice(i, i + 6).map(work)));
  try { await db.rpc("gt_refresh_date_night_tags_v1"); } catch { /* */ }
  return json({ ok: true, mode, checked: results.length, restored: results.filter((r) => r.restored).length,
    with_image: results.filter((r) => r.image).length, results, completed_at: new Date().toISOString() });
});
