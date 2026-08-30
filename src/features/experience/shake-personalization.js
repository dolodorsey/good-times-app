import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'

export async function loadTasteDimensions(session) {
  if (!session?.access_token || !session?.user?.id) return []
  const response = await fetch(
    `${GT_SUPABASE_URL}/rest/v1/gt_taste_profile_dimensions?auth_id=eq.${encodeURIComponent(session.user.id)}&select=dimension_type,dimension_value,score,total_events,last_signal_at&order=score.desc,last_signal_at.desc&limit=120`,
    {
      cache: 'no-store',
      headers: {
        apikey: GT_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  )
  if (!response.ok) return []
  return response.json().catch(() => [])
}

function normalizedTokens(values = []) {
  return new Set(values.filter(Boolean).map(value => String(value).toLowerCase().trim()))
}

export function tasteGraphBoost(venue, dimensions = []) {
  if (!venue || !dimensions?.length) return 0
  const cuisineTokens = normalizedTokens([venue.subcategory, ...(venue.shake_tags || []), ...(venue.search_tags || [])])
  const vibeTokens = normalizedTokens([...(venue.vibe_tags || []), ...(venue.shake_tags || []), ...(venue.culture_tags || [])])
  const neighborhood = String(venue.neighborhood || '').toLowerCase().trim()
  const price = String(venue.price_range || '').toLowerCase().trim()
  let score = 0

  for (const row of dimensions) {
    const value = String(row.dimension_value || '').toLowerCase().trim()
    const raw = Number(row.score || 0)
    const normalized = Math.max(-1, Math.min(1, raw / 10))
    if (row.dimension_type === 'cuisine' && cuisineTokens.has(value)) score += normalized * 0.18
    if (row.dimension_type === 'vibe' && vibeTokens.has(value)) score += normalized * 0.14
    if (row.dimension_type === 'price' && price && price === value) score += normalized * 0.08
    if (row.dimension_type === 'neighborhood' && neighborhood && neighborhood === value) score += normalized * 0.10
  }

  return Math.max(-0.30, Math.min(0.40, score))
}
