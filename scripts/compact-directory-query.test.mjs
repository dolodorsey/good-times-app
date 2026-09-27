import test from 'node:test'
import assert from 'node:assert/strict'
import {compactPilotEnabled,directoryScope,directoryPageUrl,encodeDirectoryCursor,decodeDirectoryCursor,normalizeDirectoryQuery,mergeDirectoryPages,coordinatesFor} from '../src/features/experience/compact-directory-query.js'
const base='https://content.example.test'
const row={id:'00000000-0000-4000-8000-000000000001',subcategory_key:'nightclubs'}
test('compact pilot is opt-in and cannot be enabled on a production host',()=>{
  assert.equal(compactPilotEnabled({hostname:'thegoodtimesworldwide.com',search:'?gt_compact=1'}),false)
  assert.equal(compactPilotEnabled({hostname:'good-times-app.vercel.app',search:'?gt_compact=1'}),false)
  assert.equal(compactPilotEnabled({hostname:'localhost',search:'?gt_compact=1'}),true)
  assert.equal(compactPilotEnabled({hostname:'preview.example.test',preview:true,search:'?gt_compact=1'}),true)
  assert.equal(compactPilotEnabled({hostname:'preview.example.test',preview:true}),false)
})
test('directory read is Atlanta scoped, server-filtered and bounded',()=>{
  const {url}=directoryPageUrl(base,{category:'nightlife',subcategory:'nightclubs',query:'Revel'})
  const parsed=new URL(url)
  assert.equal(parsed.searchParams.get('city_key'),'eq.atlanta')
  assert.equal(parsed.searchParams.get('category_key'),'eq.nightlife')
  assert.equal(parsed.searchParams.get('subcategory_key'),'eq.nightclubs')
  assert.equal(parsed.searchParams.get('limit'),'25')
  assert.match(parsed.searchParams.get('and'),/name\.ilike/)
  assert.equal(parsed.searchParams.get('order'),'id.asc,subcategory_key.asc')
})
test('category key injection and orphan subcategory are rejected',()=>{
  for (const category of ['nightlife,or(id.gt.0)','../nightlife','', 'a'.repeat(100)]) assert.throws(()=>directoryPageUrl(base,{category}))
  assert.throws(()=>directoryPageUrl(base,{subcategory:'nightclubs'}))
})
test('search metacharacters cannot become PostgREST syntax',()=>{
  assert.equal(normalizeDirectoryQuery('Revel,or(id.gt.0)%_*"\\'), 'Revel or id.gt.0')
  assert.equal(normalizeDirectoryQuery('  café   & jazz '),'café & jazz')
  assert.equal(normalizeDirectoryQuery('x'.repeat(500)).length,100)
})
test('cursor is bound to its full filter scope and rejects tampering',()=>{
  const scope=directoryScope({category:'nightlife',subcategory:'nightclubs',query:'Revel'})
  const cursor=encodeDirectoryCursor(row,scope)
  assert.equal(decodeDirectoryCursor(cursor,scope).id,row.id)
  assert.throws(()=>decodeDirectoryCursor(cursor,directoryScope({category:'dining_culinary'})))
  assert.throws(()=>decodeDirectoryCursor('not-a-cursor',scope))
  const {url}=directoryPageUrl(base,{category:'nightlife',subcategory:'nightclubs',query:'Revel',cursor})
  assert.match(new URL(url).searchParams.get('and'),/subcategory_key\.gt\.nightclubs/)
})
test('canonical venue identities deduplicate across taxonomy memberships',()=>{
  assert.equal(mergeDirectoryPages([row],[{...row,subcategory_key:'lounges'}]).length,1)
})
test('missing and invalid coordinates stay unknown instead of pinning zero',()=>{
  assert.equal(coordinatesFor({latitude:null,longitude:null}),null)
  assert.equal(coordinatesFor({latitude:'',longitude:''}),null)
  assert.equal(coordinatesFor({latitude:91,longitude:-84}),null)
  assert.deepEqual(coordinatesFor({latitude:33.78,longitude:-84.4}),{lat:33.78,lon:-84.4})
})

test('cursor supports Unicode search text',()=>{const scope=directoryScope({category:'dining_culinary',query:'寿司 café'});assert.equal(decodeDirectoryCursor(encodeDirectoryCursor(row,scope),scope).scope,scope)})
