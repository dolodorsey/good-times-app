import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'
import { GT_SESSION_KEY, parseStoredSession } from '../../gt-auth-session.js'

const headers = (bearer = GT_SUPABASE_ANON_KEY) => ({
  apikey: GT_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${bearer}`,
  'Content-Type': 'application/json',
})

async function request(path, { method = 'POST', body, bearer } = {}) {
  const response = await fetch(`${GT_SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers: headers(bearer),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      payload?.error_description || payload?.msg || payload?.message || payload?.error || 'Authentication failed',
    )
  }
  return payload
}

export const signUp = (email, password, fullName, city) => request('signup', {
  body: { email, password, data: { full_name: fullName, home_city: city } },
})

export const signIn = (email, password) => request('token?grant_type=password', {
  body: { email, password },
})

export const requestPasswordReset = (email) => request('recover', { body: { email } })

export function readSession(storage = globalThis.localStorage) {
  const session = parseStoredSession(storage?.getItem?.(GT_SESSION_KEY))
  if (!session?.access_token || !session?.user) return null
  if (session.expires_at && Number(session.expires_at) <= Date.now() / 1000) return null
  return session
}

export function storeSession(session, storage = globalThis.localStorage) {
  if (!session?.access_token || !session?.user) throw new Error('A complete session is required')
  storage?.setItem?.(GT_SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearSession(storage = globalThis.localStorage) {
  storage?.removeItem?.(GT_SESSION_KEY)
}

export async function getProfile(authId, accessToken) {
  if (!authId || !accessToken) return null
  const response = await fetch(
    `${GT_SUPABASE_URL}/rest/v1/gt_user_profiles?auth_id=eq.${encodeURIComponent(authId)}&select=id,full_name,home_city,vibe_preferences,tab_interests,age_range,created_at&limit=1`,
    { headers: headers(accessToken) },
  )
  if (!response.ok) return null
  const profiles = await response.json().catch(() => [])
  return Array.isArray(profiles) ? profiles[0] || null : null
}

export async function updatePreferences(authId, preferences, accessToken) {
  if (!authId || !accessToken) return false
  const profileResponse = await fetch(
    `${GT_SUPABASE_URL}/rest/v1/gt_user_profiles?auth_id=eq.${encodeURIComponent(authId)}&select=id`,
    { headers: headers(accessToken) },
  )
  if (!profileResponse.ok) return false
  const profiles = await profileResponse.json().catch(() => [])
  const profileId = profiles?.[0]?.id
  if (!profileId) return false

  const updateResponse = await fetch(
    `${GT_SUPABASE_URL}/rest/v1/gt_user_profiles?id=eq.${encodeURIComponent(profileId)}`,
    {
      method: 'PATCH',
      headers: { ...headers(accessToken), Prefer: 'return=minimal' },
      body: JSON.stringify(preferences),
    },
  )
  return updateResponse.ok
}

export function friendlyAuthError(error) {
  const message = String(error?.message || error || 'Authentication failed')
  if (/invalid login/i.test(message)) return 'Wrong email or password.'
  if (/already registered|user already exists/i.test(message)) return 'That email already has an account. Try signing in.'
  if (/email rate limit|over_email_send_rate_limit/i.test(message)) return 'Email delivery is temporarily limited. Try again shortly.'
  return message
}