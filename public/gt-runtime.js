(() => {
  "use strict";
  if (window.__GT_RUNTIME_ACTIVE__) return;
  window.__GT_RUNTIME_ACTIVE__ = true;

  const GATEWAY = "https://dzlmtvodpyhetvektfuo.supabase.co";
  const REST = `${GATEWAY}/rest/v1`;
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bG10dm9kcHloZXR2ZWt0ZnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODQ4NjQsImV4cCI6MjA4NTE2MDg2NH0.qmnWB4aWdb7U8Iod9Hv8PQAOJO3AG0vYEGnPS--kfAo";
  const originalFetch = window.fetch.bind(window);
  const today = () => new Date().toISOString().slice(0, 10);
  const authHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` };

  const readSession = () => {
    try { return JSON.parse(localStorage.getItem("gt_session") || "null"); } catch { return null; }
  };
  const session = readSession();
  let runtimeCity = (session?.user?.user_metadata?.home_city || "atlanta").replace(/-/g, "_").toLowerCase();
  const userId = session?.user?.id || null;
  const sessionId = (() => {
    const key = "gt_runtime_session_id";
    let id = sessionStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); }
    return id;
  })();

  const sourceKey = (table, id) => `${table}:${id}`;
  let rankPromise = null;
  const loadRankedAtlanta = () => {
    if (!rankPromise) {
      const query = new URLSearchParams({
        select: "source_table,source_id,title,event_date,event_time,venue_name,raw_type,raw_category,ticket_url,image_url,organizer,display_priority,good_times_score,category_key,subcategory_key,is_featured,is_curated",
        event_date: `gte.${today()}`,
        order: "rank_order.asc",
        limit: "1000",
      });
      rankPromise = originalFetch(`${REST}/v_gt_atlanta_ranked_feed?${query}`, { headers: authHeaders })
        .then((r) => r.ok ? r.json() : [])
        .catch(() => []);
    }
    return rankPromise;
  };

  const legacyType = (category, rawType) => {
    if (["concerts_live_music"].includes(category)) return "concert";
    if (["festivals_major_activations"].includes(category)) return "festival";
    if (["comedy_performing_arts"].includes(category)) return /musical/i.test(rawType || "") ? "musical" : "play";
    if (["sports_watch"].includes(category)) return "sports";
    if (["day_parties_brunch", "dining_culinary"].includes(category)) return /brunch/i.test(rawType || "") ? "brunch" : "special_event";
    if (["nightlife", "vip_exclusive"].includes(category)) return "nightlife";
    return "special_event";
  };

  const responseWithJson = (response, data) => new Response(JSON.stringify(data), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  window.fetch = async (input, init) => {
    const rawUrl = typeof input === "string" ? input : input?.url;
    if (!rawUrl) return originalFetch(input, init);
    let url;
    try { url = new URL(rawUrl, location.href); } catch { return originalFetch(input, init); }
    const isGateway = url.origin === GATEWAY && url.pathname.startsWith("/rest/v1/");
    if (!isGateway) return originalFetch(input, init);

    const table = url.pathname.split("/").pop();
    const requestedCity = url.searchParams.get("city_key")?.replace(/^eq\./, "");
    if (requestedCity) runtimeCity = requestedCity.toLowerCase();

    if (table === "eventbrite_events" && runtimeCity === "atlanta" && !url.searchParams.has("or")) {
      url.searchParams.set("or", "(city.ilike.*atlanta*,venue_address.ilike.*atlanta*)");
    }
    if (table === "gt_city_events" && runtimeCity === "atlanta") {
      const status = url.searchParams.get("status");
      if (status === "in.(active,confirmed)") url.searchParams.set("status", "in.(active,confirmed,curated)");
    }
    if (table === "gt_venues" && runtimeCity === "atlanta" && url.searchParams.get("tonight_eligible") === "eq.true" && !url.searchParams.has("city_key")) {
      url.searchParams.set("city_key", "eq.atlanta");
    }
    if (table === "gt_sports_games" && runtimeCity === "atlanta" && !url.searchParams.has("city_key")) {
      url.searchParams.set("city_key", "eq.atlanta");
    }

    const response = await originalFetch(url.toString(), init);
    if (!response.ok || runtimeCity !== "atlanta" || !["gt_shows", "gt_city_events", "eventbrite_events"].includes(table)) return response;

    try {
      const data = await response.clone().json();
      if (!Array.isArray(data)) return response;
      const ranked = await loadRankedAtlanta();
      const byKey = new Map(ranked.map((r) => [sourceKey(r.source_table, r.source_id), r]));
      const enhanced = data.map((row) => {
        const rank = byKey.get(sourceKey(table, row.id));
        return rank ? {
          ...row,
          display_priority: rank.display_priority,
          good_times_score: rank.good_times_score,
          category_key_v2: rank.category_key,
          subcategory_key_v2: rank.subcategory_key,
          is_featured: row.is_featured || rank.is_featured || rank.display_priority <= 5,
        } : row;
      });

      if (table === "gt_shows") {
        const existing = new Set(enhanced.map((r) => `${String(r.event_name || "").toLowerCase()}|${r.show_date}`));
        for (const r of ranked) {
          if (!["gt_sourced_events", "gt_city_events", "gt_daily_events"].includes(r.source_table)) continue;
          const dedup = `${String(r.title || "").toLowerCase()}|${r.event_date}`;
          if (existing.has(dedup)) continue;
          existing.add(dedup);
          enhanced.push({
            id: `ranked-${r.source_table}-${r.source_id}`,
            event_name: r.title,
            event_type: legacyType(r.category_key, r.raw_type),
            genre: r.subcategory_key || r.raw_category,
            city_key: "atlanta",
            show_date: r.event_date,
            show_time: r.event_time,
            venue_name: r.venue_name,
            ticket_url: r.ticket_url,
            image_url: r.image_url,
            status: "confirmed",
            display_priority: r.display_priority,
            good_times_score: r.good_times_score,
            is_featured: r.is_featured || r.is_curated || r.display_priority <= 5,
            category_key_v2: r.category_key,
            subcategory_key_v2: r.subcategory_key,
          });
        }
        enhanced.sort((a, b) => (a.display_priority || 50) - (b.display_priority || 50) || String(a.show_date || "").localeCompare(String(b.show_date || "")));
      }
      return responseWithJson(response, enhanced);
    } catch {
      return response;
    }
  };

  const track = (banner, eventType, surface, extra = {}) => {
    originalFetch(`${REST}/gt_banner_events`, {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ banner_id: banner.id, event_type: eventType, city_key: runtimeCity, surface_key: surface, session_id: sessionId, user_id: userId, metadata: extra }),
      keepalive: true,
    }).catch(() => {});
  };

  const dailyCountKey = (id) => `gt_banner_${id}_${today()}`;
  const eligible = (banner) => Number(localStorage.getItem(dailyCountKey(banner.id)) || 0) < (banner.frequency_cap || 3);
  const markImpression = (banner) => {
    const key = dailyCountKey(banner.id);
    localStorage.setItem(key, String(Number(localStorage.getItem(key) || 0) + 1));
  };

  const style = document.createElement("style");
  style.id = "gt-runtime-styles";
  style.textContent = `
    .gt-motion-banner{position:relative;margin:12px 16px 18px;border-radius:16px;overflow:hidden;min-height:116px;border:1px solid rgba(212,168,83,.28);background:#0b0a12;box-shadow:0 12px 32px rgba(0,0,0,.32);isolation:isolate}
    .gt-motion-banner button{font:inherit}.gt-motion-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.72}.gt-motion-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,6,12,.94),rgba(6,6,12,.44) 72%,rgba(6,6,12,.75))}
    .gt-motion-copy{position:relative;z-index:2;padding:20px 44px 18px 18px;text-align:left}.gt-motion-kicker{font-size:9px;letter-spacing:2.4px;color:#d4a853;font-weight:800;margin-bottom:7px}.gt-motion-title{font-family:'Playfair Display',Georgia,serif;font-size:21px;line-height:1.08;color:#fff;font-weight:600}.gt-motion-sub{font-size:11px;line-height:1.45;color:rgba(255,255,255,.76);margin-top:6px;max-width:92%}
    .gt-motion-close{position:absolute;z-index:4;right:8px;top:8px;width:28px;height:28px;border-radius:50%;background:rgba(6,6,12,.64);color:#fff;border:1px solid rgba(255,255,255,.16)}
    .gt-motion-ticker{min-height:54px;display:flex;align-items:center;background:linear-gradient(90deg,#15101d,#0b0a12);white-space:nowrap}.gt-motion-track{display:inline-block;padding-left:100%;animation:gtTicker 22s linear infinite;color:#fff;font-size:12px;font-weight:700;letter-spacing:.4px}.gt-motion-track b{color:#d4a853;margin-right:14px}
    @keyframes gtTicker{to{transform:translateX(-100%)}}@media(prefers-reduced-motion:reduce){.gt-motion-track{animation:none;padding-left:16px}.gt-motion-media{display:none}}
  `;
  document.head.appendChild(style);

  let banners = [];
  let bannersLoaded = false;
  const loadBanners = async () => {
    if (bannersLoaded) return banners;
    bannersLoaded = true;
    try {
      const q = new URLSearchParams({ city_key: `eq.${runtimeCity}`, order: "priority.asc,weight.desc", limit: "30" });
      const r = await originalFetch(`${REST}/v_gt_active_banners?${q}`, { headers: authHeaders });
      banners = r.ok ? await r.json() : [];
    } catch { banners = []; }
    return banners;
  };

  const pickBanner = (surface) => banners.find((b) => Array.isArray(b.surface_keys) && b.surface_keys.includes(surface) && eligible(b));
  const renderBanner = (banner, surface) => {
    const wrap = document.createElement("div");
    wrap.className = `gt-motion-banner ${banner.media_type === "ticker" ? "gt-motion-ticker" : ""}`;
    wrap.dataset.gtBannerSurface = surface;
    wrap.dataset.gtBannerId = banner.id;
    wrap.setAttribute("role", banner.click_action_type === "none" ? "region" : "button");
    wrap.tabIndex = banner.click_action_type === "none" ? -1 : 0;

    if (banner.media_type === "ticker") {
      wrap.innerHTML = `<div class="gt-motion-track"><b>GOOD TIMES LIVE</b>${banner.headline} &nbsp; • &nbsp; ${banner.subheadline || ""} &nbsp; • &nbsp; </div>`;
    } else {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.connection?.saveData;
      if (banner.media_type === "video" && banner.media_url && !reduced) {
        const v = document.createElement("video");
        v.className = "gt-motion-media"; v.src = banner.media_url; v.poster = banner.poster_url || "";
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata";
        wrap.appendChild(v);
      } else if (banner.media_url || banner.poster_url) {
        const img = document.createElement("img"); img.className = "gt-motion-media"; img.src = banner.media_url || banner.poster_url; img.alt = ""; img.loading = "lazy"; wrap.appendChild(img);
      }
      const shade = document.createElement("div"); shade.className = "gt-motion-shade"; wrap.appendChild(shade);
      const copy = document.createElement("div"); copy.className = "gt-motion-copy";
      copy.innerHTML = `<div class="gt-motion-kicker">GOOD TIMES • ATLANTA</div><div class="gt-motion-title">${banner.headline}</div>${banner.subheadline ? `<div class="gt-motion-sub">${banner.subheadline}</div>` : ""}`;
      wrap.appendChild(copy);
    }

    const close = document.createElement("button"); close.className = "gt-motion-close"; close.type = "button"; close.setAttribute("aria-label", "Dismiss banner"); close.textContent = "×";
    close.addEventListener("click", (e) => { e.stopPropagation(); track(banner, "dismiss", surface); wrap.remove(); });
    wrap.appendChild(close);
    const activate = () => {
      track(banner, "click", surface);
      if (banner.click_action_type === "url" && banner.click_target) location.href = banner.click_target;
      else window.dispatchEvent(new CustomEvent("gt:banner-action", { detail: { banner, surface } }));
    };
    wrap.addEventListener("click", (e) => { if (e.target !== close && banner.click_action_type !== "none") activate(); });
    wrap.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && banner.click_action_type !== "none") activate(); });

    markImpression(banner); track(banner, "impression", surface);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = wrap.querySelector("video");
        if (entry.isIntersecting && entry.intersectionRatio >= .55) {
          if (!wrap.dataset.gtViewable) { wrap.dataset.gtViewable = "1"; track(banner, "viewable_impression", surface); }
          video?.play().catch(() => {});
        } else video?.pause();
      }
    }, { threshold: [.1, .55] });
    observer.observe(wrap);
    return wrap;
  };

  const findExact = (text) => [...document.querySelectorAll("div,span,h1,h2,h3")].find((el) => el.children.length === 0 && el.textContent?.trim().toUpperCase() === text.toUpperCase());
  const placements = [
    { text: "WHAT'S THE MOVE?", surface: "home_hero", mode: "after" },
    { text: "CITY HIGHLIGHTS", surface: "home_between_sections", mode: "before" },
    { text: "UPCOMING GAMES", surface: "now_feed", mode: "before" },
    { text: "UPCOMING CONCERTS", surface: "concerts_section", mode: "before" },
    { text: "EXPLORE", surface: "explore_header", mode: "after" },
    { text: "MY PLANS", surface: "saved_plans", mode: "after" },
    { text: "CONCIERGE", surface: "concierge_results", mode: "after" },
  ];

  let scanPending = false;
  const scan = async () => {
    if (scanPending) return;
    scanPending = true;
    requestAnimationFrame(async () => {
      scanPending = false;
      await loadBanners();
      if (!banners.length || runtimeCity !== "atlanta") return;
      let inserted = 0;
      for (const p of placements) {
        if (document.querySelector(`[data-gt-banner-surface="${p.surface}"]`)) continue;
        const target = findExact(p.text);
        const banner = pickBanner(p.surface);
        if (!target || !banner) continue;
        const block = renderBanner(banner, p.surface);
        const anchor = target.parentElement || target;
        if (p.mode === "before") anchor.parentElement?.insertBefore(block, anchor);
        else anchor.parentElement?.insertBefore(block, anchor.nextSibling);
        if (++inserted >= 5) break;
      }
    });
  };

  const cityObserver = new MutationObserver(() => {
    const text = document.body?.innerText || "";
    if (/Tonight in Atlanta|Today in Atlanta|Atlanta's Nightlife/i.test(text)) runtimeCity = "atlanta";
    scan();
  });
  const start = () => { cityObserver.observe(document.getElementById("root") || document.body, { childList: true, subtree: true }); scan(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
