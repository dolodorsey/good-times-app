import test from 'node:test'
import assert from 'node:assert/strict'
import {homeHighlights,withReviewedVenueMedia,REVIEWED_VENUE_MEDIA} from '../src/features/experience/good-times-reviewed-media.js'
test('Home presents upcoming category variety with ranked ties, without image-based selection',()=>{
 const events=[{event_key:'later',category_key:'sports_watch',event_date:'2026-10-17',image_url:'photo'},{event_key:'music',category_key:'concerts_live_music',event_date:'2026-09-18'},{event_key:'sport',category_key:'sports_watch',event_date:'2026-09-19'},{event_key:'festival',category_key:'festivals_major_activations',event_date:'2026-09-20'}]
 const picks=homeHighlights(events,[{id:'dinner',category_key:'restaurant'}]);assert.deepEqual(picks.map(p=>p.item.event_key||p.item.id),['music','sport','festival','dinner']);assert.equal(events[0].event_key,'later')
})
test('reviewed media replaces generic defaults only for exact city and identity; retains curated photography',()=>{
 const id=Object.keys(REVIEWED_VENUE_MEDIA)[0],generic='https://example.com/good-times-backgrounds/gt-cat-dining.webp'
 const rows=[{id,city_key:'atlanta',hero_image:null},{id,city_key:'atlanta',hero_image:generic},{id,city_key:'miami',hero_image:null},{id:'other',city_key:'atlanta',hero_image:null},{id,city_key:'atlanta',hero_image:'https://official.example/curated.jpg'}]
 const enriched=withReviewedVenueMedia(rows)
 assert.equal(enriched[0].hero_image,REVIEWED_VENUE_MEDIA[id].image);assert.equal(enriched[1].hero_image,enriched[0].hero_image)
 assert.equal(enriched[2],rows[2]);assert.equal(enriched[3],rows[3]);assert.equal(enriched[4],rows[4]);assert.equal(rows[0].hero_image,null)
})
