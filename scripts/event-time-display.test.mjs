import test from 'node:test';
import assert from 'node:assert/strict';
import {eventTimeFields,validClock} from '../api/event-time-display.js';
import {eventIsDiscoverable,eventIsTonight} from '../src/features/experience/good-times-event-clock.js';

test('documented showtime takes precedence and doors remain a separate fact',()=>{
  assert.deepEqual(eventTimeFields({show_time:'20:00',doors_time:'19:00'}),{event_time:'20:00',performance_time:'20:00',doors_time:'19:00',time_basis:'performance'});
});
test('doors-only listing explicitly states showtime is unknown',()=>{
  const fields=eventTimeFields({show_time:null,doors_time:'18:00'});
  assert.equal(fields.event_time,'Doors 6:00 PM · showtime TBA');
  assert.equal(fields.performance_time,null);assert.equal(fields.time_basis,'doors');
  const event={event_date:'2026-09-16',city_key:'atlanta',status:'confirmed',...fields};
  const now=Date.parse('2026-09-16T17:00:00Z');
  assert.equal(eventIsDiscoverable(event,'atlanta',now),true);
  assert.equal(eventIsTonight(event,'atlanta',now),false);
});
test('missing and invalid times do not acquire an invented default',()=>{
  for(const value of ['',null,undefined,'TBA','24:00','13:65','Doors 7PM'])assert.equal(validClock(value),null);
  assert.deepEqual(eventTimeFields({}),{event_time:null,performance_time:null,doors_time:null,time_basis:'unknown'});
});
test('midnight and noon labels are unambiguous',()=>{
  assert.equal(eventTimeFields({doors_time:'00:00'}).event_time,'Doors 12:00 AM · showtime TBA');
  assert.equal(eventTimeFields({doors_time:'12:30'}).event_time,'Doors 12:30 PM · showtime TBA');
});
