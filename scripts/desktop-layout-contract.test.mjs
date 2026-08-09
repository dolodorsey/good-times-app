import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const exists = path => fs.existsSync(new URL(`../${path}`, import.meta.url))
const premiumCss = read('src/premium-experience.css')
const shellCss = read('src/features/experience/good-times-shell.css')
const profileCss = read('src/features/experience/good-times-profile.css')
const indexHtml = read('index.html')
const mustContain = (text, markers) => markers.forEach(marker => assert.ok(text.includes(marker), `missing desktop contract marker: ${marker}`))

test('the app-shell rule cannot leak onto floating controls', () => {
  assert.ok(!/\.gt-premium-experience > \*\s*\{/.test(premiumCss), 'a bare direct-child shell rule is back')
  mustContain(premiumCss, ['.gt-connect-fab','.gt-five-nav','[role="dialog"]','[style*="position: fixed"]'])
})

test('emergency geometry stylesheets stay deleted and unlinked', () => {
  assert.equal(exists('src/features/experience/good-times-overlay-safety.css'), false)
  assert.equal(exists('src/features/experience/good-times-desktop.css'), false)
  assert.equal(indexHtml.includes('good-times-desktop.css'), false)
})

test('profile stylesheet contains profile UI only, not shell geometry', () => {
  mustContain(profileCss, ['.gt-profile-editor','.gt-profile-save'])
  assert.equal(profileCss.includes('.gt-premium-experience'), false, 'profile CSS must not own app-shell geometry')
  assert.equal(profileCss.includes('.gtlive-app'), false, 'profile CSS must not size the Live app')
})

test('desktop web uses natural document height and a contained premium frame', () => {
  mustContain(shellCss, [
    '@media (min-width:1024px)',
    'width:min(1380px,calc(100vw - 40px))!important;',
    'height:auto!important;',
    'overflow:visible!important;',
    'border-radius:26px!important;',
  ])
})

test('desktop navigation is a header row, never a bottom dock', () => {
  mustContain(shellCss, [
    'top:102px!important;',
    'bottom:auto!important;',
    'width:min(720px,calc(100vw - 580px))!important;',
    'border-radius:14px!important;',
  ])
})

test('desktop rails are stable grids and card titles preserve two lines', () => {
  mustContain(shellCss, [
    'grid-template-columns:repeat(4,minmax(0,1fr))!important;',
    '-webkit-line-clamp:2!important;',
    'min-height:2.08em!important;',
  ])
})

test('floating member tools share one header baseline and cannot overlap', () => {
  mustContain(shellCss, [
    'button[aria-label="Tickets and paid experiences"]',
    'button[aria-label="Open GOOD TIMES account"]',
    '.gt-connect-fab',
    'top:104px!important;',
  ])
})

test('only one navigation system is rendered', () => {
  assert.ok(/\.gtlive-nav\{display:none!important\}/.test(shellCss), 'duplicate in-flow nav must stay hidden')
})

test('hero uses current GOOD TIMES brand art instead of raw event flyers', () => {
  mustContain(shellCss, ['GOODTIMES_HOMESCREEN.png','background-image:linear-gradient'])
})

test('Connect and ticket sheets are viewport-contained', () => {
  mustContain(shellCss, ['max-height:calc(100dvh - 32px)!important;','max-height:calc(100dvh - 40px)!important;'])
})
