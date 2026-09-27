import {dateNumber,timeMinutes,selectedCityClock} from '../src/features/experience/good-times-event-clock.js'
export function validatePlanInput(input={},now=Date.now()){
 const today=selectedCityClock('atlanta',now).date,date=String(input.date||today),start=timeMinutes(input.start||'19:00'),end=timeMinutes(input.end||'01:00'),people=Number(input.people||2)
 if(dateNumber(date)===null||dateNumber(date)<dateNumber(today)||dateNumber(date)>dateNumber(today)+180)throw new Error('Choose a date between today and the next 180 days.')
 if(start===null||end===null||end===start)throw new Error('Choose a valid start and finish time.')
 const finish=end<=start?end+1440:end
 if(finish-start>12*60)throw new Error('Keep each plan within 12 hours.')
 if(!Number.isInteger(people)||people<1||people>50)throw new Error('Choose between 1 and 50 people.')
 const vibes=Array.isArray(input.vibes)?[...new Set(input.vibes)].filter(x=>['grown','turnt','date','live','food','culture','rooftop','explore','sports','family'].includes(x)).slice(0,4):[]
 return{date,start:input.start||'19:00',end:input.end||'01:00',startMinute:start,endMinute:finish,people,vibes,lead:vibes.includes(input.lead)?input.lead:vibes[0]||'explore',area:String(input.area||'').trim().slice(0,80),budget:['any','value','mid','premium'].includes(input.budget)?input.budget:'any',event:typeof input.event==='string'?input.event:null,pinned:typeof input.pinned==='string'?input.pinned:null,needs:Array.isArray(input.needs)?input.needs.filter(v=>['wheelchair_accessible','vegetarian','vegan'].includes(v)):[],age:input.age?Number(input.age):null}
}
const TYPES={food:['restaurant','fine_dining','brunch','food_hall','coffee','wine_bar'],turnt:['nightclub','lounge','bar','hookah','rooftop'],date:['restaurant','wine_bar','lounge','rooftop'],grown:['lounge','wine_bar','restaurant'],culture:['culture','museum','gallery','event_venue'],live:['jazz','event_venue'],rooftop:['rooftop'],sports:['sports_bar'],family:['attraction','museum','aquarium','zoo','entertainment'],explore:['culture','entertainment','attraction']}
function type(v){return String(v.venue_category_key||v.category_key||'').toLowerCase()}
export function hoursContain(v,date,start,duration=60){
 const day=['sun','mon','tue','wed','thu','fri','sat'][new Date(`${date}T12:00:00Z`).getUTCDay()]
 const full={sun:'sunday',mon:'monday',tue:'tuesday',wed:'wednesday',thu:'thursday',fri:'friday',sat:'saturday'};const hours=v.hours?.[day]??v.hours?.[full[day]];if(hours===undefined||hours===null)return null
 if(hours==='closed'||hours===false)return false
 if(hours==='24 hours'||hours==='24/7')return true
 const intervals=Array.isArray(hours)?hours:[hours]
 for(const h of intervals){const open=timeMinutes(h?.open),close=timeMinutes(h?.close);if(open===null||close===null)continue;const end=close<=open?close+1440:close;if(start>=open&&start+duration<=end)return true}
 return intervals.some(h=>timeMinutes(h?.open)!==null&&timeMinutes(h?.close)!==null)?false:null
}
export function rankPlanVenues(venues,input){return venues.filter(v=>{
 if(input.area&&![v.neighborhood,v.side_of_town].some(x=>String(x||'').trim().toLowerCase()===input.area.toLowerCase()))return false
 if(input.needs.some(n=>![...(v.amenity_tags||[]),...(v.dietary_tags||[])].includes(n)))return false
 if(input.lead==='family'&&['nightclub','hookah','lounge'].includes(type(v)))return false
 if(input.age&&Number.parseInt(v.age_range,10)>input.age)return false
 return true
 }).sort((a,b)=>{const score=v=>Number(v.culture_score??v.quality_score??0)+(TYPES[input.lead]?.includes(type(v))?12:0)+input.vibes.filter(k=>TYPES[k]?.includes(type(v))).length*3;return score(b)-score(a)||String(a.id).localeCompare(String(b.id))})}
const time=m=>`${String(Math.floor(m%1440/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
const shift=(d,n)=>new Date((dateNumber(d)+n)*86400000).toISOString().slice(0,10)
export function generateSuggestedPlan({input,venues,events,id,now=Date.now()}){
 const spec=validatePlanInput(input,now),pool=rankPlanVenues(venues,spec),stops=[],warnings=[];let cursor=spec.startMinute
 const clock=selectedCityClock('atlanta',now);if(spec.date===clock.date&&spec.startMinute<clock.minute)throw new Error('That start time has passed. Choose a later start or another date.')
 const addVenue=(v,role)=>{if(!v||cursor+60>spec.endMinute)return false;const day=shift(spec.date,Math.floor(cursor/1440)),hours=hoursContain(v,day,cursor%1440);if(hours===false)return false;stops.push({id:`venue:${v.id}`,type:'venue',name:v.name,venue:v.name,address:v.address,neighborhood:v.neighborhood,date:day,time:time(cursor),role,status:'SUGGESTED',image_url:v.hero_image,website:v.website,booking_link:v.booking_link,phone:v.phone,price_range:v.price_range,locked:spec.pinned===v.id,timing_basis:'Suggested 60-minute stop; not a reservation',hours_verified:hours===true});if(hours!==true)warnings.push(`Check operating hours for ${v.name}.`);cursor+=75;return true}
 const pinned=spec.pinned?pool.find(v=>v.id===spec.pinned):null
 if(spec.pinned&&!pinned)throw new Error('That place no longer meets this plan’s area or verified requirements. Change the filters or pick another place.')
 if(pinned&&!addVenue(pinned,'Your selected place'))throw new Error('The selected place is closed during this time or cannot fit the plan. Choose another time; it has not been replaced.')
 else{const food=pool.find(v=>TYPES.food.includes(type(v))&&hoursContain(v,spec.date,cursor)!==false);addVenue(food||pool.find(v=>hoursContain(v,spec.date,cursor)!==false),'Start')}
 const matching=events.filter(e=>e.event_date===spec.date&&timeMinutes(e.event_time)!==null&&timeMinutes(e.event_time)>=cursor&&timeMinutes(e.event_time)<=spec.endMinute-45&&(!spec.area||`${e.neighborhood||''} ${e.venue_address||''}`.toLowerCase().includes(spec.area.toLowerCase()))&&(!spec.age||!Number.parseInt(e.age_requirement,10)||Number.parseInt(e.age_requirement,10)<=spec.age))
 const anchor=spec.event?matching.find(e=>e.event_key===spec.event):matching.find(e=>spec.vibes.includes('live')?e.category_key==='concerts_live_music':spec.vibes.includes('sports')?e.category_key==='sports_watch':spec.lead==='family'?e.category_key==='family_kids':true)
 if(spec.event&&!anchor)throw new Error('The selected event does not fit this date or time window. Change the plan times; it has not been replaced.')
 if(anchor){stops.push({id:anchor.event_key,type:'event',name:anchor.title,venue:anchor.venue_name,date:anchor.event_date,time:anchor.event_time,role:'Main event',image_url:anchor.image_url,ticket_url:anchor.ticket_url,status:'SUGGESTED',timing_basis:'Published start; event end is not verified',locked:true});warnings.push(`Check the end time for ${anchor.title} before adding a later stop.`)}
 else{for(const v of pool){if(stops.length>=3||cursor+60>spec.endMinute)break;if(!stops.some(s=>s.id===`venue:${v.id}`))addVenue(v,stops.length?'Next stop':'Start')}}
 if(!stops.length)throw new Error('No suitable stops fit these verified requirements. Try a different date, area, or fewer restrictions.')
 warnings.push('Travel is not verified. Suggested gaps are planning buffers, not driving estimates.')
 if(spec.budget!=='any')warnings.push('Total cost cannot be confirmed from the available prices. Check menus, cover and ticket fees.')
 return{id,name:'Your Atlanta plan',city_id:'atlanta',itinerary_date:spec.date,stops,group_size:spec.people,status:'draft',created_by:'good_times',vibe_profile:{vibes:spec.vibes,lead:spec.lead,area:spec.area,budget:spec.budget},metadata:{source:'good-times-compact-planner-v1',spec,warnings:[...new Set(warnings)],timing_verified:false,reservations_assumed:false},updated_at:null}
}
export function planWarnings(stops){const warnings=[];let previous=null;for(const s of stops){const d=dateNumber(s.date),m=timeMinutes(s.time);if(d===null||m===null){warnings.push(`Choose a valid time for ${s.name}.`);continue}const absolute=d*1440+m;if(previous!==null&&absolute<=previous)warnings.push('Stop times are not chronological. Adjust the times before going.');previous=absolute;if(!s.hours_verified&&s.type==='venue')warnings.push(`Check operating hours for ${s.name}.`)}return[...new Set(warnings)]}
