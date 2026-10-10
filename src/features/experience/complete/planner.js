/** Deterministic planning constraints shared by the UI and server. No booking side effects. */
import {dateNumber,timeMinutes,selectedCityClock} from '../good-times-event-clock.js'
import {list,safeLink,safeImage,shiftDate,identity,unique,occurrenceUsable} from './model.js'
export const MOODS=[['nightlife','Turn up','Clubs, music, late nights'],['chill','Chill','Low-key drinks and conversation'],['date','Date night','Dinner and somewhere special'],['music','Live music','A show worth planning around'],['food','Good food','Let dinner lead'],['sports','Sports','Games and places to watch'],['culture','Culture','Arts, museums and experiences'],['rooftop','Rooftop','Views and open-air spaces']]
export function normalizePlanInput(input={},now=Date.now()){
 const clock=selectedCityClock('atlanta',now),date=input.date||clock.date,start=input.start||'19:00',end=input.end||'01:00',sm=timeMinutes(start),em=timeMinutes(end),people=Number(input.people??2)
 if(dateNumber(date)===null||date<clock.date||date>shiftDate(clock.date,180))throw new Error('Choose a date from today through the next six months.')
 if(sm===null||em===null||sm===em)throw new Error('Choose a valid start and end time.')
 const endMinute=em<=sm?em+1440:em;if(endMinute-sm>12*60)throw new Error('Keep this plan within a 12-hour window.')
 if(date===clock.date&&sm<clock.minute)throw new Error('The start time has passed. Choose a later start or another date.')
 if(!Number.isInteger(people)||people<1||people>20)throw new Error('Choose a group size from 1 to 20.')
 const vibes=[...new Set(list(input.vibes))].filter(v=>MOODS.some(([id])=>id===v)).slice(0,4)
 const area=String(input.area||'').trim().slice(0,70),budget=['','$','$$','$$$','$$$$'].includes(input.budget)?input.budget:''
 const id=String(input.anchorId||'');if(id&&!/^(show:|venue:)?[a-f0-9-]{36}$/i.test(id))throw new Error('The selected stop has an unsupported identity. Choose it again from the current collection.')
 const budgetMax=input.budgetMax==null||input.budgetMax===''?null:Number(input.budgetMax)
 if(budgetMax!==null&&(!Number.isFinite(budgetMax)||budgetMax<0))throw new Error('Choose a valid numeric budget.')
 const budgetBasis=input.budgetBasis==='group'?'group':'person',company=['solo','date','friends','family'].includes(input.company)?input.company:null
 const dietary=list(input.dietary).map(normalize).slice(0,8),accessibility=list(input.accessibility).map(normalize).slice(0,8)
 const mustHave=String(input.mustHave||'').trim().slice(0,500)
 return {company,budgetMax,budgetBasis,dietary,accessibility,mustHave,date,start,end,startMinute:sm,endMinute,people,vibes,area,budget,allowUnknownHours:input.allowUnknownHours===true,adultOnly:input.adultOnly===true,anchorId:id||null,source_method:['build','shake','ask','manual'].includes(input.source_method)?input.source_method:'build',excludeNightlife:input.excludeNightlife===true}
}
const normalize=s=>String(s||'').toLowerCase().trim()
function seededIndex(seed,salt,size){if(size<=1)return 0;const text=String(seed||'draft')+'|'+salt;let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h>>>0)%size}
function hoursIntervals(venue,date){
 // Only structured published periods are evaluated. Free-text summaries are not parsed into facts.
 const day=new Date(date+'T12:00:00Z').getUTCDay(),h=venue.hours
 if(!h||typeof h!=='object')return null
 const periods=Array.isArray(h.periods)?h.periods:null;if(!periods)return null
 const intervals=[]
 for(const period of periods){const o=period.open,c=period.close;if(!o||!c||Number(o.day)!==day)continue;const format=t=>/^\d{4}$/.test(String(t))?String(t).slice(0,2)+':'+String(t).slice(2):t;const start=timeMinutes(format(o.time)),finish=timeMinutes(format(c.time));if(start===null||finish===null)continue;const offset=(Number(c.day)-day+7)%7;intervals.push([start,finish+1440*(offset||Number(finish<=start))])}
 return intervals
}
export function venueFits(venue,prefs,arrival,duration=60){
 if(venue.city_key!=='atlanta'||venue.status!=='active'||venue.is_verified!==true||venue.verification_status!=='verified_current')return {fits:false,reason:'not_current'}
 if(prefs.excludeNightlife&&/nightclub|nightlife|clubs/.test(normalize([venue.category_key,venue.subcategory,venue.venue_subcategory].join(' '))))return {fits:false,reason:'excluded_category'}
 if(prefs.company==='family'&&/21\+|18\+|adults? only|nightclub/.test(normalize([venue.age_range,venue.venue_subcategory,venue.subcategory].join(' '))))return {fits:false,reason:'age'}
 if(prefs.dietary?.some(t=>!list(venue.dietary_tags).map(normalize).includes(t))||prefs.accessibility?.some(t=>!list(venue.amenity_tags).map(normalize).includes(t)))return {fits:false,reason:'unsupported_requirement'}
 if(prefs.budgetMax!==null&&prefs.budgetMax!==undefined){const cost=venue.metadata?.verified_cost;const cap=prefs.budgetBasis==='group'?prefs.budgetMax/prefs.people:prefs.budgetMax;if(!cost||cost.currency!=='USD'||cost.basis!=='person'||!Number.isFinite(cost.total)||!cost.source_url||!cost.verified_at||cost.total>cap)return {fits:false,reason:'budget_unknown_or_exceeded'}}
 if(prefs.area&&!normalize(venue.neighborhood).includes(normalize(prefs.area)))return {fits:false,reason:'area'}
 if(prefs.budget&&venue.price_range!==prefs.budget)return {fits:false,reason:'price_band'}
 if(!prefs.adultOnly&&/21\+|21 and|adults? only|18\+|nightclub|clubs/i.test([venue.age_range,venue.venue_subcategory,venue.subcategory].join(' ')))return {fits:false,reason:'age'}
 const day=shiftDate(prefs.date,Math.floor(arrival/1440)),hours=hoursIntervals(venue,day),prior=hoursIntervals(venue,shiftDate(day,-1)),minute=arrival%1440
 if(hours===null)return {fits:prefs.allowUnknownHours,verified:false,reason:'hours_unknown'}
 const intervals=[...hours,...(prior||[]).filter(([,end])=>end>1440).map(([a,b])=>[a-1440,b-1440])]
 return {fits:intervals.some(([a,b])=>minute>=a&&minute+duration<=b),verified:true,reason:'hours'}
}
export function composePlan(raw,{events=[],venues=[],now=Date.now(),requestId='draft'}={}){
 const p=normalizePlanInput(raw,now),clock=selectedCityClock('atlanta',now),seen=new Set(),warnings=[],stops=[]
 if(p.mustHave)return {ok:true,plan:null,conflicts:['Your must-have needs confirmation: '+p.mustHave+'. Select supported requirements or confirm this detail with the venue before building.']}
 const avoided=new Set(list(raw?.avoidIds).map(x=>String(x||'').replace(/^venue:/,'')).filter(Boolean).slice(0,20))
 const score=x=>Number(x.good_times_score??x.quality_score??0)
 const eventRows=unique(events).filter(e=>!e.is_sold_out&&(!p.excludeNightlife||!/nightclub|nightlife/.test([e.category_key,e.subcategory_key].join(' ')))&&(!p.dietary.length&&!p.accessibility.length)&&(p.budgetMax===null||(e.currency==='USD'&&e.price_basis==='person'&&Number.isFinite(e.ticket_price_max)&&e.ticket_price_max<=(p.budgetBasis==='group'?p.budgetMax/p.people:p.budgetMax)))&&e.city_key==='atlanta'&&occurrenceUsable(e,now)&&e.event_date>=p.date&&e.event_date<=shiftDate(p.date,1)&&(!p.area||normalize(e.neighborhood||venues.find(v=>v.id===e.venue_id)?.neighborhood).includes(normalize(p.area)))&&(p.adultOnly||!/(21\+|18\+|21 and|adult only|nightclub|clubs)/i.test([e.age_requirement,e.subcategory_key].join(' ')))).sort((a,b)=>score(b)-score(a))
 const venueRows=unique(venues).filter(v=>!p.excludeNightlife||!/nightclub|nightlife/i.test([v.category_key,v.subcategory].join(' '))).sort((a,b)=>score(b)-score(a)),candidates=[...eventRows,...venueRows]
 const anchor=p.anchorId?candidates.find(x=>identity(x)===p.anchorId||`venue:${x.id}`===p.anchorId||`show:${x.id}`===p.anchorId):null
 if(p.anchorId&&!anchor)return {ok:true,plan:null,conflicts:['The selected anchor is no longer in the current eligible inventory. Choose another anchor.']}
 const tag=x=>normalize([x.category_key,x.subcategory,...list(x.vibe_tags)].join(' '))
 const moodMatches=(x,mood)=>({nightlife:/nightclub|nightlife/.test(tag(x)),chill:/lounge|bar|cocktail|wine/.test(tag(x)),date:/restaurant|dining|romantic|rooftop|date/.test(tag(x)),food:/restaurant|dining|cafe|food/.test(tag(x)),music:/concert|live music/.test(tag(x)),sports:/sport/.test(tag(x)),culture:/museum|arts|culture|entertainment/.test(tag(x)),rooftop:/rooftop/.test(tag(x))}[mood])
 const chooseVenue=(predicate,salt)=>{const eligible=venueRows.filter(v=>!seen.has(v.id)&&venueCost(v)+spent<=budgetCap&&predicate(v));if(!eligible.length)return null;const preferred=eligible.filter(v=>!avoided.has(String(v.id)));const base=preferred.length?preferred:eligible;const fitScore=v=>p.vibes.reduce((n,m,i)=>n+(moodMatches(v,m)?(p.vibes.length-i)*100:0),score(v));base.sort((a,b)=>fitScore(b)-fitScore(a));const top=fitScore(base[0]);const near=base.filter(v=>top-fitScore(v)<=8).slice(0,8);return near[seededIndex(requestId,salt,near.length)]||base[0]}
 const minutes=e=>(dateNumber(e.event_date)-dateNumber(p.date))*1440+(timeMinutes(e.event_time)??99999)
 let anchorEvent=anchor?.event_key?anchor:null
 if(!anchorEvent&&p.vibes.some(v=>['music','sports','culture'].includes(v)))anchorEvent=eventRows.find(e=>p.vibes.some(v=>moodMatches(e,v))&&minutes(e)>=p.startMinute&&minutes(e)<p.endMinute)
 if(anchorEvent&&(minutes(anchorEvent)<p.startMinute||minutes(anchorEvent)>=p.endMinute))return {ok:true,plan:null,conflicts:['The anchor starts outside your selected window. Adjust the start/end or choose another event.']}
 const eventFinish=e=>{const finish=timeMinutes(e.event_end_time||e.end_time);if(finish===null)return null;let n=(dateNumber(e.event_end_date||e.end_date||e.event_date)-dateNumber(p.date))*1440+finish;if(n<=minutes(e))n+=1440;return n}
 if(anchorEvent&&eventFinish(anchorEvent)!==null&&eventFinish(anchorEvent)>p.endMinute)return {ok:true,plan:null,conflicts:['The event finishes after your selected finish time. Change your finish or choose another event.']}
 if(anchorEvent?.venue_id)seen.add(anchorEvent.venue_id)
 let spent=0;const budgetCap=p.budgetMax===null?Infinity:p.budgetBasis==='group'?p.budgetMax/p.people:p.budgetMax
 const venueCost=v=>p.budgetMax===null?0:v.metadata?.verified_cost?.total??Infinity
 const eventCost=anchorEvent&&p.budgetMax!==null?anchorEvent.ticket_price_max:0
 if(eventCost>budgetCap)return {ok:true,plan:null,conflicts:['The event exceeds your numeric budget.']}
 spent+=eventCost
 const pushVenue=(v,t,role)=>{seen.add(v.id);spent+=venueCost(v);const fit=venueFits(v,p,t);stops.push({id:`venue:${v.id}`,object_id:v.id,type:'venue',name:v.name,role,venue:v.name,date:shiftDate(p.date,Math.floor(t/1440)),time:`${String(Math.floor(t%1440/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`,time_basis:'suggested_arrival',image_url:safeImage(v.hero_image),address:v.address,neighborhood:v.neighborhood,booking_link:safeLink(v.booking_link),website:safeLink(v.website),phone:v.phone,status:fit.verified?'SUGGESTED':'ACTION REQUIRED',duration_minutes:60,duration_basis:'planning allowance',departure_date:shiftDate(p.date,Math.floor((t+60)/1440)),departure_time:`${String(Math.floor((t+60)%1440/60)).padStart(2,'0')}:${String((t+60)%60).padStart(2,'0')}`,fit_reason:p.vibes.filter(m=>moodMatches(v,m)).map(m=>MOODS.find(x=>x[0]===m)?.[1]).join(' · ')||'Your selected anchor',hours_verified:fit.verified===true,travel_verified:false,price_range:v.price_range||null});if(!fit.verified)warnings.push(`${v.name}: confirm hours, entry and service before going.`)}
 let cursor=p.startMinute
 if(anchor&&!anchor.event_key){const fit=venueFits(anchor,p,cursor);if(!fit.fits||cursor+60>p.endMinute||venueCost(anchor)+spent>budgetCap)return {ok:true,plan:null,conflicts:['The anchor does not satisfy the selected area, price, age or hours requirement. Change that requirement explicitly or choose another place.']};pushVenue(anchor,cursor,'Your anchor');cursor+=90}
 const opening=chooseVenue(v=>moodMatches(v,p.vibes.includes('food')?'food':p.vibes.includes('date')?'date':'chill')&&venueFits(v,p,cursor).fits,'opening')
 if(opening&&cursor+90<=(anchorEvent?minutes(anchorEvent):p.endMinute)){pushVenue(opening,cursor,'First stop');cursor+=90}
 if(anchorEvent){seen.add(identity(anchorEvent));if(anchorEvent.venue_id)seen.add(anchorEvent.venue_id);stops.push({id:identity(anchorEvent),object_id:anchorEvent.id||identity(anchorEvent),type:'event',name:anchorEvent.title,role:'Main event',venue:anchorEvent.venue_name,date:anchorEvent.event_date,time:anchorEvent.event_time,time_basis:'published_start',image_url:safeImage(anchorEvent.image_url),address:anchorEvent.venue_address,ticket_url:safeLink(anchorEvent.ticket_url),website:safeLink(anchorEvent.source_url),status:anchorEvent.is_verified===true?'SUGGESTED':'ACTION REQUIRED',fit_reason:'Your selected event and time window',duration_minutes:eventFinish(anchorEvent)===null?null:eventFinish(anchorEvent)-minutes(anchorEvent),duration_basis:'published schedule',hours_verified:anchorEvent.is_verified===true,travel_verified:false});if(anchorEvent.is_verified!==true)warnings.push(`${anchorEvent.title}: listing facts are not independently verified. Confirm the published schedule and admission with the provider.`);const finish=timeMinutes(anchorEvent.event_end_time||anchorEvent.end_time);if(finish===null){warnings.push('The event end time is not published. No later timed stop was invented.');cursor=p.endMinute}else{cursor=(dateNumber(anchorEvent.event_end_date||anchorEvent.end_date||anchorEvent.event_date)-dateNumber(p.date))*1440+finish;if(cursor<=minutes(anchorEvent))cursor+=1440;cursor+=30}}
 while(stops.length<10&&cursor+60<=p.endMinute){const v=chooseVenue(v=>p.vibes.some(m=>moodMatches(v,m))&&venueFits(v,p,cursor).fits,`stop-${stops.length}-${cursor}`);if(!v)break;pushVenue(v,cursor,stops.length?'Next stop':'First stop');cursor+=90}
 if(!stops.length)return {ok:true,plan:null,conflicts:['No current options satisfy the selected constraints. Try another date/area/price band, or explicitly include places whose hours still need confirmation.']}
 if(p.people>1)warnings.push(`Confirm admission and seating for ${p.people} people with each provider; group capacity is not verified.`)
 warnings.push('Travel has not been verified; 30-minute planning buffers are allowances, not route estimates.','Price bands apply to places, not ticket prices or guaranteed per-person costs. Check ticket costs, booking and availability separately.')
 if(stops.at(-1)?.type==='venue'&&cursor-30<p.endMinute)warnings.push('Your plan does not cover the full requested window. Remaining time is unplanned; change the area, activities or finish time for more options.')
 return {ok:true,plan:{id:requestId,name:'Your Atlanta night',city_id:'atlanta',itinerary_date:p.date,stops,group_size:p.people,status:'draft',created_by:'user',vibe_profile:p,metadata:{source:'good-times-compact-planner',source_method:p.source_method,warnings:[...new Set(warnings)],generated_at:new Date(now).toISOString(),version:2,diversity_seed:String(requestId)}},conflicts:[]}
}
export function editStops(plan,action,index,value){const stops=list(plan.stops).map(s=>({...s}));if(index<0||index>=stops.length)throw new Error('Stop not found.');if(action==='lock')stops[index].locked=!stops[index].locked;else if(stops[index].locked)throw new Error('Unlock this stop before changing it.');else if(action==='remove')stops.splice(index,1);else if(action==='up'||action==='down'){const to=index+(action==='up'?-1:1);if(to<0||to>=stops.length)return plan;if(stops[to].locked)throw new Error('The neighboring stop is locked.');[stops[to],stops[index]]=[stops[index],stops[to]]}else if(action==='time'){if(timeMinutes(value)===null)throw new Error('Choose a valid time.');if(stops[index].type==='event')throw new Error('A published event start cannot be edited.');stops[index].time=value;stops[index].time_basis='user_selected';stops[index].hours_verified=false;stops[index].status='ACTION REQUIRED';delete stops[index].departure_time;delete stops[index].departure_date}return {...plan,stops}}
