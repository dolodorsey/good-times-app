#!/usr/bin/env node
/**
 * GOOD TIMES — screen audit
 *
 * Walks every tab of the built app at phone and desktop sizes, writes a
 * screenshot per screen, and fails the run when it finds a defect class that
 * has shipped to production before:
 *
 *   1. blank render          — app mounts to no text (the Google Fonts outage mode)
 *   2. off-viewport chrome   — primary nav laid out below the fold
 *   3. overlapping chrome    — fixed utility buttons covering page content
 *   4. undersized targets    — interactive elements below 44x44 (HIG / WCAG AA)
 *   5. horizontal overflow   — content wider than the viewport
 *   6. broken images         — <img> that resolved but decoded to nothing
 *
 * Usage:
 *   npm run build
 *   node scripts/serve-dist.mjs &
 *   node scripts/screen-audit.mjs [--base http://localhost:4180] [--out .audit]
 *
 * Exit code is non-zero when any check fails, so it can gate a release.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

// document.fonts.ready never settles when the font host is unreachable, and
// Playwright waits on it before capturing. Never let that abort an audit run.
const capture = (page, options) =>
  page.screenshot({ timeout: 15_000, ...options }).catch(() => null);

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = flag('base', process.env.GT_AUDIT_BASE || 'http://localhost:4180');
const OUT = path.resolve(flag('out', '.audit'));
const EXECUTABLE = process.env.GT_AUDIT_CHROMIUM || process.env.CHROME_PATH || undefined;
const MIN_TARGET = 44;

const TABS = ['Now', 'Dates', 'Build My Night', 'Plans', 'Explore', 'Vault'];
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, scale: 2, mobile: true },
  { name: 'desktop', width: 1440, height: 900, scale: 1, mobile: false },
];

// A signed-in shell is what customers actually see; the audit should not stop
// at the sign-up wall.
const AUDIT_SESSION = {
  access_token: 'screen-audit',
  refresh_token: 'screen-audit',
  expires_at: Math.floor(Date.now() / 1000) + 86_400,
  user: {
    id: 'screen-audit',
    email: 'screen-audit@thegoodtimesworldwide.com',
    user_metadata: { full_name: 'Screen Audit', home_city: 'atlanta' },
  },
};

const failures = [];
const notes = [];
const fail = (screen, check, detail) => failures.push({ screen, check, detail });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

async function openContext(browser, viewport, { blockFonts = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.scale,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    userAgent: viewport.mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  if (blockFonts) {
    await context.route('**://fonts.googleapis.com/**', (route) => route.abort());
    await context.route('**://fonts.gstatic.com/**', (route) => route.abort());
  }
  await context.addInitScript((session) => {
    try {
      localStorage.setItem('gt_session', JSON.stringify(session));
      sessionStorage.setItem('gt_splash_shown', '1');
    } catch {}
    window.__auditDeliveredImages = new Set();
  }, AUDIT_SESSION);
  return context;
}

// Record which image URLs actually returned bytes, so a decode failure can be
// told apart from a network failure on the audit machine.
function trackImageDelivery(page) {
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'image') return;
    if (!response.ok()) return;
    await page
      .evaluate((url) => {
        window.__auditDeliveredImages ||= new Set();
        window.__auditDeliveredImages.add(url);
      }, response.url())
      .catch(() => {});
  });
}

async function waitForContent(page, budgetMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < budgetMs) {
    const state = await page.evaluate(() => {
      const text = document.body.innerText || '';
      return { length: text.trim().length, loading: /CURATING/i.test(text) };
    });
    if (!state.loading && state.length > 800) return Date.now() - started;
    await page.waitForTimeout(750);
  }
  return null;
}

function inspect() {
  const root = document.documentElement;
  const viewportWidth = root.clientWidth;

  const scrollableAncestor = (element) => {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const overflowX = getComputedStyle(parent).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
      parent = parent.parentElement;
    }
    return false;
  };

  const clipped = [];
  const seenClipped = new Set();
  for (const element of document.querySelectorAll('body *')) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    if (rect.right <= viewportWidth + 2 && rect.left >= -2) continue;
    const style = getComputedStyle(element);
    if (style.position === 'fixed' && rect.width <= viewportWidth + 4) continue;
    if (style.overflowX === 'auto' || style.overflowX === 'scroll') continue;
    // Decorative layers that bleed past the viewport by design. Listed
    // explicitly rather than loosening the check: .gt-rich-visuals is the
    // cinematic art/video plate, .gt2-agent-orbit is the orbit ring behind the
    // concierge mark (measured -8px on a 390px phone, no scrollbar produced).
    if (element.closest('.gt-rich-visuals, .gt2-agent-orbit')) continue;
    if (scrollableAncestor(element)) continue;
    const key = `${element.tagName}:${String(element.className).slice(0, 40)}`;
    if (seenClipped.has(key)) continue;
    seenClipped.add(key);
    clipped.push({ tag: element.tagName.toLowerCase(), cls: String(element.className || '').slice(0, 50) });
  }

  const undersized = [];
  const seenTargets = new Set();
  for (const element of document.querySelectorAll('button,a,[role="button"],input,select,textarea')) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (getComputedStyle(element).visibility === 'hidden') continue;
    if (rect.height >= 44 && rect.width >= 44) continue;
    const label = (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 34);
    const key = `${label}:${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (seenTargets.has(key)) continue;
    seenTargets.add(key);
    undersized.push({ label: label || `<${element.tagName.toLowerCase()}>`, w: Math.round(rect.width), h: Math.round(rect.height) });
  }

  // Only images whose bytes actually arrived. An image that never reached the
  // network (offline runner, blocked egress, captive portal) is a property of
  // the machine running the audit, not a defect in the app, and reporting it
  // buries the real findings.
  const delivered = window.__auditDeliveredImages || new Set();
  const brokenImages = [...document.querySelectorAll('img')]
    .filter((img) => img.getAttribute('src') && img.complete && img.naturalWidth === 0)
    .map((img) => img.currentSrc || img.src)
    .filter((src) => delivered.has(src))
    .map((src) => src.slice(-80));

  const box = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
  };
  const overlaps = (a, b) => !!(a && b) && !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);

  const nav = box('.gt2-nav');
  const content = box('.gt2-content');
  const chromeOverlap = [
    ['connect', '.gt-connect-fab'],
    ['tickets', 'button[aria-label="Tickets and paid experiences"]'],
    ['account', 'button[aria-label="Open GOOD TIMES account"]'],
  ]
    .filter(([, selector]) => overlaps(box(selector), content))
    .map(([name]) => name);

  return {
    viewportWidth,
    overflowX: root.scrollWidth - root.clientWidth,
    textLength: (document.body.innerText || '').trim().length,
    clipped: clipped.slice(0, 12),
    undersized: undersized.slice(0, 12),
    brokenImages: [...new Set(brokenImages)].slice(0, 8),
    navBelowFold: nav ? nav.y >= window.innerHeight : null,
    chromeOverlap,
  };
}

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] });

// Check 1 — the app must still render when the font host is unreachable.
{
  const context = await openContext(browser, VIEWPORTS[0], { blockFonts: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 160)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForContent(page);
  const textLength = await page.evaluate(() => (document.body.innerText || '').trim().length);
  await capture(page, { path: path.join(OUT, 'resilience-fonts-blocked.png') });
  if (textLength < 200) {
    fail('boot (fonts blocked)', 'blank-render', `body text length ${textLength}; page errors: ${pageErrors.slice(0, 2).join(' | ') || 'none'}`);
  } else {
    notes.push(`fonts-blocked boot OK (${textLength} chars of text, ${pageErrors.length} page errors)`);
  }
  await context.close();
}

// Check 2 — every tab, every viewport.
for (const viewport of VIEWPORTS) {
  const context = await openContext(browser, viewport);
  const page = await context.newPage();
  trackImageDelivery(page);
  const httpErrors = [];
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('fonts.g')) {
      httpErrors.push(`${response.status()} ${response.url().slice(0, 120)}`);
    }
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const bootMs = await waitForContent(page);
  notes.push(`${viewport.name} time-to-content ${bootMs ?? '>60000'}ms`);

  for (const tab of TABS) {
    const screen = `${viewport.name} · ${tab}`;
    const button = page.locator('button', { hasText: tab }).last();
    if (!(await button.count())) {
      fail(screen, 'missing-tab', 'tab button not present');
      continue;
    }
    await button.click({ force: true, timeout: 8_000 }).catch((error) => fail(screen, 'tab-click', error.message.slice(0, 120)));
    await page.waitForTimeout(3_000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const slug = tab.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await capture(page, { path: path.join(OUT, `${viewport.name}-${slug}.png`) });
    await capture(page, { path: path.join(OUT, `${viewport.name}-${slug}-full.png`), fullPage: true });

    const result = await page.evaluate(inspect);
    if (result.textLength < 120) fail(screen, 'empty-screen', `only ${result.textLength} characters rendered`);
    if (result.overflowX > 2) fail(screen, 'horizontal-overflow', `${result.overflowX}px wider than the viewport`);
    if (result.navBelowFold) fail(screen, 'nav-below-fold', 'primary navigation laid out past the bottom of the viewport');
    if (result.chromeOverlap.length) fail(screen, 'chrome-overlaps-content', result.chromeOverlap.join(', '));
    if (result.clipped.length) fail(screen, 'clipped-element', result.clipped.map((c) => `${c.tag}.${c.cls}`).join('; '));
    if (result.brokenImages.length) fail(screen, 'broken-image', result.brokenImages.join('; '));
    if (viewport.mobile && result.undersized.length) {
      fail(screen, 'touch-target', result.undersized.map((t) => `"${t.label}" ${t.w}x${t.h} (min ${MIN_TARGET})`).join('; '));
    }
  }

  if (httpErrors.length) notes.push(`${viewport.name} HTTP errors: ${[...new Set(httpErrors)].slice(0, 5).join(' | ')}`);
  await context.close();
}

await browser.close();

const report = { base: BASE, generatedAt: new Date().toISOString(), notes, failures };
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

console.log(`\nGOOD TIMES screen audit — ${BASE}`);
console.log(`screenshots: ${OUT}`);
for (const note of notes) console.log(`  · ${note}`);

if (!failures.length) {
  console.log('\nPASS — no defects found.\n');
  process.exit(0);
}

console.log(`\nFAIL — ${failures.length} defect(s):`);
for (const item of failures) console.log(`  [${item.check}] ${item.screen}\n      ${item.detail}`);
console.log('');
process.exit(1);
