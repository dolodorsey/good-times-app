/**
 * GOOD TIMES — third-party font resilience + image decode contract.
 *
 * Closes the exact gap that let a P0 reach production on 2026-08-15: three
 * bundled stylesheets opened with `@import url(fonts.googleapis.com)`. A
 * bundled @import is render-blocking, and its failure rejected Vite's CSS
 * preload, so the dynamic App import never resolved and the app mounted to
 * nothing at all. The rendered geometry suite could not catch it, because a
 * blank page has no geometry to be wrong about.
 *
 * Contract: no third-party asset host may be able to blank the app. If Google
 * Fonts is unreachable — corporate DNS filtering, a blocked region, an ad
 * blocker, or simply a bad connection — GOOD TIMES must still render in the
 * local fallback stack.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.GT_UI_BASE
const OUT = process.env.GT_UI_ARTIFACTS || 'ui-artifacts'

let chromium = null
try { ({ chromium } = await import('playwright-core')) } catch { /* optional */ }

const skip = !BASE || !chromium
  ? 'set GT_UI_BASE and install playwright-core to run rendered UI checks'
  : false

// The signed-out landing screen is intentionally sparse (~100 characters), so a
// raw character count is the wrong signal. What distinguishes a working app from
// the outage is whether React mounted at all: #root gains children, readable
// copy appears, and there is something to tap. A blanked app has none of these.
const MIN_TEXT = 40

const launch = () =>
  process.env.GT_UI_CHROME_PATH
    ? chromium.launch({ executablePath: process.env.GT_UI_CHROME_PATH, headless: true, args: ['--no-sandbox'] })
    : chromium.launch({ channel: process.env.GT_UI_CHANNEL || 'chrome', headless: true })

async function settle(page, budgetMs = 45_000) {
  const started = Date.now()
  while (Date.now() - started < budgetMs) {
    const state = await page.evaluate(() => {
      const text = document.body.innerText || ''
      return { length: text.trim().length, loading: /CURATING/i.test(text) }
    })
    if (!state.loading && state.length > MIN_TEXT) return
    await page.waitForTimeout(750)
  }
}

test('the app still renders when the font host is unreachable', { skip }, async () => {
  const browser = await launch()
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    // Hard-fail every request to the font host, the way a DNS filter would.
    await ctx.route('**://fonts.googleapis.com/**', (route) => route.abort())
    await ctx.route('**://fonts.gstatic.com/**', (route) => route.abort())

    const page = await ctx.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 200)))

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await settle(page)

    const mounted = await page.evaluate(() => {
      const root = document.getElementById('root')
      const visible = [...document.querySelectorAll('button, a[href], input')].filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 8 && r.height > 8 && getComputedStyle(el).visibility !== 'hidden'
      })
      return {
        rootChildren: root ? root.childElementCount : 0,
        textLength: (document.body.innerText || '').trim().length,
        interactive: visible.length,
      }
    })

    fs.mkdirSync(OUT, { recursive: true })
    await page
      .screenshot({ path: path.join(OUT, 'font-host-blocked-390x844.png'), timeout: 15_000 })
      .catch(() => null) // document.fonts.ready never settles with the host blocked

    const detail =
      `root children ${mounted.rootChildren}, text ${mounted.textLength} chars, ` +
      `${mounted.interactive} interactive elements. ` +
      `Page errors: ${pageErrors.slice(0, 3).join(' | ') || 'none'}`

    assert.ok(
      mounted.rootChildren > 0,
      `React never mounted with the font host blocked — #root is empty. ${detail}`,
    )
    assert.ok(
      mounted.textLength > MIN_TEXT,
      `app rendered almost no readable copy with the font host blocked. ${detail}`,
    )
    assert.ok(
      mounted.interactive > 0,
      `app rendered nothing tappable with the font host blocked. ${detail}`,
    )

    assert.equal(
      pageErrors.length,
      0,
      `unhandled page errors with the font host blocked: ${pageErrors.slice(0, 3).join(' | ')}`,
    )

    await ctx.close()
  } finally {
    await browser.close()
  }
})

test('no bundled stylesheet blocks rendering on a third-party font import', { skip }, async () => {
  // Defence in depth: even if the rendered check above were to pass for an
  // unrelated reason, a bundled @import of a remote font host is the mechanism
  // that caused the outage and must not come back.
  const browser = await launch()
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const stylesheets = []
    page.on('response', async (response) => {
      if (response.request().resourceType() !== 'stylesheet') return
      if (!response.url().startsWith(BASE)) return
      const body = await response.text().catch(() => '')
      if (body) stylesheets.push({ url: response.url(), body })
    })

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(4_000)

    const offenders = stylesheets
      .filter((sheet) => /@import\s+(url\()?["']?https?:\/\/fonts\./i.test(sheet.body))
      .map((sheet) => sheet.url)

    assert.deepEqual(
      offenders,
      [],
      'bundled stylesheet(s) @import a remote font host, which is render-blocking and can blank the app: ' +
        offenders.join(', ') +
        '. Load fonts from index.html with media="print" onload instead.',
    )

    await ctx.close()
  } finally {
    await browser.close()
  }
})

test('images that reach the browser actually decode', { skip }, async () => {
  const browser = await launch()
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()

    // Only images whose bytes actually arrived. An image that never reached the
    // network is a property of the CI runner, not a defect in the app.
    const delivered = new Set()
    page.on('response', (response) => {
      if (response.request().resourceType() === 'image' && response.ok()) delivered.add(response.url())
    })

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await settle(page)
    await page.waitForTimeout(2_500)

    const broken = await page.evaluate(
      (urls) =>
        [...document.querySelectorAll('img')]
          .filter((img) => img.getAttribute('src') && img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src)
          .filter((src) => urls.includes(src)),
      [...delivered],
    )

    assert.deepEqual(broken, [], `images were delivered but failed to decode: ${broken.join(', ')}`)

    await ctx.close()
  } finally {
    await browser.close()
  }
})
