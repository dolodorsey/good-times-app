import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('PWA install contract stays active', async () => {
  const [manifestRaw, sw, main] = await Promise.all([
    readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'),
    readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/main.jsx', import.meta.url), 'utf8'),
  ])

  const manifest = JSON.parse(manifestRaw)
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, '/')
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.some(icon => icon.sizes === '192x192'))
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'))

  assert.match(main, /serviceWorker\.register\('\/sw\.js'/)
  assert.doesNotMatch(sw, /registration\.unregister/)
  assert.match(sw, /addEventListener\('fetch'/)
  assert.match(sw, /fetch\(request\)/)
})
