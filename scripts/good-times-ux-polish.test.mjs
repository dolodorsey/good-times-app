import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {parseSearch,searchPath} from '../api/discovery-search.js'
import {diversePicks} from '../src/features/experience/good-times-ux-model.js'
const date=new Date('2026-09-25T12:00:00Z')
const query=value=>decodeURIComponent(searchPath(parseSearch(value,date)))
test('food filter resolves the real venue category keys',()=>assert.match(query('/?scope=venues&category=dining_culinary'),/category_key=in\.\(dining_culinary,restaurant,food,food_and_dining,coffee\)/))
test('place-specific filters do not bleed into the entertainment scope',()=>{assert.equal(parseSearch('/?scope=venues&category=rooftops',date).category,'rooftops');assert.equal(parseSearch('/?scope=entertainment&category=rooftops',date).category,'');assert.match(query('/?scope=venues&category=rooftops'),/category_key=in\.\(rooftop\)/)})
test('hookah searches use explicit category or verified amenity tags, never all lounges',()=>{const text=query('/?scope=venues&category=hookah');assert.match(text,/amenity_tags.cs.\{hookah\}/);assert.doesNotMatch(text,/category_key.eq.lounge/)})
test('entertainment default does not include business training categories',()=>{const text=query('/');assert.match(text,/category_key_v2=in\.\(/);assert.ok(!text.includes('business_professional'))})
test('family filter requires explicit stored family tags',()=>{const text=query('/?scope=venues&category=family_kids');assert.match(text,/best_for.ov./);assert.match(text,/search_tags.ov./);assert.doesNotMatch(text,/museum|restaurant/)})
test('Home orders real-imagery events by date and includes a venue among the first three',()=>{const events=[{event_key:'late',event_date:'2026-09-30',category_key:'music',image_url:'https://example.com/l.jpg'},{event_key:'now',event_date:'2026-09-25',category_key:'comedy',image_url:'https://example.com/n.jpg'}];const venues=[{id:'place',category_key:'restaurant',hero_image:'https://example.com/v.jpg'}];const result=diversePicks(events,venues,3);assert.deepEqual(result.map(x=>x.item.event_key||x.item.id),['now','late','place']);assert.equal(diversePicks(events,venues,0).length,0)})
test('Ask request composer comes before optional suggestions in keyboard order',()=>{const text=fs.readFileSync(new URL('../src/features/experience/GoodTimesPlannerStudio.jsx',import.meta.url),'utf8');assert.ok(text.indexOf('className="gt-ux-composer"')<text.indexOf('className="gt-ux-suggestions"'))})
