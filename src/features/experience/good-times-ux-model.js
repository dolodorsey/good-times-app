/** GOOD TIMES only. Pure presentation contracts; no account/data migrations. */
export const UX_NAV = Object.freeze([
  ['home', '⌂', 'Home'], ['entertainment', '♫', 'Entertainment'],
  ['plan', '＋', 'Plan'], ['venues', '⌖', 'Venues'], ['profile', '◎', 'Profile'],
]);
export const HOME_MODES = Object.freeze([['for-you','For You'],['upcoming','Upcoming'],['tonight','Tonight'],['sports','Sports']]);
export const PLAN_MODES = Object.freeze([['click','Build It','Choose, step by step.'],['shake','Shake It','Let a good plan find you.'],['ask','Ask GOOD TIMES','Tell us what you have in mind.']]);
export function canonicalTab(value) {
  if (value === 'discover') return 'entertainment';
  if (value === 'saved') return 'profile';
  return UX_NAV.some(([id]) => id === value) || value === 'radar' ? value : 'home';
}
export function canonicalPlanMode(value) { return value === 'ai' ? 'ask' : value === 'custom' ? 'click' : ['click','shake','ask'].includes(value) ? value : 'click'; }
export function cityDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part = key => parts.find(x => x.type === key)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDate(value, days) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
export function cleanText(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
export function safePublicUrl(value) { try { if (/^\/(?!\/)/.test(String(value||''))) return String(value); const u = new URL(String(value || '')); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password && !/[?&](?:key|token|access_token)=/i.test(u.search) ? u.href : null; } catch { return null; } }
export function itemKey(item, type) { return `${type || (item?.event_key ? 'event' : 'venue')}:${item?.event_key || item?.id || ''}`; }
export function isExplicitlyFamily(item) {
  const keys = [item?.category_key,item?.subcategory_key,...(Array.isArray(item?.best_for)?item.best_for:[]),...(Array.isArray(item?.search_tags)?item.search_tags:[])].map(cleanText);
  return keys.some(value => /^(family kids|family friendly|families|family|kids|children|all ages)$/.test(value));
}
export function isLeisureEvent(item) {
  // Administrative/professional inventory is retained in the source catalog, not promoted as a leisure pick.
  const category=cleanText(item?.category_key||item?.category_key_v2||'');
  return !/^(business professional|business networking|professional networking|business|career jobs|healthcare|medical)$/.test(category);
}
export function diversePicks(events = [], venues = [], limit = 5) {
  if(limit<=0)return [];
  const hasImage=item=>{const image=item.image_url||item.hero_image;return !!safePublicUrl(image)&&!/(?:city-atlanta\.png|good-times-backgrounds|gt-fallback)/i.test(image)};
  const sortedEvents=events.filter(isLeisureEvent).sort((a,b)=>Number(hasImage(b))-Number(hasImage(a))||String(a.event_date||'9999').localeCompare(String(b.event_date||'9999'))||String(a.event_time||'23:59').localeCompare(String(b.event_time||'23:59')));
  const sortedVenues=[...venues].sort((a,b)=>Number(hasImage(b))-Number(hasImage(a)));
  const pool = [...sortedEvents.slice(0,2).map(item=>({type:'event',item})),...sortedVenues.slice(0,1).map(item=>({type:'venue',item})),...sortedEvents.slice(2).map(item=>({type:'event',item})),...sortedVenues.slice(1).map(item=>({type:'venue',item}))];
  const counts = new Map(), seen = new Set(), result = [];
  for (const row of pool) {
    const key = itemKey(row.item,row.type), category = row.item.category_key || row.type;
    if (seen.has(key) || (counts.get(category)||0) >= 2) continue;
    result.push(row); seen.add(key); counts.set(category,(counts.get(category)||0)+1);
    if(result.length>=limit)break;
  }
  return result;
}
export function planBucket(plan, today = cityDate()) {
  if (['draft','suggested','pending'].includes(String(plan?.status||'draft').toLowerCase()) || !plan?.itinerary_date) return 'drafts';
  return plan.itinerary_date < today ? 'past' : 'upcoming';
}
export function buildPlanPrompt(draft, {anchor=null, history=''} = {}) {
  const notes = String(draft.notes||'').trim().slice(0,1000);
  const total = Number(draft.budget);
  return [
    `Create a DRAFT plan in Atlanta for ${draft.date}, starting ${draft.time || 'at a suitable time'}.`,
    `Party: ${Number(draft.adults)||1} adults and ${Number(draft.children)||0} children.`,
    `Occasion: ${draft.occasion || 'Something different'}. Area: ${draft.area || 'Atlanta; keep travel practical'}.`,
    Number.isFinite(total)&&total>=0&&String(draft.budget)!=='' ? `Maximum TOTAL budget for the whole group: $${total}.` : 'Budget is not specified; show estimates, not invented prices.',
    anchor ? `Keep this selected starting point: ${anchor.name||anchor.title} (source ID ${anchor.id||anchor.event_key}).` : '',
    notes ? `Additional requirements: ${notes}` : '',
    history ? `Retain previously accepted constraints and stops unless this request changes them: ${history.slice(-3500)}` : '',
    'Use only current source-backed inventory. Validate date, hours, age rules, travel time and budget. Never invent availability, a live score, a booking confirmation or a price. Mark unknown information. A suggestion is not a reservation.',
  ].filter(Boolean).join('\n');
}
export function validateDraft(draft, today = cityDate()) {
  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date||'') || draft.date < today) errors.date = 'Choose today or a future date.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time||'')) errors.time = 'Choose a starting time.';
  if (!Number.isInteger(Number(draft.adults)) || Number(draft.adults)<1 || Number(draft.adults)>50) errors.adults = 'Choose between 1 and 50 adults.';
  if (!Number.isInteger(Number(draft.children)) || Number(draft.children)<0 || Number(draft.children)>50) errors.children = 'Choose between 0 and 50 children.';
  if (String(draft.budget)!=='' && (!Number.isFinite(Number(draft.budget)) || Number(draft.budget)<0)) errors.budget = 'Enter a valid total budget, or leave it open.';
  return errors;
}
export function eligibleShakeVenues(venues, draft) {
  return venues.filter(v => v?.id && v?.name && v?.status !== 'closed' && v?.status !== 'inactive'
    && (Number(draft.children||0)===0 || isExplicitlyFamily(v))
    && (!draft.area || cleanText(`${v.neighborhood||''} ${v.side_of_town||''}`).includes(cleanText(draft.area))));
}
export function nextShakePick(rows, recent = [], random = Math.random) {
  const avoided = new Set(recent.slice(-8));
  const pool = rows.filter(row=>!avoided.has(String(row.id)));
  const candidates = pool.length ? pool : rows;
  return candidates.length ? candidates[Math.min(candidates.length-1, Math.floor(Math.max(0,random())*candidates.length))] : null;
}
export function sportPresentation(game, now = Date.now()) {
  const stamp = Date.parse(game?.updated_at || ''), age = now-stamp;
  const fresh = Number.isFinite(stamp) && age>=0 && age<=120000;
  const state = cleanText(game?.status);
  const live = /^(live|in progress|inprogress|halftime|in)$/.test(state);
  const ended = /^(final|finished|completed|post)$/.test(state);
  const scheduled = /^(scheduled|pre|not started)$/.test(state);
  const scheduleFresh = Number.isFinite(stamp) && age>=0 && age<=7*86400000;
  const numericScore = value => value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value));
  return { label: live ? (fresh?'LIVE':'UPDATE DELAYED') : ended?'FINAL': scheduled?(scheduleFresh?'UPCOMING':'SCHEDULE NEEDS RECHECK'): (game?.status || 'STATUS UNAVAILABLE'), live:live&&fresh,
    showScores:(live||ended)&&numericScore(game?.home_score)&&numericScore(game?.away_score),
    updatedAt:Number.isFinite(stamp)?new Date(stamp).toISOString():null, scheduleFresh };
}
