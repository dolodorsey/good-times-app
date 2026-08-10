import test from 'node:test'
import assert from 'node:assert/strict'
import { brittleVenueImage, customerVenueMedia } from '../api/data-fast.js'

test('logo, bottle and padded placeholder media are rejected',()=>{
  assert.equal(brittleVenueImage('https://example.com/brand-logo.png'),true)
  assert.equal(brittleVenueImage('https://example.com/StarLogo-02.png'),true)
  assert.equal(brittleVenueImage('https://example.com/Web.Bottle-02.png'),true)
  assert.equal(brittleVenueImage('https://example.com/Artboard+1.png'),true)
  assert.equal(brittleVenueImage('https://cdn.example.com/image.png?fit=pad'),true)
  assert.equal(brittleVenueImage('https://example.com/real-room-photo.jpg'),false)
})

test('brittle restaurant media becomes approved-style dining category art',()=>{
  const venue=customerVenueMedia({name:'Example',category_key:'restaurant',hero_image:'https://example.com/brand-logo.png'})
  assert.match(venue.hero_image,/good-times-backgrounds\/gt-cat-dining\.webp$/)
  assert.equal(venue.image_is_category_fallback,true)
  assert.equal(venue.image_source,'good_times_category_fallback')
})

test('approved GOOD TIMES venue photography is never replaced',()=>{
  const url='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/REVEL.webp'
  const venue={name:'Revel Atlanta',category_key:'nightclub',hero_image:url}
  assert.equal(customerVenueMedia(venue),venue)
})
