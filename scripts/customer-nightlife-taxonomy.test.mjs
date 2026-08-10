import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCustomerEventTaxonomy } from '../api/data-fast.js'

const base={event_date:'2026-08-09',event_time:'23:00',category_key:'dining_culinary',subcategory_key:null,raw_type:'special_event'}

test('Utopia After Dark recurring parties are customer-facing nightlife',()=>{
  for(const title of ['Dance Hall After Dark','Global After Dark','Hip-Hop/R&B After Dark','Amapiano After Dark','Afrobeats After Dark']){
    const result=normalizeCustomerEventTaxonomy({...base,title,venue_name:'Utopia Restaurant at the Underground Atlanta'})
    assert.equal(result.category_key,'nightlife',title)
    assert.equal(result.subcategory_key,'late_night',title)
  }
})

test('Playhouse Sundays at P Sports Bar is nightlife rather than a sports watch party',()=>{
  const result=normalizeCustomerEventTaxonomy({...base,title:'PLAYHOUSE SUNDAYS AT P SPORTS BAR!',venue_name:'P Sports Bar',raw_type:'sports',category_key:'sports_watch',subcategory_key:'watch_parties',event_time:'22:00'})
  assert.equal(result.category_key,'nightlife')
  assert.equal(result.subcategory_key,'weekly_parties')
})

test('real concerts, wellness and cocktail events using After Dark keep their real category',()=>{
  const concert=normalizeCustomerEventTaxonomy({...base,title:'Velvet After Dark: An Intimate Night of Live Music',venue_name:'Apache XLR',raw_type:'concert',category_key:'concerts_live_music',subcategory_key:'intimate_shows'})
  const yoga=normalizeCustomerEventTaxonomy({...base,title:'Self-Ease Yoga After Dark',venue_name:'3063 Bolling Way NE',category_key:'wellness_fitness',subcategory_key:'fitness_classes'})
  const cocktails=normalizeCustomerEventTaxonomy({...base,title:'Happy Hour After Dark',venue_name:'Happy Hour ATL',raw_type:'play',category_key:'dining_culinary',subcategory_key:'wine_cocktails'})
  assert.deepEqual([concert.category_key,yoga.category_key,cocktails.category_key],['concerts_live_music','wellness_fitness','dining_culinary'])
})

test('explicit daytime party remains Day Parties & Brunch',()=>{
  const result=normalizeCustomerEventTaxonomy({...base,title:'Sunday Service ATL — Premier Sunday Day Party',venue_name:'Utopia Restaurant and Lounge',raw_type:'nightlife',category_key:'day_parties_brunch',subcategory_key:'day_parties',event_time:'11:00'})
  assert.equal(result.category_key,'day_parties_brunch')
  assert.equal(result.subcategory_key,'day_parties')
})
