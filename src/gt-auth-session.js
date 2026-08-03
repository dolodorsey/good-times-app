import { GT_SUPABASE_URL, GT_SUPABASE_ANON_KEY } from './lib/supabase.js'

export const GT_SESSION_KEY = 'gt_session'

const DEFAULT_SAFETY_WINDOW_SECONDS = 60
const DEFAULT_TIMEOUT_MS = 7000

export function parseStoredSession(rawValue) {
  if (!rawValue) return null
  try {
    const parsed = JSON.parse(rawValue)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function shouldRefreshSession(
  session,
  nowSeconds = Math.floor(Date.now() / 1000),
  safetyWindowSeconds = DEFAULT_SAFETY_WINDOW_SECONDS,
) {
  if (!session?.refresh_token) return false
  const expiresAt = Number(session.expires_at || 0)
  return !expiresAt || expiresAt <= nowSeconds + safetyWindowSeconds
}

export function parseRecoverySession(hash = '') {
  const raw = String(hash || '').replace(/^#/, '')
  if (!raw) return null
  const params = new URLSearchParams(raw)
  if (params.get('type') !== 'recovery') return null

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: params.get('token_type') || 'bearer',
    expires_in: Number(params.get('expires_in') || 0) || undefined,
    expires_at: Number(params.get('expires_at') || 0) || undefined,
    type: 'recovery',
  }
}

function authHeaders(anonKey, bearer = anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
  }
}

export async function refreshStoredSession({
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch,
  supabaseUrl = GT_SUPABASE_URL,
  anonKey = GT_SUPABASE_ANON_KEY,
  nowSeconds = Math.floor(Date.now() / 1000),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const raw = storage?.getItem?.(GT_SESSION_KEY)
  const session = parseStoredSession(raw)

  if (raw && !session) {
    storage?.removeItem?.(GT_SESSION_KEY)
    return { status: 'invalid-local-session', session: null }
  }

  if (!shouldRefreshSession(session, nowSeconds)) {
    return { status: session ? 'current' : 'missing', session }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: authHeaders(anonKey),
      body: JSON.stringify({ refresh_token: session.refresh_token }),
      signal: controller?.signal,
    })

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        storage?.removeItem?.(GT_SESSION_KEY)
        return { status: 'invalid-refresh-token', session: null }
      }
      return { status: 'refresh-failed', session }
    }

    const refreshed = await response.json()
    if (!refreshed?.access_token || !refreshed?.refresh_token) {
      return { status: 'refresh-failed', session }
    }

    storage?.setItem?.(GT_SESSION_KEY, JSON.stringify(refreshed))
    return { status: 'refreshed', session: refreshed }
  } catch {
    return { status: 'refresh-failed', session }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function updateRecoveryPassword({
  accessToken,
  password,
  fetchImpl = globalThis.fetch,
  supabaseUrl = GT_SUPABASE_URL,
  anonKey = GT_SUPABASE_ANON_KEY,
} = {}) {
  if (!accessToken) throw new Error('Recovery session is missing or expired.')
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: authHeaders(anonKey, accessToken),
    body: JSON.stringify({ password }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.msg || payload?.message || payload?.error_description || payload?.error || 'Unable to update password.')
  }
  return payload
}

export function installRecoveryRedirect({
  target = globalThis,
  origin = globalThis.location?.origin,
  recoveryPath = '/?auth=recovery',
} = {}) {
  if (!target?.fetch || !origin || target.__gtRecoveryRedirectInstalled) return

  const originalFetch = target.fetch.bind(target)
  target.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url
    if (url?.includes('/auth/v1/recover') && String(init?.method || 'GET').toUpperCase() === 'POST') {
      const nextUrl = new URL(url)
      if (!nextUrl.searchParams.has('redirect_to')) {
        nextUrl.searchParams.set('redirect_to', `${origin}${recoveryPath}`)
      }
      return originalFetch(typeof input === 'string' ? nextUrl.toString() : new Request(nextUrl.toString(), input), init)
    }
    return originalFetch(input, init)
  }
  target.__gtRecoveryRedirectInstalled = true
}
