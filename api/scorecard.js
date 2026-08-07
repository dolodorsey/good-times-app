const GT_URL = 'https://czocqfaovfpjweayniuw.supabase.co'
const GT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NxZmFvdmZwandlYXluaXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzEzODAsImV4cCI6MjA4Mzk0NzM4MH0.6-3rmA9tZXHLVg5N6a_82rKA9Kvrj4gRrUUiSczovho'
const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const CANONICAL = 'https://thegoodtimesworldwide.com'

function headers(key){ return {apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'} }
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',status===200?'public, s-maxage=60, stale-while-revalidate=240':'no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(payload))}
async function rows(url,key){const response=await fetch(url,{headers:headers(key),cache:'no-store'});if(!response.ok)throw new Error(`${response.status} ${url}`);const body=await response.json();return Array.isArray(body)?body:[]}

export default async function handler(req,res){
  if((req.method||'GET')!=='GET'){res.setHeader('Allow','GET');return send(res,405,{ok:false,error:'Method not allowed'})}
  const generatedAt=new Date().toISOString()
  const started=Date.now()
  const [product,growth,dataProbe]=await Promise.allSettled([
    rows(`${GT_URL}/rest/v1/v_gt_product_scorecard?select=*`,GT_KEY),
    rows(`${CONTENT_URL}/rest/v1/v_gt_growth_funnel_30d?select=*`,CONTENT_KEY),
    (async()=>{const t=Date.now();const response=await fetch(`${CANONICAL}/api/data?city=atlanta&event_limit=5&venue_limit=5`,{headers:{Accept:'application/json'},cache:'no-store'});const payload=await response.json().catch(()=>null);return{status:response.status,latency_ms:Date.now()-t,connected:Boolean(payload?.connected),degraded:Boolean(payload?.degraded),counts:payload?.counts||null}})(),
  ])
  const data=dataProbe.status==='fulfilled'?dataProbe.value:{status:0,latency_ms:null,connected:false,degraded:true}
  const status=data.connected&&!data.degraded&&Number(data.latency_ms||99999)<2000?'green':data.connected?'yellow':'red'
  return send(res,200,{
    ok:true,
    generated_at:generatedAt,
    status,
    response_ms:Date.now()-started,
    production:{canonical:CANONICAL,data_api:data,seo_guide_pages:88,cities:11},
    product:product.status==='fulfilled'?(product.value?.[0]||{}):{error:'product scorecard unavailable'},
    growth:growth.status==='fulfilled'?(growth.value?.[0]||{}):{error:'growth scorecard unavailable'},
  })
}
