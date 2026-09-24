import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import handler, { normalizeCity, buildGatewayQueries, inferCustomerTaxonomy } from '../api/data.js'

const response = () => ({ statusCode: 0, headers: {}, body: '', setHeader(k,v) { this.headers[k]=v }, end(v='') { this.body=v } })

test('Atlanta filesystem entrypoint reads the fresh verified cache before heavier inventory work', async () => {
  const original=globalThis.fetch, calls=[]
  globalThis.fetch=async (url,options={}) => {
    calls.push({url:String(url),options})
    assert.match(String(url), /\/rpc\/gt_public_live_inventory_cache_only_v1$/)
    assert.equal(options.method,'POST')
    assert.equal(JSON.parse(options.body).p_city,'atlanta')
    return new Response(JSON.stringify({
      ok:true,
      city:'atlanta',
      service_date:'2026-09-24',
      cache_refreshed_at:'2026-09-24T22:20:00Z',
      is_service_date_match:true,
      is_fresh:true,
      payload:{events:[],venues:[]},
    }), {status:200})
  }
  try {
    const res=response()
    await handler({method:'GET',url:'/api/data?city=atlanta'},res)
    assert.equal(res.statusCode,200)
    assert.equal(JSON.parse(res.body).source,'good-times-fast-customer-inventory')
    assert.equal(calls.length,1)
    assert.deepEqual(JSON.parse(res.body).events,[])
  } finally { globalThis.fetch=original }
})

test('read-only method boundary still rejects writes before any fetch', async () => {
  const res=response()
  await handler({method:'POST',url:'/api/data?city=atlanta'},res)
  assert.equal(res.statusCode,405)
})

test('legacy research helpers remain available while the public handler is Atlanta-locked', () => {
  assert.equal(normalizeCity('houston'),'houston')
  assert.match(buildGatewayQueries({city:'houston',today:'2026-09-16'}).eventPath,/city_key=eq.houston/)
  assert.equal(inferCustomerTaxonomy({event_type:'comedy',event_name:'Named headliner',venue_name:'The Punchline'}).category,'comedy_performing_arts')
  const text=fs.readFileSync(new URL('../api/data.js',import.meta.url),'utf8')
  assert.match(text,/const city = 'atlanta'/)
  assert.match(text,/const \{ default: handleAtlantaInventory \} = await import\('\.\/data-live\.js'\)/)
})
