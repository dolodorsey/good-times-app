import { dateNumber, timeMinutes, selectedCityClock, eventIsDiscoverable, eventIsTonight, eventStatus } from './good-times-event-clock.js'
export const dateLabel = value => dateNumber(value) === null ? 'Date TBA' : new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { timeZone:'UTC', weekday:'short', month:'short', day:'numeric' })
export const timeLabel = value => { const m=timeMinutes(value); return m===null?'Time TBA':`${Math.floor(m/60)%12||12}:${String(m%60).padStart(2,'0')} ${m>=720?'PM':'AM'}` }
export const localDate = (now=Date.now()) => selectedCityClock('atlanta',now)?.date || ''
export const shiftDate = (date,days) => dateNumber(date)===null?'':new Date((dateNumber(date)+days)*86400000).toISOString().slice(0,10)
export const categoryLabel = (key,taxonomy=[]) => taxonomy.find(c=>c.id===key)?.name || ({concerts_live_music:'Concerts & Live Music',nightlife:'Nightlife',sports_watch:'Sports & Watch',festivals_major_activations:'Festivals',dining_culinary:'Food & Drink',comedy_performing_arts:'Comedy & Performing Arts',family_kids:'Family & Kids',arts_museums_culture:'Arts & Culture',wellness_fitness:'Wellness & Fitness',day_parties_brunch:'Day Parties & Brunch'})[key] || String(key||'Experience').replaceAll('_',' ')
export function safeURL(value){ try{const u=new URL(String(value||''));return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null} }
export function specificMedia(value){const raw=String(value||'').trim(); if(/^\/(?!\/)/.test(raw))return raw;return safeURL(raw)&&!/(images\.unsplash\.com|\/good-times-backgrounds\/(?:gt-cat-|event-)|[?&]key=)/i.test(raw)?raw:null}
export function entityKey(item,type){return type==='event'?(item.event_key||`show:${item.id}`):String(item.id||'')}
export function uniqueItems(items,type){const seen=new Set();return(items||[]).filter(x=>{const id=entityKey(x,type);if(!id||seen.has(id))return false;seen.add(id);return true})}
export function activeItems(items,now=Date.now()){return uniqueItems(items,'event').filter(e=>e.city_key==='atlanta'&&eventIsDiscoverable(e,'atlanta',now))}
export function eventBadge(event,now=Date.now()) { const status=eventStatus(event,'atlanta',now);return ['GT PICK','CURATED'].includes(status)?dateLabel(event.event_date):status }
export function qualifiedStatus(stop){const raw=String(stop?.status||'SUGGESTED').toUpperCase();if(raw==='REQUESTED'&&!stop?.request_id)return 'SUGGESTED';if(['CONFIRMED','TICKETED','HELD'].includes(raw)&&!stop?.confirmation_id&&!stop?.provider_reference)return 'SUGGESTED';if(raw==='HELD'&&(!stop?.hold_expires_at||Date.parse(stop.hold_expires_at)<=Date.now()))return 'SUGGESTED';return ['SUGGESTED','SELECTED','REQUESTED','CONFIRMED','TICKETED','HELD','WAITLIST','CANCELLED','COMPLETED','ACTION REQUIRED'].includes(raw)?raw:'SUGGESTED'}
export function eventInEvening(event,date,now=Date.now()){
 const clock=selectedCityClock('atlanta',now);if(!clock||dateNumber(date)===null)return false
 // Preserve the current canonical 18:00–04:00 service-day policy in this release.
 const context=new Date(`${date}T22:00:00Z`).getTime();return eventIsDiscoverable(event,'atlanta',now)&&eventIsTonight(event,'atlanta',context)
}
export function calendarFile(plan){
 const escape=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\r/g,'')
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
 const date=plan.itinerary_date; if(dateNumber(date)===null)throw new Error('Choose a valid plan date before adding it to your calendar.')
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GOOD TIMES//Personal plan//EN','CALSCALE:GREGORIAN']
 for(const [i,stop]of(plan.stops||[]).entries()){
  const d=stop.date||date,m=timeMinutes(stop.time);if(dateNumber(d)===null)throw new Error('One stop has an invalid date. Edit the plan before exporting.');lines.push('BEGIN:VEVENT',`UID:${escape(plan.id||'draft')}-${i}@goodtimes`,`DTSTAMP:${stamp}`)
  lines.push(m===null?`DTSTART;VALUE=DATE:${d.replaceAll('-','')}`:`DTSTART;TZID=America/New_York:${d.replaceAll('-','')}T${String(Math.floor(m/60)).padStart(2,'0')}${String(m%60).padStart(2,'0')}00`)
  lines.push(`SUMMARY:${escape(stop.name)}`,`LOCATION:${escape(stop.address||stop.venue||'')}`,`DESCRIPTION:${escape(`${qualifiedStatus(stop)} — Suggested GOOD TIMES plan. Check hours and booking details before going.`)}`,'END:VEVENT')
 }
 lines.push('END:VCALENDAR');return lines.join('\r\n')+'\r\n'
}
