(() => {
  'use strict'
  if (window.__GT_STABILIZER_ACTIVE__) return
  window.__GT_STABILIZER_ACTIVE__ = true

  const originalFetch = window.fetch.bind(window)
  const inflight = new Map()
  const responseCache = new Map()
  const storagePrefix = 'gt_api_cache_v4:'
  const fallbackImage = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/good-times-backgrounds/gt-homescreen-atlanta.webp'
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  function apiKey(url) {
    try {
      const parsed = new URL(typeof url === 'string' ? url : url.url, location.href)
      if (parsed.origin !== location.origin) return null
      if (!['/api/data', '/api/catalog'].includes(parsed.pathname)) return null
      return `${parsed.pathname}?${[...parsed.searchParams.entries()].sort().map(([key, value]) => `${key}=${value}`).join('&')}`
    } catch {
      return null
    }
  }

  function mediaUrl(value) {
    if (!value || typeof value !== 'string') return value
    const text = value.trim()
    if (!text || text.startsWith('/api/media?') || text.startsWith('data:') || text.startsWith('blob:')) return text
    try {
      const parsed = new URL(text, location.href)
      if (parsed.origin === location.origin || parsed.hostname === 'dzlmtvodpyhetvektfuo.supabase.co') return parsed.href
      return `/api/media?url=${encodeURIComponent(parsed.href)}`
    } catch {
      return fallbackImage
    }
  }

  function rewriteImages(value) {
    if (Array.isArray(value)) return value.map(rewriteImages)
    if (!value || typeof value !== 'object') return value
    const output = {}
    for (const [key, child] of Object.entries(value)) {
      output[key] = ['image_url', 'hero_image', 'image'].includes(key) && typeof child === 'string'
        ? mediaUrl(child)
        : rewriteImages(child)
    }
    return output
  }

  function normalizeJsonText(text, contentType) {
    if (!String(contentType || '').includes('application/json')) return text
    try { return JSON.stringify(rewriteImages(JSON.parse(text))) } catch { return text }
  }

  function store(key, text, response) {
    const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8'
    const record = {
      text: normalizeJsonText(text, contentType),
      status: response.status,
      statusText: response.statusText,
      contentType,
      storedAt: Date.now(),
    }
    responseCache.set(key, record)
    try { sessionStorage.setItem(storagePrefix + key, JSON.stringify(record)) } catch {}
    return record
  }

  function readStored(key) {
    if (responseCache.has(key)) return responseCache.get(key)
    try {
      const record = JSON.parse(sessionStorage.getItem(storagePrefix + key) || 'null')
      if (record && Date.now() - Number(record.storedAt || 0) < 30 * 60 * 1000) return record
    } catch {}
    return null
  }

  function makeResponse(record, stale = false) {
    return new Response(record.text, {
      status: record.status || 200,
      statusText: record.statusText || 'OK',
      headers: {
        'content-type': record.contentType || 'application/json; charset=utf-8',
        'x-good-times-cache': stale ? 'stale-fallback' : 'runtime',
      },
    })
  }

  function report(surface, error, path = '') {
    originalFetch('/api/client-log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        surface,
        message: error?.message || String(error),
        path,
        city: 'atlanta',
        build: document.documentElement.dataset?.build || '',
        online: navigator.onLine,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => null)
  }

  window.fetch = function stabilizedFetch(input, init = {}) {
    const key = apiKey(input)
    if (!key) return originalFetch(input, init)

    const perform = async () => {
      let lastError = null
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await Promise.race([
            originalFetch(input, { ...init, cache: 'no-store' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Good Times request timed out')), 18000)),
          ])
          const text = await response.text()
          if (!response.ok) throw new Error(`Good Times API ${response.status}: ${text.slice(0, 240)}`)
          return store(key, text, response)
        } catch (error) {
          lastError = error
          if (attempt < 2) await sleep(350 * (attempt + 1))
        }
      }
      const cached = readStored(key)
      if (cached) return { ...cached, stale: true }
      report('signed_in_api', lastError, key)
      throw lastError || new Error('Good Times live data failed')
    }

    if (!inflight.has(key)) inflight.set(key, perform().finally(() => inflight.delete(key)))
    return inflight.get(key).then(record => makeResponse(record, Boolean(record.stale)))
  }

  document.addEventListener('error', event => {
    const image = event.target
    if (!(image instanceof HTMLImageElement)) return
    if (image.dataset.gtFallbackApplied === '1') return
    image.dataset.gtFallbackApplied = '1'
    image.referrerPolicy = 'no-referrer'
    image.src = fallbackImage
  }, true)

  window.addEventListener('unhandledrejection', event => {
    const error = event.reason
    if (/abort|network|fetch|timed out/i.test(error?.message || String(error))) report('unhandled_rejection', error)
  })

  window.__GT_STABILIZER_READY__ = (async () => {
    if (!('serviceWorker' in navigator)) return
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(registration => registration.unregister()))
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.filter(key => key.startsWith('good-times-shell')).map(key => caches.delete(key)))
      }
      try {
        Object.defineProperty(navigator.serviceWorker, 'register', {
          configurable: true,
          value: async () => ({ update: async () => {}, unregister: async () => true }),
        })
      } catch {}
      if (navigator.serviceWorker.controller && sessionStorage.getItem('gt_service_worker_retired_v3') !== '1') {
        sessionStorage.setItem('gt_service_worker_retired_v3', '1')
        location.reload()
        await new Promise(() => {})
      }
    } catch (error) {
      report('service_worker_retirement', error)
    }
  })()
})()
