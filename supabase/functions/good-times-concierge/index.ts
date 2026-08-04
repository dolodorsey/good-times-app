import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import {
  adaptWeights,
  addDays,
  buildMemoryProfile,
  clean,
  diversityRerank,
  evaluateQuality,
  isoDate,
  optimizeItinerary,
  parseIntent,
  scoreEvent,
  scoreVenue,
  type ScoredCandidate,
} from "./intelligence.ts";

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
const PIPELINE_AGENTS = [
  "gt_intelligence_supervisor",
  "gt_memory_agent",
  "gt_confidence_agent",
  "gt_diversity_agent",
  "gt_agent_evaluator",
];

function isAllowedOrigin(origin: string) {
  return FIXED_ORIGINS.has(origin)
    || /^https:\/\/good-times-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i.test(origin)
    || /^https:\/\/good-times-app-git-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i.test(origin);
}

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": isAllowedOrigin(origin) ? origin : "https://good-times-app.vercel.app",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST,OPTIONS",
    vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "content-type": "application/json; charset=utf-8" },
  });
}

function cityFromQuery(query: string, fallback: string) {
  const text = query.toLowerCase();
  const cities: Record<string, string[]> = {
    atlanta: ["atlanta", "atl"],
    houston: ["houston", "htx"],
    los_angeles: ["los angeles", "la"],
    miami: ["miami"],
    charlotte: ["charlotte"],
    washington_dc: ["washington dc", "washington, dc", "dc"],
    new_york: ["new york", "nyc"],
    dallas: ["dallas"],
    phoenix: ["phoenix"],
    scottsdale: ["scottsdale"],
    las_vegas: ["las vegas", "vegas"],
  };
  for (const [slug, aliases] of Object.entries(cities)) {
    if (aliases.some((alias) => text.includes(alias))) return slug;
  }
  return fallback;
}

function sanitizePlanStop(stop: any) {
  if (stop.object_type === "event") {
    return {
      type: "event",
      role: stop.role,
      id: stop.object_id,
      name: stop.title,
      date: stop.event_date,
      time: stop.scheduled_time || stop.event_time,
      venue: stop.venue_name,
      ticket_url: stop.ticket_url,
      image_url: stop.image_url,
      score: stop.relevance_score,
      confidence: stop.confidence_score,
      reasons: stop.reasons,
    };
  }
  return {
    type: "venue",
    role: stop.role,
    id: stop.object_id,
    name: stop.name,
    time: stop.scheduled_time,
    address: stop.address,
    neighborhood: stop.neighborhood,
    booking_link: stop.booking_link,
    website: stop.website,
    phone: stop.phone,
    image_url: stop.hero_image,
    score: stop.relevance_score,
    confidence: stop.confidence_score,
    reasons: stop.reasons,
  };
}

function assistantMessage(intent: any, events: ScoredCandidate[], venues: ScoredCandidate[], itinerary: any, warning: string | null) {
  const lead = events[0]?.title || venues[0]?.name;
  if (!lead) return `I could not find a strong, sufficiently supported match for ${intent.dateLabel}. I kept the result honest instead of filling the list with weak options.`;
  const count = events.length + venues.length;
  const planNote = itinerary
    ? ` I also optimized and saved a ${itinerary.stops?.length || 0}-stop plan.`
    : warning ? ` ${warning}` : "";
  return `I found ${count} source-backed option${count === 1 ? "" : "s"} for ${intent.dateLabel}. ${lead} is the strongest current match after relevance, confidence, freshness, diversity and actionability checks.${planNote}`;
}

function impressionRows(sessionId: string, authId: string, candidates: ScoredCandidate[]) {
  return candidates.map((item, index) => ({
    session_id: sessionId,
    auth_id: authId,
    object_type: item.object_type,
    object_id: item.object_id,
    rank_position: item.rank_position || index + 1,
    relevance_score: item.relevance_score,
    confidence_score: item.confidence_score,
    completeness_score: item.completeness_score,
    freshness_score: item.freshness_score,
    diversity_adjustment: item.diversity_adjustment || 0,
    exploration_pick: Boolean(item.exploration_pick),
    reasons: item.reasons,
    score_components: item.score_components,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && !isAllowedOrigin(origin)) return json(req, { error: "Origin not allowed" }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(req, { error: "Concierge configuration unavailable" }, 503);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "Authentication required" }, 401);
  const userClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json(req, { error: "Invalid or expired session" }, 401);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json(req, { error: "Invalid request" }, 400);
  }

  const query = clean(input.query);
  const action = String(input.action) === "itinerary" ? "itinerary" : "recommend";
  if (query.length < 2) return json(req, { error: "Tell GOOD TIMES what kind of experience you need." }, 400);
  const fallbackCity = clean(input.city, 60).toLowerCase().replace(/[\s-]+/g, "_") || "atlanta";
  const city = cityFromQuery(query, fallbackCity);
  const intent = parseIntent(query, clean(input.today, 10) || isoDate(), input);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const gateway = createClient(GATEWAY_URL, GATEWAY_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const started = Date.now();
  let task: any = null;
  let run: any = null;

  try {
    const [{ data: recommendationFormula, error: recommendationError }, { data: itineraryFormula, error: itineraryError }, { data: profile }, { data: signals }] = await Promise.all([
      admin.from("gt_formula_versions").select("*").eq("formula_key", "recommendation").eq("is_active", true).single(),
      admin.from("gt_formula_versions").select("*").eq("formula_key", "itinerary").eq("is_active", true).single(),
      admin.from("gt_user_profiles").select("*").eq("auth_id", auth.user.id).maybeSingle(),
      admin.from("gt_taste_signals").select("entity_type,entity_id,signal_type,signal_value,metadata,occurred_at").eq("auth_id", auth.user.id).order("occurred_at", { ascending: false }).limit(1000),
    ]);
    if (recommendationError) throw recommendationError;
    if (itineraryError) throw itineraryError;

    const memory = buildMemoryProfile(profile, signals || []);
    const adaptedWeights = adaptWeights(recommendationFormula.weights || {}, memory.maturityStage);
    await admin.from("gt_user_intelligence_profiles").upsert({
      auth_id: auth.user.id,
      maturity_stage: memory.maturityStage,
      signal_count: memory.signalCount,
      positive_signal_count: memory.positiveSignalCount,
      negative_signal_count: memory.negativeSignalCount,
      category_affinity: memory.categoryAffinity,
      neighborhood_affinity: memory.neighborhoodAffinity,
      daypart_affinity: memory.daypartAffinity,
      price_affinity: memory.priceAffinity,
      suppression_rules: memory.suppressions,
      exploration_rate: memory.explorationRate,
      last_signal_at: memory.lastSignalAt,
      computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "auth_id" });

    const taskInsert = await admin.from("gt_agent_tasks").insert({
      agent_key: "gt_intelligence_supervisor",
      auth_id: auth.user.id,
      task_type: action,
      input: { query, city, intent, maturity_stage: memory.maturityStage },
      status: "running",
      priority: action === "itinerary" ? 3 : 4,
      locked_at: new Date().toISOString(),
      locked_by: "good-times-intelligence-v3",
      attempts: 1,
    }).select().single();
    if (taskInsert.error) throw taskInsert.error;
    task = taskInsert.data;

    const runInsert = await admin.from("gt_agent_run_ledger").insert({
      task_id: task.id,
      agent_key: "gt_intelligence_supervisor",
      auth_id: auth.user.id,
      status: "started",
      formula_key: action === "itinerary" ? "itinerary" : "recommendation",
      formula_version: action === "itinerary" ? itineraryFormula.version : recommendationFormula.version,
      input_summary: {
        city,
        action,
        intent,
        maturity_stage: memory.maturityStage,
        signal_count: memory.signalCount,
        exploration_rate: memory.explorationRate,
        pipeline: ["intent", "memory", "candidates", "confidence", "ranking", "diversity", "itinerary", "evaluation"],
      },
    }).select().single();
    if (runInsert.error) throw runInsert.error;
    run = runInsert.data;

    let eventRows: any[] = [];
    if (city === "atlanta") {
      const result = await gateway.from("gt_public_atlanta_feed")
        .select("event_key,source_table,source_id,city_key,title,event_date,event_time,venue_name,raw_type,raw_category,ticket_url,image_url,organizer,display_priority,good_times_score,category_key,subcategory_key,is_featured,is_curated,rank_order,refreshed_at")
        .gte("event_date", intent.dateStart)
        .lte("event_date", addDays(intent.dateEnd, 45))
        .order("rank_order")
        .limit(750);
      if (result.error) throw result.error;
      eventRows = result.data || [];
    } else {
      const result = await gateway.from("gt_shows")
        .select("id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,image_url,organizer,display_priority,good_times_score,category_key_v2,subcategory_key_v2,is_featured,is_curated,updated_at")
        .eq("city_key", city)
        .gte("show_date", intent.dateStart)
        .lte("show_date", addDays(intent.dateEnd, 45))
        .in("status", ["confirmed", "tentative"])
        .limit(650);
      if (result.error) throw result.error;
      eventRows = (result.data || []).map((item: any, index: number) => ({
        event_key: `show:${item.id}`,
        source_table: "gt_shows",
        source_id: item.id,
        city_key: item.city_key,
        title: item.event_name,
        event_date: item.show_date,
        event_time: item.show_time,
        venue_name: item.venue_name,
        raw_type: item.event_type,
        raw_category: item.genre,
        ticket_url: item.ticket_url,
        image_url: item.image_url,
        organizer: item.organizer,
        display_priority: item.display_priority,
        good_times_score: item.good_times_score,
        category_key: item.category_key_v2 || item.event_type,
        subcategory_key: item.subcategory_key_v2,
        is_featured: item.is_featured,
        is_curated: item.is_curated,
        rank_order: index + 1,
        refreshed_at: item.updated_at,
      }));
    }

    const venueQuery = await gateway.from("gt_venues")
      .select("id,name,slug,city_key,neighborhood,side_of_town,category_key,subcategory,address,latitude,longitude,phone,website,instagram_handle,short_desc,vibe_tags,best_for,best_time,price_range,dress_code,reservation_req,hours_summary,insider_tip,status,is_featured,is_verified,quality_score,hero_image,booking_link,booking_platform,google_rating,google_reviews,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_score,source_count,evidence_url_1,evidence_url_2,culture_tags,updated_at,enriched_at")
      .eq("status", "active")
      .eq("city_key", city)
      .limit(1000);
    if (venueQuery.error) throw venueQuery.error;

    const thresholds = recommendationFormula.thresholds || {};
    const minimumRelevance = Number(thresholds.minimum_relevance || 42);
    const minimumConfidence = Number(thresholds.minimum_confidence || 35);
    const scoredEvents = eventRows
      .map((item) => scoreEvent(item, intent, memory, adaptedWeights, input))
      .filter((item) => item.relevance_score >= minimumRelevance && item.confidence_score >= minimumConfidence);
    const scoredVenues = (venueQuery.data || [])
      .map((item: any) => scoreVenue(item, intent, memory, adaptedWeights, input))
      .filter((item: ScoredCandidate) => item.relevance_score >= minimumRelevance && item.confidence_score >= minimumConfidence);

    const seed = `${auth.user.id}:${city}:${query.toLowerCase()}:${intent.dateStart}`;
    const events = diversityRerank(scoredEvents, "event", 12, thresholds, memory, seed)
      .map((item) => ({ ...item, recommendation_score: item.relevance_score }));
    const venues = diversityRerank(scoredVenues, "venue", 10, thresholds, memory, seed)
      .map((item) => ({ ...item, recommendation_score: item.relevance_score }));

    let itinerary: any = null;
    let itineraryWarning: string | null = null;
    let optimizedPlan: any = null;
    if (action === "itinerary") {
      optimizedPlan = optimizeItinerary(events, venues, intent, itineraryFormula.weights || {}, itineraryFormula.thresholds || {});
      if (optimizedPlan?.stops?.length) {
        const stops = optimizedPlan.stops.map(sanitizePlanStop);
        const save = await admin.from("itineraries").insert({
          user_id: auth.user.id,
          name: `${intent.occasion === "general" ? "GOOD TIMES" : intent.occasion.replaceAll("_", " ").toUpperCase()} — ${intent.dateLabel}`,
          city_id: city,
          itinerary_date: intent.dateStart,
          estimated_duration: stops.length >= 3 ? "4-6 hours" : "2-4 hours",
          stops,
          vibe_profile: { occasion: intent.occasion, categories: intent.categories },
          group_size: intent.partySize,
          status: "draft",
          created_by: "ai",
          metadata: {
            formula: "itinerary",
            formula_version: itineraryFormula.version,
            optimizer_score: optimizedPlan.score,
            optimizer_parts: optimizedPlan.parts,
            total_miles: optimizedPlan.total_miles,
            query,
          },
        }).select().single();
        if (save.error) throw save.error;
        itinerary = save.data;
      } else {
        itineraryWarning = "I found recommendations, but not a three-stop sequence that passed the current confidence, travel and timing rules.";
      }
    }

    const sessionInsert = await admin.from("gt_recommendation_sessions").insert({
      auth_id: auth.user.id,
      agent_task_id: task.id,
      city_slug: city,
      action,
      raw_query: query,
      parsed_intent: intent,
      formula_key: action === "itinerary" ? "itinerary" : "recommendation",
      formula_version: action === "itinerary" ? itineraryFormula.version : recommendationFormula.version,
      maturity_stage: memory.maturityStage,
      exploration_rate: memory.explorationRate,
      candidate_count: scoredEvents.length + scoredVenues.length,
      result_count: events.length + venues.length,
      itinerary_id: itinerary?.id || null,
      duration_ms: Date.now() - started,
    }).select().single();
    if (sessionInsert.error) throw sessionInsert.error;
    const recommendationSession = sessionInsert.data;

    const impressions = impressionRows(recommendationSession.id, auth.user.id, [...events, ...venues]);
    if (impressions.length) {
      const impressionInsert = await admin.from("gt_recommendation_impressions").insert(impressions);
      if (impressionInsert.error) throw impressionInsert.error;
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

    const message = assistantMessage(intent, events, venues, itinerary, itineraryWarning);
    const qualityMetrics = evaluateQuality(events, venues, minimumConfidence);
    await admin.from("concierge_messages").insert([
      { thread_id: threadId, role: "user", content: query, meta: { action, intent, recommendation_session_id: recommendationSession.id } },
      {
        thread_id: threadId,
        role: "assistant",
        content: message,
        meta: {
          events: events.slice(0, 6),
          venues: venues.slice(0, 6),
          itinerary_id: itinerary?.id || null,
          recommendation_session_id: recommendationSession.id,
          formula_version: recommendationFormula.version,
          maturity_stage: memory.maturityStage,
          quality_metrics: qualityMetrics,
        },
      },
    ]);

    await admin.from("gt_product_events").insert({
      auth_id: auth.user.id,
      event_name: action === "itinerary" ? "itinerary_generated" : "concierge_query",
      surface: "concierge",
      object_type: action,
      object_id: itinerary?.id || recommendationSession.id,
      city_slug: city,
      properties: {
        categories: intent.categories,
        date_label: intent.dateLabel,
        result_count: events.length + venues.length,
        maturity_stage: memory.maturityStage,
        formula_version: recommendationFormula.version,
        quality_metrics: qualityMetrics,
      },
    });
    await admin.from("gt_taste_signals").insert({
      auth_id: auth.user.id,
      entity_type: "category",
      entity_id: intent.categories[0] || "general",
      signal_type: "search",
      signal_value: 1,
      city_slug: city,
      metadata: {
        query,
        category_key: intent.categories[0] || "general",
        occasion: intent.occasion,
        neighborhoods: intent.neighborhoods,
        budget: intent.budget,
      },
    });

    if (run?.id) {
      const evaluationRows = qualityMetrics.map((metric) => ({
        run_id: run.id,
        agent_key: "gt_agent_evaluator",
        metric_key: metric.metric_key,
        score: metric.score,
        passed: metric.passed,
        threshold: metric.threshold,
        details: {
          recommendation_session_id: recommendationSession.id,
          event_count: events.length,
          venue_count: venues.length,
        },
      }));
      await admin.from("gt_agent_quality_evaluations").insert(evaluationRows);
    }

    const response = {
      thread_id: threadId,
      recommendation_session_id: recommendationSession.id,
      message,
      intent,
      events,
      venues,
      itinerary,
      itinerary_warning: itineraryWarning,
      formula: {
        key: action === "itinerary" ? "itinerary" : "recommendation",
        version: action === "itinerary" ? itineraryFormula.version : recommendationFormula.version,
        recommendation_version: recommendationFormula.version,
        itinerary_version: itineraryFormula.version,
      },
      intelligence: {
        maturity_stage: memory.maturityStage,
        signal_count: memory.signalCount,
        exploration_rate: memory.explorationRate,
        adapted_weights: adaptedWeights,
        pipeline_agents: [
          "Intelligence Supervisor",
          "Taste Memory",
          "Evidence Confidence",
          "Diversity & Discovery",
          ...(action === "itinerary" ? ["Itinerary Optimizer"] : []),
          "Agent Evaluator",
        ],
        quality_metrics: qualityMetrics,
        optimizer: optimizedPlan ? {
          score: optimizedPlan.score,
          total_miles: optimizedPlan.total_miles,
          parts: optimizedPlan.parts,
        } : null,
      },
      truth: {
        availability_not_assumed: true,
        ranking_explained: true,
        confidence_separate_from_relevance: true,
        source_data_only: true,
        failed_closed_on_weak_candidates: true,
      },
    };

    await admin.from("gt_agent_tasks").update({
      status: "completed",
      result: {
        recommendation_session_id: recommendationSession.id,
        result_count: events.length + venues.length,
        itinerary_id: itinerary?.id || null,
        quality_metrics: qualityMetrics,
      },
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", task.id);
    await admin.from("gt_agent_run_ledger").update({
      status: "completed",
      output_summary: {
        recommendation_session_id: recommendationSession.id,
        events: events.length,
        venues: venues.length,
        itinerary_id: itinerary?.id || null,
        maturity_stage: memory.maturityStage,
        quality_metrics: qualityMetrics,
      },
      duration_ms: Date.now() - started,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    await admin.from("gt_agent_registry").update({
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).in("agent_key", [...PIPELINE_AGENTS, ...(action === "itinerary" ? ["gt_itinerary_optimizer", "gt_itinerary_agent"] : ["gt_concierge_agent"])]);

    return json(req, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Concierge request failed";
    console.error("GOOD TIMES intelligence failed", { user: auth.user.id, action, city, message });
    if (task?.id) {
      await admin.from("gt_agent_tasks").update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", task.id);
    }
    if (run?.id) {
      await admin.from("gt_agent_run_ledger").update({
        status: "failed",
        error_message: message,
        duration_ms: Date.now() - started,
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);
    }
    return json(req, { error: message }, 400);
  }
});
