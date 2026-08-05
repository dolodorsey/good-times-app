const CACHE_VERSION = 'good-times-shell-v3'
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/good-times-192.png',
  '/icons/good-times-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    await self.clients.claim()

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    await Promise.all(clients.map(async (client) => {
      try {
        client.postMessage({ type: 'GOOD_TIMES_FORCE_RELOAD', cacheVersion: CACHE_VERSION })
        if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
          await client.navigate(client.url)
        }
      } catch {
        // A closing tab can disappear during activation. The remaining clients still update.
      }
    }))
  })())
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION)
  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  return cached || network
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker' ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(networkFirst(request))
    return
  }

  if (
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
