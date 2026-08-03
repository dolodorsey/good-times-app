const env = import.meta.env || {}
export const GT_SUPABASE_URL = env.VITE_GT_SUPABASE_URL || 'https://czocqfaovfpjweayniuw.supabase.co'
export const GT_SUPABASE_ANON_KEY = env.VITE_GT_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NxZmFvdmZwandlYXluaXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzEzODAsImV4cCI6MjA4Mzk0NzM4MH0.6-3rmA9tZXHLVg5N6a_82rKA9Kvrj4gRrUUiSczovho'
export const KHG_SUPABASE_URL = env.VITE_KHG_SUPABASE_URL || 'https://dzlmtvodpyhetvektfuo.supabase.co'
export const KHG_SUPABASE_ANON_KEY = env.VITE_KHG_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJkemxtdHZvZHB5aGV0dmVrdGZ1byIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY5NTg0ODY0LCJleHAiOjIwODUxNjA4NjR9.qmnWB4aWdb7U8Iod9Hv8PQAOJO3AG0vYEGnPS--kfAo'
export const SB = `${GT_SUPABASE_URL}/rest/v1`
export const SK = GT_SUPABASE_ANON_KEY
export const KHG_SB = `${KHG_SUPABASE_URL}/rest/v1`
export const KHG_SK = KHG_SUPABASE_ANON_KEY
async function readJson(baseUrl, anonKey, query, fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl(`${baseUrl}/${query}`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } })
    if (!response.ok) return []
    const payload = await response.json()
    return Array.isArray(payload) ? payload : []
  } catch { return [] }
}
export const sbF = (query, fetchImpl) => readJson(SB, SK, query, fetchImpl)
export const khgF = (query, fetchImpl) => readJson(KHG_SB, KHG_SK, query, fetchImpl)
