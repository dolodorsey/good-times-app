import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const GATEWAY_URL = "https://dzlmtvodpyhetvektfuo.supabase.co";
const GATEWAY_KEY = "sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR";
const FIXED_ORIGINS = new Set([
  "https://good-times-app.vercel.app",
  "https://thegoodtimesworldwide.com",
  "https://www.thegoodtimesworldwide.com",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://localhost",
]);
const CATEGORY_TERMS: Record<string, string[]> = {
  nightlife: ["club", "nightlife", "party", "dance", "lounge", "hookah", "late night", "dj"],
  concerts_live_music: ["concert", "music", "live music", "r&b", "hip hop", "jazz", "show"],
  dining_culinary: ["dinner", "dining", "restaurant", "food", "eat", "brunch", "date night"],
  day_parties_brunch: ["brunch", "day party", "daytime", "sunday funday"],
  comedy_performing_arts: ["comedy", "stand up", "theater", "theatre", "play"],
  festivals_major_activations: ["festival", "activation", "expo", "convention", "fair"],
  sports_watch: ["sports", "game", "watch party", "basketball", "football", "baseball", "soccer"],
  arts_museums_culture: ["art", "museum", "gallery", "culture", "exhibit"],
  dating_social: ["date", "dating", "singles", "social", "meet people"],
  wellness_fitness: ["wellness", "fitness", "yoga", "spa", "workout"],
  vip_exclusive: ["vip", "exclusive", "luxury", "premium", "celebrity"],
  community_civic: ["community", "civic", "networking", "business", "nonprofit"],
};
const VENUE_CATEGORIES: Record<string, string[]> = {
  nightlife: ["nightclub", "lounge", "hookah", "bar", "cocktail_bar", "rooftop", "speakeasy", "jazz"],
  concerts_live_music: ["music_venue", "jazz", "event_venue", "theater"],
  dining_culinary: ["restaurant", "brunch", "food_hall", "coffee", "wine_bar", "food_truck"],
  day_parties_brunch: ["brunch", "day_party", "pool_party", "rooftop"],
  comedy_performing_arts: ["comedy", "theater", "event_venue"],
  arts_museums_culture: ["culture", "museum", "gallery", "event_venue"],
  sports_watch: ["sports_bar", "stadium", "entertainment"],
  wellness_fitness: ["spa", "fitness", "gym"],
  vip_exclusive: ["nightclub", "lounge", "fine_dining", "rooftop"],
};
const SIGNAL_WEIGHT: Record<string, number> = {
  view: 1, search: 1, save: 5, share: 4, book: 9, attend: 10,
  rate: 6, dismiss: -3, hide: -8, concierge_select: 6,
};

const clean = (value: unknown, max = 1000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const isoDate = (date = new Date()) => date.toISOString().slice(0, 10);
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
};
const isAllowedOrigin = (origin: string) => FIXED_ORIGINS.has(origin)
  || /^https:\/\/good-times-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i.test(origin)
  || /^https:\/\/good-times-app-git-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i.test(origin);
const cors = (req: Request) => {
  const origin = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": isAllowedOrigin(origin) ? origin : "https://good-times-app.vercel.app",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST,OPTIONS",
    vary: "Origin",
  };
};
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors(req), "content-type": "application/json; charset=utf-8" },
});

function parseIntent(query: string, today: string, input: Record<string, unknown>) {
  const text = query.toLowerCase();
  const categories = Object.entries(CATEGORY_TERMS)
    .filter(([, terms]) => terms.some((term) => text.includes(term)))
    .map(([key]) => key);
  let dateStart = clean(input.date, 10) || today;
  let dateEnd = dateStart;
  let dateLabel = "today";
  if (text.includes("tomorrow")) {
    dateStart = addDays(today, 1); dateEnd = dateStart; dateLabel = "tomorrow";
  } else if (text.includes("weekend")) {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    dateStart = addDays(today, (5 - day + 7) % 7); dateEnd = addDays(dateStart, 2); dateLabel = "this weekend";
  } else if (text.includes("this week") || text.includes("next 7")) {
    dateEnd = addDays(today, 7); dateLabel = "the next seven days";
  } else if (text.includes("tonight")) dateLabel = "tonight";
  const neighborhoods = [
    "buckhead", "midtown", "downtown", "old fourth ward", "west midtown", "east atlanta",
    "edgewood", "decatur", "atlantic station", "inman park", "virginia-highland",
    "little five points", "castleberry hill", "college park", "sandy springs", "alpharetta",
  ].filter((value) => text.includes(value));
  const budget = text.includes("free") ? "free"
    : /cheap|budget|affordable/.test(text) ? "budget"
    : /vip|luxury|premium|exclusive/.test(text) ? "premium"
    : clean(input.budget, 30) || "any";
  const occasion = /birthday/.test(text) ? "birthday"
    : /date night|romantic|date/.test(text) ? "date"
    : /girls|ladies/.test(text) ? "girls_night"
    : /guys|boys/.test(text) ? "guys_night"
    : /business|client|network/.test(text) ? "business"
    : /solo|by myself/.test(text) ? "solo" : "general";
  return { categories, dateStart, dateEnd, dateLabel, neighborhoods, budget, occasion, partySize: Number(input.party_size) || 1 };
}

function tasteProfile(profile: any, signals: any[]) {
  const weights: Record<string, number> = {};
  for (const vibe of profile?.vibe_preferences || []) weights[String(vibe)] = (weights[String(vibe)] || 0) + 4;
  for (const signal of signals || []) {
    const category = signal.metadata?.category_key || signal.metadata?.category || signal.entity_id;
    if (!category) continue;
    const multiplier = signal.entity_type === "category" ? 1 : .5;
    weights[String(category)] = (weights[String(category)] || 0)
      + (SIGNAL_WEIGHT[signal.signal_type] || 0) * Number(signal.signal_value || 1) * multiplier;
  }
  return weights;
}
function weighted(components: Record<string, number>, weights: Record<string, number>) {
  return clamp(Object.entries(weights).reduce((sum, [key, weight]) => sum + (components[key] || 0) * Number(weight), 0));
}
function temporal(date: string, intent: any) {
  if (date >= intent.dateStart && date <= intent.dateEnd) return 100;
  const distance = Math.abs((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${intent.dateStart}T12:00:00Z`).getTime()) / 86400000);
  return clamp(80 - distance * 12);
}
function categoryMatch(category: string, requested: string[]) {
  return requested.length ? (requested.includes(category) ? 100 : 25) : 65;
}
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function eventScore(item: any, intent: any, tastes: Record<string, number>, seen: Set<string>, formula: Record<string, number>) {
  const match = categoryMatch(item.category_key || "", intent.categories);
  const parts = {
    base_quality: clamp(Number(item.good_times_score || 50)),
    preference_match: clamp(50 + (tastes[item.category_key] || 0) * 5 + (match - 50) * .45),
    temporal_fit: temporal(item.event_date, intent),
    source_confidence: clamp(45 + (item.is_curated ? 25 : 0) + (item.is_featured ? 20 : 0) + (item.organizer ? 5 : 0) + (item.venue_name ? 5 : 0)),
    actionability: clamp(30 + (item.ticket_url ? 35 : 0) + (item.venue_name ? 15 : 0) + (item.image_url ? 10 : 0) + (item.event_time ? 10 : 0)),
    culture_signal: clamp(45 + (item.is_curated ? 30 : 0) + (item.is_featured ? 20 : 0)),
    novelty: seen.has(String(item.event_key)) ? 25 : 90,
    proximity: 50,
  };
  return { parts, score: weighted(parts, formula) };
}
function venueScore(item: any, intent: any, tastes: Record<string, number>, seen: Set<string>, formula: Record<string, number>, input: Record<string, unknown>) {
  const mapped = Object.entries(VENUE_CATEGORIES).find(([, values]) => values.includes(item.category_key))?.[0] || item.category_key || "";
  let proximity = 50;
  const userLat = Number(input.latitude), userLng = Number(input.longitude);
  if (Number.isFinite(userLat) && Number.isFinite(userLng) && item.latitude != null && item.longitude != null) {
    proximity = clamp(100 - distanceMiles(userLat, userLng, Number(item.latitude), Number(item.longitude)) * 6);
  }
  const match = categoryMatch(mapped, intent.categories);
  const parts = {
    base_quality: clamp(Number(item.quality_score || 0) * .55 + Number(item.google_rating || 0) / 5 * 100 * .45),
    preference_match: clamp(50 + (tastes[mapped] || 0) * 5 + (match - 50) * .45),
    temporal_fit: 70,
    source_confidence: clamp(35 + (item.is_verified ? 30 : 0) + Math.min(Number(item.source_count || 0) * 5, 20) + (item.evidence_url_1 ? 10 : 0) + (item.evidence_url_2 ? 5 : 0)),
    actionability: clamp(25 + (item.booking_link ? 25 : 0) + (item.website ? 15 : 0) + (item.phone ? 10 : 0) + (item.address ? 10 : 0) + (item.hours_summary ? 10 : 0) + (item.hero_image ? 5 : 0)),
    culture_signal: clamp(Number(item.culture_score || 0) || (item.is_culture_pick ? 85 : item.is_black_owned ? 70 : 45)),
    novelty: seen.has(String(item.id)) ? 25 : 90,
    proximity,
  };
  return { parts, score: weighted(parts, formula) };
}
function explanations(parts: Record<string, number>, item: any, intent: any, type: "event" | "venue") {
  const output: string[] = [];
  if (parts.preference_match >= 75) output.push("matches your stated or learned taste");
  if (type === "event" && parts.temporal_fit >= 90) output.push(`fits ${intent.dateLabel}`);
  if (parts.base_quality >= 75) output.push("strong quality signals");
  if (parts.culture_signal >= 75) output.push("strong local culture signal");
  if (parts.actionability >= 75) output.push(type === "event" && item.ticket_url ? "ticket link available" : item.booking_link ? "booking link available" : "complete visit details");
  if (type === "venue" && item.is_black_owned) output.push("Black-owned business");
  return output.length ? output.slice(0, 3) : ["best available match from current verified data"];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && !isAllowedOrigin(origin)) return json(req, { error: "Origin not allowed" }, 403);

  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(req, { error: "Concierge configuration unavailable" }, 503);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "Authentication required" }, 401);
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json(req, { error: "Invalid or expired session" }, 401);

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json(req, { error: "Invalid request" }, 400); }
  const query = clean(input.query), action = String(input.action) === "itinerary" ? "itinerary" : "recommend";
  if (query.length < 2) return json(req, { error: "Tell GOOD TIMES what kind of experience you need." }, 400);
  const city = clean(input.city, 60).toLowerCase().replace(/[\s-]+/g, "_") || "atlanta";
  const intent = parseIntent(query, clean(input.today, 10) || isoDate(), input);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const gateway = createClient(GATEWAY_URL, GATEWAY_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const started = Date.now();
  let task: any = null, run: any = null;

  try {
    const formulaKey = action === "itinerary" ? "itinerary" : "recommendation";
    const [{ data: activeFormula }, { data: recommendation }, { data: profile }, { data: signals }] = await Promise.all([
      admin.from("gt_formula_versions").select("*").eq("formula_key", formulaKey).eq("is_active", true).single(),
      admin.from("gt_formula_versions").select("weights,thresholds,version").eq("formula_key", "recommendation").eq("is_active", true).single(),
      admin.from("gt_user_profiles").select("*").eq("auth_id", auth.user.id).maybeSingle(),
      admin.from("gt_taste_signals").select("entity_type,entity_id,signal_type,signal_value,metadata,occurred_at").eq("auth_id", auth.user.id).order("occurred_at", { ascending: false }).limit(500),
    ]);
    const tastes = tasteProfile(profile, signals || []);
    const seen = new Set((signals || []).filter((item: any) => item.signal_type === "view").map((item: any) => String(item.entity_id)));
    const taskInsert = await admin.from("gt_agent_tasks").insert({
      agent_key: action === "itinerary" ? "gt_itinerary_agent" : "gt_concierge_agent",
      auth_id: auth.user.id, task_type: action, input: { query, city, intent }, status: "running",
      priority: action === "itinerary" ? 3 : 4, locked_at: new Date().toISOString(), locked_by: "good-times-concierge-v2", attempts: 1,
    }).select().single();
    if (taskInsert.error) throw taskInsert.error;
    task = taskInsert.data;
    run = (await admin.from("gt_agent_run_ledger").insert({
      task_id: task.id, agent_key: task.agent_key, auth_id: auth.user.id, status: "started",
      formula_key: formulaKey, formula_version: activeFormula?.version || 1, input_summary: { city, action, intent },
    }).select().single()).data;

    let eventRows: any[] = [];
    if (city === "atlanta") {
      const result = await gateway.from("gt_public_atlanta_feed")
        .select("event_key,source_table,source_id,city_key,title,event_date,event_time,venue_name,raw_type,raw_category,ticket_url,image_url,organizer,display_priority,good_times_score,category_key,subcategory_key,is_featured,is_curated,rank_order,refreshed_at")
        .gte("event_date", intent.dateStart).lte("event_date", addDays(intent.dateEnd, 30)).order("rank_order").limit(600);
      if (result.error) throw result.error;
      eventRows = result.data || [];
    } else {
      const result = await gateway.from("gt_shows")
        .select("id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,image_url,organizer,display_priority,good_times_score,category_key_v2,subcategory_key_v2,is_featured,is_curated")
        .eq("city_key", city).gte("show_date", intent.dateStart).lte("show_date", addDays(intent.dateEnd, 30)).in("status", ["confirmed", "tentative"]).limit(500);
      if (result.error) throw result.error;
      eventRows = (result.data || []).map((item: any) => ({
        event_key: `show:${item.id}`, source_table: "gt_shows", source_id: item.id, city_key: item.city_key,
        title: item.event_name, event_date: item.show_date, event_time: item.show_time, venue_name: item.venue_name,
        raw_type: item.event_type, raw_category: item.genre, ticket_url: item.ticket_url, image_url: item.image_url,
        organizer: item.organizer, display_priority: item.display_priority, good_times_score: item.good_times_score,
        category_key: item.category_key_v2 || item.event_type, subcategory_key: item.subcategory_key_v2,
        is_featured: item.is_featured, is_curated: item.is_curated, rank_order: 999,
      }));
    }
    let eventCandidates = eventRows;
    if (intent.categories.length) {
      const exact = eventRows.filter((item) => intent.categories.includes(item.category_key));
      if (exact.length >= 3) eventCandidates = exact;
    }
    if (intent.budget === "free") eventCandidates = eventCandidates.filter((item) => /free/i.test(`${item.raw_category || ""} ${item.title || ""}`));
    const minScore = Number(recommendation?.thresholds?.reject_below || 35);
    const formula = recommendation?.weights || {};
    const events = eventCandidates.map((item) => {
      const calculated = eventScore(item, intent, tastes, seen, formula);
      return { ...item, recommendation_score: Math.round(calculated.score * 10) / 10, score_components: calculated.parts, reasons: explanations(calculated.parts, item, intent, "event") };
    }).filter((item) => item.recommendation_score >= minScore)
      .sort((a, b) => b.recommendation_score - a.recommendation_score || Number(a.rank_order) - Number(b.rank_order)).slice(0, 12);

    const venueQuery = await gateway.from("gt_venues")
      .select("id,name,slug,city_key,neighborhood,side_of_town,category_key,subcategory,address,latitude,longitude,phone,website,instagram_handle,short_desc,vibe_tags,best_for,best_time,price_range,dress_code,reservation_req,hours_summary,insider_tip,status,is_featured,is_verified,quality_score,hero_image,booking_link,booking_platform,google_rating,google_reviews,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_score,source_count,evidence_url_1,evidence_url_2,culture_tags")
      .eq("status", "active").eq("city_key", city).limit(700);
    if (venueQuery.error) throw venueQuery.error;
    let venueRows = venueQuery.data || [];
    if (intent.neighborhoods.length) {
      const exact = venueRows.filter((item: any) => intent.neighborhoods.some((hood: string) => `${item.neighborhood || ""} ${item.side_of_town || ""}`.toLowerCase().includes(hood)));
      if (exact.length >= 3) venueRows = exact;
    }
    if (intent.categories.length) {
      const accepted = new Set(intent.categories.flatMap((key: string) => VENUE_CATEGORIES[key] || []));
      const exact = venueRows.filter((item: any) => accepted.has(item.category_key));
      if (exact.length >= 3) venueRows = exact;
    }
    const venues = venueRows.map((item: any) => {
      const calculated = venueScore(item, intent, tastes, seen, formula, input);
      return { ...item, recommendation_score: Math.round(calculated.score * 10) / 10, score_components: calculated.parts, reasons: explanations(calculated.parts, item, intent, "venue") };
    }).filter((item: any) => item.recommendation_score >= minScore)
      .sort((a: any, b: any) => b.recommendation_score - a.recommendation_score).slice(0, 10);

    let itinerary: any = null;
    if (action === "itinerary") {
      const dinner = venues.find((item: any) => ["restaurant", "brunch", "food_hall", "wine_bar", "coffee"].includes(item.category_key));
      const main = events[0];
      const after = venues.find((item: any) => item.id !== dinner?.id && ["nightclub", "lounge", "hookah", "bar", "cocktail_bar", "rooftop", "jazz", "speakeasy"].includes(item.category_key));
      const stops: any[] = [];
      if (dinner) stops.push({ type: "venue", role: "before", id: dinner.id, name: dinner.name, address: dinner.address, image_url: dinner.hero_image, booking_link: dinner.booking_link, score: dinner.recommendation_score, reasons: dinner.reasons });
      if (main) stops.push({ type: "event", role: "main", id: main.event_key, name: main.title, date: main.event_date, time: main.event_time, venue: main.venue_name, ticket_url: main.ticket_url, image_url: main.image_url, score: main.recommendation_score, reasons: main.reasons });
      if (after) stops.push({ type: "venue", role: "after", id: after.id, name: after.name, address: after.address, image_url: after.hero_image, booking_link: after.booking_link, score: after.recommendation_score, reasons: after.reasons });
      if (!stops.length) throw new Error("No strong current options were available to build an honest itinerary.");
      const save = await admin.from("itineraries").insert({
        user_id: auth.user.id,
        name: `${intent.occasion === "general" ? "GOOD TIMES" : intent.occasion.replaceAll("_", " ").toUpperCase()} — ${intent.dateLabel}`,
        city_id: city, itinerary_date: intent.dateStart, estimated_duration: stops.length >= 3 ? "4-6 hours" : "2-4 hours",
        stops, vibe_profile: { occasion: intent.occasion, categories: intent.categories }, group_size: intent.partySize,
        status: "draft", created_by: "ai", metadata: { formula: "itinerary", formula_version: activeFormula?.version || 1, query },
      }).select().single();
      if (save.error) throw save.error;
      itinerary = save.data;
    }

    let threadId = clean(input.thread_id, 40) || null;
    if (threadId) {
      const existing = await admin.from("concierge_threads").select("id").eq("id", threadId).eq("user_id", auth.user.id).maybeSingle();
      if (!existing.data) threadId = null;
    }
    if (!threadId) {
      const created = await admin.from("concierge_threads").insert({ user_id: auth.user.id, city, status: "open" }).select("id").single();
      if (created.error) throw created.error;
      threadId = created.data.id;
    }
    const lead = events[0]?.title || venues[0]?.name;
    const count = events.length + venues.length;
    const message = lead
      ? `I found ${count} current option${count === 1 ? "" : "s"} for ${intent.dateLabel}. ${lead} is the strongest match based on timing, quality, actionability and your taste signals.`
      : `I could not find a strong current match for ${intent.dateLabel}. I kept the result honest instead of filling the list with weak options.`;
    await admin.from("concierge_messages").insert([
      { thread_id: threadId, role: "user", content: query, meta: { action, intent } },
      { thread_id: threadId, role: "assistant", content: message, meta: { events: events.slice(0, 6), venues: venues.slice(0, 6), itinerary_id: itinerary?.id || null, formula_version: recommendation?.version || 1 } },
    ]);
    await admin.from("gt_product_events").insert({
      auth_id: auth.user.id, event_name: action === "itinerary" ? "itinerary_generated" : "concierge_query",
      surface: "concierge", object_type: action, object_id: itinerary?.id || threadId, city_slug: city,
      properties: { categories: intent.categories, date_label: intent.dateLabel, result_count: count },
    });
    await admin.from("gt_taste_signals").insert({
      auth_id: auth.user.id, entity_type: "category", entity_id: intent.categories[0] || "general",
      signal_type: "search", signal_value: 1, city_slug: city,
      metadata: { query, category_key: intent.categories[0] || "general", occasion: intent.occasion },
    });
    const result = {
      thread_id: threadId, message, intent, events, venues, itinerary,
      formula: { key: formulaKey, version: activeFormula?.version || 1 },
      truth: { availability_not_assumed: true, ranking_explained: true, source_data_only: true },
    };
    await admin.from("gt_agent_tasks").update({ status: "completed", result, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", task.id);
    if (run?.id) await admin.from("gt_agent_run_ledger").update({ status: "completed", output_summary: { events: events.length, venues: venues.length, itinerary_id: itinerary?.id || null }, duration_ms: Date.now() - started, completed_at: new Date().toISOString() }).eq("id", run.id);
    await admin.from("gt_agent_registry").update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("agent_key", task.agent_key);
    return json(req, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Concierge request failed";
    console.error("GOOD TIMES concierge failed", { user: auth.user.id, action, city, message });
    if (task?.id) await admin.from("gt_agent_tasks").update({ status: "failed", error_message: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", task.id);
    if (run?.id) await admin.from("gt_agent_run_ledger").update({ status: "failed", error_message: message, duration_ms: Date.now() - started, completed_at: new Date().toISOString() }).eq("id", run.id);
    return json(req, { error: message }, 400);
  }
});
