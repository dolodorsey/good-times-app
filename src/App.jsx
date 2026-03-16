import { useState, useEffect, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════
// GOOD TIMES™ — VENUE DISCOVERY + EVENTS v2.0
// Real data from Supabase gt_venues + events
// ═══════════════════════════════════════════════

const C = {
  bg: "#06060C", bgCard: "#0E0E18", bgSheet: "#12121E", bgEl: "#161624",
  gold: "#D4A853", goldDim: "rgba(212,168,83,0.15)",
  text: "#F2F0EB", textSec: "#8A8A7F", muted: "#555550",
  a1: "#FF6B6B", a2: "#6BFFB8", a3: "#6BB8FF", a4: "#FFB86B", a5: "#B86BFF", a6: "#FF6BB8",
  glass: "rgba(14,14,24,0.92)", overlay: "rgba(6,6,12,0.88)"
};
const G = { f: "'DM Sans',sans-serif", s: "'Playfair Display',Georgia,serif" };
const chip = (a) => ({ background: a ? `linear-gradient(135deg,${C.gold},#B8942F)` : "rgba(255,255,255,0.05)", color: a ? "#0A0A0F" : C.textSec, border: "none", borderRadius: 99, padding: "7px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: G.f, letterSpacing: 0.5, transition: "all 0.2s" });
const card = { background: C.bgCard, border: `1px solid ${C.goldDim}`, borderRadius: 22 };

// ═══ SUPABASE CONFIG ═══
// Main KHG Supabase (gt_venues)
const SUPA_MAIN = "https://dzlmtvodpyhetvektfuo.supabase.co/rest/v1";
const SK_MAIN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bG10dm9kcHloZXR2ZWt0ZnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODQ4NjQsImV4cCI6MjA4NTE2MDg2NH0.qmnWB4aWdb7U8Iod9Hv8PQAOJO3AG0vYEGnPS--kfAo";
// Secondary Supabase (events)
const SUPA_EV = "https://czocqfaovfpjweayniuw.supabase.co/rest/v1";
const SK_EV = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NxZmFvdmZwandlYXluaXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzEzODAsImV4cCI6MjA4Mzk0NzM4MH0.6-3rmA9tZXHLVg5N6a_82rKA9Kvrj4gRrUUiSczovho";

const supa = async (ep, base = SUPA_MAIN, key = SK_MAIN) => {
  try {
    const r = await fetch(`${base}/${ep}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    return r.ok ? await r.json() : [];
  } catch { return []; }
};

const FALLBACK_IMG = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";

const CITIES = [
  { id: "atlanta", name: "Atlanta", key: "atlanta" },
  { id: "houston", name: "Houston", key: "houston" },
  { id: "los_angeles", name: "Los Angeles", key: "los_angeles" },
  { id: "miami", name: "Miami", key: "miami" },
  { id: "washington_dc", name: "Washington DC", key: "washington_dc" },
  { id: "charlotte", name: "Charlotte", key: "charlotte" },
  { id: "dallas", name: "Dallas", key: "dallas" },
  { id: "new_york", name: "New York", key: "new_york" },
  { id: "phoenix", name: "Phoenix", key: "phoenix" },
  { id: "scottsdale", name: "Scottsdale", key: "scottsdale" },
];

// Category display config — maps category_key to user-friendly display
const CATEGORIES = [
  { key: "restaurant", name: "Restaurants", icon: "🍽", color: "#FFB86B" },
  { key: "nightclub", name: "Nightclubs", icon: "🌙", color: "#B86BFF" },
  { key: "brunch", name: "Brunch", icon: "🥂", color: "#E8A0BF" },
  { key: "coffee", name: "Coffee", icon: "☕", color: "#C39BD3" },
  { key: "bar", name: "Bars", icon: "🍸", color: "#FF6B6B" },
  { key: "rooftop", name: "Rooftops", icon: "🏙", color: "#6BB8FF" },
  { key: "event_venue", name: "Event Venues", icon: "🎪", color: "#FFD700" },
  { key: "speakeasy", name: "Speakeasies", icon: "🗝", color: "#D4A853" },
  { key: "jazz", name: "Jazz", icon: "🎷", color: "#6BFFB8" },
  { key: "lounge", name: "Lounges", icon: "🛋", color: "#FF69B4" },
  { key: "comedy", name: "Comedy", icon: "😂", color: "#FFB86B" },
  { key: "sports_bar", name: "Sports Bars", icon: "🏟", color: "#6BFFB8" },
  { key: "hookah", name: "Hookah", icon: "💨", color: "#B86BFF" },
  { key: "food_hall", name: "Food Halls", icon: "🏬", color: "#FF6B6B" },
  { key: "wine_bar", name: "Wine Bars", icon: "🍷", color: "#C39BD3" },
  { key: "pool_party", name: "Pool Parties", icon: "🏊", color: "#6BB8FF" },
  { key: "day_party", name: "Day Parties", icon: "☀️", color: "#FFD700" },
  { key: "spa", name: "Spa & Wellness", icon: "🧖", color: "#90EE90" },
  { key: "shopping", name: "Shopping", icon: "🛍", color: "#E8A0BF" },
  { key: "culture", name: "Culture", icon: "🎨", color: "#FF69B4" },
  { key: "entertainment", name: "Entertainment", icon: "🎭", color: "#FFB86B" },
  { key: "food_truck", name: "Food Trucks", icon: "🚚", color: "#FF6B6B" },
  { key: "gym", name: "Fitness", icon: "💪", color: "#6BFFB8" },
  { key: "outdoor_adventures", name: "Outdoors", icon: "🌿", color: "#90EE90" },
  { key: "experiences", name: "Experiences", icon: "✨", color: "#D4A853" },
  { key: "housing", name: "Hotels", icon: "🏨", color: "#6BB8FF" },
  { key: "fitness", name: "Fitness", icon: "🏋️", color: "#6BFFB8" },
  { key: "wellness", name: "Wellness", icon: "🧘", color: "#90EE90" },
  { key: "services", name: "Services", icon: "✂️", color: "#C39BD3" },
  { key: "beauty", name: "Beauty", icon: "💅", color: "#FF69B4" },
  { key: "special_events", name: "Special Events", icon: "🎉", color: "#FFD700" },
  { key: "event_creative", name: "Creative Spaces", icon: "🎬", color: "#B86BFF" },
  { key: "food_and_dining", name: "Fine Dining", icon: "🥘", color: "#FFB86B" },
  { key: "bookings", name: "Bookings", icon: "📋", color: "#6BB8FF" },
];

const getCatInfo = (key) => CATEGORIES.find(c => c.key === key) || { name: key, icon: "📍", color: C.gold };

// ═══ MAIN APP ═══
export default function GoodTimes() {
  const [screen, setScreen] = useState("splash");
  const [tab, setTab] = useState("discover");
  const [city, setCity] = useState(CITIES[0]);
  const [showCity, setShowCity] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [saved, setSaved] = useState([]);
  const [toast, setToast] = useState(null);
  const [catCounts, setCatCounts] = useState({});
  const [imgErrors, setImgErrors] = useState({});

  // ═══ SPLASH ═══
  useEffect(() => { const t = setTimeout(() => setScreen("discover"), 2200); return () => clearTimeout(t); }, []);

  // ═══ LOAD VENUES FOR SELECTED CITY ═══
  useEffect(() => {
    if (screen === "splash") return;
    (async () => {
      setLoading(true);
      const v = await supa(`gt_venues?city_key=eq.${city.key}&status=eq.active&select=*&order=name.asc&limit=500`);
      setVenues(v);
      // Build category counts
      const counts = {};
      v.forEach(venue => {
        const k = venue.category_key || "other";
        counts[k] = (counts[k] || 0) + 1;
      });
      setCatCounts(counts);
      setLoading(false);
    })();
  }, [city, screen]);

  // ═══ LOAD EVENTS ═══
  useEffect(() => {
    (async () => {
      const ev = await supa("events?select=*&order=date.asc&limit=100", SUPA_EV, SK_EV);
      setEvents(ev);
    })();
  }, []);

  // ═══ DERIVED DATA ═══
  const cityCategories = useMemo(() => {
    const keys = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);
    return keys.map(k => ({ ...getCatInfo(k), count: catCounts[k] })).filter(c => c.count > 0);
  }, [catCounts]);

  const catVenues = useMemo(() => {
    if (!selectedCat) return [];
    return venues.filter(v => v.category_key === selectedCat.key);
  }, [venues, selectedCat]);

  const featuredVenues = useMemo(() => venues.filter(v => v.is_featured).slice(0, 8), [venues]);
  const topVenues = useMemo(() => venues.filter(v => v.hero_image).slice(0, 12), [venues]);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return events.filter(e => e.date >= today && (e.city === city.name || e.city === "TBA")).sort((a, b) => a.date.localeCompare(b.date));
  }, [events, city]);

  const searchResults = useMemo(() => {
    if (!searchQ.trim()) return { venues: [], events: [] };
    const q = searchQ.toLowerCase();
    return {
      venues: venues.filter(v => v.name?.toLowerCase().includes(q) || v.subcategory?.toLowerCase().includes(q) || v.neighborhood?.toLowerCase().includes(q) || v.category_key?.toLowerCase().includes(q)),
      events: events.filter(e => e.title?.toLowerCase().includes(q) || e.brand?.toLowerCase().includes(q))
    };
  }, [searchQ, venues, events]);

  // ═══ ACTIONS ═══
  const go = useCallback((s, t) => { setScreen(s); if (t) setTab(t); }, []);
  const toggleSave = (id) => {
    const rm = saved.includes(id);
    setSaved(p => rm ? p.filter(x => x !== id) : [...p, id]);
    setToast(rm ? "Removed" : "Saved ♡");
    setTimeout(() => setToast(null), 1800);
  };

  const getVenueImg = (v) => {
    if (imgErrors[v.id]) return FALLBACK_IMG;
    if (v.hero_image && v.hero_image.startsWith("http")) return v.hero_image;
    return FALLBACK_IMG;
  };

  const handleImgError = (id) => {
    setImgErrors(p => ({ ...p, [id]: true }));
  };

  // ═══ SHARED UI COMPONENTS ═══
  const nightBg = (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      background: `radial-gradient(ellipse at 50% 0%,rgba(30,20,60,0.4) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(212,168,83,0.05) 0%,transparent 50%),${C.bg}` }} />
  );

  const Page = ({ children }) => (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: G.f, position: "relative", overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 90, color: C.text }}>
      {nightBg}<div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );

  const TopBar = (
    <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: "rgba(6,6,12,0.85)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <button onClick={() => setShowCity(!showCity)} style={{ ...chip(false), display: "flex", alignItems: "center", gap: 6, padding: "6px 14px" }}>
        <span style={{ fontSize: 13, color: C.gold }}>📍</span><span style={{ fontSize: 16, fontWeight: 600 }}>{city.name}</span><span style={{ fontSize: 12, color: C.muted }}>▼</span>
      </button>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setShowSearch(true)} style={{ ...chip(false), padding: "6px 12px", fontSize: 14 }}>🔍</button>
      </div>
    </div>
  );

  const NavBar = (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", background: "rgba(6,6,12,0.92)", borderTop: "1px solid rgba(255,255,255,0.04)", padding: "8px 0 env(safe-area-inset-bottom, 8px)" }}>
      <div style={{ display: "flex", justifyContent: "space-around", maxWidth: 430, margin: "0 auto" }}>
        {[
          { id: "discover", icon: "🏠", label: "Discover" },
          { id: "explore", icon: "🧭", label: "Explore" },
          { id: "events", icon: "🎫", label: "Events" },
          { id: "saved", icon: "♡", label: "Saved" },
        ].map(n => (
          <button key={n.id} onClick={() => { setScreen(n.id); setTab(n.id); setSelectedCat(null); setSelectedVenue(null); setSelectedEvent(null); }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 16px", opacity: tab === n.id ? 1 : 0.4, transition: "all 0.2s" }}>
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: tab === n.id ? C.gold : C.muted }}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ═══ OVERLAYS ═══
  const CitySheet = showCity && (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: C.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowCity(false)}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: C.bgSheet, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxHeight: "70vh", overflowY: "auto", animation: "slideUp 0.3s ease-out" }}>
        <div style={{ fontSize: 13, letterSpacing: 4, color: C.gold, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>SELECT CITY</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CITIES.map(c => (
            <button key={c.id} onClick={() => { setCity(c); setShowCity(false); setSelectedCat(null); }}
              style={{ ...card, padding: 14, cursor: "pointer", textAlign: "center", border: city.id === c.id ? `2px solid ${C.gold}` : card.border, transition: "all 0.2s" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: city.id === c.id ? C.gold : C.text }}>{c.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const SearchSheet = showSearch && (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: C.overlay }} onClick={() => { setShowSearch(false); setSearchQ(""); }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", background: C.bgSheet, padding: 20, minHeight: "100vh" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search venues, events..." autoFocus
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.goldDim}`, borderRadius: 12, padding: "16px 20px", color: C.text, fontSize: 14, fontFamily: G.f, outline: "none" }} />
          <button onClick={() => { setShowSearch(false); setSearchQ(""); }} style={{ ...chip(false), padding: "10px 16px" }}>✕</button>
        </div>
        {searchQ.trim() && (
          <>
            {searchResults.venues.length > 0 && (
              <>
                <div style={{ fontSize: 12, letterSpacing: 3, color: C.gold, fontWeight: 600, marginBottom: 10 }}>VENUES</div>
                {searchResults.venues.slice(0, 8).map(v => (
                  <button key={v.id} onClick={() => { setSelectedVenue(v); setShowSearch(false); setSearchQ(""); setScreen("venueDetail"); }}
                    style={{ ...card, width: "100%", padding: 12, marginBottom: 8, cursor: "pointer", textAlign: "left", display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 50, height: 50, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: C.bgEl }}>
                      <img src={getVenueImg(v)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => handleImgError(v.id)} loading="lazy" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: getCatInfo(v.category_key).color }}>{getCatInfo(v.category_key).icon} {getCatInfo(v.category_key).name}{v.neighborhood ? ` · ${v.neighborhood}` : ""}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {searchResults.events.length > 0 && (
              <>
                <div style={{ fontSize: 12, letterSpacing: 3, color: C.gold, fontWeight: 600, marginBottom: 10, marginTop: 16 }}>EVENTS</div>
                {searchResults.events.slice(0, 5).map(e => (
                  <button key={e.id} onClick={() => { setSelectedEvent(e); setShowSearch(false); setSearchQ(""); setScreen("eventDetail"); }}
                    style={{ ...card, width: "100%", padding: 12, marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: C.gold }}>{e.brand} · {e.city}</div>
                  </button>
                ))}
              </>
            )}
            {searchResults.venues.length === 0 && searchResults.events.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No results for "{searchQ}"</div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ═══ VENUE CARD ═══
  const VenueCard = ({ v, compact }) => {
    const cat = getCatInfo(v.category_key);
    const hasImg = v.hero_image && !imgErrors[v.id];
    return (
      <button onClick={() => { setSelectedVenue(v); setScreen("venueDetail"); }}
        style={{ ...card, width: compact ? 220 : "100%", flexShrink: 0, cursor: "pointer", overflow: "hidden", padding: 0, textAlign: "left", fontFamily: G.f, transition: "transform 0.2s" }}>
        <div style={{ height: compact ? 130 : 180, position: "relative", overflow: "hidden", background: C.bgEl }}>
          <img src={getVenueImg(v)} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: hasImg ? "brightness(0.75) saturate(1.1)" : "brightness(0.3)" }}
            onError={() => handleImgError(v.id)} loading="lazy" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(6,6,12,0.05),rgba(6,6,12,0.85) 85%)" }} />
          {v.price_range && <div style={{ position: "absolute", top: 10, right: 10, ...chip(false), padding: "3px 8px", fontSize: 11, background: "rgba(0,0,0,0.5)", color: C.gold }}>{v.price_range}</div>}
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, background: "rgba(0,0,0,0.5)", fontSize: 11, color: cat.color }}>
            <span>{cat.icon}</span><span style={{ fontWeight: 600 }}>{cat.name}</span>
          </div>
        </div>
        <div style={{ padding: compact ? "10px 12px" : "12px 16px" }}>
          <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: C.text, marginBottom: 3, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
          {v.neighborhood && <div style={{ fontSize: 12, color: C.textSec, marginBottom: 2 }}>📍 {v.neighborhood}</div>}
          {v.short_desc && !compact && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{v.short_desc}</div>}
          {v.vibe_tags && v.vibe_tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
              {(Array.isArray(v.vibe_tags) ? v.vibe_tags : []).slice(0, compact ? 2 : 3).map((t, i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(255,255,255,0.04)", color: C.textSec }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </button>
    );
  };

  // ═══ EVENT CARD ═══
  const EventCard = ({ e, compact }) => {
    const d = e.date ? new Date(e.date + "T12:00:00") : null;
    return (
      <button onClick={() => { setSelectedEvent(e); setScreen("eventDetail"); }}
        style={{ ...card, width: compact ? 240 : "100%", flexShrink: 0, cursor: "pointer", overflow: "hidden", padding: 0, textAlign: "left", fontFamily: G.f }}>
        <div style={{ height: compact ? 130 : 170, position: "relative", overflow: "hidden", background: C.bgEl }}>
          <img src={e.image_url || FALLBACK_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.2) brightness(0.65)" }} loading="lazy" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(6,6,12,0.1),rgba(6,6,12,0.85) 85%)" }} />
          {e.price > 0 && <div style={{ position: "absolute", top: 10, right: 10, ...chip(true), padding: "3px 10px", fontSize: 12 }}>${e.price}</div>}
        </div>
        <div style={{ padding: compact ? "10px 12px" : "12px 16px" }}>
          <div style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: C.text, marginBottom: 3, lineHeight: 1.3 }}>{e.title}</div>
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, marginBottom: 2 }}>{e.brand}</div>
          {d && <div style={{ fontSize: 12, color: C.textSec }}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {e.city}</div>}
        </div>
      </button>
    );
  };

  const SectionLabel = ({ t, icon, color, action }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", marginBottom: 12, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <span style={{ fontSize: 12, letterSpacing: 3, color: color || C.gold, fontWeight: 700 }}>{t}</span>
      </div>
      {action && <button onClick={action.fn} style={{ ...chip(false), padding: "4px 12px", fontSize: 12 }}>{action.l}</button>}
    </div>
  );

  const SkeletonCards = ({ n = 3, compact }) => (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "0 20px" }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ ...card, width: compact ? 220 : "100%", height: compact ? 200 : 260, flexShrink: 0, overflow: "hidden", padding: 0 }}>
          <div className="skeleton" style={{ width: "100%", height: compact ? 130 : 180 }} />
          <div style={{ padding: 14 }}><div className="skeleton" style={{ width: "70%", height: 14, borderRadius: 8, marginBottom: 8 }} /><div className="skeleton" style={{ width: "50%", height: 12, borderRadius: 8 }} /></div>
        </div>
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════
  // SCREENS
  // ═══════════════════════════════════════════════

  // SPLASH
  if (screen === "splash") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%,rgba(30,20,60,0.5) 0%,transparent 55%),radial-gradient(ellipse at 80% 100%,rgba(212,168,83,0.06) 0%,transparent 45%),${C.bg}` }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "48px 40px", borderRadius: 26, background: "rgba(14,14,24,0.45)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(212,168,83,0.12)", animation: "fadeIn 1s ease-out" }}>
        <div style={{ fontSize: 14, letterSpacing: 8, color: C.gold, fontWeight: 700, fontFamily: G.f, marginBottom: 16, animation: "fadeIn 0.6s ease-out" }}>GOOD TIMES™</div>
        <div style={{ fontSize: 36, fontFamily: G.s, color: C.text, fontWeight: 300, animation: "fadeIn 0.8s ease-out 0.3s both" }}>What's the move?</div>
        <div style={{ marginTop: 28, width: 60, height: 2, margin: "28px auto 0", background: `linear-gradient(90deg,transparent,${C.gold},transparent)`, animation: "shimmer 2s ease-in-out infinite" }} />
        <div style={{ fontSize: 13, letterSpacing: 4, color: C.muted, fontWeight: 600, marginTop: 18, animation: "fadeIn 1s ease-out 1.2s both" }}>Entering...</div>
      </div>
    </div>
  );

  // ═══ DISCOVER (HOME) ═══
  if (screen === "discover") return (
    <Page>
      {TopBar}{CitySheet}{SearchSheet}
      <div style={{ padding: "0 0 20px" }}>
        <div style={{ padding: "8px 20px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: 6, color: C.gold, fontWeight: 700, marginBottom: 6 }}>GOOD TIMES™</div>
          <div style={{ fontSize: 40, fontFamily: G.s, fontWeight: 300, lineHeight: 1.15, marginBottom: 6 }}>What's the move?</div>
          <div style={{ fontSize: 14, color: C.textSec }}>{city.name} · {venues.length} venues · {cityCategories.length} categories</div>
        </div>

        {/* Quick Category Chips */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 20px", marginBottom: 20 }}>
          {cityCategories.slice(0, 8).map(cat => (
            <button key={cat.key} onClick={() => { setSelectedCat(cat); setScreen("categoryList"); }}
              style={{ ...chip(false), padding: "8px 14px", border: `1px solid ${cat.color}30`, color: cat.color, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
              {cat.icon} {cat.name} <span style={{ color: C.muted, marginLeft: 4 }}>{cat.count}</span>
            </button>
          ))}
        </div>

        {/* Top Venues with Images */}
        <SectionLabel t="TOP PICKS" icon="✦" color={C.gold} />
        {loading ? <SkeletonCards compact /> : (
          <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "0 20px", marginBottom: 24 }}>
            {topVenues.slice(0, 8).map(v => <VenueCard key={v.id} v={v} compact />)}
            {topVenues.length === 0 && <div style={{ padding: 20, color: C.muted, textAlign: "center", width: "100%" }}>No venues with images yet for {city.name}</div>}
          </div>
        )}

        {/* Upcoming Events */}
        {upcoming.length > 0 && (
          <>
            <SectionLabel t="UPCOMING EVENTS" icon="🎫" color={C.a3} action={{ l: "See All", fn: () => { setScreen("events"); setTab("events"); } }} />
            <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "0 20px", marginBottom: 24 }}>
              {upcoming.slice(0, 6).map(e => <EventCard key={e.id} e={e} compact />)}
            </div>
          </>
        )}

        {/* Category Grid */}
        <SectionLabel t="EXPLORE CATEGORIES" icon="🧭" color={C.a4} action={{ l: "All", fn: () => { setScreen("explore"); setTab("explore"); } }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "0 20px", marginBottom: 24 }}>
          {cityCategories.slice(0, 9).map(cat => (
            <button key={cat.key} onClick={() => { setSelectedCat(cat); setScreen("categoryList"); }}
              style={{ ...card, padding: "16px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{cat.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, marginBottom: 2 }}>{cat.name}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{cat.count}</div>
            </button>
          ))}
        </div>

        {/* Featured Venues */}
        {featuredVenues.length > 0 && (
          <>
            <SectionLabel t="FEATURED" icon="⭐" color={C.gold} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 20px", marginBottom: 20 }}>
              {featuredVenues.slice(0, 4).map(v => <VenueCard key={v.id} v={v} />)}
            </div>
          </>
        )}
      </div>
      {NavBar}
    </Page>
  );

  // ═══ EXPLORE (ALL CATEGORIES) ═══
  if (screen === "explore") return (
    <Page>
      {TopBar}{CitySheet}{SearchSheet}
      <div style={{ padding: "8px 20px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: C.gold, fontWeight: 700, marginBottom: 6 }}>EXPLORE</div>
          <div style={{ fontSize: 32, fontFamily: G.s, fontWeight: 300, marginBottom: 4 }}>{city.name}</div>
          <div style={{ fontSize: 14, color: C.textSec }}>{cityCategories.length} categories · {venues.length} venues</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {cityCategories.map(cat => (
            <button key={cat.key} onClick={() => { setSelectedCat(cat); setScreen("categoryList"); }}
              style={{ ...card, padding: "20px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.2s", borderLeft: `3px solid ${cat.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: cat.color }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{cat.count} spots</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      {NavBar}
    </Page>
  );

  // ═══ CATEGORY LIST ═══
  if (screen === "categoryList" && selectedCat) return (
    <Page>
      <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: "rgba(6,6,12,0.85)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <button onClick={() => setScreen(tab)} style={{ ...chip(false), padding: "6px 12px", fontSize: 16 }}>←</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: selectedCat.color }}>{selectedCat.icon} {selectedCat.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{catVenues.length} in {city.name}</div>
        </div>
      </div>
      {CitySheet}{SearchSheet}
      <div style={{ padding: "12px 20px" }}>
        {/* Subcategory chips if any */}
        {(() => {
          const subs = [...new Set(catVenues.filter(v => v.subcategory).map(v => v.subcategory))];
          if (subs.length === 0) return null;
          return (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
              {subs.map(s => (
                <span key={s} style={{ ...chip(false), padding: "5px 12px", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, color: selectedCat.color, border: `1px solid ${selectedCat.color}30` }}>{s}</span>
              ))}
            </div>
          );
        })()}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {catVenues.map(v => <VenueCard key={v.id} v={v} />)}
          {catVenues.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No venues in this category for {city.name} yet.</div>}
        </div>
      </div>
      {NavBar}
    </Page>
  );

  // ═══ VENUE DETAIL ═══
  if (screen === "venueDetail" && selectedVenue) {
    const v = selectedVenue;
    const cat = getCatInfo(v.category_key);
    const isSaved = saved.includes(v.id);
    return (
      <Page>
        <div style={{ position: "relative" }}>
          <div style={{ height: 280, position: "relative", overflow: "hidden", background: C.bgEl }}>
            <img src={getVenueImg(v)} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.6) saturate(1.1)" }} onError={() => handleImgError(v.id)} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(6,6,12,0.3) 0%,rgba(6,6,12,0.95) 85%)" }} />
            <button onClick={() => setScreen(tab)} style={{ position: "absolute", top: 16, left: 16, ...chip(false), padding: "8px 14px", fontSize: 16, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>←</button>
            <button onClick={() => toggleSave(v.id)} style={{ position: "absolute", top: 16, right: 16, ...chip(false), padding: "8px 14px", fontSize: 18, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", color: isSaved ? C.gold : C.text }}>{isSaved ? "♥" : "♡"}</button>
          </div>
          <div style={{ padding: "0 20px", marginTop: -60, position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 99, background: `${cat.color}20`, color: cat.color, fontWeight: 600 }}>{cat.icon} {cat.name}</span>
              {v.subcategory && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 99, background: "rgba(255,255,255,0.05)", color: C.textSec }}>{v.subcategory}</span>}
            </div>
            <div style={{ fontSize: 28, fontFamily: G.s, fontWeight: 400, marginBottom: 6, lineHeight: 1.2 }}>{v.name}</div>
            {v.neighborhood && <div style={{ fontSize: 14, color: C.textSec, marginBottom: 6 }}>📍 {v.neighborhood}{v.side_of_town ? ` · ${v.side_of_town}` : ""}</div>}
            {v.address && <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{v.address}</div>}

            {/* Quick Info Row */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              {v.price_range && <span style={{ ...chip(false), padding: "5px 12px", fontSize: 12 }}>💰 {v.price_range}</span>}
              {v.google_rating && <span style={{ ...chip(false), padding: "5px 12px", fontSize: 12 }}>⭐ {v.google_rating}{v.google_reviews ? ` (${v.google_reviews})` : ""}</span>}
              {v.people_score && <span style={{ ...chip(false), padding: "5px 12px", fontSize: 12 }}>👥 {v.people_score}/10</span>}
              {v.age_range && <span style={{ ...chip(false), padding: "5px 12px", fontSize: 12 }}>🎂 {v.age_range}</span>}
              {v.dress_code && <span style={{ ...chip(false), padding: "5px 12px", fontSize: 12 }}>👔 {v.dress_code}</span>}
            </div>

            {/* Description */}
            {(v.short_desc || v.long_desc) && (
              <div style={{ ...card, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{v.long_desc || v.short_desc}</div>
              </div>
            )}

            {/* Vibe Tags */}
            {v.vibe_tags && (Array.isArray(v.vibe_tags) ? v.vibe_tags : []).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 8 }}>VIBE</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(Array.isArray(v.vibe_tags) ? v.vibe_tags : []).map((t, i) => (
                    <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: "rgba(255,255,255,0.05)", color: C.textSec, border: "1px solid rgba(255,255,255,0.06)" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {v.best_for && <div style={{ ...card, padding: 14 }}><div style={{ fontSize: 10, letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 4 }}>BEST FOR</div><div style={{ fontSize: 13, color: C.text }}>{v.best_for}</div></div>}
              {v.best_time && <div style={{ ...card, padding: 14 }}><div style={{ fontSize: 10, letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 4 }}>BEST TIME</div><div style={{ fontSize: 13, color: C.text }}>{v.best_time}</div></div>}
              {v.featured_item && <div style={{ ...card, padding: 14 }}><div style={{ fontSize: 10, letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 4 }}>MUST TRY</div><div style={{ fontSize: 13, color: C.text }}>{v.featured_item}</div></div>}
              {v.hours_summary && <div style={{ ...card, padding: 14 }}><div style={{ fontSize: 10, letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 4 }}>HOURS</div><div style={{ fontSize: 13, color: C.text }}>{v.hours_summary}</div></div>}
            </div>

            {/* Insider Tip */}
            {v.insider_tip && (
              <div style={{ ...card, padding: "16px 18px", marginBottom: 14, borderLeft: `3px solid ${C.gold}` }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: C.gold, fontWeight: 600, marginBottom: 6 }}>INSIDER TIP</div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, fontStyle: "italic" }}>{v.insider_tip}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {v.website && <a href={v.website} target="_blank" rel="noopener noreferrer" style={{ ...chip(true), padding: "12px 20px", fontSize: 14, textDecoration: "none", flex: 1, textAlign: "center" }}>Visit Website</a>}
              {v.booking_link && <a href={v.booking_link} target="_blank" rel="noopener noreferrer" style={{ ...chip(true), padding: "12px 20px", fontSize: 14, textDecoration: "none", flex: 1, textAlign: "center" }}>Book Now</a>}
              {v.phone && <a href={`tel:${v.phone}`} style={{ ...chip(false), padding: "12px 20px", fontSize: 14, textDecoration: "none", border: `1px solid ${C.goldDim}` }}>📞 Call</a>}
              {v.instagram_handle && <a href={`https://instagram.com/${v.instagram_handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ ...chip(false), padding: "12px 20px", fontSize: 14, textDecoration: "none", border: `1px solid ${C.goldDim}` }}>📸 IG</a>}
            </div>
          </div>
        </div>
        {NavBar}
      </Page>
    );
  }

  // ═══ EVENTS ═══
  if (screen === "events") return (
    <Page>
      {TopBar}{CitySheet}{SearchSheet}
      <div style={{ padding: "8px 20px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: C.gold, fontWeight: 700, marginBottom: 6 }}>EVENTS</div>
          <div style={{ fontSize: 32, fontFamily: G.s, fontWeight: 300, marginBottom: 4 }}>What's Happening</div>
          <div style={{ fontSize: 14, color: C.textSec }}>{upcoming.length} upcoming in {city.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {upcoming.map(e => <EventCard key={e.id} e={e} />)}
          {upcoming.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No upcoming events for {city.name} yet. Check back soon!</div>}
        </div>
      </div>
      {NavBar}
    </Page>
  );

  // ═══ EVENT DETAIL ═══
  if (screen === "eventDetail" && selectedEvent) {
    const e = selectedEvent;
    const d = e.date ? new Date(e.date + "T12:00:00") : null;
    return (
      <Page>
        <div style={{ height: 260, position: "relative", overflow: "hidden", background: C.bgEl }}>
          <img src={e.image_url || FALLBACK_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.2) brightness(0.5)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(6,6,12,0.2),rgba(6,6,12,0.95) 80%)" }} />
          <button onClick={() => { setScreen("events"); setTab("events"); }} style={{ position: "absolute", top: 16, left: 16, ...chip(false), padding: "8px 14px", fontSize: 16, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>←</button>
        </div>
        <div style={{ padding: "0 20px", marginTop: -50, position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>{e.brand}</div>
          <div style={{ fontSize: 28, fontFamily: G.s, fontWeight: 400, marginBottom: 8, lineHeight: 1.2 }}>{e.title}</div>
          {d && <div style={{ fontSize: 16, color: C.textSec, marginBottom: 6 }}>📅 {d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>}
          {e.time && <div style={{ fontSize: 14, color: C.muted, marginBottom: 6 }}>⏰ {e.time}{e.end_time ? ` — ${e.end_time}` : ""}</div>}
          {e.venue && <div style={{ fontSize: 14, color: C.textSec, marginBottom: 6 }}>📍 {e.venue} · {e.city}</div>}
          {e.description && <div style={{ ...card, padding: "16px 18px", marginTop: 16, marginBottom: 16 }}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{e.description}</div></div>}
          {e.price > 0 && <div style={{ ...chip(true), padding: "14px 24px", fontSize: 16, textAlign: "center", width: "100%", display: "block", marginBottom: 16 }}>Get Tickets — ${e.price}</div>}
        </div>
        {NavBar}
      </Page>
    );
  }

  // ═══ SAVED ═══
  if (screen === "saved") return (
    <Page>
      {TopBar}{CitySheet}{SearchSheet}
      <div style={{ padding: "8px 20px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: C.gold, fontWeight: 700, marginBottom: 6 }}>YOUR VAULT</div>
          <div style={{ fontSize: 32, fontFamily: G.s, fontWeight: 300, marginBottom: 4 }}>Saved Spots</div>
          <div style={{ fontSize: 14, color: C.textSec }}>{saved.length} saved</div>
        </div>
        {saved.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>♡</div>
            <div style={{ fontSize: 16, color: C.muted }}>Save your favorite venues to find them here</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {venues.filter(v => saved.includes(v.id)).map(v => <VenueCard key={v.id} v={v} />)}
          </div>
        )}
      </div>
      {NavBar}
    </Page>
  );

  // Fallback
  return (
    <Page>
      {TopBar}{CitySheet}{SearchSheet}
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 32, fontFamily: G.s, marginBottom: 16 }}>Good Times™</div>
        <button onClick={() => { setScreen("discover"); setTab("discover"); }} style={{ ...chip(true), padding: "14px 28px" }}>Go Home</button>
      </div>
      {NavBar}
    </Page>
  );
}
