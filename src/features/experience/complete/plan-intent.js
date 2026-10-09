import {selectedCityClock,timeMinutes} from '../good-times-event-clock.js'
import {shiftDate} from './model.js'

// A transparent deterministic parser. Unsupported requirements stay visible
// for clarification instead of disappearing into an ungrounded recommendation.
export function parsePlanIntent(text,previous={},now=Date.now()) {
 const t=String(text||'').toLowerCase(),p={...previous,source_method:'ask'},notes=[]
 const c=selectedCityClock('atlanta',now)
 const moods=[['food',/dinner|food|eat/],['music',/live music|concert|show/],['date',/date night|romantic/],['chill',/quiet|chill|low.key/],['culture',/museum|art|different/],['nightlife',/turn up|clubs|nightlife/]]
 const found=moods.map(([m,re])=>[m,t.search(re)]).filter(([,i])=>i>=0).sort((a,b)=>a[1]-b[1]).map(([m])=>m)
 if(found.length)p.vibes=found.slice(0,4)
 if(/no clubs|without clubs|exclude clubs/.test(t)){p.excludeNightlife=true;p.vibes=(p.vibes||[]).filter(m=>m!=='nightlife')}
 if(/family|children|kids/.test(t)){p.company='family';p.adultOnly=false}
 else if(/friends/.test(t))p.company='friends'
 const group=t.match(/(?:for|with|party of|group of)\s+(\d{1,2})(?:\s+(?:people|friends|guests))?\b/)
 if(group)p.people=Number(group[1])
 for(const area of ['West Midtown','Old Fourth Ward','East Atlanta','Midtown','Buckhead','Downtown'])if(t.includes(area.toLowerCase())){p.area=area;break}
 if(/anywhere/.test(t))p.area=''
 const date=t.match(/\b20\d{2}-\d{2}-\d{2}\b/)
 if(date)p.date=date[0]
 else if(/tomorrow/.test(t))p.date=shiftDate(c.date,1)
 else if(/tonight|today/.test(t))p.date=c.date
 else {const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];const target=days.findIndex(d=>t.includes(d));if(target>=0){const current=new Date(c.date+'T12:00:00Z').getUTCDay();p.date=shiftDate(c.date,(target-current+7)%7)}}
 const times=[...t.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/g)].map(m=>`${String(Number(m[1])%12+(m[3]==='pm'?12:0)).padStart(2,'0')}:${m[2]||'00'}`)
 if(times[0]&&timeMinutes(times[0])!==null)p.start=times[0]
 if(times[1]&&timeMinutes(times[1])!==null)p.end=times[1]
 const money=t.match(/(?:under|less than|maximum|max|budget(?: of)?)\s*\$\s*(\d+(?:\.\d{1,2})?)/)
 if(money){p.budgetMax=Number(money[1]);p.budgetBasis=/total|whole group|for everyone/.test(t)?'group':'person'}
 else if(/cheap|cheaper/.test(t))p.budget='$'
 p.dietary=[...new Set([...(p.dietary||[]),...['vegan','vegetarian','gluten-free','halal','kosher'].filter(x=>t.includes(x))])]
 p.accessibility=[...new Set([...(p.accessibility||[]),...(/wheelchair|step.free/.test(t)?['wheelchair_accessible']:[])])]
 if(/closer|earlier|later|swap|between stops/.test(t))notes.push('Choose the exact area, time or stop in Build before generating; that correction needs a specific value.')
 if(/all (?:are |over )?21|everyone is 21/.test(t))notes.push('Confirm the age checkbox yourself in Build. Text does not enable it automatically.')
 if(!found.length&&!group&&!date&&!times.length&&!money&&!/tomorrow|tonight|today|midtown|buckhead|downtown|anywhere|no clubs/.test(t))notes.push('Review the extracted choices below; details outside the supported fields need a must-have note.')
 return {values:p,notes}
}
