import {selectedCityClock,dateNumber,timeMinutes,eventIsTonight,eventIsThisWeekend} from '../good-times-event-clock.js'
import {shiftDate,occurrenceUsable} from './model.js'
export function discoveryWindow(mode,now=Date.now()) {
 const c=selectedCityClock('atlanta',now),day=new Date(c.date+'T12:00:00Z').getUTCDay()
 if(mode==='tonight')return {from:c.serviceDate,to:shiftDate(c.serviceDate,1)}
 if(mode==='weekend'){const friday=shiftDate(c.date,day===0?-2:day===6?-1:(5-day+7)%7);return {from:friday,to:shiftDate(friday,3)}}
 const n=mode==='week'?6:mode==='next-week'?13:mode==='month'?30:180
 return {from:mode==='next-week'?shiftDate(c.date,7):c.date,to:shiftDate(c.date,n)}
}
export function filterDiscoveryEvents(rows,{mode='upcoming',day='',band='',now=Date.now()}={}){
 const c=selectedCityClock('atlanta',now),w=discoveryWindow(mode,now),seen=new Set()
 return rows.filter(e=>{
  const id=e.event_key||e.id;if(!id||seen.has(id)||!occurrenceUsable(e,now))return false
  if(mode==='tonight'&&!eventIsTonight(e,'atlanta',now)||mode==='weekend'&&!eventIsThisWeekend(e,'atlanta',now))return false
  if(!['tonight','weekend'].includes(mode)&&(e.event_date<w.from||e.event_date>w.to))return false
  const m=timeMinutes(e.event_time),service=m!==null&&m<240?shiftDate(e.event_date,-1):e.event_date
  if(day&&service!==day)return false
  if(band){if(m===null)return false;const phase=m<240?m+1440:m
   if(band==='day'&&!(phase>=600&&phase<1020)||band==='dinner'&&!(phase>=1020&&phase<1260)||band==='night'&&!(phase>=1260&&phase<1380)||band==='late'&&phase<1380)return false
   if(band==='soon'){const delta=(dateNumber(e.event_date)-dateNumber(c.date))*1440+m-c.minute;if(delta<0||delta>120)return false}
  }
  seen.add(id);return true
 }).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))||String(a.event_time||'99').localeCompare(String(b.event_time||'99')))
}
export const EVENT_LANES=[['concerts_live_music','Concerts & Live Music'],['nightlife','Parties'],['sports_watch','Sports'],['comedy_performing_arts','Comedy & Performing Arts'],['festivals_major_activations','Festivals'],['arts_museums_culture','Culture'],['food_drink','Food Events'],['pop_ups','Pop-Ups'],['family_kids','Family']]
