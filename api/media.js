const FALLBACK = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/good-times-backgrounds/gt-homescreen-atlanta.webp'

const ALLOWED_HOSTS = [
  'img.evbuc.com',
  'images.unsplash.com',
  'images.discovery-prod.axs.com',
  'dzlmtvodpyhetvektfuo.supabase.co',
  'thegoodtimesworldwide.com',
  'statefarmarena.com',
  'www.statefarmarena.com',
  'aso.org',
  'www.aso.org',
  'theworksatl.com',
  'www.theworksatl.com',
  'atlantabg.org',
  'www.atlantabg.org',
  'collegeparkga.gov',
  'www.collegeparkga.gov',
  'piedmontpark.org',
  'www.piedmontpark.org',
  'beltline.org',
  'www.beltline.org',
  'highmuseum-redesign.s3.amazonaws.com',
  'cdn.theescapegame.com',
  'popmenucloud.com',
  'static.spotapps.co',
  'indy-systems.imgix.net',
  'russellcenter.org',
  'www.russellcenter.org',
  'sevenmidtown.com',
  'www.sevenmidtown.com',
]

const ALLOWED_SUFFIXES = [
  '.squarespace.com',
  '.squarespace-cdn.com',
  '.cloudfront.net',
  '.amazonaws.com',
  '.axs.com',
]

function isAllowed(hostname) {
  const host = String(hostname || '').toLowerCase()
  return ALLOWED_HOSTS.includes(host) || ALLOWED_SUFFIXES.some(suffix => host.endsWith(suffix))
}

function redirectFallback(response) {
  response.statusCode = 302
  response.setHeader('Location', FALLBACK)
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
  response.end()
}

export default async function handler(request, response) {
  if ((request.method || 'GET') !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.statusCode = 405
    return response.end('Method not allowed')
  }

  let target
  try {
    const requestUrl = new URL(request.url || '/api/media', 'https://thegoodtimesworldwide.com')
    target = new URL(requestUrl.searchParams.get('url') || '')
    if (target.protocol !== 'https:' || !isAllowed(target.hostname)) return redirectFallback(response)
    if (/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(target.href) || /[?&]key=/i.test(target.href)) return redirectFallback(response)
  } catch {
    return redirectFallback(response)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const upstream = await fetch(target.href, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'GoodTimesMedia/1.0 (+https://thegoodtimesworldwide.com)',
        Referer: 'https://thegoodtimesworldwide.com/',
      },
    })
    if (!upstream.ok) return redirectFallback(response)
    const contentType = upstream.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return redirectFallback(response)
    const contentLength = Number(upstream.headers.get('content-length') || 0)
    if (contentLength > 10_000_000) return redirectFallback(response)

    const bytes = Buffer.from(await upstream.arrayBuffer())
    if (!bytes.length || bytes.length > 10_000_000) return redirectFallback(response)

    response.statusCode = 200
    response.setHeader('Content-Type', contentType)
    response.setHeader('Content-Length', String(bytes.length))
    response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.end(bytes)
  } catch (error) {
    console.warn('[GOOD TIMES media]', { host: target?.hostname, message: error?.message || String(error) })
    return redirectFallback(response)
  } finally {
    clearTimeout(timeout)
  }
}
