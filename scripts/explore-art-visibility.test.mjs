import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css=fs.readFileSync(new URL('../src/features/experience/good-times-creative-refresh.css',import.meta.url),'utf8')

test('Explore keeps approved Supabase art visible instead of burying it under a near-black veil',()=>{
  assert.match(css,/var\(--gt-cat-image\)!important/)
  assert.match(css,/rgba\(6,6,11,.04\) 0%/)
  assert.match(css,/rgba\(6,6,11,.18\) 48%/)
  assert.match(css,/rgba\(6,6,11,.80\) 100%/)
  assert.doesNotMatch(css,/rgba\(6,6,11,.95\) 90%/)
})

test('Explore artwork stays readable on hover without reverting to generic repeated art',()=>{
  assert.match(css,/saturate\(1.14\) brightness\(1.04\)/)
  assert.doesNotMatch(css,/ChatGPT_Image_Feb_10_2026/)
  assert.doesNotMatch(css,/GOODTIMES_SCREENS\.png/)
})
