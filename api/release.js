// Public deployment identity only. No database access, user state, or credentials.
export default function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  const method = request.method || 'GET'
  if (!['GET', 'HEAD'].includes(method)) {
    response.statusCode = 405
    response.setHeader('Allow', 'GET, HEAD')
    return response.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
  }
  const candidate = process.env.VERCEL_GIT_COMMIT_SHA || ''
  const sha = /^[a-f0-9]{40}$/i.test(candidate) ? candidate : null
  response.statusCode = sha ? 200 : 503
  if (sha) response.setHeader('X-Good-Times-Release', sha)
  const payload = { ok: Boolean(sha), service: 'good-times', commit_sha: sha,
    environment: process.env.VERCEL_ENV || 'unknown', launch_scope: 'atlanta_only' }
  return response.end(method === 'HEAD' ? undefined : JSON.stringify(payload))
}
