import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GOOD_TIMES_WEIGHTS,
  scoreGoodTimesVenue,
  scoreMediaCandidate,
  selectBestMedia,
} from '../api/good-times-intelligence.js'

test('Good Times intelligence weights total 100 and caps proximity at five percent',()=>{
  assert.equal(Object.values(GOOD_TIMES_WEIGHTS).reduce((sum,value)=>sum+value,0),100)
  assert.equal(GOOD_TIMES_WEIGHTS.proximity,5)
  assert.equal(GOOD_TIMES_WEIGHTS.cultural_relevance,25)
  assert.equal(GOOD_TIMES_WEIGHTS.experience_quality,20)
})

test('SEO-style Google rating does not change the intelligence score',()=>{
  const base={
    is_verified:true,quality_score:55,culture_score:80,is_culture_pick:true,
    source_tier:'A',hero_image:'https://example.com/venue.jpg',website:'https://venue.example',
  }
  const low=scoreGoodTimesVenue({...base,google_rating:3.1,google_reviews:12})
  const high=scoreGoodTimesVenue({...base,google_rating:5,google_reviews:50000})
  assert.equal(low.total,high.total)
})

test('distance cannot overpower a materially better experience',()=>{
  const weakNearby=scoreGoodTimesVenue({
    is_verified:true,quality_score:35,culture_score:20,source_tier:'C',distance_miles:0.2,
    hero_image:'https://example.com/near.jpg',
  })
  const strongFarther=scoreGoodTimesVenue({
    is_verified:true,quality_score:80,culture_score:92,is_culture_pick:true,source_tier:'S',distance_miles:18,
    hero_image:'https://example.com/far.jpg',independent_source_count:4,recent_mentions:5,
  })
  assert.ok(strongFarther.total > weakNearby.total)
})

test('visual director can replace a curator submission with a stronger verified image',()=>{
  const curator={
    url:'https://example.com/curator-flyer.jpg',source_type:'curator_submission',
    is_curator_submission:true,subject_verified:true,width:800,height:800,text_heavy:true,
  }
  const editorial={
    url:'https://example.com/editorial-venue.jpg',source_type:'editorial_press',
    is_editorial:true,subject_verified:true,width:1800,height:1013,mobile_crop_safe:true,
    rights_status:'licensed',captured_at:new Date().toISOString(),
  }
  const picked=selectBestMedia({hero_image:curator.url,media_candidates:[curator,editorial]},'venue')
  assert.equal(picked.url,editorial.url)
  assert.equal(picked.changed_from_current,true)
})

test('real official/editorial photography outranks stock, logos, and generic fallbacks',()=>{
  const official=scoreMediaCandidate({
    url:'https://venue.example/interior.jpg',source_type:'official_venue',is_official:true,
    subject_verified:true,width:1600,height:900,rights_status:'owned',mobile_crop_safe:true,
  },'venue')
  const stock=scoreMediaCandidate({
    url:'https://images.example/stock-nightclub.jpg',source_type:'stock',width:2000,height:1125,
  },'venue')
  const logo=scoreMediaCandidate({
    url:'https://venue.example/logo.png',source_type:'official_venue',is_official:true,
    subject_verified:true,width:1600,height:900,rights_status:'owned',
  },'venue')
  assert.ok(official > stock)
  assert.ok(official > logo)
})
