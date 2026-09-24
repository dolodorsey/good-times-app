import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const live = read('api/data-live.js')
const client = read('src/features/intelligence/client.js')
const app = read('src/features/experience/GoodTimesCommandAppV4.jsx')
const css = read('src/features/experience/good-times-founder-v4-restore.css')

test('live inventory fails fast to verified snapshot before the browser timeout', () => {
  assert.match(live, /INVENTORY_RPC_TIMEOUT_MS=2600/)
  assert.match(live, /INVENTORY_RPC_ATTEMPTS=1/)
  assert.match(client, /controller\.abort\(\), 7000/)
  assert.ok(!live.includes('setTimeout(()=>controller.abort(),7000)'))
})

test('customer bootstrap requests a bounded but useful Atlanta payload', () => {
  assert.ok(client.includes('event_limit=80&venue_limit=120'))
  assert.ok(app.includes('loadCanonicalEvents(nextCity,{limit:80})'))
  assert.ok(app.includes('loadCanonicalVenues(nextCity,{limit:120})'))
})

test('taxonomy cannot block first useful customer inventory render', () => {
  const refresh = app.slice(app.indexOf('const refresh=useCallback'), app.indexOf('const refreshAccount=useCallback'))
  assert.ok(refresh.includes('const taxonomyPromise=loadExploreTaxonomy().catch(()=>[])'))
  assert.ok(refresh.includes('setEvents(hardened.events);setVenues(hardened.venues)'))
  assert.ok(refresh.includes('finally{setLoading(false)}'))
  assert.ok(refresh.indexOf('setEvents(hardened.events)') < refresh.indexOf('taxonomyPromise.then'))
})

test('loading status is accessible but cannot cover the visible app', () => {
  assert.ok(app.includes('className="gt5-sr-status"'))
  assert.ok(!app.includes('className="gt5-hydrating"'))
  assert.match(css, /\.gt5-sr-status\{[^}]*width:1px!important[^}]*height:1px!important/s)
})
