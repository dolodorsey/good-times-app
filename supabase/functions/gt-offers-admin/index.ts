import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// FREE IN THE A admin API (queue, create/edit, verify/approve/reject/flag/feature/expire, metrics).
// Auth: x-gt-admin-key must equal credentials.gt_free_in_the_a_admin. Approval still requires verification
// (enforced by the gt_offers trigger), so nothing can be published unverified even from here.
const ORIGINS = new Set(["https://thegoodtimesworldwide.com", "https://www.thegoodtimesworldwide.com", "https://good-times-app.vercel.app", "http://127.0.0.1:4180"]);
const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin && (ORIGINS.has(origin) || /^https:\/\/good-times-app-[a-z0-9-]+\.vercel\.app$/.test(origin)) ? origin : "https://thegoodtimesworldwide.com",
  "access-control-allow-headers": "content-type,x-gt-admin-key",
  "access-control-allow-methods": "POST,OPTIONS",
  vary: "origin",
});
const secureEqual = (a: string, b: string) => { if (!a || !b || a.length !== b.length) return false; let m = 0; for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i); return m === 0; };
const FIELDS = ["title","description","category","offer_type","merchant_name","venue_id","show_id","image_url","location","participating_locations","actual_value","requirements","claim_method","claim_url","redemption_instructions","source_url","source_type","starts_at","expires_at","city_key"];

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, "content-type": "application/json", "cache-control": "no-store" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: cred } = await db.from("credentials").select("credential_value").eq("credential_key", "gt_free_in_the_a_admin").eq("is_active", true).maybeSingle();
  const expected = String(cred?.credential_value?.api_key ?? "");
  if (!secureEqual(req.headers.get("x-gt-admin-key") ?? "", expected)) return json({ ok: false, error: "unauthorized" }, 401);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  const reviewer = String(body.reviewer ?? "admin").slice(0, 80);
  try {
    switch (body.action) {
      case "queue": {
        const { data, error } = await db.from("v_gt_offers_admin_queue").select("*").eq("city_key", String(body.city ?? "atlanta")).limit(300);
        if (error) throw error; return json({ ok: true, offers: data });
      }
      case "metrics": {
        const { data, error } = await db.from("v_gt_offer_metrics").select("*").eq("city_key", String(body.city ?? "atlanta"));
        if (error) throw error;
        const since = new Date(Date.now() - 30 * 864e5).toISOString();
        const { data: ev } = await db.from("gt_offer_events").select("event_type,category,utm_source").gte("created_at", since).limit(20000);
        const totals: Record<string, number> = {}; const sources: Record<string, number> = {};
        for (const e of ev ?? []) { totals[e.event_type] = (totals[e.event_type] ?? 0) + 1; if (e.utm_source) sources[e.utm_source] = (sources[e.utm_source] ?? 0) + 1; }
        const { count: expired } = await db.from("gt_offers").select("id", { count: "exact", head: true }).in("verification_status", ["expired", "flagged", "rejected"]);
        const { count: all } = await db.from("gt_offers").select("id", { count: "exact", head: true });
        return json({ ok: true, offers: data, last30: totals, sources, expired_or_invalid_rate: all ? Math.round(((expired ?? 0) / all) * 1000) / 10 : 0 });
      }
      case "upsert": {
        const o = (body.offer ?? {}) as Record<string, unknown>;
        const row: Record<string, unknown> = {};
        for (const f of FIELDS) if (o[f] !== undefined && o[f] !== "") row[f] = o[f];
        if (typeof row.participating_locations === "string") row.participating_locations = String(row.participating_locations).split(/\s*[,;]\s*/).filter(Boolean);
        row.source_type = row.source_type ?? "good_times";
        if (o.id) { const { data, error } = await db.from("gt_offers").update(row).eq("id", String(o.id)).select("id").single(); if (error) throw error; return json({ ok: true, id: data.id }); }
        const { data, error } = await db.from("gt_offers").insert({ ...row, verification_status: "pending", approval_status: "submitted" }).select("id").single();
        if (error) throw error; return json({ ok: true, id: data.id });
      }
      case "review": {
        const { data, error } = await db.rpc("gt_admin_review_offer", { p_offer_id: String(body.id), p_action: String(body.op), p_reviewer: reviewer,
          p_note: body.note ? String(body.note).slice(0, 500) : null, p_verified_source_url: body.source_url ? String(body.source_url) : null,
          p_expires_at: body.expires_at ? String(body.expires_at) : null });
        if (error) throw error; return json({ ok: true, result: data });
      }
      default: return json({ ok: false, error: "unknown_action" }, 400);
    }
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e) }, 400);
  }
});
