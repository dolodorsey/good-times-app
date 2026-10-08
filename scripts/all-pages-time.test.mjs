import test from 'node:test';import assert from 'node:assert/strict';
import {discoveryWindow,filterDiscoveryEvents} from '../src/features/experience/complete/discovery-time.js';
const now=Date.parse('2026-10-09T20:00:00-04:00');
test('weekend window includes Monday overnight query boundary and Sunday uses current weekend',()=>{assert.deepEqual(discoveryWindow('weekend',now),{from:'2026-10-09',to:'2026-10-12'});assert.deepEqual(discoveryWindow('weekend',Date.parse('2026-10-11T12:00:00-04:00')),{from:'2026-10-09',to:'2026-10-12'})});
test('tonight query starts on service date after midnight',()=>assert.deepEqual(discoveryWindow('tonight',Date.parse('2026-10-10T01:00:00-04:00')),{from:'2026-10-09',to:'2026-10-10'}));
test('event discovery deduplicates and excludes missing time from time-specific filters',()=>{const e={event_key:'show:test',city_key:'atlanta',event_date:'2026-10-09',event_time:'21:00',title:'Fixture',status:'active'};assert.equal(filterDiscoveryEvents([e,e],{mode:'upcoming',now}).length,1);assert.equal(filterDiscoveryEvents([{...e,event_time:null}],{mode:'upcoming',band:'late',now}).length,0)});
