import {KHG_SUPABASE_URL, KHG_SUPABASE_ANON_KEY} from '../../lib/supabase.js'
import {COMPACT_PAGE_SIZE, directoryPageUrl, encodeDirectoryCursor} from './compact-directory-query.js'

/** Read the same approved public view as the existing directory; never use a service key. */
export async function loadCompactDirectoryPage(options = {}) {
  const {url,scope} = directoryPageUrl(KHG_SUPABASE_URL,options)
  const controller = new AbortController()
  const cancel = () => controller.abort()
  let timedOut = false
  if (options.signal?.aborted) controller.abort()
  else options.signal?.addEventListener('abort',cancel,{once:true})
  const timer = setTimeout(()=>{timedOut=true;controller.abort()},8000)
  try {
    const response = await fetch(url,{cache:'no-store',signal:controller.signal,headers:{apikey:KHG_SUPABASE_ANON_KEY,Authorization:`Bearer ${KHG_SUPABASE_ANON_KEY}`,Accept:'application/json'}})
    if (!response.ok) throw new Error(`The venue directory could not be refreshed (${response.status}). Please retry.`)
    const payload = await response.json()
    if (!Array.isArray(payload) || payload.some(row=>!row?.id || !row?.name)) throw new Error('The venue directory returned incomplete data. Please retry.')
    const rows = payload.slice(0,COMPACT_PAGE_SIZE)
    const hasMore = payload.length > COMPACT_PAGE_SIZE
    return {rows,scope,nextCursor:hasMore?encodeDirectoryCursor(rows.at(-1),scope):null,asOf:new Date().toISOString()}
  } catch(error) {
    if (timedOut) throw new Error('The venue directory timed out. Please retry.')
    throw error
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort',cancel)
  }
}
