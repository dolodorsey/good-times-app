/** Public Supabase API headers. A publishable application key is not a user JWT. */
export function publicApiHeaders(key, extra = {}) {
  if (typeof key !== 'string' || !key || key.startsWith('sb_secret_')) throw new Error('A public application key is required.')
  const headers = { apikey: key, Accept: 'application/json', ...extra }
  if (!key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${key}`
  return headers
}
