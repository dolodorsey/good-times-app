const CONTENT_URL='https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const VIBE_LANES={
  grown:['nightlife_places','nightlife_now','date_night','top_places','this_week'],
  turnt:['nightlife_now','nightlife_places','live_music','this_week','top_places'],
  date:['date_night','top_places','this_week','nightlife_places'],
  live:['live_music','this_week','nightlife_now','top_places'],
  food:['date_night','top_places','this_week'],
  culture:['black_owned','top_places','this_week','live_music'],
  free:['this_week','top_places'],
  vip:['nightlife_places','nightlife_now','date_night','top_places'],
}
function clean(value,max=80){return String(value||'').trim().slice(0,max)}
function cityKey(value){return clean(value||'atlanta').toLowerCase().replace(/[\s-]+/g,'_')}
function parseVibes(value){return [...new Set(clean(value,160).split(',').map(v=>v.trim().toLowerCase()).filter(v=>VIBE_LANES[v]))].slice(0,5)}
function headers(){return{apikey:CONTENT_KEY,Authorization:`Bearer ${CONTENT_KEY}`,Accept:'application/json'}}
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',status===200?'public, s-maxage=300, stale-while-revalidate=1800':'no-store');res.end(JSON.stringify(payload))}

export default async function handler(req,res){
  if((req.method||'GET')!=='GET'){res.setHeader('Allow','GET');return send(res,405,{ok:false,error:'Method not allowed'})}
  const url=new URL(req.url||'/api/programming','https://thegoodtimesworldwide.com')
  const city=cityKey(url.searchParams.get('city'))
  const vibes=parseVibes(url.searchParams.get('vibes'))
  const params=new URLSearchParams({
    select:'program_date,city_key,lane,item_type,object_id,title,subtitle,image_url,action_url,score,rank_order,metadata,refreshed_at',
    city_key:`eq.${city}`,
    order:'lane.asc,rank_order.asc',
    limit:'500',
  })
  try{
    const response=await fetch(`${CONTENT_URL}/rest/v1/gt_daily_programming?${params}`,{headers:headers(),cache:'no-store'})
    const text=await response.text()
    if(!response.ok)throw new Error(`programming HTTP ${response.status}: ${text.slice(0,160)}`)
    const rows=text?JSON.parse(text):[]
    const grouped={}
    for(const row of Array.isArray(rows)?rows:[]){(grouped[row.lane] ||= []).push(row)}
    let laneOrder=['tonight','this_week','top_places','nightlife_now','nightlife_places','date_night','live_music','black_owned']
    if(vibes.length){
      const preferred=[]
      for(const vibe of vibes)for(const lane of VIBE_LANES[vibe])if(!preferred.includes(lane))preferred.push(lane)
      laneOrder=[...preferred,...laneOrder.filter(lane=>!preferred.includes(lane))]
    }
    const lanes=laneOrder.filter(lane=>grouped[lane]?.length).map(lane=>({lane,count:grouped[lane].length,items:grouped[lane]}))
    return send(res,200,{ok:true,city,personalized:vibes.length>0,vibes,generated_at:new Date().toISOString(),lanes})
  }catch(error){
    console.error('[GOOD TIMES programming]',{city,message:error?.message||String(error)})
    return send(res,503,{ok:false,city,error:'GOOD TIMES city programming is temporarily unavailable.'})
  }
}
