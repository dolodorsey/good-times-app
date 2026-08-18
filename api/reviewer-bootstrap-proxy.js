export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const response = await fetch('https://czocqfaovfpjweayniuw.supabase.co/functions/v1/review-once-2b3cbd92697c76ece8add522')
  const body = await response.text()
  res.status(response.status).setHeader('content-type', response.headers.get('content-type') || 'application/json').send(body)
}
