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
 return {date,start,end,startMinute:sm,endMinute,people,vibes,area,budget,allowUnknownHours:input.allowUnknownHours===true,adultOnly:input.adultOnly===true,anchorId:id||null,source_method:['build','shake','ask','manual'].includes(input.source_method)?input.source_method:'build',excludeNightlife:input.excludeNightlife===true}
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
 if(prefs.area&&!normalize(venue.neighborhood).includes(normalize(prefs.area)))return {fits:false,reason:'area'}
 if(prefs.budget&&venue.price_range!==prefs.budget)return {fits:false,reason:'price_band'}
 if(!prefs.adultOnly&&/21\+|21 and|adults? only|18\+/i.test(venue.age_range||venue.venue_subcategory||venue.subcategory||''))return {fits:false,reason:'age'}
 const day=shiftDate(prefs.date,Math.floor(arrival/1440)),hours=hoursIntervals(venue,day),prior=hoursIntervals(venue,shiftDate(day,-1)),minute=arrival%1440
 if(hours===null)return {fits:prefs.allowUnknownHours,verified:false,reason:'hours_unknown'}
 const intervals=[...hours,...(prior||[]).filter(([,end])=>end>1440).map(([a,b])=>[a-1440,b-1440])]
 return {fits:intervals.some(([a,b])=>minute>=a&&minute+duration<=b),verified:true,reason:'hours'}
}
export function composePlan(raw,{events=[],venues=[],now=Date.now(),requestId='draft'}={}){
 const p=normalizePlanInput(raw,now),clock=selectedCityClock('atlanta',now),seen=new Set(),warnings=[],stops=[]
 const avoided=new Set(list(raw?.avoidIds).map(x=>String(x||'').replace(/^venue:/,'')).filter(Boolean).slice(0,20))
 const score=x=>Number(x.good_times_score??x.quality_score??0)
 const eventRows=unique(events).filter(e=>e.city_key==='atlanta'&&occurrenceUsable(e,now)&&e.event_date>=p.date&&e.event_date<=shiftDate(p.date,1)&&(!p.area||normalize(e.neighborhood||venues.find(v=>v.id===e.venue_id)?.neighborhood).includes(normalize(p.area)))&&(p.adultOnly||!/(21\+|18\+|21 and|adult only)/i.test(e.age_requirement||''))).sort((a,b)=>score(b)-score(a))
 const venueRows=unique(venues).filter(v=>!p.excludeNightlife||!/nightclub|nightlife/i.test([v.category_key,v.subcategory].join(' '))).sort((a,b)=>score(b)-score(a)),candidates=[...eventRows,...venueRows]
 const anchor=p.anchorId?candidates.find(x=>identity(x)===p.anchorId||`venue:${x.id}`===p.anchorId||`show:${x.id}`===p.anchorId):null
 if(p.anchorId&&!anchor)return {ok:true,plan:null,conflicts:['The selected anchor is no longer in the current eligible inventory. Choose another anchor.']}
 const tag=x=>normalize([x.category_key,x.subcategory,...list(x.vibe_tags)].join(' '))
 const moodMatches=(x,mood)=>({nightlife:/nightclub|nightlife/.test(tag(x)),chill:/lounge|bar|cocktail|wine/.test(tag(x)),date:/restaurant|dining|romantic|rooftop|date/.test(tag(x)),food:/restaurant|dining|cafe|food/.test(tag(x)),music:/concert|live music/.test(tag(x)),sports:/sport/.test(tag(x)),culture:/museum|arts|culture|entertainment/.test(tag(x)),rooftop:/rooftop/.test(tag(x))}[mood])
 const chooseVenue=(predicate,salt)=>{const eligible=venueRows.filter(v=>!seen.has(v.id)&&predicate(v));if(!eligible.length)return null;const preferred=eligible.filter(v=>!avoided.has(String(v.id)));const base=preferred.length?preferred:eligible;const top=score(base[0]);const near=base.filter(v=>top-score(v)<=8).slice(0,8);return near[seededIndex(requestId,salt,near.length)]||base[0]}
 const minutes=e=>(dateNumber(e.event_date)-dateNumber(p.date))*1440+(timeMinutes(e.event_time)??99999)
 let anchorEvent=anchor?.event_key?anchor:null
 if(!anchorEvent&&p.vibes.some(v=>['music','sports','culture'].includes(v)))anchorEvent=eventRows.find(e=>p.vibes.some(v=>moodMatches(e,v))&&minutes(e)>=p.startMinute&&minutes(e)<p.endMinute)
 if(anchorEvent&&(minutes(anchorEvent)<p.startMinute||minutes(anchorEvent)>=p.endMinute))return {ok:true,plan:null,conflicts:['The anchor starts outside your selected window. Adjust the start/end or choose another event.']}
 const pushVenue=(v,t,role)=>{seen.add(v.id);const fit=venueFits(v,p,t);stops.push({id:`venue:${v.id}`,object_id:v.id,type:'venue',name:v.name,role,venue:v.name,date:shiftDate(p.date,Math.floor(t/1440)),time:`${String(Math.floor(t%1440/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`,time_basis:'suggested_arrival',image_url:safeImage(v.hero_image),address:v.address,neighborhood:v.neighborhood,booking_link:safeLink(v.booking_link),website:safeLink(v.website),phone:v.phone,status:'SUGGESTED',hours_verified:fit.verified===true,travel_verified:false,price_range:v.price_range||null});if(!fit.verified)warnings.push(`${v.name}: confirm hours, entry and service before going.`)}
 let cursor=p.startMinute
 if(anchor&&!anchor.event_key){const fit=venueFits(anchor,p,cursor);if(!fit.fits)return {ok:true,plan:null,conflicts:['The anchor does not satisfy the selected area, price, age or hours requirement. Change that requirement explicitly or choose another place.']};pushVenue(anchor,cursor,'Your anchor');cursor+=90}
 const opening=chooseVenue(v=>moodMatches(v,p.vibes.includes('food')?'food':p.vibes.includes('date')?'date':'chill')&&venueFits(v,p,cursor).fits,'opening')
 if(opening&&cursor+90<=(anchorEvent?minutes(anchorEvent):p.endMinute)){pushVenue(opening,cursor,'First stop');cursor+=90}
 if(anchorEvent){seen.add(identity(anchorEvent));stops.push({id:identity(anchorEvent),object_id:anchorEvent.id||identity(anchorEvent),type:'event',name:anchorEvent.title,role:'Main event',venue:anchorEvent.venue_name,date:anchorEvent.event_date,time:anchorEvent.event_time,time_basis:'published_start',image_url:safeImage(anchorEvent.image_url),address:anchorEvent.venue_address,ticket_url:safeLink(anchorEvent.ticket_url),website:safeLink(anchorEvent.source_url),status:'SUGGESTED',hours_verified:true,travel_verified:false});const finish=timeMinutes(anchorEvent.event_end_time||anchorEvent.end_time);if(finish===null){warnings.push('The event end time is not published. No later timed stop was invented.');cursor=p.endMinute}else{cursor=finish<=timeMinutes(anchorEvent.event_time)?finish+1440:finish;cursor+=30}}
 while(stops.length<3&&cursor+60<=p.endMinute){const v=chooseVenue(v=>p.vibes.some(m=>moodMatches(v,m))&&venueFits(v,p,cursor).fits,`stop-${stops.length}-${cursor}`);if(!v)break;pushVenue(v,cursor,stops.length?'Next stop':'First stop');cursor+=90}
 if(!stops.length)return {ok:true,plan:null,conflicts:['No current options satisfy the selected constraints. Try another date/area/price band, or explicitly include places whose hours still need confirmation.']}
 warnings.push('Travel has not been verified; 30-minute planning buffers are allowances, not route estimates.','Price bands apply to places, not ticket prices or guaranteed per-person costs. Check ticket costs, booking and availability separately.')
 if(stops.length<3)warnings.push('Fewer stops were returned rather than relaxing your requirements.')
 return {ok:true,plan:{id:requestId,name:'Your Atlanta night',city_id:'atlanta',itinerary_date:p.date,stops,group_size:p.people,status:'draft',created_by:'user',vibe_profile:p,metadata:{source:'good-times-compact-planner',source_method:p.source_method,warnings:[...new Set(warnings)],generated_at:new Date(now).toISOString(),version:2,diversity_seed:String(requestId)}},conflicts:[]}
}
export function editStops(plan,action,index,value){const stops=list(plan.stops).map(s=>({...s}));if(index<0||index>=stops.length)throw new Error('Stop not found.');if(action==='lock')stops[index].locked=!stops[index].locked;else if(stops[index].locked)throw new Error('Unlock this stop before changing it.');else if(action==='remove')stops.splice(index,1);else if(action==='up'||action==='down'){const to=index+(action==='up'?-1:1);if(to<0||to>=stops.length)return plan;if(stops[to].locked)throw new Error('The neighboring stop is locked.');[stops[to],stops[index]]=[stops[index],stops[to]]}else if(action==='time'){if(timeMinutes(value)===null)throw new Error('Choose a valid time.');if(stops[index].type==='event')throw new Error('A published event start cannot be edited.');stops[index].time=value;stops[index].time_basis='user_selected'}return {...plan,stops}}
