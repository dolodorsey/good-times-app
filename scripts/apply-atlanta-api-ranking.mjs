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
function rankCustomerEventsByUrgency(rows,city,today) {
  if(city!=='atlanta')return rows
  const bucket=days=>days===0?0:days<=7?1:2
  return [...rows].sort((a,b)=>{
    const aDays=customerDateDistance(a.show_date,today)
    const bDays=customerDateDistance(b.show_date,today)
    return bucket(aDays)-bucket(bDays)||aDays-bDays||eventRecordScore(b)-eventRecordScore(a)
  })
}`

if (!source.includes('function rankCustomerEventsByUrgency')) {
  if (!source.includes(dedupeBlock)) throw new Error('GOOD TIMES Atlanta API ranking anchor moved')
  source = source.replace(dedupeBlock, urgencyHelpers)
}

const before = `  const events = mapShows(dedupeCustomerEvents(filteredEvents)).slice(0,eventLimit)`
const after = `  const events = mapShows(rankCustomerEventsByUrgency(dedupeCustomerEvents(filteredEvents),city,todayISO())).slice(0,eventLimit)`
if (!source.includes(after)) {
  if (!source.includes(before)) throw new Error('GOOD TIMES Atlanta API handler anchor moved')
  source = source.replace(before, after)
}

fs.writeFileSync(target, source)
console.log('Applied GOOD TIMES Atlanta urgency ranking')
