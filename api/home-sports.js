/** GOOD TIMES sports reader. Does not fabricate a live feed from stale rows. */
const CONTENT_URL='https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const cache={value:null,at:0,pending:null}
const KNOWN_TEAMS=[['Atlanta Falcons','NFL'],['Atlanta Braves','MLB'],['Atlanta Hawks','NBA'],['Atlanta Dream','WNBA'],['Atlanta United','MLS']]
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control',status===200?'public, s-maxage=30, stale-while-revalidate=30':'no-store');res.end(JSON.stringify(payload))}
async function read(){
  const now=new Date(),from=new Date(now.getTime()-2*86400000).toISOString().slice(0,10),to=new Date(now.getTime()+45*86400000).toISOString().slice(0,10)
  const names=KNOWN_TEAMS.map(([name])=>name==='Atlanta United'?'Atlanta United*':name)
  const local=names.flatMap(name=>[`home_team.ilike.${name}`,`away_team.ilike.${name}`]).join(',')
  const params=new URLSearchParams({select:'id,league,home_team,away_team,game_date,game_time,venue,city_key,status,home_score,away_score,home_logo,away_logo,is_home_game,updated_at',and:`(game_date.gte.${from},game_date.lte.${to})`,or:`(${local})`,order:'game_date.asc,game_time.asc',limit:'180'})
  const response=await fetch(`${CONTENT_URL}/rest/v1/gt_sports_games?${params}`,{headers:{apikey:CONTENT_KEY,Authorization:`Bearer ${CONTENT_KEY}`},signal:AbortSignal.timeout(6500)})
  if(!response.ok)throw new Error(`sports_upstream_${response.status}`)
  const games=await response.json();if(!Array.isArray(games))throw new Error('invalid_sports_payload')
  return {ok:true,city:'atlanta',games,teams:KNOWN_TEAMS.map(([name,league])=>({id:name.toLowerCase().replaceAll(' ','-'),name,league})),generated_at:now.toISOString(),coverage:'Core Atlanta professional teams currently mapped. Additional local teams and source freshness require verification.',source:'gt_sports_games'}
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{ok:false,error:'Method not allowed'})}
  try{
    if(cache.value&&Date.now()-cache.at<30000)return send(res,200,cache.value)
    if(!cache.pending)cache.pending=read().then(value=>{cache.value=value;cache.at=Date.now();return value}).finally(()=>{cache.pending=null})
    return send(res,200,await cache.pending)
  }catch(error){console.warn('[GOOD TIMES sports]',error.message);return send(res,503,{ok:false,error:'Sports updates are unavailable. No live scores can be confirmed right now.'})}
}
