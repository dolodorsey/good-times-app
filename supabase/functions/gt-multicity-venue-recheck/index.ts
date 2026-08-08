import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED = new Set([
  "houston", "los_angeles", "miami", "charlotte", "washington_dc",
  "dallas", "new_york", "phoenix", "scottsdale", "las_vegas",
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const secureEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
};
const cleanUrl = (value: string) => {
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
};
const checkSite = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; GoodTimesVenueVerifier/1.0; +https://thegoodtimesworldwide.com)",
        accept: "text/html,application/xhtml+xml,*/*;q=0.5",
      },
    });
    try { await response.body?.cancel(); } catch {}
    return { ok: response.ok, status: response.status, final_url: response.url || url };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      final_url: url,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
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
  try { body = await req.json(); } catch {}
  const city = typeof body.city_key === "string"
    ? body.city_key.toLowerCase().trim().replace(/[\s-]+/g, "_")
    : "";
  if (city === "atlanta") return json({ ok: false, error: "atlanta_is_intentionally_excluded" }, 409);
  if (!ALLOWED.has(city)) return json({ ok: false, error: "unsupported_city" }, 400);

  const limit = Math.min(Math.max(Number(body.limit ?? 12), 1), 20);
  const { data: venues, error } = await db
    .from("gt_venues")
    .select("id,name,website,metadata,enriched_at,updated_at")
    .eq("city_key", city)
    .eq("status", "active")
    .eq("is_verified", true)
    .not("website", "is", null)
    .order("enriched_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) return json({ ok: false, error: "venue_query_failed", detail: error.message }, 500);

  const results: unknown[] = [];
  let checked = 0;
  let refreshed = 0;
  let failed = 0;

  for (const venue of venues ?? []) {
    const url = cleanUrl(venue.website);
    if (!url) {
      results.push({ id: venue.id, name: venue.name, ok: false, error: "invalid_url" });
      failed++;
      continue;
    }
    checked++;
    const result = await checkSite(url);
    if (result.ok) {
      const metadata = venue.metadata && typeof venue.metadata === "object" ? venue.metadata : {};
      const now = new Date().toISOString();
      const { error: updateError } = await db.from("gt_venues").update({
        enriched_at: now,
        updated_at: now,
        enrichment_status: "verified",
        enrichment_source: "direct_website_recheck",
        metadata: {
          ...metadata,
          direct_website_recheck: { checked_at: now, status: result.status, final_url: result.final_url },
        },
      }).eq("id", venue.id);
      if (updateError) {
        failed++;
        results.push({ id: venue.id, name: venue.name, ok: false, error: updateError.message });
      } else {
        refreshed++;
        results.push({ id: venue.id, name: venue.name, ok: true, status: result.status, final_url: result.final_url });
      }
    } else {
      failed++;
      results.push({ id: venue.id, name: venue.name, ok: false, status: result.status, error: result.error ?? "site_unavailable" });
    }
  }

  return json({ ok: true, city, checked, refreshed, failed, completed_at: new Date().toISOString(), results });
});
