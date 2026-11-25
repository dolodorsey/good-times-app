import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Strict official-site re-verification for PREVIOUSLY VERIFIED Atlanta venues whose freshness window lapsed.
// A venue is renewed only when: official site returns 2xx, the page names the venue, and no closure/parked signal
// appears. Every attempt is logged to gt_venue_reverification_log with prior values (reversible). Never upgrades
// unverified inventory; the SQL function re-checks record eligibility under row lock.

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
    const url = new URL(value.trim());
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
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&amp;|&/g, " and ").replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

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

const check = async (venue: { venue_id: string; name: string; website: string }) => {
  const url = await safeUrl(venue.website);
  if (!url) return { http: 0, finalUrl: venue.website, score: 0, closed: null, title: "", passed: false, reason: "unsafe_or_unresolvable_url" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 GoodTimesVenueVerifier/3.0",
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
    });
    const finalUrl = res.url || url;
    if (res.status < 200 || res.status > 299) { try { await res.body?.cancel(); } catch { /* */ } return { http: res.status, finalUrl, score: 0, closed: null, title: "", passed: false, reason: `http_${res.status}` }; }
    const html = await readCapped(res);
    const { title, text } = extract(html);
    const host = new URL(finalUrl).hostname.toLowerCase();
    const score = nameScore(venue.name, ` ${text} `, title, host);
    const closedHit = CLOSED.find((r) => r.test(text))?.source ?? null;
    const parkedHit = PARKED.find((r) => r.test(text))?.source ?? null;
    const signal = closedHit ? `closed:${closedHit}` : parkedHit ? `parked:${parkedHit}` : null;
    const passed = score >= 0.6 && !signal && text.length > 200;
    const reason = passed ? "official_site_live_name_match" : signal ? "closure_or_parked_signal" : text.length <= 200 ? "page_has_no_readable_content" : "venue_name_not_found_on_site";
    return { http: res.status, finalUrl, score, closed: signal, title, passed, reason };
  } catch (e) {
    return { http: 0, finalUrl: url, score: 0, closed: null, title: "", passed: false, reason: `fetch_error:${e instanceof Error ? e.message.slice(0, 120) : "unknown"}` };
  } finally {
    clearTimeout(timer);
  }
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
  const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 40);
  const { data: venues, error } = await db.rpc("gt_venue_reverification_candidates_v1", { p_limit: limit });
  if (error) return json({ ok: false, error: "candidate_query_failed", detail: error.message }, 500);

  const results: Record<string, unknown>[] = [];
  const list = (venues ?? []) as { venue_id: string; name: string; website: string }[];
  for (let i = 0; i < list.length; i += 6) {
    const batch = list.slice(i, i + 6);
    results.push(...await Promise.all(batch.map(async (v) => {
      const r = await check(v);
      const { data, error: applyError } = await db.rpc("gt_apply_venue_site_reverification_v1", {
        p_venue_id: v.venue_id, p_http_status: r.http, p_final_url: r.finalUrl, p_name_match_score: r.score,
        p_closed_signal: r.closed, p_page_title: r.title, p_passed: r.passed, p_reason: r.reason,
      });
      return { venue_id: v.venue_id, name: v.name, http: r.http, score: r.score, renewed: Boolean((data as { ok?: boolean } | null)?.ok), reason: applyError ? `apply_error:${applyError.message}` : r.reason };
    })));
  }
  return json({ ok: true, city: "atlanta", checked: results.length, renewed: results.filter((r) => r.renewed).length, results, completed_at: new Date().toISOString() });
});
