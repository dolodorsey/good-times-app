const CONTENT_URL='https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const ALLOWED_TYPES=new Set(['venue','event','vendor','artist','influencer','sponsor','hiring','intern','consult','nda','inquiry','what'])
const WINDOW_MS=60_000
const MAX_PER_WINDOW=6
const RATE=globalThis.__GOOD_TIMES_FORM_RATE__||(globalThis.__GOOD_TIMES_FORM_RATE__=new Map())

function clean(value,max=500){return String(value??'').trim().slice(0,max)}
function emailOkay(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||''))}
function ipOf(request){return clean(request.headers['x-forwarded-for']||request.socket?.remoteAddress||'unknown',120).split(',')[0].trim()}
function allowed(request){
  const key=ipOf(request)
  const now=Date.now()
  const hits=(RATE.get(key)||[]).filter(at=>now-at<WINDOW_MS)
  if(hits.length>=MAX_PER_WINDOW){RATE.set(key,hits);return false}
  hits.push(now);RATE.set(key,hits)
  if(RATE.size>1500){for(const[k,v]of RATE){if(!v.some(at=>now-at<WINDOW_MS))RATE.delete(k)}}
  return true
}
function send(response,status,payload){
  response.statusCode=status
  response.setHeader('Content-Type','application/json; charset=utf-8')
  response.setHeader('Cache-Control','no-store')
  response.setHeader('X-Content-Type-Options','nosniff')
  response.end(JSON.stringify(payload))
}

export default async function handler(request,response){
  if((request.method||'GET')!=='POST'){response.setHeader('Allow','POST');return send(response,405,{ok:false,error:'Method not allowed'})}
  if(!allowed(request))return send(response,429,{ok:false,error:'Too many submissions. Try again shortly.'})

  const body=typeof request.body==='string'?JSON.parse(request.body||'{}'):request.body||{}
  const formType=clean(body.form_type,40).toLowerCase()
  const formData=body.form_data&&typeof body.form_data==='object'?body.form_data:{}
  const fullName=clean(formData.full_name||body.full_name,100)
  const email=clean(formData.email||body.email,180).toLowerCase()
  const phone=clean(formData.phone||body.phone,40)

  if(!ALLOWED_TYPES.has(formType))return send(response,400,{ok:false,error:'Unsupported form type.'})
  if(fullName.length<2)return send(response,400,{ok:false,error:'Full name is required.'})
  if(!emailOkay(email))return send(response,400,{ok:false,error:'A valid email is required.'})

  const safeData={}
  for(const[key,value]of Object.entries(formData).slice(0,40)){
    const safeKey=clean(key,60).replace(/[^a-zA-Z0-9_\-]/g,'')
    if(!safeKey)continue
    safeData[safeKey]=clean(value,2500)
  }
  safeData.submission_source='good_times_partner_hub'
  safeData.submission_origin=clean(request.headers.origin||request.headers.referer||'',300)

  try{
    const upstream=await fetch(`${CONTENT_URL}/rest/v1/form_submissions`,{
      method:'POST',
      headers:{
        apikey:CONTENT_KEY,
        Authorization:`Bearer ${CONTENT_KEY}`,
        'Content-Type':'application/json',
        Prefer:'return=minimal',
      },
      body:JSON.stringify({
        brand_key:'good_times',
        form_type:formType,
        full_name:fullName,
        email,
        phone,
        form_data:safeData,
        ghl_push_status:'pending',
      }),
    })
    const text=await upstream.text()
    if(!upstream.ok)throw new Error(`Submission store returned ${upstream.status}: ${text.slice(0,160)}`)
    return send(response,201,{ok:true,message:'Submitted. GOOD TIMES will follow up.'})
  }catch(error){
    console.error('[GOOD TIMES form-submit]',error)
    return send(response,503,{ok:false,error:'Submission service is temporarily unavailable.'})
  }
}
