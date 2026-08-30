import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type QueueVenue = {
  venue_id: string;
  name: string;
  website: string;
  venue_status: string | null;
  verification_status: string | null;
  consecutive_failures: number | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const secureEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
};

const isPrivateIpv4 = (host: string) => {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
};

const isPrivateIp = (host: string) => {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (isPrivateIpv4(normalized)) return true;
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
};

const cleanUrl = async (value: string) => {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const hostname = url.hostname.toLowerCase();
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || isPrivateIp(hostname)) return null;

    // Reject DNS targets that resolve into loopback/private/link-local networks.
    // This keeps database-controlled website checks from becoming an SSRF path.
    const resolutions = await Promise.allSettled([
      Deno.resolveDns(hostname, "A"),
      Deno.resolveDns(hostname, "AAAA"),
    ]);
    const addresses = resolutions.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (addresses.length === 0 || addresses.some((address) => isPrivateIp(address))) return null;
    return url.toString();
  } catch {
    return null;
  }
};

const checkSite = async (rawUrl: string) => {
  const safeUrl = await cleanUrl(rawUrl);
  if (!safeUrl) return { reachable: false, status: 0, finalUrl: rawUrl, error: "unsafe_or_unresolvable_url" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(safeUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; GoodTimesVenueVerifier/2.0; +https://thegoodtimesworldwide.com)",
        accept: "text/html,application/xhtml+xml,*/*;q=0.5",
      },
    });
    try { await response.body?.cancel(); } catch { /* no-op */ }
    const reachable = response.status > 0 && response.status < 500;
    return {
      reachable,
      status: response.status,
      finalUrl: response.url || safeUrl,
      error: reachable ? null : `http_${response.status}`,
    };
  } catch (error) {
    return {
      reachable: false,
      status: 0,
      finalUrl: safeUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
};

const nextCheckAt = (reachable: boolean, status: number, failures: number) => {
  const now = Date.now();
  if (reachable) return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  if (status >= 500) return new Date(now + 6 * 60 * 60 * 1000).toISOString();
  const hours = Math.min(24, Math.max(1, 2 ** Math.min(failures, 4)));
  return new Date(now + hours * 60 * 60 * 1000).toISOString();
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "server_configuration_missing" }, 500);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: credential, error: credentialError } = await db
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
  if (credentialError || !secureEqual(req.headers.get("x-khg-internal-key") ?? "", expected)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* defaults are safe */ }
  const limit = Math.min(Math.max(Number(body.limit ?? 20), 1), 20);
  const nowIso = new Date().toISOString();

  const { data: venues, error: queueError } = await db
    .from("gt_atlanta_venue_recheck_queue")
    .select("venue_id,name,website,venue_status,verification_status,consecutive_failures")
    .lte("next_check_at", nowIso)
    .order("priority_score", { ascending: false })
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (queueError) return json({ ok: false, error: "queue_query_failed", detail: queueError.message }, 500);

  const processVenue = async (venue: QueueVenue) => {
    const result = await checkSite(venue.website);
    const previousFailures = Number(venue.consecutive_failures ?? 0);
    const failures = result.reachable ? 0 : previousFailures + 1;
    const checkedAt = new Date().toISOString();
    const { error: stateError } = await db.from("gt_venue_recheck_state").upsert({
      venue_id: venue.venue_id,
      city_key: "atlanta",
      last_checked_at: checkedAt,
      last_http_status: result.status || null,
      last_final_url: result.finalUrl,
      last_ok: result.reachable,
      consecutive_failures: failures,
      last_error: result.error,
      next_check_at: nextCheckAt(result.reachable, result.status, failures),
      updated_at: checkedAt,
    }, { onConflict: "venue_id" });

    return {
      venue_id: venue.venue_id,
      name: venue.name,
      reachable: result.reachable,
      http_status: result.status,
      final_url: result.finalUrl,
      state_saved: !stateError,
      error: stateError?.message ?? result.error,
    };
  };

  const results: Awaited<ReturnType<typeof processVenue>>[] = [];
  const batchSize = 5;
  for (let i = 0; i < (venues ?? []).length; i += batchSize) {
    const batch = (venues ?? []).slice(i, i + batchSize) as QueueVenue[];
    results.push(...await Promise.all(batch.map(processVenue)));
  }

  const reachable = results.filter((item) => item.reachable && item.state_saved).length;
  const failed = results.filter((item) => !item.reachable || !item.state_saved).length;
  return json({
    ok: true,
    city: "atlanta",
    checked: results.length,
    reachable,
    failed,
    completed_at: new Date().toISOString(),
    results,
    note: "Website reachability is evidence only; this worker never marks venue operating status verified.",
  });
});
