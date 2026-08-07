import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const GATEWAY_URL = "https://dzlmtvodpyhetvektfuo.supabase.co";
const GATEWAY_KEY = "sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR";
const ALLOWED = new Set([
  "https://thegoodtimesworldwide.com",
  "https://www.thegoodtimesworldwide.com",
  "https://good-times-app.vercel.app",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:5173",
]);

function allowed(origin: string) {
  return ALLOWED.has(origin)
    || /^https:\/\/good-times-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i.test(origin)
    || /^https:\/\/good-times-app-git-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i.test(origin);
}
function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": allowed(origin) ? origin : "https://thegoodtimesworldwide.com",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST,OPTIONS",
    vary: "Origin",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "content-type": "application/json; charset=utf-8" } });
}
function iso(date = new Date()) { return date.toISOString().slice(0, 10); }
function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return iso(date);
}
function dateRange(when: string, today: string) {
  const normalized = String(when || "tonight").toLowerCase();
  if (normalized.includes("tomorrow")) return { start: addDays(today, 1), end: addDays(today, 1), label: "Tomorrow" };
  if (normalized.includes("weekend")) {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    const start = addDays(today, (5 - day + 7) % 7);
    return { start, end: addDays(start, 2), label: "This Weekend" };
  }
  return { start: today, end: today, label: "Tonight" };
}
const VIBE_CATEGORIES: Record<string, string[]> = {
  grown: ["nightlife", "dining_culinary", "dating_social"],
  turnt: ["nightlife", "concerts_live_music", "day_parties_brunch"],
  date: ["dating_social", "dining_culinary", "arts_museums_culture"],
  live: ["concerts_live_music", "nightlife"],
  food: ["dining_culinary", "day_parties_brunch"],
  culture: ["black_culture_diaspora", "arts_museums_culture"],
  free: ["free_things_to_do", "community_civic"],
  vip: ["vip_exclusive", "nightlife"],
};
const VENUE_CATEGORY_MAP: Record<string, string[]> = {
  dining_culinary: ["restaurant", "brunch", "food_hall", "coffee", "wine_bar", "fine_dining"],
  nightlife: ["nightclub", "lounge", "bar", "rooftop", "speakeasy", "hookah", "jazz", "entertainment"],
  concerts_live_music: ["event_venue", "jazz", "entertainment"],
  dating_social: ["restaurant", "rooftop", "wine_bar", "lounge", "speakeasy"],
  arts_museums_culture: ["culture", "event_venue", "entertainment"],
};
function isCustomerEvent(item: any) {
  const venue = String(item.venue_name || "").trim();
  const title = String(item.event_name || "").trim();
  const category = String(item.category_key_v2 || "").trim();
  return Boolean(title && category && category !== "needs_review" && item.ticket_url && item.image_url && venue)
    && !/^(atlanta|tba|online|virtual)$/i.test(venue)
    && !/\b(sold out|mon-fri 2026|timeshare|webinar|make money fast)\b/i.test(title);
}
function venueReady(item: any) {
  return item?.is_verified && item?.status === "active" && Boolean(item.address || item.website || item.phone || item.booking_link || item.instagram_handle);
}
function categoryMatchesVenue(item: any, categories: Set<string>) {
  if (!categories.size) return true;
  return [...categories].some((category) => (VENUE_CATEGORY_MAP[category] || []).includes(String(item.category_key || "")));
}
function areaScore(item: any, area: string) {
  const needle = String(area || "").trim().toLowerCase();
  if (!needle) return 0;
  const haystack = `${item.neighborhood || ""} ${item.side_of_town || ""} ${item.address || ""}`.toLowerCase();
  return haystack.includes(needle) ? 30 : -10;
}
function venueScore(item: any, categories: Set<string>, area: string) {
  return Number(item.quality_score || 0)
    + Number(item.google_rating || 0) * 5
    + (item.is_culture_pick ? 12 : 0)
    + (item.is_black_owned ? 5 : 0)
    + (categoryMatchesVenue(item, categories) ? 18 : 0)
    + areaScore(item, area);
}
function eventScore(item: any, categories: Set<string>) {
  return Number(item.good_times_score || 0)
    + (item.is_featured ? 15 : 0)
    + (item.is_curated ? 8 : 0)
    + (categories.size && categories.has(String(item.category_key_v2 || "")) ? 25 : 0)
    - Number(item.display_priority || 50) * .15;
}
function stopFromVenue(item: any, role: string, time: string) {
  return { id:`venue:${item.id}`,type:"venue",role,name:item.name,venue:item.name,address:item.address,neighborhood:item.neighborhood,time,image:item.hero_image,image_url:item.hero_image,booking_link:item.booking_link,website:item.website,phone:item.phone };
}
function stopFromEvent(item: any, role = "Main Move") {
  return { id:`show:${item.id}`,type:"event",role,name:item.event_name,venue:item.venue_name,date:item.show_date,time:item.show_time||"21:30",image:item.image_url,image_url:item.image_url,ticket_url:item.ticket_url,category_key:item.category_key_v2,subcategory_key:item.subcategory_key_v2 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && !allowed(origin)) return json(req, { error: "Origin not allowed" }, 403);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(req, { error: "Concierge configuration unavailable" }, 503);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "Authentication required" }, 401);
  const userClient = createClient(url, anon, { auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}} });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json(req, { error: "Invalid or expired session" }, 401);
  let input: any = {};
  try { input = await req.json(); } catch { return json(req, { error: "Invalid request" }, 400); }
  const city = String(input.city || "atlanta").toLowerCase().replace(/[\s-]+/g, "_");
  const range = dateRange(input.when || input.query, String(input.today || iso()));
  const vibes = Array.isArray(input.vibes) ? input.vibes.map(String) : [];
  const categories = new Set(vibes.flatMap((value: string) => VIBE_CATEGORIES[value] || []));
  const area = String(input.area || "");
  const gateway = createClient(GATEWAY_URL, GATEWAY_KEY, { auth:{persistSession:false,autoRefreshToken:false} });
  const admin = createClient(url, service, { auth:{persistSession:false,autoRefreshToken:false} });
  try {
    const [{data:eventRows,error:eventError},{data:venueRows,error:venueError}] = await Promise.all([
      gateway.from("gt_shows").select("id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,image_url,organizer,display_priority,good_times_score,category_key_v2,subcategory_key_v2,is_featured,is_curated,status").eq("city_key",city).gte("show_date",range.start).lte("show_date",range.end).in("status",["confirmed","tentative"]).order("display_priority",{ascending:true,nullsFirst:false}).order("show_date",{ascending:true}).limit(180),
      gateway.from("gt_venues").select("id,name,city_key,neighborhood,side_of_town,category_key,subcategory,address,latitude,longitude,phone,website,instagram_handle,short_desc,vibe_tags,price_range,status,is_featured,is_verified,quality_score,hero_image,booking_link,google_rating,google_reviews,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_score").eq("city_key",city).eq("status","active").eq("is_verified",true).order("quality_score",{ascending:false,nullsFirst:false}).limit(600),
    ]);
    if(eventError)throw eventError;if(venueError)throw venueError;
    const events=(eventRows||[]).filter(isCustomerEvent).sort((a:any,b:any)=>eventScore(b,categories)-eventScore(a,categories));
    const venues=(venueRows||[]).filter(venueReady).sort((a:any,b:any)=>venueScore(b,categories,area)-venueScore(a,categories,area));
    const dining=venues.filter((item:any)=>["restaurant","brunch","food_hall","wine_bar","fine_dining"].includes(String(item.category_key)));
    const nightlife=venues.filter((item:any)=>["nightclub","lounge","bar","rooftop","speakeasy","hookah","jazz","entertainment"].includes(String(item.category_key)));
    const activity=venues.filter((item:any)=>!dining.includes(item)&&!nightlife.includes(item));
    const start=dining[0]||venues[0];const anchor=events[0]||null;const finish=nightlife.find((item:any)=>item.id!==start?.id)||activity.find((item:any)=>item.id!==start?.id)||venues.find((item:any)=>item.id!==start?.id);
    const stops=[start&&stopFromVenue(start,"Start","19:00"),anchor&&stopFromEvent(anchor),finish&&stopFromVenue(finish,"Finish",anchor?.show_time?"23:30":"21:30")].filter(Boolean);
    if(!stops.length)return json(req,{error:"No customer-ready inventory is available for this request."},422);
    const occasion=String(input.occasion||"A night out").trim();const name=`${occasion||"GOOD TIMES"} — ${range.label}`;
    const save=await admin.from("itineraries").insert({user_id:auth.user.id,name,city_id:city,itinerary_date:range.start,stops,estimated_duration:stops.length>=3?"4-6 hours":"2-4 hours",group_size:Math.max(1,Math.min(100,Number(input.party_size||input.group||2))),status:"draft",created_by:"ai",vibe_profile:{vibes,area,budget:input.budget||"mid"},metadata:{source:"good-times-live-concierge",inventory_events:events.length,inventory_venues:venues.length}}).select().single();
    if(save.error)throw save.error;
    return json(req,{ok:true,source:"good-times-live-concierge",itinerary:save.data,events:events.slice(0,12).map((item:any)=>stopFromEvent(item,"Option")),venues:venues.slice(0,12),inventory:{events:events.length,venues:venues.length},truth:{source_data_only:true,reservations_not_assumed:true}});
  } catch(error){console.error("GOOD TIMES live concierge failed",{city,message:error instanceof Error?error.message:String(error)});return json(req,{error:error instanceof Error?error.message:"Build My Night failed"},500);}
});
