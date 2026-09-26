/** GOOD TIMES product-preservation gate. Fixtures never reach a production origin. */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

test('canonical app must render the established taxonomy with all state handlers', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  const mount = source.match(/<ExploreTaxonomyBrowser\b[\s\S]*?\/>/)
  assert.ok(mount, 'P1: full taxonomy browser removed; a shallow filter list is not a replacement')
  for (const binding of ['taxonomy={taxonomy}', 'selectedCategory={selectedCategory}', 'selectedSubcategory={selectedSubcategory}', 'onCategory={setSelectedCategory}', 'onSubcategory={setSelectedSubcategory}', 'directoryOpen={directoryOpen}', 'onDirectoryOpen={setDirectoryOpen}', 'mapMode={mapMode}', 'onMapMode={setMapMode}']) {
    assert.ok(mount[0].includes(binding), `Protected taxonomy binding missing: ${binding}`)
  }
  assert.match(source, /loadExploreTaxonomy\(/)
})
test('category and subcategory data remain authoritative and complete', () => {
  const client = read('src/features/intelligence/client.js')
  const browser = read('src/features/experience/ExploreTaxonomyBrowser.jsx')
  for (const source of ['gt_taxonomy_categories?', 'gt_taxonomy_subcategories?', 'v_gt_venue_taxonomy_directory?', 'v_gt_venue_taxonomy_counts?']) assert.ok(client.includes(source), `Canonical data source removed: ${source}`)
  assert.match(client, /is_active=eq\.true/)
  assert.match(browser, /categoryRows\.map\(/)
  assert.match(browser, /subcategoryRows\.map\(/)
  assert.doesNotMatch(browser, /(?:categoryRows|subcategoryRows)\.slice\(/, 'Do not truncate the standard taxonomy')
  assert.match(browser, /This lane remains visible/)
})

const BASE = process.env.GT_UI_BASE
let chromium
try { ({ chromium } = await import('playwright-core')) } catch {}
const skip = !BASE || !chromium ? 'requires the established rendered UI job; static checks still run' : false
const epoch = Date.parse('2026-09-25T16:00:00Z')
// Deliberately unknown IDs: a hardcoded shortlist cannot pass this contract.
const categories = Array.from({ length: 26 }, (_, i) => ({ category_key: `guard_category_${i}`, category_name: `Catalog section ${i + 1}`, sort_order: i, is_active: true }))
const subcategories = categories.flatMap((cat, i) => Array.from({ length: i === 25 ? 3 : 2 }, (_, j) => ({ category_key: cat.category_key, subcategory_key: `guard_sub_${i}_${j}`, subcategory_name: `Section ${i + 1} option ${j + 1}`, sort_order: j, is_active: true })))
const venues = subcategories.filter(row => row.subcategory_key !== 'guard_sub_25_2').map((row, i) => ({ id: `guard_venue_${i}`, name: `Catalog place ${i + 1}`, city_key: 'atlanta', category_key: row.category_key, subcategory_key: row.subcategory_key, subcategory: row.subcategory_name, neighborhood: 'Midtown', short_desc: 'Isolated regression fixture, not a live recommendation.', hero_image: '/venues/revel.webp', address: 'Fixture address only', latitude: 33.78, longitude: -84.38, quality_score: 90, is_verified: true }))
const counts = categories.map(cat => ({ category_key: cat.category_key, subcategory_key: null, place_count: venues.filter(v => v.category_key === cat.category_key).length })).concat(subcategories.map(sub => ({ category_key: sub.category_key, subcategory_key: sub.subcategory_key, place_count: venues.filter(v => v.subcategory_key === sub.subcategory_key).length })))
const events = [{ event_key: 'guard-event', title: 'Regression fixture only', city_key: 'atlanta', category_key: 'concerts_live_music', event_date: '2026-09-25', event_time: '20:00', venue_name: 'Fixture venue', image_url: '/venues/revel.webp', quality_score: 90, is_verified: true }]
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  test(`all dynamic category/subcategory journeys stay usable at ${viewport.width}px`, { skip, timeout: 120000 }, async () => {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname), 'Fixtures must never target production')
    const browser = await chromium.launch({ headless: true, executablePath: process.env.GT_UI_CHROME_PATH || undefined, args: ['--no-sandbox'] })
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', timezoneId: 'America/New_York' })
    const page = await context.newPage(), errors = [], requests = [], traversed = []
    const dir = path.join(process.env.GT_UI_ARTIFACTS || 'ui-artifacts', 'protected-taxonomy', String(viewport.width))
    fs.mkdirSync(dir, { recursive: true })
    page.on('pageerror', e => errors.push(e.message))
    const capture = name => page.screenshot({ path: path.join(dir, `${name}.png`), animations: 'disabled' })
    try {
      await context.addInitScript(epoch => {
        const NativeDate = Date
        window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [epoch])) } static now() { return epoch } }
        localStorage.setItem('gt_session', JSON.stringify({ access_token: 'isolated-taxonomy-fixture', user: { id: 'isolated-taxonomy-user' }, expires_at: 4102444800 }))
        sessionStorage.setItem('gt_premium_launch', '1'); sessionStorage.setItem('gt_splash_shown', '1')
      }, epoch)
      await context.route('**/auth/v1/**', route => route.fulfill(json({ external: { google: true } })))
      await context.route('**/api/**', route => { const p = new URL(route.request().url()).pathname; return route.fulfill(json(p === '/api/health' ? { ok: true, service: 'good-times', customer_ready: true, content_ready: true } : p.startsWith('/api/data') ? { ok: true, connected: true, degraded: false, city: 'atlanta', events, venues: [], counts: { events: 1, venues: 0 } } : { ok: true })) })
      await context.route('**/rest/v1/**', route => {
        const u = new URL(route.request().url()), table = u.pathname.split('/').at(-1)
        requests.push({ table, query: u.search })
        if (table === 'gt_taxonomy_categories') return route.fulfill(json(categories))
        if (table === 'gt_taxonomy_subcategories') return route.fulfill(json(subcategories))
        if (table === 'v_gt_venue_taxonomy_counts') return route.fulfill(json(counts))
        if (table === 'v_gt_venue_taxonomy_directory') { const key = String(u.searchParams.get('category_key') || '').replace(/^eq\./, ''); return route.fulfill(json(venues.filter(v => !key || v.category_key === key))) }
        return route.fulfill(json([]))
      })
      await context.route('**/functions/v1/**', route => route.fulfill(json({ ok: true, events: [], venues: [] })))
      await context.route('https://www.openstreetmap.org/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Isolated map fixture</p>' }))
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.locator('.gt5-nav').getByRole('button', { name: 'Discover', exact: true }).click()
      await page.locator('[data-gt-category="guard_category_25"]').waitFor({ timeout: 15000 })
      assert.deepEqual(await page.locator('[data-gt-category]').evaluateAll(nodes => nodes.map(n => n.dataset.gtCategory)), categories.map(c => c.category_key))
      assert.deepEqual(await page.locator('[data-gt-category] strong').allTextContents(), categories.map(c => c.category_name))
      await capture('all-categories')
      for (const cat of categories) {
        await page.locator(`[data-gt-category="${cat.category_key}"]`).click()
        const grid = page.locator(`[data-gt-subcategories="${cat.category_key}"]`)
        await grid.waitFor()
        const subs = subcategories.filter(s => s.category_key === cat.category_key)
        assert.deepEqual(await grid.locator('button strong').allTextContents(), [`All ${cat.category_name}`, ...subs.map(s => s.subcategory_name)])
        const sub = subs[0], venue = venues.find(v => v.subcategory_key === sub.subcategory_key)
        await grid.getByRole('button', { name: new RegExp(sub.subcategory_name) }).click()
        await page.locator('.gt2-venue-grid h3').filter({ hasText: venue.name }).waitFor()
        assert.deepEqual(await page.locator('.gt2-venue-grid h3').allTextContents(), [venue.name])
        traversed.push(cat.category_key)
        if (cat.category_key === 'guard_category_25') {
          await capture('subcategory-directory')
          await page.locator('.gt2-venue-grid .gt5-venue').first().click()
          await page.locator('.gt5-detail').waitFor()
          await page.locator('.gt5-detail-back').click()
          assert.equal(await grid.locator('button.active strong').innerText(), sub.subcategory_name, 'Detail return lost subcategory')
          await page.locator('.gt2-explore-toggle').getByRole('button', { name: 'Map', exact: true }).click()
          await page.locator('.gt2-map-frame').waitFor()
          await capture('subcategory-map')
          await page.locator('.gt2-explore-toggle').getByRole('button', { name: 'Directory', exact: true }).click()
          await grid.getByRole('button', { name: new RegExp(subs[2].subcategory_name) }).click()
          await page.getByRole('heading', { name: 'No verified matches yet' }).waitFor()
          assert.equal(await grid.locator('button strong').count(), 4, 'Empty subcategory removed')
          await capture('empty-subcategory-retained')
        }
        await page.getByRole('button', { name: '‹ All categories', exact: true }).click()
        await page.locator('[data-gt-category="guard_category_25"]').waitFor()
      }
      assert.equal(traversed.length, categories.length)
      assert.deepEqual(errors, [])
      for (const name of ['gt_taxonomy_categories', 'gt_taxonomy_subcategories', 'v_gt_venue_taxonomy_directory']) assert.ok(requests.some(r => r.table === name), `Missing source request ${name}`)
      fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify({ scope: 'isolated fixture; not production authentication or real catalog count', viewport, categories_checked: categories.length, subcategory_labels_checked: subcategories.length, journeys_checked: traversed.length, map_checked: true, detail_return_checked: true, empty_subcategory_retained: true, errors, requests }, null, 2))
    } catch (error) { await capture('failure').catch(() => {}); throw error }
    finally { await context.close(); await browser.close() }
  })
}
