import test from 'node:test'
import assert from 'node:assert/strict'
import { inferCustomerTaxonomy } from '../api/data.js'

test('music versus titles are not classified as sports', () => {
  const a=inferCustomerTaxonomy({
    event_type:'play',
    event_name:'Hip-Hop vs R&B Part-2',
    venue_name:'Believe Music Hall',
    description:'Live concert hosted by Lil Bank Head',
  })
  const b=inferCustomerTaxonomy({
    event_type:'special_event',
    event_name:'R&B vs HIP HOP',
    venue_name:'BELIEVE MUSIC HALL',
    description:'KiWii performing live',
  })
  assert.deepEqual(a,{category:'concerts_live_music',subcategory:'hip_hop_rap'})
  assert.deepEqual(b,{category:'concerts_live_music',subcategory:'hip_hop_rap'})
})

test('real sports matchups still classify as sports', () => {
  const result=inferCustomerTaxonomy({
    event_type:'sports',
    event_name:'Atlanta United vs NYCFC',
    venue_name:'Mercedes-Benz Stadium',
  })
  assert.deepEqual(result,{category:'sports_watch',subcategory:'pro_home_games'})
})

test('combat versus language remains sports when a fight signal exists', () => {
  const result=inferCustomerTaxonomy({
    event_type:'special_event',
    event_name:'Smith vs Jones Fight Night',
    venue_name:'Arena',
  })
  assert.deepEqual(result,{category:'sports_watch',subcategory:'combat_sports'})
})
