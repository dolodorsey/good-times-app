function send(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

export default async function handler(request, response) {
  if ((request.method || 'GET') !== 'POST') {
    response.setHeader('Allow', 'POST')
    return send(response, 405, { ok: false, error: 'Method not allowed' })
  }

  try {
    const chunks = []
    let bytes = 0
    for await (const chunk of request) {
      bytes += chunk.length
      if (bytes > 12_000) return send(response, 413, { ok: false, error: 'Payload too large' })
      chunks.push(chunk)
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    console.error('[GOOD TIMES client]', {
      surface: String(payload.surface || 'unknown').slice(0, 80),
      message: String(payload.message || 'Unknown client failure').slice(0, 500),
      city: String(payload.city || '').slice(0, 50),
      path: String(payload.path || '').slice(0, 300),
      build: String(payload.build || '').slice(0, 100),
      online: Boolean(payload.online),
      userAgent: String(payload.userAgent || '').slice(0, 300),
      at: new Date().toISOString(),
    })
    return send(response, 202, { ok: true })
  } catch (error) {
    console.error('[GOOD TIMES client log failure]', error)
    return send(response, 400, { ok: false, error: 'Invalid telemetry payload' })
  }
}
