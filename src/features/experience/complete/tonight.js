import {selectedCityClock,eventIsTonight} from '../good-times-event-clock.js'
import {occurrenceUsable,unique,displayDate,shiftDate} from './model.js'

const order=(a,b)=>String(a.event_date).localeCompare(String(b.event_date))||String(a.event_time||'99').localeCompare(String(b.event_time||'99'))

/**
 * Tonight's confirmed events; when tonight's window has nothing left (late night, quiet weeknight),
 * the next night that has confirmed events, clearly labelled with its day. Never invents listings.
 */
export function tonightOrNext(events=[],now=Date.now()){
 const c=selectedCityClock('atlanta',now)
 const usable=unique(events).filter(e=>occurrenceUsable(e,now)).sort(order)
 const tonight=usable.filter(e=>eventIsTonight(e,'atlanta',now))
 if(tonight.length)return {rows:tonight,title:c.minute<240?'Still Going':'Tonight',kicker:'LIVE & UPCOMING',next:false}
 const future=usable.filter(e=>String(e.event_date)>=c.date)
 if(!future.length)return {rows:[],title:'Tonight',kicker:'LIVE & UPCOMING',next:false}
 const day=future[0].event_date
 const weekday=displayDate(day,{weekday:'long'})
 const title=day===c.date?'Tonight':day===shiftDate(c.date,1)?'Tomorrow Night':`${weekday} Night`
 return {rows:future.filter(e=>e.event_date===day),title,kicker:`UP NEXT · ${displayDate(day,{weekday:'short',month:'short',day:'numeric'}).toUpperCase()}`,next:true,day}
}
