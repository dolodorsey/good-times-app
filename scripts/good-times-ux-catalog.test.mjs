import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {parseSearch,searchPath,mapSearchRows} from '../api/discovery-search.js'
import {safePublicUrl,UX_NAV,HOME_MODES,PLAN_MODES} from '../src/features/experience/good-times-ux-model.js'
const fixed=new Date('2026-09-25T12:00:00Z')
test('catalog defaults to Atlanta entertainment, not a second city',()=>{const o=parseSearch('/api/discovery-search?city=miami',fixed);assert.equal(o.scope,'entertainment');assert.match(searchPath(o),/city_key=eq.atlanta/)})
test('catalog bounds page offset and does not accept negative pages',()=>{assert.equal(parseSearch('/?page=-2',fixed).page,0);assert.equal(parseSearch('/?page=999999',fixed).page,100);assert.equal(parseSearch('/?page=bad',fixed).page,0)})
test('search tokens cannot inject PostgREST query syntax',()=>{const o=parseSearch('/?q='+encodeURIComponent('x),or(status.eq.hidden),x('),fixed);assert.equal(o.q,'x or status eq hidden x');assert.ok(!o.q.includes('('));assert.ok(!o.q.includes('.'))})
test('search length is bounded and unsupported categories ignored',()=>{assert.equal(parseSearch('/?q='+'a'.repeat(500),fixed).q.length,100);assert.equal(parseSearch('/?category=secret',fixed).category,'')})
test('venue search enforces current verified active inventory',()=>{const path=decodeURIComponent(searchPath(parseSearch('/?scope=venues&q=midtown',fixed)));for(const clause of ['gt_venues?','status=eq.active','is_verified=eq.true','verification_status=eq.verified_current','freshness_expires_at=gt.','limit=19'])assert.ok(path.includes(clause),clause)})
test('event search uses canonical category and explicit date',()=>{const path=decodeURIComponent(searchPath(parseSearch('/?category=family_kids&date=2026-09-26',fixed)));assert.match(path,/category_key_v2=eq.family_kids/);assert.match(path,/show_date=eq.2026-09-26/)})
test('past date filter cannot expose expired events',()=>assert.equal(parseSearch('/?date=2024-01-01',fixed).date,''))
test('source-less events do not become search results',()=>assert.deepEqual(mapSearchRows([{id:'1',event_name:'test'}],'entertainment'),[]))
test('venue result preserves source id and is typed separately',()=>{const v={id:'venue-source',name:'Source Venue',is_verified:true};assert.deepEqual(mapSearchRows([v],'venues'),[{...v,entity_type:'venue'}])})
test('relative approved images remain usable without allowing scheme-relative URLs',()=>{assert.equal(safePublicUrl('/venues/revel.webp'),'/venues/revel.webp');assert.equal(safePublicUrl('//unexpected-host/image.jpg'),null);assert.equal(safePublicUrl('javascript:alert(1)'),null)})
test('three modes and four Home views do not create extra primary tabs',()=>{assert.equal(UX_NAV.length,5);assert.equal(HOME_MODES.length,4);assert.equal(PLAN_MODES.length,3)})
test('planner uses total group budgets rather than silent per-person budgets',()=>{const src=fs.readFileSync(new URL('../src/features/experience/GoodTimesPlannerStudio.jsx',import.meta.url),'utf8');assert.match(src,/Total group budget/);assert.doesNotMatch(src,/Budget per person/)})
test('motion has permission handling, cleanup, cooldown and tap fallback',()=>{const src=fs.readFileSync(new URL('../src/features/experience/GoodTimesPlannerStudio.jsx',import.meta.url),'utf8');for(const text of ['requestPermission','removeEventListener','lastMotion','Tap to shake'])assert.ok(src.includes(text))})
test('duplicate concierge creation has a synchronous shared guard',()=>{const src=fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx',import.meta.url),'utf8');assert.match(src,/conciergeLock\.current\)return null/);assert.match(src,/finally\{conciergeLock.current=false/)})
test('entry account gate is not bypassed by the UI upgrade',()=>{const src=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');assert.match(src,/!hasSession/);assert.match(src,/SignedOutMemberGate/);assert.doesNotMatch(src,/ux-review-entry/)})
