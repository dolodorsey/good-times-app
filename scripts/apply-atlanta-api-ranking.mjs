import fs from 'node:fs'

const target = 'api/data.js'
let source = fs.readFileSync(target, 'utf8')

const dedupeBlock = `export function dedupeCustomerEvents(rows) {
  const best = new Map()
  for (const item of rows || []) {
    const key = eventCanonicalKey(item)
    const existing = best.get(key)
    if (!existing || eventRecordScore(item) > eventRecordScore(existing)) best.set(key, item)
  }
  return [...best.values()].sort((a,b) => eventRecordScore(b) - eventRecordScore(a) || String(a.show_date || '').localeCompare(String(b.show_date || '')))
}`

const urgencyHelpers = `${dedupeBlock}
function customerDateDistance(value,today) {
  const candidate=Date.parse(\`${'${value}'}T12:00:00Z\`)
  const base=Date.parse(\`${'${today}'}T12:00:00Z\`)
  if(!Number.isFinite(candidate)||!Number.isFinite(base))return 9999
  return Math.max(0,Math.round((candidate-base)/86400000))
}
function customerEventMinutes(value) {
  const match=String(value||'').match(/^(\\d{1,2}):(\\d{2})/)
  if(!match)return -1
  return Number(match[1])*60+Number(match[2])
}
function atlantaTonightPriority(item,days) {
  if(days!==0)return 9
  const taxonomy=inferCustomerTaxonomy(item)
  const text=normalizeText(\`${'${item?.event_name||\'\'}'} ${'${item?.venue_name||\'\'}'} ${'${item?.event_type||\'\'}'} ${'${item?.genre||\'\'}'}\`)
  const minutes=customerEventMinutes(item?.show_time)
  const evening=minutes>=17*60
  const partySignal=taxonomy.category==='nightlife'||taxonomy.category==='day_parties_brunch'||cleanKey(item?.event_type)==='nightlife'||/\\b(party|nightclub|club night|after party|after-party|lounge|rooftop|dj|dance|r&b|rnb|hip hop|hip-hop)\\b/.test(text)
  if(partySignal&&evening)return 0
  if(taxonomy.category==='concerts_live_music'&&evening)return 1
  if(evening)return 2
  if(partySignal)return 3
  return 6
}
function rankCustomerEventsByUrgency(rows,city,today) {
  if(city!=='atlanta')return rows
  const bucket=days=>days===0?0:days<=7?1:2
  return [...rows].sort((a,b)=>{
    const aDays=customerDateDistance(a.show_date,today)
    const bDays=customerDateDistance(b.show_date,today)
    const aBucket=bucket(aDays)
    const bBucket=bucket(bDays)
    if(aBucket!==bBucket)return aBucket-bBucket
    if(aDays!==bDays)return aDays-bDays
    if(aDays===0){
      const priority=atlantaTonightPriority(a,aDays)-atlantaTonightPriority(b,bDays)
      if(priority)return priority
      const time=customerEventMinutes(b.show_time)-customerEventMinutes(a.show_time)
      if(time)return time
    }
    return eventRecordScore(b)-eventRecordScore(a)
  })
}`

if (!source.includes('function rankCustomerEventsByUrgency')) {
  if (!source.includes(dedupeBlock)) throw new Error('GOOD TIMES Atlanta API ranking anchor moved')
  source = source.replace(dedupeBlock, urgencyHelpers)
} else if (!source.includes('function atlantaTonightPriority')) {
  const start = source.indexOf('function customerDateDistance')
  const end = source.indexOf('\nfunction mapShows', start)
  if (start < 0 || end < 0) throw new Error('GOOD TIMES Atlanta ranking helper block moved')
  source = `${source.slice(0,start)}${urgencyHelpers.slice(urgencyHelpers.indexOf('function customerDateDistance'))}${source.slice(end)}`
}

const before = `  const events = mapShows(dedupeCustomerEvents(filteredEvents)).slice(0,eventLimit)`
const after = `  const events = mapShows(rankCustomerEventsByUrgency(dedupeCustomerEvents(filteredEvents),city,todayISO())).slice(0,eventLimit)`
if (!source.includes(after)) {
  if (!source.includes(before)) throw new Error('GOOD TIMES Atlanta API handler anchor moved')
  source = source.replace(before, after)
}

fs.writeFileSync(target, source)
console.log('Applied GOOD TIMES Atlanta same-day nightlife-first ranking')