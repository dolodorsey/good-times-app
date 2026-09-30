const CONTENT_URL=process.env.KHG_SUPABASE_URL||'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY=process.env.KHG_SUPABASE_ANON_KEY||'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const MAX_BYTES=10_000_000
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const GOOGLE_PHOTO=/^https:\/\/maps\.googleapis\.com\/maps\/api\/place\/photo\?/i

function send(response,status,message=''){
  response.statusCode=status
  response.setHeader('Cache-Control','no-store')
  response.setHeader('X-Content-Type-Options','nosniff')
  if(message){response.setHeader('Content-Type','text/plain; charset=utf-8');response.end(message)}
  else response.end()
}
function contentHeaders(){return{apikey:CONTENT_KEY,Accept:'application/json'}}

export default async function handler(request,response){
  if(!['GET','HEAD'].includes(request.method||'GET')){response.setHeader('Allow','GET, HEAD');return send(response,405,'Method not allowed')}
  const url=new URL(request.url||'/api/place-photo','https://thegoodtimesworldwide.com')
  const id=String(url.searchParams.get('id')||'').trim()
  if(!UUID.test(id))return send(response,400,'Invalid place')

  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),9000)
  try{
    const query=new URLSearchParams({
      id:`eq.${id}`,
      city_key:'eq.atlanta',
      status:'eq.active',
      is_verified:'eq.true',
      verification_status:'eq.verified_current',
      select:'id,photos',
      limit:'1',
    })
    const meta=await fetch(`${CONTENT_URL}/rest/v1/gt_venues?${query}`,{headers:contentHeaders(),cache:'no-store',signal:controller.signal})
    if(!meta.ok)return send(response,404,'Photo unavailable')
    const rows=await meta.json().catch(()=>[])
    const photos=Array.isArray(rows?.[0]?.photos)?rows[0].photos:[]
    const source=photos.find(value=>GOOGLE_PHOTO.test(String(value||''))&&/[?&]photoreference=/.test(value)&&/[?&]key=/.test(value))
    if(!source)return send(response,404,'Photo unavailable')

    const upstream=await fetch(source,{redirect:'follow',signal:controller.signal,headers:{Accept:'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8','User-Agent':'GoodTimesPlacePhoto/1.0'}})
    if(!upstream.ok)return send(response,404,'Photo unavailable')
    const type=upstream.headers.get('content-type')||''
    if(!type.startsWith('image/'))return send(response,415,'Photo unavailable')
    const length=Number(upstream.headers.get('content-length')||0)
    if(length>MAX_BYTES)return send(response,413,'Photo unavailable')
    if((request.method||'GET')==='HEAD'){
      response.statusCode=200
      response.setHeader('Content-Type',type)
      response.setHeader('Cache-Control','public, s-maxage=604800, stale-while-revalidate=2592000')
      response.setHeader('X-Content-Type-Options','nosniff')
      return response.end()
    }
    const bytes=Buffer.from(await upstream.arrayBuffer())
    if(!bytes.length||bytes.length>MAX_BYTES)return send(response,413,'Photo unavailable')
    response.statusCode=200
    response.setHeader('Content-Type',type)
    response.setHeader('Content-Length',String(bytes.length))
    response.setHeader('Cache-Control','public, s-maxage=604800, stale-while-revalidate=2592000')
    response.setHeader('X-Content-Type-Options','nosniff')
    response.setHeader('Cross-Origin-Resource-Policy','same-origin')
    return response.end(bytes)
  }catch(error){
    console.warn('[GOOD TIMES place photo]',{id,message:error?.name==='AbortError'?'timeout':'unavailable'})
    return send(response,404,'Photo unavailable')
  }finally{clearTimeout(timer)}
}
