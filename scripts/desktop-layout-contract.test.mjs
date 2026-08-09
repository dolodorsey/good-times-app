import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const indexHtml = read('index.html')
const desktopCss = read('src/features/experience/good-times-desktop.css')
const overlayCss = read('src/features/experience/good-times-overlay-safety.css')

const mustContain = (text, markers) => markers.forEach(marker => assert.ok(text.includes(marker), `missing desktop contract marker: ${marker}`))

test('desktop styles load after overlay safety and base app styles', () => {
  mustContain(indexHtml, [
    '/src/features/experience/good-times-overlay-safety.css',
    '/src/features/experience/good-times-desktop.css',
  ])
  assert.ok(indexHtml.indexOf('good-times-overlay-safety.css') < indexHtml.indexOf('good-times-desktop.css'))
})

test('desktop web uses a contained premium frame instead of edge-to-edge mobile geometry', () => {
  mustContain(desktopCss, [
    '@media (min-width: 960px)',
    'width: min(1380px, calc(100vw - 48px)) !important;',
    'height: calc(100dvh - 48px) !important;',
    'border-radius: 28px !important;',
    'height: 420px !important;',
  ])
})

test('desktop rails are stable grids and cannot scatter mobile cards across the viewport', () => {
  mustContain(desktopCss, [
    '.gtlive-rail {',
    'grid-template-columns: repeat(4, minmax(0,1fr)) !important;',
    '.gtlive-rail > :nth-child(n+5) { display: none !important; }',
    'width: 100% !important;',
    'min-width: 0 !important;',
  ])
})

test('floating member tools stay independent of the app shell', () => {
  mustContain(overlayCss, [
    '.gt-premium-experience > .gt-connect-fab',
    'button[aria-label="Tickets and paid experiences"]',
    'button[aria-label="Open GOOD TIMES account"]',
    'min-height: 0 !important;',
  ])
})