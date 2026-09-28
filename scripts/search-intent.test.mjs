import test from 'node:test'
import assert from 'node:assert/strict'
import {routeSearchIntent} from '../src/features/experience/complete/search-intent.js'

test('restaurant intent routes to Places',()=>{const r=routeSearchIntent('upscale steakhouse in Midtown');assert.equal(r.mode,'places')})
test('nightlife timing routes to Entertainment',()=>{const r=routeSearchIntent('clubs tonight');assert.equal(r.mode,'entertainment');assert.equal(r.category,'nightlife');assert.equal(r.time,'tonight')})
test('sports intent routes to Entertainment sports',()=>{const r=routeSearchIntent('where can I watch the Hawks game');assert.equal(r.mode,'entertainment');assert.equal(r.category,'sports_watch')})
test('combined outing routes to both systems',()=>{const r=routeSearchIntent('dinner and a lounge after');assert.equal(r.mode,'both');assert.equal(r.category,'nightlife')})
test('concert intent routes to Entertainment live inventory',()=>{const r=routeSearchIntent('21 savage concert tickets');assert.equal(r.mode,'entertainment');assert.equal(r.category,'concerts_live_music')})
test('ambiguous discovery searches keep both systems available',()=>assert.equal(routeSearchIntent('something cool in Midtown').mode,'both'))
