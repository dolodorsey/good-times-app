import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_ROWS = 100;
const MAX_BODY_BYTES = 1_000_000;

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,x-khg-internal-key",
  "access-control-allow-methods": "POST,OPTIONS",
  "cache-control": "no-store",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

const text = (value: unknown, max = 500): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const nullableText = (value: unknown, max = 500): string | null => {
  const output = text(value, max);
  return output || null;
};

const integer = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.min(Math.trunc(parsed), 2_147_483_647), -1);
};

const boolean = (value: unknown): boolean => value === true;

const isoDateTime = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isoDate = (value: unknown): string => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
};

const stringArray = (value: unknown, maxItems = 50, maxLength = 80): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
};

const secureEqual = (a: string, b: string): boolean => {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
};

const sanitizeProfile = (row: Record<string, unknown>) => ({
  username: text(row.username, 100).replace(/^@/, "").toLowerCase(),
  snapshot_date: isoDate(row.snapshot_date),
  full_name: nullableText(row.full_name, 200),
  bio: nullableText(row.bio, 500),
  follower_count: integer(row.follower_count),
  following_count: integer(row.following_count),
  post_count: integer(row.post_count),
  is_verified: boolean(row.is_verified),
  is_business: boolean(row.is_business),
  business_category: nullableText(row.business_category, 150),
  contact_email: nullableText(row.contact_email, 254),
  contact_phone: nullableText(row.contact_phone, 50),
  external_url: nullableText(row.external_url, 1000),
  profile_pic_url: nullableText(row.profile_pic_url, 1500),
  city: nullableText(row.city, 100),
  scraped_via: nullableText(row.scraped_via, 100) ?? "gt_secure_ingest",
});

const sanitizePost = (row: Record<string, unknown>) => ({
  username: text(row.username, 100).replace(/^@/, "").toLowerCase(),
  post_id: text(row.post_id, 150),
  post_url: text(row.post_url, 1500),
  post_type: nullableText(row.post_type, 50),
  caption: nullableText(row.caption, 5000),
  like_count: integer(row.like_count),
  comment_count: integer(row.comment_count),
  view_count: integer(row.view_count),
  share_count: integer(row.share_count),
  posted_at: isoDateTime(row.posted_at),
  hashtags: stringArray(row.hashtags),
  location_name: nullableText(row.location_name, 300),
  location_id: nullableText(row.location_id, 150),
  is_sponsored: boolean(row.is_sponsored),
  scraped_at: isoDateTime(row.scraped_at) ?? new Date().toISOString(),
  scraped_via: nullableText(row.scraped_via, 100) ?? "gt_secure_ingest",
});

const sanitizeHashtagResult = (row: Record<string, unknown>) => ({
  hashtag: text(row.hashtag, 100).replace(/^#/, "").toLowerCase(),
  post_id: nullableText(row.post_id, 150),
  post_url: text(row.post_url, 1500),
  username: text(row.username, 100).replace(/^@/, "").toLowerCase(),
  like_count: integer(row.like_count),
  comment_count: integer(row.comment_count),
  view_count: integer(row.view_count),
  post_type: nullableText(row.post_type, 50),
  caption: nullableText(row.caption, 5000),
  posted_at: isoDateTime(row.posted_at),
  scraped_at: isoDateTime(row.scraped_at) ?? new Date().toISOString(),
  scraped_via: nullableText(row.scraped_via, 100) ?? "gt_secure_ingest",
});

const sanitizeLocationResult = (row: Record<string, unknown>) => ({
  location_name: text(row.location_name, 300),
  location_id: nullableText(row.location_id, 150),
  post_id: nullableText(row.post_id, 150),
  post_url: text(row.post_url, 1500),
  username: text(row.username, 100).replace(/^@/, "").toLowerCase(),
  like_count: integer(row.like_count),
  comment_count: integer(row.comment_count),
  view_count: integer(row.view_count),
  caption: nullableText(row.caption, 5000),
  posted_at: isoDateTime(row.posted_at),
  scraped_at: isoDateTime(row.scraped_at) ?? new Date().toISOString(),
  scraped_via: nullableText(row.scraped_via, 100) ?? "gt_secure_ingest",
});

const sanitizeScrapeJob = (row: Record<string, unknown>) => ({
  job_type: text(row.job_type, 100) || "secure_ingest",
  target: nullableText(row.target, 300),
  target_handle: nullableText(row.target_handle, 100),
  status: text(row.status, 50) || "completed",
  records_found: integer(row.records_found),
  handles_attempted: integer(row.handles_attempted),
  profiles_scraped: integer(row.profiles_scraped),
  posts_scraped: integer(row.posts_scraped),
  errors: row.errors && typeof row.errors === "object" ? row.errors : [],
  error_message: nullableText(row.error_message, 2000),
  scraped_via: nullableText(row.scraped_via, 100) ?? "gt_secure_ingest",
  started_at: isoDateTime(row.started_at),
  completed_at: isoDateTime(row.completed_at) ?? new Date().toISOString(),
  collector: nullableText(row.collector, 100) ?? "khg_ig_scraper",
  result_counts: row.result_counts && typeof row.result_counts === "object" ? row.result_counts : {},
});

const configurations = {
  profile_snapshots: {
    table: "ig_profile_snapshots",
    conflict: "username,snapshot_date",
    sanitize: sanitizeProfile,
    valid: (row: ReturnType<typeof sanitizeProfile>) => Boolean(row.username),
  },
  post_metadata: {
    table: "ig_post_metadata",
    conflict: "post_id",
    sanitize: sanitizePost,
    valid: (row: ReturnType<typeof sanitizePost>) => Boolean(row.username && row.post_id && row.post_url),
  },
  hashtag_results: {
    table: "ig_hashtag_results",
    conflict: "hashtag,post_url",
    sanitize: sanitizeHashtagResult,
    valid: (row: ReturnType<typeof sanitizeHashtagResult>) => Boolean(row.hashtag && row.post_url && row.username),
  },
  location_results: {
    table: "ig_location_results",
    conflict: "location_name,post_url",
    sanitize: sanitizeLocationResult,
    valid: (row: ReturnType<typeof sanitizeLocationResult>) => Boolean(row.location_name && row.post_url && row.username),
  },
} as const;

type Dataset = keyof typeof configurations | "scrape_job";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { ok: false, error: "server_configuration_missing" });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json(413, { ok: false, error: "payload_too_large" });

  const database = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const suppliedKey = request.headers.get("x-khg-internal-key") ?? "";
  const { data: credential, error: credentialError } = await database
    .from("credentials")
    .select("credential_value")
    .eq("credential_key", "gt_atlanta_source_internal")
    .eq("is_active", true)
    .maybeSingle();

  const expectedKey = typeof credential?.credential_value?.api_key === "string"
    ? credential.credential_value.api_key
    : "";

  if (credentialError || !secureEqual(suppliedKey, expectedKey)) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const action = text(body.action, 50).toLowerCase();

  if (action === "get_targets") {
    const [brands, competitors, hashtags, locations, cultureSources] = await Promise.all([
      database.from("brand_social_handles")
        .select("brand_key,brand_display_name,ig_handle")
        .not("ig_handle", "is", null)
        .eq("posting_paused", false)
        .limit(500),
      database.from("ig_competitors")
        .select("username,brand_key,category,city")
        .eq("is_active", true)
        .limit(1000),
      database.from("ig_hashtag_watchlist")
        .select("hashtag,category,city")
        .eq("is_active", true)
        .limit(1000),
      database.from("ig_location_watchlist")
        .select("location_id,location_name,city,category")
        .eq("is_active", true)
        .limit(1000),
      database.from("gt_culture_sources")
        .select("instagram_handle,display_name,source_type,authority_score,city_key")
        .eq("is_active", true)
        .limit(1000),
    ]);

    const failure = [brands, competitors, hashtags, locations, cultureSources].find((result) => result.error);
    if (failure?.error) return json(500, { ok: false, error: "target_query_failed" });

    return json(200, {
      ok: true,
      targets: {
        brands: brands.data ?? [],
        competitors: competitors.data ?? [],
        hashtags: hashtags.data ?? [],
        locations: locations.data ?? [],
        culture_sources: cultureSources.data ?? [],
      },
    });
  }

  if (action === "process") {
    const limit = Math.max(1, Math.min(integer(body.limit, 5000), 20000));
    const { data, error } = await database.rpc("gt_refresh_instagram_social_signals", {
      p_city_key: "atlanta",
      p_limit: limit,
      p_dry_run: false,
    });
    if (error) return json(500, { ok: false, error: "signal_processing_failed" });
    return json(200, { ok: true, result: data ?? [] });
  }

  if (action !== "ingest") return json(400, { ok: false, error: "unsupported_action" });

  const dataset = text(body.dataset, 50) as Dataset;
  const inputRows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];
  if (!dataset || inputRows.length === 0) return json(400, { ok: false, error: "dataset_and_rows_required" });

  if (dataset === "scrape_job") {
    const rows = inputRows
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
      .map(sanitizeScrapeJob);
    if (rows.length === 0) return json(400, { ok: false, error: "no_valid_rows" });

    const { error } = await database.from("ig_scrape_jobs").insert(rows);
    if (error) return json(500, { ok: false, error: "ingest_failed", dataset });
    return json(200, { ok: true, dataset, accepted: rows.length });
  }

  const configuration = configurations[dataset as keyof typeof configurations];
  if (!configuration) return json(400, { ok: false, error: "unsupported_dataset" });

  const rows = inputRows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .map((row) => configuration.sanitize(row as never))
    .filter((row) => configuration.valid(row as never));

  if (rows.length === 0) return json(400, { ok: false, error: "no_valid_rows" });

  const { error } = await database
    .from(configuration.table)
    .upsert(rows, { onConflict: configuration.conflict, ignoreDuplicates: false });

  if (error) return json(500, { ok: false, error: "ingest_failed", dataset });
  return json(200, { ok: true, dataset, accepted: rows.length });
});
