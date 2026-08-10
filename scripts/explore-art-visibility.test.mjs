import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css=fs.readFileSync(new URL('../src/features/experience/good-times-creative-refresh.css',import.meta.url),'utf8')

test('Explore keeps approved Supabase art visible instead of burying it under a full-card veil',()=>{
  assert.match(css,/var\(--gt-cat-image\)!important/)
  assert.match(css,/rgba\(6,6,11,0\) 0%/)
  assert.match(css,/rgba\(6,6,11,0\) 50%/)
  assert.match(css,/rgba\(6,6,11,.10\) 62%/)
  assert.match(css,/rgba\(6,6,11,.84\) 100%/)
  assert.doesNotMatch(css,/rgba\(6,6,11,.95\) 90%/)
})

test('Explore artwork stays vivid on hover without reverting to generic repeated art',()=>{
  assert.match(css,/saturate\(1.18\) brightness\(1.08\)/)
  assert.doesNotMatch(css,/ChatGPT_Image_Feb_10_2026/)
  assert.doesNotMatch(css,/GOODTIMES_SCREENS\.png/)
})
