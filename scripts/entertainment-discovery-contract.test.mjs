import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {UX_NAV,canonicalTab} from '../src/features/experience/good-times-ux-model.js'
const source=fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx',import.meta.url),'utf8')
const api=fs.readFileSync(new URL('../api/discovery-search.js',import.meta.url),'utf8')
test('Sept 25 discovery split retains five destinations and the central Plan action',()=>{assert.deepEqual(UX_NAV.map(x=>x[0]),['home','entertainment','plan','venues','profile']);assert.match(source,/const NAV=UX_NAV/)})
test('legacy Discover and Saved destinations resolve without deleting user data',()=>{assert.equal(canonicalTab('discover'),'entertainment');assert.equal(canonicalTab('saved'),'profile');assert.match(source,/<ProfileLibrary plans=\{plans\} saved=\{saved\}/)})
test('catalog search preserves named canonical category fields',()=>{assert.match(api,/category_key_v2/);assert.match(api,/subcategory_key_v2/);assert.match(api,/inferCustomerTaxonomy/);assert.match(api,/eq.verified_current/)})
test('Entertainment data is source-backed and bounded, not an in-memory Home search',()=>{assert.match(api,/gt_shows/);assert.match(api,/gt_venues/);assert.match(api,/limit:18/);assert.match(api,/next_page/);assert.match(api,/city_key:'eq.atlanta'/)})
