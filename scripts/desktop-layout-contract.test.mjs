import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const exists = path => fs.existsSync(new URL(`../${path}`, import.meta.url))
const premiumCss = read('src/premium-experience.css')
const desktopCss = read('src/features/experience/good-times-desktop.css')
const shellCss = read('src/features/experience/good-times-shell.css')

const mustContain = (text, markers) => markers.forEach(marker => assert.ok(text.includes(marker), `missing desktop contract marker: ${marker}`))

/*
 * Rewritten 2026-08-09 (Phase 1).
 *
 * This suite used to assert that good-times-overlay-safety.css existed and was
 * linked before good-times-desktop.css — it tested the patch stack, not the
 * behaviour, so it locked the emergency overrides in place. The behaviour it
 * was really protecting ("floating member tools stay independent of the app
 * shell") is now guaranteed at source by scoping `.gt-premium-experience > *`,
 * so that stylesheet is gone and the assertions moved here.
 *
 * Rendered geometry is verified separately in scripts/ui-geometry.test.mjs.
 */

test('the app-shell rule cannot leak onto floating controls', () => {
  assert.ok(
    !/\.gt-premium-experience > \*\s*\{/.test(premiumCss),
    'a bare `.gt-premium-experience > *` shell rule is back — it will re-break the floating controls',
  )
  mustContain(premiumCss, [
    '.gt-connect-fab',
    '.gt-five-nav',
    '[role="dialog"]',
    '[style*="position: fixed"]',
  ])
})

test('the emergency overlay-safety stylesheet stays deleted', () => {
  assert.equal(
    exists('src/features/experience/good-times-overlay-safety.css'),
    false,
    'good-times-overlay-safety.css is back; fix the source rule instead of re-adding an override sheet',
  )
})

test('desktop web uses a contained premium frame instead of edge-to-edge mobile geometry', () => {
  mustContain(desktopCss, [
    '@media (min-width: 960px)',
    'width: min(1380px, calc(100vw - 48px)) !important;',
    'height: calc(100dvh - 48px) !important;',
    'border-radius: 28px !important;',
  ])
})

test('desktop rails are stable grids and cannot scatter mobile cards across the viewport', () => {
  mustContain(desktopCss, [
    '.gtlive-rail {',
    'grid-template-columns: repeat(4, minmax(0,1fr)) !important;',
    'width: 100% !important;',
    'min-width: 0 !important;',
  ])
})

test('floating member tools share one baseline so they cannot overlap', () => {
  mustContain(shellCss, [
    '--gt-gutter',
    'button[aria-label="Tickets and paid experiences"]',
    'button[aria-label="Open GOOD TIMES account"]',
    '.gt-connect-fab',
  ])
})

test('only one navigation system is rendered', () => {
  mustContain(shellCss, ['.gtlive-nav'])
  assert.ok(/\.gtlive-nav\s*\{[^}]*display:\s*none/.test(shellCss), 'the duplicate in-flow nav must stay hidden')
})
