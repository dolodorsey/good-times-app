/**
 * Serves the production build the way Vercel does, for UI regression runs.
 *
 *   - real files out of dist/ first (so /assets/*, /gt-stabilizer.js resolve)
 *   - /api/* proxied to production (there is no local serverless runtime)
 *   - everything else falls back to index.html (the SPA rewrite)
 *
 * `vercel dev` cannot be used for this: the "/(.*)" -> /index.html rewrite in
 * vercel.json catches /src/*, /gt-stabilizer.js and /gt-timezone-guard.js, so
 * every asset comes back as HTML and the app never boots.
 *
 *   node scripts/serve-dist.mjs            # port 4180
 *   PORT=5000 API_ORIGIN=... node scripts/serve-dist.mjs
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = Number(process.env.PORT || 4180)
const API_ORIGIN = process.env.API_ORIGIN || 'https://thegoodtimesworldwide.com'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (url.pathname.startsWith('/api/')) {
    try {
      const upstream = await fetch(`${API_ORIGIN}${url.pathname}${url.search}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'gt-ui-regression' },
      })
      const body = Buffer.from(await upstream.arrayBuffer())
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'access-control-allow-origin': '*',
      })
      return res.end(body)
    } catch (error) {
      res.writeHead(502, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ ok: false, error: 'upstream', detail: String(error) }))
    }
  }

  let filePath = path.join(ROOT, decodeURIComponent(url.pathname))
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden') }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html')
  if (!fs.existsSync(filePath)) filePath = path.join(ROOT, 'index.html')

  res.writeHead(200, { 'content-type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => console.log(`gt static+api server on http://localhost:${PORT} (api -> ${API_ORIGIN})`))
