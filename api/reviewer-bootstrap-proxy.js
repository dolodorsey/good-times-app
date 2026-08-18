export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const response = await fetch('https://czocqfaovfpjweayniuw.supabase.co/functions/v1/signup-reviewer-68e0c3c8e2944b47')
  const body = await response.text()
  res.status(response.status).setHeader('content-type', response.headers.get('content-type') || 'application/json').send(body)
}
