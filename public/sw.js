const VERSION = 'good-times-pwa-v1'

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // GOOD TIMES data is live and city-sensitive. Do not retain old application/API caches.
    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Network-only by design: installability without stale venue/event/API data.
  event.respondWith(fetch(request))
})
