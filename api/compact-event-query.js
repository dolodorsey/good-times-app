import {createHash} from 'node:crypto'
import {inferCustomerTaxonomy} from './data.js'
import {eventTimeFields} from './event-time-display.js'
import {dateNumber,eventIsDiscoverable,eventIsTonight,selectedCityClock} from '../src/features/experience/good-times-event-clock.js'
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24)
const shift=(d,n)=>new Date((dateNumber(d)+n)*86400000).toISOString().slice(0,10)
export function parseScope(params,now=Date.now()){
 const clock=selectedCityClock('atlanta',now),mode=params.get('mode')||'upcoming',date=params.get('date')||(mode==='tonight'?clock.serviceDate:clock.date)
 const to=params.get('to')||shift(date,180)
 if(dateNumber(date)===null||dateNumber(to)===null||dateNumber(to)<dateNumber(date)||dateNumber(to)-dateNumber(date)>366)throw new Error('Choose a valid date range of up to one year.')
 const category=params.get('category')||'',subcategory=params.get('subcategory')||'',q=(params.get('q')||'').trim().slice(0,120)
 if(!['upcoming','tonight'].includes(mode)||[category,subcategory].some(x=>x&&!/^[a-z][a-z0-9_]{0,79}$/.test(x))||subcategory&&!category)throw new Error('Invalid collection filter.')
 const scope={city:'atlanta',date,to:mode==='tonight'?shift(date,1):to,category,subcategory,q,mode,limit:Math.min(48,Math.max(1,Number.parseInt(params.get('limit'),10)||24))}
 const signature=hash(scope);let after=null
 if(params.get('cursor')){try{const c=JSON.parse(Buffer.from(params.get('cursor'),'base64url').toString());if(c.signature!==signature||dateNumber(c.date)===null||!/^[0-9a-f-]{36}$/i.test(c.id)||!/^([0-2][0-9]:[0-5][0-9]|99:99)$/.test(c.time||'')||Date.now()-c.at>15*60*1000)throw new Error();after=c}catch{throw new Error('This result page expired. Refresh the collection.')}}
 return{...scope,signature,after}
}
export function encodeCursor(row,scope){return Buffer.from(JSON.stringify({signature:scope.signature,date:row.show_date,time:/^([01]\d|2[0-3]):[0-5]\d/.test(row.show_time||'')?row.show_time.slice(0,5):'99:99',id:row.id,at:Date.now()})).toString('base64url')}
export function showToEvent(row,now=Date.now()){
 const category=inferCustomerTaxonomy(row),updated=Date.parse(row.updated_at||'')
 if(row.city_key!=='atlanta'||!row.event_name||!row.venue_name||!row.ticket_url||!row.image_url||!Number.isFinite(updated)||updated>now+60000||now-updated>72*3600000||row.is_sold_out||!['confirmed','tentative'].includes(row.status)||category.category==='needs_review')return null
 const e={event_key:`show:${row.id}`,id:row.id,source_table:'gt_shows',source_id:row.id,city_key:'atlanta',title:row.event_name,...eventTimeFields(row),event_date:row.show_date,venue_id:row.venue_id,venue_name:row.venue_name,venue_address:row.venue_address,description:row.description,category_key:category.category,subcategory_key:category.subcategory,image_url:row.image_url,ticket_url:row.ticket_url,source_url:row.source_url,source_name:row.source,updated_at:row.updated_at,is_curated:row.is_curated,is_featured:row.is_featured,quality_score:row.quality_score,good_times_score:row.good_times_score,age_requirement:row.age_requirement,is_free:row.is_free,ticket_price_min:row.ticket_price_min,ticket_price_max:row.ticket_price_max}
 return eventIsDiscoverable(e,'atlanta',now)?e:null
}
export function eventMatches(e,scope,now=Date.now()){
 if(!e||scope.category&&e.category_key!==scope.category||scope.subcategory&&e.subcategory_key!==scope.subcategory)return false
 if(scope.mode==='tonight'&&!eventIsTonight(e,'atlanta',Date.parse(`${scope.date}T22:00:00Z`)))return false
 return true
}
