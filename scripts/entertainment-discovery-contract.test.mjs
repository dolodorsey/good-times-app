import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx', import.meta.url), 'utf8')

test('protected bottom navigation remains unchanged', () => {
  assert.match(source, /const NAV=\[\['home','⌂','Home'\],\['discover','⌕','Discover'\],\['plan','＋','Plan'\],\['saved','▣','Saved'\],\['profile','◎','Profile'\]\]/)
})

test('Discover exposes Entertainment without replacing the protected nav', () => {
  assert.match(source, /'Entertainment','Hotels','Experiences'/)
  assert.match(source, /selectedCategory==='entertainment'/)
  assert.match(source, /setSelectedCategory\('entertainment'\)/)
})

test('Entertainment does not add a sixth protected editorial lane', () => {
  const laneBlock = source.match(/const CATEGORY_LANES=\[(.*?)\]\nconst CATEGORY_LABELS/s)?.[1] || ''
  assert.equal((laneBlock.match(/^\s*\[/gm) || []).length, 5)
})

test('Entertainment Whats On uses verified event inventory', () => {
  assert.match(source, /ENTERTAINMENT_EVENT_CATEGORIES=new Set/)
  assert.match(source, /activeEvents\.filter\(item=>ENTERTAINMENT_EVENT_CATEGORIES\.has\(item\.category_key\)\)/)
  assert.match(source, /Entertainment happening now/)
})
