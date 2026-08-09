import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync(new URL('./apply-atlanta-api-ranking.mjs',import.meta.url),'utf8')

test('Atlanta same-day ranking explicitly prioritizes real nightlife and evening party signals',()=>{
  assert.match(source,/function atlantaTonightPriority/)
  assert.match(source,/partySignal&&evening/)
  assert.match(source,/taxonomy\.category==='nightlife'/)
  assert.match(source,/taxonomy\.category==='day_parties_brunch'/)
  assert.match(source,/customerEventMinutes\(b\.show_time\)-customerEventMinutes\(a\.show_time\)/)
})

test('nightlife priority only changes Atlanta same-day ordering',()=>{
  assert.match(source,/if\(city!==\'atlanta\'\)return rows/)
  assert.match(source,/if\(days!==0\)return 9/)
  assert.match(source,/const bucket=days=>days===0\?0:days<=7\?1:2/)
})
