import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {isLeisureEvent,diversePicks} from '../src/features/experience/good-times-ux-model.js'
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('professional training is not a Home leisure recommendation',()=>{assert.equal(isLeisureEvent({category_key:'business_professional'}),false);assert.equal(isLeisureEvent({category_key:'concerts_live_music'}),true);assert.equal(isLeisureEvent({category_key:'family_kids'}),true)})
test('Home picks exclude professional records without removing source inventory',()=>{const source=[{event_key:'work',category_key:'business_professional'},{event_key:'family',category_key:'family_kids'}];assert.deepEqual(diversePicks(source,[],5).map(x=>x.item.event_key),['family']);assert.equal(source.length,2)})
test('Upcoming and Next up apply the same leisure scope as Home picks',()=>{const source=read('src/features/experience/GoodTimesUXScreens.jsx');assert.match(source,/leisureUpcoming=upcoming.filter\(isLeisureEvent\)/);assert.match(source,/rows=\(mode==='tonight'\?today:upcoming\).filter\(isLeisureEvent\)/)})
test('new public readers reuse public configuration without inline keys or service-role escalation',()=>{for(const file of ['api/discovery-search.js','api/home-sports.js']){const text=read(file);assert.match(text,/publicContentReadHeaders\(\)/);assert.doesNotMatch(text,/sb_publishable_|SERVICE_ROLE|SUPABASE_SERVICE|process.env/)};assert.match(read('api/data-live.js'),/export \{ CONTENT_URL as PUBLIC_CONTENT_URL, headers as publicContentReadHeaders \}/)})
test('family mood does not reuse the generic bar scene',()=>assert.match(read('src/features/experience/GoodTimesPlannerStudio.jsx'),/label==='Family day'\?'\/city-atlanta.png'/))
test('compact checkbox preserves its 44px hit area',()=>{const css=read('src/features/experience/good-times-ux.css');assert.match(css,/flex:0 0 44px;height:44px/);assert.match(css,/input:before\{content:'';position:absolute;inset:11px/)})
