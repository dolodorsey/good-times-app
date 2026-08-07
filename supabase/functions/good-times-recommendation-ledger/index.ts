import { createClient } from 'npm:@supabase/supabase-js@2'

const PROD=new Set(['https://thegoodtimesworldwide.com','https://www.thegoodtimesworldwide.com'])
const PREVIEW=/^https:\/\/good-times-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i
const clean=(v:unknown,max=300)=>String(v??'').trim().slice(0,max)
const num=(v:unknown,min=0,max=100)=>Math.max(min,Math.min(max,Number(v)||0))
const allowed=(origin:string|null)=>Boolean(origin&&(PROD.has(origin)||PREVIEW.test(origin)))
const headers=(origin:string|null)=>({'Content-Type':'application/json','Access-Control-Allow-Origin':allowed(origin)?origin!:'https://thegoodtimesworldwide.com','Access-Control-Allow-Headers':'authorization, content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'})
const out=(status:number,body:unknown,origin:string|null)=>new Response(JSON.stringify(body),{status,headers:headers(origin)})

Deno.serve(async req=>{
  const origin=req.headers.get('origin')
  if(req.method==='OPTIONS')return allowed(origin)?new Response(null,{status:204,headers:headers(origin)}):new Response(null,{status:403})
  if(req.method!=='POST')return out(405,{ok:false,error:'Method not allowed'},origin)
  if(!allowed(origin))return out(403,{ok:false,error:'Origin not allowed'},origin)

  const auth=req.headers.get('authorization')||''
  const token=auth.toLowerCase().startsWith('bearer ')?auth.slice(7):''
  if(!token)return out(401,{ok:false,error:'Authentication required'},origin)

  const url=Deno.env.get('SUPABASE_URL')!
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:userData,error:userError}=await admin.auth.getUser(token)
  const user=userData?.user
  if(userError||!user)return out(401,{ok:false,error:'GOOD TIMES session is invalid or expired'},origin)

  try{
    const body=await req.json().catch(()=>({}))
    const city=clean(body?.city||'atlanta',80).toLowerCase().replace(/[\s-]+/g,'_')
    const rawItems=Array.isArray(body?.items)?body.items.slice(0,12):[]
    if(!rawItems.length)return out(400,{ok:false,error:'No recommendation items supplied'},origin)
    const action=clean(body?.action||'home_feed',80)
    const formulaKey=action==='itinerary'?'itinerary':'recommendation'

    const {data:formula,error:formulaError}=await admin.from('gt_formula_versions').select('formula_key,version,thresholds').eq('formula_key',formulaKey).eq('is_active',true).order('version',{ascending:false}).limit(1).maybeSingle()
    if(formulaError)throw formulaError
    if(!formula)throw new Error(`Active ${formulaKey} formula is missing`)

    const {count:signalCount}=await admin.from('gt_taste_signals').select('id',{count:'exact',head:true}).eq('auth_id',user.id)
    const signals=signalCount||0
    const maturity=signals>=30?'mature':signals>=8?'warm':'cold'
    const thresholds=formula.thresholds||{}
    const explorationRate=formulaKey==='recommendation'?Number(thresholds[`${maturity}_exploration_rate`]??(maturity==='cold'?0.2:maturity==='warm'?0.12:0.08)):0
    const vibes=Array.isArray(body?.vibes)?body.vibes.map((v:unknown)=>clean(v,40)).filter(Boolean).slice(0,5):[]
    const rawQuery=clean(body?.raw_query||`personalized ${action} in ${city}`,500)
    const itineraryId=/^[0-9a-f-]{36}$/i.test(clean(body?.itinerary_id,50))?clean(body.itinerary_id,50):null
    const started=Date.now()

    const {data:session,error:sessionError}=await admin.from('gt_recommendation_sessions').insert({
      auth_id:user.id,
      city_slug:city,
      action,
      raw_query:rawQuery,
      parsed_intent:{surface:clean(body?.surface||'home',80),vibes},
      formula_key:formula.formula_key,
      formula_version:formula.version,
      maturity_stage:maturity,
      exploration_rate:explorationRate,
      candidate_count:Math.max(rawItems.length,Number(body?.candidate_count)||rawItems.length),
      result_count:rawItems.length,
      itinerary_id:itineraryId,
      duration_ms:Math.max(0,Date.now()-started),
    }).select('id').single()
    if(sessionError)throw sessionError

    const rows=rawItems.map((item:any,index:number)=>{
      const objectType=(item?.object_type||item?.type)==='venue'?'venue':'event'
      const base=objectType==='event'?num(item?.good_times_score||item?.relevance_score||78):num(item?.quality_score||item?.relevance_score||78)
      const confidence=objectType==='event'?(item?.is_curated?90:76):(item?.is_verified?92:78)
      const completeness=objectType==='event'?num((item?.title||item?.name?30:0)+(item?.event_date||item?.date?25:0)+(item?.venue_name||item?.venue?20:0)+(item?.image_url||item?.image?15:0)+(item?.ticket_url?10:0)):num((item?.name?25:0)+(item?.address?20:0)+(item?.hero_image||item?.image?15:0)+(item?.category_key?15:0)+(item?.website||item?.booking_link?15:0)+(item?.google_rating?10:0))
      const freshness=objectType==='event'?100:85
      return {
        session_id:session.id,
        auth_id:user.id,
        object_type:objectType,
        object_id:clean(item?.object_id||item?.event_key||item?.id,180),
        rank_position:index+1,
        relevance_score:base,
        confidence_score:confidence,
        completeness_score:completeness,
        freshness_score:freshness,
        diversity_adjustment:0,
        exploration_pick:false,
        reasons:vibes.length?[`Matched member vibes: ${vibes.join(', ')}`]:[formulaKey==='itinerary'?'Selected for the generated GOOD TIMES itinerary':'Ranked from live GOOD TIMES inventory'],
        score_components:{surface:clean(body?.surface||'home',80),personalized:Boolean(vibes.length),base_score:base,formula_key:formulaKey},
      }
    }).filter((row:any)=>row.object_id)
    if(rows.length){const {error:impressionError}=await admin.from('gt_recommendation_impressions').insert(rows);if(impressionError)throw impressionError}
    return out(200,{ok:true,session_id:session.id,count:rows.length,maturity_stage:maturity,formula_key:formulaKey,formula_version:formula.version},origin)
  }catch(error){console.error('[GOOD TIMES recommendation ledger]',error);return out(500,{ok:false,error:'Recommendation ledger unavailable'},origin)}
})
