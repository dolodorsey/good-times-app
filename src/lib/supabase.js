const env = import.meta.env || {}

const CANONICAL_GT_URL = 'https://czocqfaovfpjweayniuw.supabase.co'
const CANONICAL_GT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NxZmFvdmZwandlYXluaXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzEzODAsImV4cCI6MjA4Mzk0NzM4MH0.6-3rmA9tZXHLVg5N6a_82rKA9Kvrj4gRrUUiSczovho'
const CANONICAL_KHG_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CANONICAL_KHG_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bG10dm9kcHloZXR2ZWt0ZnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODQ4NjQsImV4cCI6MjA4NTE2MDg2NH0.qmnWB4aWdb7U8Iod9Hv8PQAOJO3AG0vYEGnPS--kfAo'

function validProjectUrl(value, expectedRef) {
  if (!value) return false
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === `${expectedRef}.supabase.co` } catch { return false }
}
function decodeRef(value) {
  if (typeof value !== 'string' || !value.startsWith('eyJ')) return null
  try {
    const encoded = value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')
    return JSON.parse(atob(padded))?.ref || null
  } catch { return null }
}
function validProjectKey(value, expectedRef) {
  return typeof value === 'string' && value.length > 40 && decodeRef(value) === expectedRef
}

export const GT_SUPABASE_URL = validProjectUrl(env.VITE_GT_SUPABASE_URL,'czocqfaovfpjweayniuw') ? env.VITE_GT_SUPABASE_URL : CANONICAL_GT_URL
export const GT_SUPABASE_ANON_KEY = validProjectKey(env.VITE_GT_SUPABASE_ANON_KEY,'czocqfaovfpjweayniuw') ? env.VITE_GT_SUPABASE_ANON_KEY : CANONICAL_GT_ANON_KEY
export const KHG_SUPABASE_URL = validProjectUrl(env.VITE_KHG_SUPABASE_URL,'dzlmtvodpyhetvektfuo') ? env.VITE_KHG_SUPABASE_URL : CANONICAL_KHG_URL
export const KHG_SUPABASE_ANON_KEY = validProjectKey(env.VITE_KHG_SUPABASE_ANON_KEY,'dzlmtvodpyhetvektfuo') ? env.VITE_KHG_SUPABASE_ANON_KEY : CANONICAL_KHG_ANON_KEY

export const SB = `${GT_SUPABASE_URL}/rest/v1`
export const SK = GT_SUPABASE_ANON_KEY
export const KHG_SB = `${KHG_SUPABASE_URL}/rest/v1`
export const KHG_SK = KHG_SUPABASE_ANON_KEY

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function readJson(baseUrl, anonKey, query, fetchImpl = globalThis.fetch) {
  const url = `${baseUrl}/${query}`
  let lastError = null
  for (let attempt=0;attempt<2;attempt+=1) {
    try {
      const response = await fetchImpl(url,{headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`,Accept:'application/json'},cache:'no-store'})
      if (!response.ok) {
        const body=await response.text().catch(()=> '');lastError=new Error(`Supabase ${response.status}: ${body||response.statusText}`)
        if(response.status<500||attempt===1)break
        await sleep(250);continue
      }
      const payload=await response.json()
      if(!Array.isArray(payload)){lastError=new Error('Supabase returned a non-array payload');break}
      return payload
    } catch(error){lastError=error;if(attempt===0)await sleep(250)}
  }
  console.error('[GOOD TIMES backend]',{url,error:lastError?.message||String(lastError)})
  if(typeof window!=='undefined')window.__GOOD_TIMES_BACKEND_ERROR__={url,message:lastError?.message||String(lastError),at:new Date().toISOString()}
  return []
}

export const sbF=(query,fetchImpl)=>readJson(SB,SK,query,fetchImpl)
export const khgF=(query,fetchImpl)=>readJson(KHG_SB,KHG_SK,query,fetchImpl)
export async function checkGoodTimesBackend(fetchImpl=globalThis.fetch){
  const[profileProbe,contentProbe]=await Promise.all([
    readJson(SB,SK,'gt_formula_versions?select=id&limit=1',fetchImpl),
    readJson(KHG_SB,KHG_SK,'gt_venues?select=id&status=eq.active&limit=1',fetchImpl),
  ])
  return{gt:profileProbe.length>0,khg:contentProbe.length>0,connected:profileProbe.length>0&&contentProbe.length>0}
}
