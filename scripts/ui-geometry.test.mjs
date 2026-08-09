/**
 * GOOD TIMES — rendered UI geometry contract (Phase 7).
 *
 * Every assertion here encodes a defect that was actually measured in the
 * browser on 2026-08-09 and fixed. These are rendered-DOM checks, not string
 * matches against CSS — the plan is explicit that "the browser is the source
 * of truth" and that green CI must not be mistaken for a working UI.
 *
 * Requires a built dist/ and a server. Skips (does not fail) when the harness
 * is unavailable, so `npm test` stays runnable without a browser:
 *
 *   GT_UI_BASE=http://localhost:4180 npm test
 *
 * CI starts the server itself — see .github/workflows/ui-regression.yml.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.GT_UI_BASE
const OUT = process.env.GT_UI_ARTIFACTS || 'ui-artifacts'
const SESSION_FILE = process.env.GT_UI_SESSION

let chromium = null
try { ({ chromium } = await import('playwright-core')) } catch { /* optional */ }

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, mobile: false },
  { name: '1280x800', width: 1280, height: 800, mobile: false },
  { name: '1024x768', width: 1024, height: 768, mobile: false },
  { name: '430x932', width: 430, height: 932, mobile: true },
  { name: '390x844', width: 390, height: 844, mobile: true },
]

const skip = !BASE || !chromium
  ? 'set GT_UI_BASE and install playwright-core to run rendered UI checks'
  : false

let browser
let session = null
if (!skip) {
  if (SESSION_FILE && fs.existsSync(SESSION_FILE)) {
    session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
    if (!session.expires_at) session.expires_at = Math.floor(Date.now() / 1000) + 3600
  }
  fs.mkdirSync(OUT, { recursive: true })
  // CI supplies an explicit binary (setup-chrome); locally we use the installed
  // Chrome channel so no browser download is needed.
  browser = process.env.GT_UI_CHROME_PATH
    ? await chromium.launch({ executablePath: process.env.GT_UI_CHROME_PATH, headless: true, args: ['--no-sandbox'] })
    : await chromium.launch({ channel: process.env.GT_UI_CHANNEL || 'chrome', headless: true })
}

async function open(vp, signedIn) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  })
  if (signedIn && session) {
    await ctx.addInitScript((s) => {
      localStorage.setItem('gt_session', JSON.stringify(s))
      localStorage.setItem('gt_personalization', JSON.stringify({ city: 'atlanta', vibes: ['grown'], age: '25-34' }))
      sessionStorage.setItem('gt_premium_launch', '1')
      sessionStorage.setItem('gt_splash_shown', '1')
    }, session)
  }
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(signedIn ? 6000 : 2500)
  return { ctx, page, errors }
}

const geometry = (page) => page.evaluate(() => {
  const vw = innerWidth, vh = innerHeight
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom } }
  const overlaps = (a, b) => !!a && !!b && a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom
  const fixedOutside = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.right > vw + 2 || r.left < -2 || r.bottom > vh + 2 || r.top < -2) {
      fixedOutside.push(`${el.className || el.tagName} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
  }
  const doc = document.scrollingElement || document.documentElement
  const tickets = box('button[aria-label="Tickets and paid experiences"]')
  const account = box('button[aria-label="Open GOOD TIMES account"]')
  const connect = box('.gt-connect-fab')
  const visibleNavs = ['.gt-five-nav', '.gtlive-nav'].filter((sel) => {
    const el = document.querySelector(sel); if (!el) return false
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
  })
  // The original two-nav defect showed up here: .gtlive-app is a fixed-height
  // overflow:hidden flex column, and the duplicate in-flow nav pushed its
  // content to scrollHeight 993 against clientHeight 898 — 95px silently
  // clipped off the bottom. Checking "is the nav visible" does NOT catch this,
  // because the whole point is that the second nav was outside the viewport.
  const appEl = document.querySelector('.gtlive-app')
  const appOverflow = appEl ? appEl.scrollHeight - appEl.clientHeight : 0
  return {
    vw, vh,
    appOverflow,
    hOverflow: doc.scrollWidth - vw,
    fixedOutside,
    visibleNavs,
    ticketsAccountOverlap: overlaps(tickets, account),
    connectTicketsOverlap: overlaps(connect, tickets),
    hero: box('.gtlive-hero'),
    card: box('.gtlive-rail .gtlive-event, .gtlive-rail .gtlive-venue'),
    dialogsTooBig: [...document.querySelectorAll('[role="dialog"], .gt-connect-sheet')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > vw + 4 })
      .map((el) => el.className),
  }
})

for (const vp of VIEWPORTS) {
  test(`[${vp.name}] signed-out shell has no geometry faults`, { skip }, async () => {
    const { ctx, page, errors } = await open(vp, false)
    const g = await geometry(page)
    await page.screenshot({ path: path.join(OUT, `${vp.name}__signed-out.png`) })
    await ctx.close()
    assert.ok(g.hOverflow <= 1, `horizontal overflow of ${g.hOverflow}px`)
    assert.deepEqual(g.fixedOutside, [], 'fixed controls outside the viewport')
    assert.deepEqual(errors, [], 'uncaught page errors')
  })

  test(`[${vp.name}] signed-in shell has no geometry faults`, { skip: skip || (!session && 'no GT_UI_SESSION') }, async () => {
    const { ctx, page, errors } = await open(vp, true)
    const g = await geometry(page)
    await page.screenshot({ path: path.join(OUT, `${vp.name}__signed-in.png`) })
    await ctx.close()

    // Regression: the page must not scroll sideways.
    assert.ok(g.hOverflow <= 1, `horizontal overflow of ${g.hOverflow}px`)

    // Regression: Connect / Tickets / Account were three independently
    // positioned fixed elements; Account overlapped Tickets by 72px at 1440.
    assert.equal(g.ticketsAccountOverlap, false, 'Tickets and Account overlap')
    assert.equal(g.connectTicketsOverlap, false, 'Connect and Tickets overlap')

    // Regression: floating launchers must stay on screen.
    assert.deepEqual(g.fixedOutside, [], 'fixed controls outside the viewport')

    // Regression: .gtlive-nav rendered at y=939 inside a 900px shell and was
    // clipped, so the app shipped two navs and only one was reachable.
    assert.equal(g.visibleNavs.length, 1, `expected exactly one visible nav, got ${g.visibleNavs.join(' + ') || 'none'}`)

    // The load-bearing one: .gtlive-app must not silently clip its own content.
    // Baseline measured 95px of hidden overflow here (scrollHeight 993 vs
    // clientHeight 898) which is where the second nav went.
    assert.ok(g.appOverflow <= 4, `.gtlive-app clips ${g.appOverflow}px of its own content`)

    // Regression: hero must occupy real area, not collapse.
    assert.ok(g.hero && g.hero.h > 100, `hero collapsed: ${JSON.stringify(g.hero)}`)

    // Regression: `min-width:0; height:100%` applied to rail children outside
    // the desktop breakpoint collapsed every card to 28x23 at 390px and 32x23
    // at 430px. Neither overlap, overflow nor clipping catches that, so assert
    // real card area directly.
    assert.ok(g.card && g.card.w > 140 && g.card.h > 180, `rail card collapsed: ${JSON.stringify(g.card)}`)

    assert.deepEqual(g.dialogsTooBig, [], 'dialogs wider than the viewport')
    assert.deepEqual(errors, [], 'uncaught page errors')
  })
}

test('teardown', { skip }, async () => { await browser.close() })
