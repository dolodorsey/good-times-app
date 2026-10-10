import {selectedCityClock} from '../good-times-event-clock.js'
import {shiftDate} from './model.js'

// Extract only explicit choices. Relative or unsupported requests need clarification;
// they must not silently erase the rest of an existing plan.
export function parsePlanIntent(text,previous={},now=Date.now()) {
 const t=String(text||'').toLowerCase(),p={...previous,source_method:'ask'},notes=[]
 const c=selectedCityClock('atlanta',now)
 const noClubs=/\b(?:no|without|exclude) clubs\b/.test(t)
 const positive=t.replace(/\b(?:no|without|exclude) clubs\b/g,'')
 const moods=[['food',/\bdinner\b|\bfood\b|\beat\b/],['music',/live music|\bconcert\b|\bshow\b/],['date',/date night|romantic/],['chill',/\bquiet\b|\bchill\b|low.key/],['culture',/\bmuseum\b|\bart\b|\bdifferent\b/],['nightlife',/turn up|\bclubs\b|\bnightlife\b/],['sports',/\bsports\b|watch a game/],['rooftop',/\brooftop\b/]]
 const found=moods.map(([m,re])=>[m,positive.search(re)]).filter(([,i])=>i>=0).sort((a,b)=>a[1]-b[1]).map(([m])=>m)
 if(found.length)p.vibes=(/\b(?:add|also|too)\b/.test(t)?[...new Set([...(p.vibes||[]),...found])]:found).slice(0,4)
 if(noClubs){p.excludeNightlife=true;p.vibes=(p.vibes||[]).filter(m=>m!=='nightlife')}
 if(/family|children|kids/.test(t)){p.company='family';p.adultOnly=false}
 else if(/friends/.test(t))p.company='friends'
 const words={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10}
 const group=t.match(/(?:for|with|party of|group of)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s+(?:people|friends|guests))?\b/)
 if(group)p.people=words[group[1]]||Number(group[1])
 for(const area of ['West Midtown','Old Fourth Ward','East Atlanta','Midtown','Buckhead','Downtown'])if(t.includes(area.toLowerCase())){p.area=area;break}
 if(/anywhere/.test(t))p.area=''
 const date=t.match(/\b20\d{2}-\d{2}-\d{2}\b/)
 if(date)p.date=date[0]
 else if(/tomorrow/.test(t))p.date=shiftDate(c.date,1)
 else if(/tonight|today/.test(t))p.date=c.date
 else {const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];const target=days.findIndex(d=>t.includes(d));if(target>=0){const current=new Date(c.date+'T12:00:00Z').getUTCDay();p.date=shiftDate(c.date,(target-current+7)%7)}}
 const matches=[...t.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/g)]
 const times=matches.map(m=>{const h=Number(m[1]),minute=Number(m[2]||0);return h>=1&&h<=12&&minute<60?`${String(h%12+(m[3]==='pm'?12:0)).padStart(2,'0')}:${String(minute).padStart(2,'0')}`:null})
 if(times.some(x=>x===null))notes.push('That time is not valid. Choose a start and finish in Build.')
 else if(times.length===1&&/\b(?:end|finish|until|home by)\b/.test(t))p.end=times[0]
 else {if(times[0])p.start=times[0];if(times[1])p.end=times[1]}
 const money=t.match(/(?:under|less than|maximum|max|budget(?: of)?)\s*\$\s*(\d+(?:\.\d{1,2})?)/)
 if(money){p.budgetMax=Number(money[1]);p.budgetBasis=/total|whole group|for everyone/.test(t)?'group':'person'}
 else if(/\b(?:cheap|cheaper)\b/.test(t)){const bands=['$','$$','$$$','$$$$'],i=bands.indexOf(p.budget);p.budget=bands[Math.max(0,i-1)];if(p.budgetMax!=null)notes.push('Your numeric limit is unchanged. Enter a lower amount in Spend if you want a smaller maximum.')}
 p.dietary=[...new Set([...(p.dietary||[]),...['vegan','vegetarian','gluten-free','halal','kosher'].filter(x=>t.includes(x))])]
 p.accessibility=[...new Set([...(p.accessibility||[]),...(/wheelchair|step.free/.test(t)?['wheelchair_accessible']:[])])]
 if(/closer|swap|between stops/.test(t)||(/earlier|later/.test(t)&&!times.length))notes.push('Choose the exact area, time or stop in Build before generating; that correction needs a specific value.')
 if(/all (?:are |over )?21|everyone is 21/.test(t))notes.push('Confirm the age checkbox yourself in Build. Text does not enable it automatically.')
 if(!found.length&&!group&&!date&&!times.length&&!money&&!/tomorrow|tonight|today|midtown|buckhead|downtown|anywhere|no clubs|cheaper/.test(t))notes.push('Review the extracted choices below; details outside the supported fields need a must-have note.')
 return {values:p,notes}
}

// Send the same editable constraints with a follow-up request, without inventing
// a conversation transcript or turning user text into analytics identifiers.
export function planIntentQuery(text,values) {
 const {date,start,end,people,area,budget,budgetMax,budgetBasis,vibes,dietary,accessibility,excludeNightlife,adultOnly,allowUnknownHours,mustHave}=values
 return `${String(text).trim()}\nCurrent editable planning choices: ${JSON.stringify({date,start,end,people,area,budget,budgetMax,budgetBasis,vibes,dietary,accessibility,excludeNightlife,adultOnly,allowUnknownHours,mustHave})}. Preserve these constraints. Flag unknown availability and ask for a specific value for ambiguous changes.`
}
