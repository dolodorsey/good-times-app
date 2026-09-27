from pathlib import Path

def edit(path,old,new):
 p=Path(path);s=p.read_text();assert s.count(old)==1,(path,old[:70],s.count(old));p.write_text(s.replace(old,new))
def append(path,text):
 p=Path(path);p.write_text(p.read_text()+text)
append('src/features/experience/good-times-complete.css','''
/* The shared premium wrapper previously kept desktop content inside 460px. */
@media(min-width:900px){
 html body.gt-app-mode #root:has([data-complete-upgrade])>.gt-premium-experience,
 html body.gt-app-mode #root:has([data-complete-upgrade])>.gt-premium-experience>.gt5-app[data-complete-upgrade]{width:100%!important;max-width:none!important;min-width:0!important;height:100%!important;max-height:none!important;margin:0!important;}
}
html body.gt-app-mode #root .gt5-app[data-complete-upgrade] .gt-complete-ad{display:flex;gap:12px;align-items:center;min-width:0;padding:10px;border:1px solid var(--gt5-line);border-radius:12px;margin:12px 0;background:#111315;}
html body.gt-app-mode #root .gt5-app[data-complete-upgrade] .gt-complete-ad img{width:76px;height:64px;object-fit:cover;border-radius:8px;}
html body.gt-app-mode #root .gt5-app[data-complete-upgrade] .gt-complete-ad>div{flex:1;min-width:0;}
html body.gt-app-mode #root .gt5-app[data-complete-upgrade] .gt-complete-ad small{display:block;font-size:10px;color:var(--gt5-gold2);}
html body.gt-app-mode #root .gt5-app[data-complete-upgrade] .gt-complete-ad strong{display:block;font:600 14px/1.3 var(--gt5-sans);}
html body.gt-app-mode #root .gt5-app[data-complete-upgrade] .gt-complete-ad a{display:inline-flex;align-items:center;min-height:44px;font-size:12px;color:var(--gt5-gold2);}
''')
edit('api/compact-plan-rules.js',"const vibes=Array.isArray(input.vibes)?", "if(input.vibes!==undefined&&(!Array.isArray(input.vibes)||input.vibes.length>4||input.vibes.some(x=>!['grown','turnt','date','live','food','culture','rooftop','explore','sports','family'].includes(x))))throw new Error('Choose up to four supported vibes.');\n if(input.needs!==undefined&&(!Array.isArray(input.needs)||input.needs.some(x=>!['wheelchair_accessible','vegetarian','vegan'].includes(x))))throw new Error('A requested requirement is not supported; it has not been dropped.');\n if(input.budget!==undefined&&!['any','value','mid','premium'].includes(input.budget))throw new Error('Choose a supported spending preference.');\n const age=input.age===undefined||input.age===null||input.age===''?null:Number(input.age);if(age!==null&&(!Number.isInteger(age)||age<0||age>120))throw new Error('Enter a valid youngest guest age.');\n const vibes=Array.isArray(input.vibes)?")
edit('api/compact-plan-rules.js',"age:input.age?Number(input.age):null", "age")
edit('api/compact-plan-rules.js',"if(input.lead==='family'&&['nightclub','hookah','lounge'].includes(type(v)))return false\n if(input.age&&Number.parseInt(v.age_range,10)>input.age)return false", "const family=input.vibes.includes('family')||input.lead==='family';if(family&&['nightclub','hookah','lounge','adult_entertainment','strip_club'].includes(type(v)))return false\n const ageRule=minimumAge(v.age_range);if(input.age!==null&&(ageRule!==null?ageRule>input.age:input.age<18))return false\n if(family&&ageRule!==null&&ageRule>=18)return false")
edit('api/compact-plan-rules.js',"const time=m=>", "export function minimumAge(value){const s=String(value??'').trim().toLowerCase();if(/^(all ages|all-ages|family friendly)$/.test(s))return 0;const m=s.match(/^(\\d{1,3})(?:\\s*\\+|\\s*(?:and|or) older)?$/);return m?Number(m[1]):null}\nexport function eventMeetsRequirements(e,spec){if(e.city_key&&e.city_key!=='atlanta')return false;const family=spec.vibes.includes('family')||spec.lead==='family';if(family&&e.category_key==='nightlife')return false;const age=minimumAge(e.age_requirement);if(family&&age!==null&&age>=18)return false;if(spec.age!==null&&(age!==null?age>spec.age:spec.age<18))return false;if(spec.needs.some(n=>![...(e.amenity_tags||[]),...(e.dietary_tags||[])].includes(n)))return false;return true}\nconst time=m=>")
edit('api/compact-plan-rules.js',"if(pinned&&!addVenue(pinned,'Your selected place'))throw new Error('The selected place is closed during this time or cannot fit the plan. Choose another time; it has not been replaced.')\n else{", "if(pinned){if(!addVenue(pinned,'Your selected place'))throw new Error('The selected place is closed during this time or cannot fit the plan. Choose another time; it has not been replaced.')}\n else if(!spec.event){")
edit('api/compact-plan-rules.js',"const matching=events.filter(e=>e.event_date", "const matching=events.filter(e=>eventMeetsRequirements(e,spec)&&e.event_date")
edit('api/compact-plan.js',"rankPlanVenues,hoursContain", "rankPlanVenues,hoursContain,eventMeetsRequirements")
edit('api/compact-plan.js',"if(v&&hoursContain(v,date,m)===false)", "if(e&&!eventMeetsRequirements(e,spec))throw invalid('The selected event does not meet your verified requirements.');\n   if(v&&hoursContain(v,date,m)===false)")
edit('src/features/experience/CompactPlanHub.jsx',"budget:'any',needs:[]", "budget:'any',needs:[],age:''")
edit('src/features/experience/CompactPlanHub.jsx',"</select></label></div><p>Must-have requirements</p>", "</select></label><label>Youngest guest age (optional)<input type=\"number\" aria-label=\"Youngest guest age\" min=\"0\" max=\"120\" value={value.age??''} onChange={e=>change({age:e.target.value})}/></label></div><p>Must-have requirements</p>")
edit('src/features/experience/CompactPlanHub.jsx',"<dt>Spending</dt><dd>{value.budget}</dd>", "<dt>Spending</dt><dd>{value.budget}</dd><dt>Youngest guest</dt><dd>{value.age!==''&&value.age!=null?`${value.age} years`:'Not specified; check admission rules'}</dd>")
edit('src/features/experience/CompactItinerary.jsx',"root=useRef(null)", "root=useRef(null),dirtyRef=useRef(false),[confirmClose,setConfirmClose]=useState(false)\n dirtyRef.current=dirty||!value.updated_at\n const close=()=>{if(dirtyRef.current)setConfirmClose(true);else onClose()}")
edit('src/features/experience/CompactItinerary.jsx',"const key=e=>{if(e.key==='Escape')onClose()}", "const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(dirtyRef.current)setConfirmClose(true);else onClose()}if(e.key==='Tab'){const nodes=[...root.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),summary,[tabindex=\"0\"]')].filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}")
edit('src/features/experience/CompactItinerary.jsx',"onClick={onClose} aria-label=\"Close itinerary\"", "onClick={close} aria-label=\"Close itinerary\"")
edit('src/features/experience/CompactItinerary.jsx',"<div className=\"gt-complete-itinerary-body\"><h1>", "<div className=\"gt-complete-itinerary-body\">{confirmClose&&<section role=\"alert\" className=\"gt-complete-plan-warning\"><strong>Leave without saving?</strong><p>Your latest changes have not been saved to your account.</p><div className=\"gt-complete-itinerary-actions\"><button className=\"primary\" onClick={()=>setConfirmClose(false)}>Keep editing</button><button onClick={onClose}>Discard changes</button></div></section>}<h1>")
Path('src/features/experience/CompactSponsored.jsx').write_text('''import React,{useEffect,useRef,useState}from'react'
import{loadGoodTimesAd,trackGoodTimesAd}from'./good-times-ads.js'
import{safeURL,specificMedia}from'./compact-display.js'
export default function CompactSponsored({placement}){const[ad,setAd]=useState(null),root=useRef(null)
 useEffect(()=>{let alive=true;loadGoodTimesAd(placement,'atlanta').then(v=>{if(alive)setAd(v)});return()=>{alive=false}},[placement])
 useEffect(()=>{if(!ad||!root.current)return;let sent=false;const observer=new IntersectionObserver(entries=>{if(!sent&&entries.some(e=>e.isIntersecting)){sent=true;void trackGoodTimesAd({ad,placementKey:placement,citySlug:'atlanta',eventType:'impression'});observer.disconnect()}},{threshold:.5});observer.observe(root.current);return()=>observer.disconnect()},[ad,placement])
 if(!ad?.headline||!safeURL(ad.cta_url))return null
 return <aside className="gt-complete-ad" ref={root} aria-label="Sponsored">{specificMedia(ad.image_url)&&<img src={specificMedia(ad.image_url)} alt="" loading="lazy" onError={e=>e.currentTarget.style.display='none'}/>}<div><small>SPONSORED · {ad.advertiser_name}</small><strong>{ad.headline}</strong><a href={safeURL(ad.cta_url)} target="_blank" rel="noreferrer" onClick={()=>void trackGoodTimesAd({ad,placementKey:placement,citySlug:'atlanta',eventType:'click'})}>{ad.cta_text||'View offer'} ↗</a></div></aside>}
''')
edit('src/features/experience/CompactHome.jsx',"import CompactEventCard", "import CompactSponsored from './CompactSponsored.jsx'\nimport CompactEventCard")
edit('src/features/experience/CompactHome.jsx',"<button className=\"gt-complete-inline-cta\" onClick={onPlan}", "<CompactSponsored placement=\"home_between_sections\"/>\n  <button className=\"gt-complete-inline-cta\" onClick={onPlan}")
edit('src/features/experience/GoodTimesCommandAppV4.jsx',"import CompactHome", "import CompactSponsored from './CompactSponsored.jsx'\nimport CompactHome")
edit('src/features/experience/GoodTimesCommandAppV4.jsx',"renderVenue={venue=><CompactVenueCard key={venue.id} venue={venue} saved={savedKeys.has(`venue:${venue.id}`)} onOpen={()=>openVenue(venue)} onSave={()=>toggleSave('venue',venue.id)}/>}/></section>","renderVenue={venue=><CompactVenueCard key={venue.id} venue={venue} saved={savedKeys.has(`venue:${venue.id}`)} onOpen={()=>openVenue(venue)} onSave={()=>toggleSave('venue',venue.id)}/>}/>{COMPLETE_UPGRADE&&<CompactSponsored placement=\"discover_inline\"/>}</section>")
edit('scripts/complete-upgrade-evidence.mjs',"return{viewport:[innerWidth,innerHeight],overflow:","const app=document.querySelector('.gt5-app').getBoundingClientRect();return{appWidth:app.width,viewport:[innerWidth,innerHeight],overflow:")
edit('scripts/complete-upgrade-evidence.mjs',"const g=await geometry();", "const g=await geometry();if(viewport.width>=1000)assert.ok(g.appWidth>=1000,`Desktop app is only ${g.appWidth}px wide`);")
append('scripts/complete-upgrade.test.mjs','''
test('pinned first stop remains unique',()=>{const p=generateSuggestedPlan({input:{...input,pinned:'dinner'},venues,events:[],id:'p',now});assert.equal(p.stops.filter(s=>s.id==='venue:dinner').length,1);assert.equal(p.stops[0].locked,true)})
test('unsupported requirements are rejected not dropped',()=>{assert.throws(()=>validatePlanInput({...input,needs:['must_be_quiet']},now),/not supported/);assert.throws(()=>validatePlanInput({...input,vibes:['imaginary']},now));assert.throws(()=>validatePlanInput({...input,budget:'$500 hard maximum'},now))})
test('youngest guest age is bounded and zero is retained',()=>{assert.equal(validatePlanInput({...input,age:0},now).age,0);for(const age of [-1,1.5,121,'unknown'])assert.throws(()=>validatePlanInput({...input,age},now))})
test('family membership cannot be defeated by a different lead vibe',()=>{const s=validatePlanInput({...input,vibes:['food','family'],lead:'food'},now);assert.equal(rankPlanVenues(venues,s).some(v=>v.id==='club'),false)})
test('children are not assigned places with unknown admission rules',()=>{const s=validatePlanInput({...input,age:10},now);assert.equal(rankPlanVenues(venues,s).length,0);assert.equal(rankPlanVenues([{...venues[0],age_range:'All ages'}],s).length,1)})
test('family event cannot use explicit adult-only music fixture',()=>{const event={...showToEvent(show,now),age_requirement:'21+'};assert.throws(()=>generateSuggestedPlan({input:{...input,event:event.event_key,vibes:['family']},venues:[{...venues[0],age_range:'All ages'}],events:[event],id:'p',now}),/selected event/)})
test('request record alone cannot imply reservation confirmation',()=>assert.equal(qualifiedStatus({status:'CONFIRMED',request_id:'request-only'}),'SUGGESTED'))
test('cancelled sporting fixture cannot appear live',()=>assert.equal(safeGame({city_key:'atlanta',status:'cancelled',updated_at:new Date(now).toISOString()},now),null))
test('itinerary exposes keyboard trap and unsaved close warning',()=>{const c=fs.readFileSync('src/features/experience/CompactItinerary.jsx','utf8');assert.match(c,/Leave without saving/);assert.match(c,/e.key==='Tab'/);assert.match(c,/Discard changes/);assert.match(c,/Keep editing/)})
''')
p=Path('supabase/migrations/20260927210000_gt_compact_event_page_v1.sql');s=p.read_text()
fields='id venue_id event_name event_type genre city_key show_date show_time doors_time venue_name venue_address ticket_url image_url description organizer source source_url status quality_score freshness_tier display_priority good_times_score category_key_v2 subcategory_key_v2 is_featured is_curated updated_at is_sold_out is_free age_requirement ticket_price_min ticket_price_max'.split()
s=s.replace('returns setof public.gt_shows','returns setof jsonb').replace('and s.image_url is not null and s.ticket_url is not null',"and nullif(btrim(s.image_url),'') is not null and nullif(btrim(s.ticket_url),'') is not null")
assert 'select s.*' in s
s=s.replace('select s.*',"select jsonb_build_object("+','.join("'%s',s.%s"%(f,f) for f in fields)+')');p.write_text(s)
Path('docs/GOOD_TIMES_ADVISOR_DISPOSITION.md').write_text('''# Post-migration advisor disposition

Security and performance advisors were run after applying gt_compact_event_page_v1. The new function is bounded, read-only SECURITY INVOKER with fixed search_path, timeout, explicit public JSON projection, and the existing editorial/freshness gate. An anonymous-role verification returned 24 Atlanta rows; its transaction rolled back.

Findings concern unrelated khg policies/views, legacy mutable-search-path routines, extensions in public, a job log duplicate index and an unindexed gt_shows venue foreign key. No finding names the new function. This does not certify the whole shared project as finding-free. No prior full advisor snapshot was captured for a differential claim. Cross-brand objects were not edited. Actual query latency still requires measurement.

Rollback: drop function public.gt_compact_event_page_v1(date,date,text,text,text,date,uuid,integer,text,uuid[]); only after restoring compatible application reads. No existing listing, account or source schedule was changed by this function.
''')
print('Final release corrections materialized; production flag unchanged.')
