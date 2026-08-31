const CACHE=globalThis.__GOOD_TIMES_SPORTS_CACHE__||(globalThis.__GOOD_TIMES_SPORTS_CACHE__=new Map())

const TEAM=(sport,league,id,name)=>({sport,league,id,name})
const CITY_TEAMS={
  atlanta:[TEAM('football','nfl','1','Falcons'),TEAM('basketball','nba','1','Hawks'),TEAM('basketball','wnba','20','Dream'),TEAM('baseball','mlb','15','Braves'),TEAM('soccer','usa.1','18418','Atlanta United')],
  houston:[TEAM('football','nfl','34','Texans'),TEAM('basketball','nba','10','Rockets'),TEAM('baseball','mlb','18','Astros'),TEAM('soccer','usa.1','6077','Dynamo')],
  los_angeles:[TEAM('football','nfl','24','Chargers'),TEAM('football','nfl','14','Rams'),TEAM('basketball','nba','12','Clippers'),TEAM('basketball','nba','13','Lakers'),TEAM('basketball','wnba','6','Sparks'),TEAM('baseball','mlb','3','Angels'),TEAM('baseball','mlb','19','Dodgers'),TEAM('soccer','usa.1','187','Galaxy'),TEAM('soccer','usa.1','18966','LAFC'),TEAM('hockey','nhl','8','Kings'),TEAM('hockey','nhl','25','Ducks')],
  miami:[TEAM('football','nfl','15','Dolphins'),TEAM('basketball','nba','14','Heat'),TEAM('baseball','mlb','28','Marlins'),TEAM('soccer','usa.1','20232','Inter Miami'),TEAM('hockey','nhl','26','Panthers')],
  charlotte:[TEAM('football','nfl','29','Panthers'),TEAM('basketball','nba','30','Hornets'),TEAM('soccer','usa.1','21300','Charlotte FC')],
  washington_dc:[TEAM('football','nfl','28','Commanders'),TEAM('basketball','nba','27','Wizards'),TEAM('basketball','wnba','16','Mystics'),TEAM('baseball','mlb','20','Nationals'),TEAM('soccer','usa.1','193','D.C. United'),TEAM('hockey','nhl','23','Capitals')],
  new_york:[TEAM('football','nfl','19','Giants'),TEAM('football','nfl','20','Jets'),TEAM('basketball','nba','17','Nets'),TEAM('basketball','nba','18','Knicks'),TEAM('basketball','wnba','9','Liberty'),TEAM('baseball','mlb','21','Mets'),TEAM('baseball','mlb','10','Yankees'),TEAM('soccer','usa.1','17606','NYCFC'),TEAM('soccer','usa.1','190','Red Bulls'),TEAM('hockey','nhl','11','Devils'),TEAM('hockey','nhl','12','Islanders'),TEAM('hockey','nhl','13','Rangers')],
  dallas:[TEAM('football','nfl','6','Cowboys'),TEAM('basketball','nba','6','Mavericks'),TEAM('basketball','wnba','3','Wings'),TEAM('baseball','mlb','13','Rangers'),TEAM('soccer','usa.1','185','FC Dallas'),TEAM('hockey','nhl','9','Stars')],
  phoenix:[TEAM('football','nfl','22','Cardinals'),TEAM('basketball','nba','21','Suns'),TEAM('basketball','wnba','11','Mercury'),TEAM('baseball','mlb','29','Diamondbacks')],
  scottsdale:[TEAM('football','nfl','22','Cardinals'),TEAM('basketball','nba','21','Suns'),TEAM('basketball','wnba','11','Mercury'),TEAM('baseball','mlb','29','Diamondbacks')],
  las_vegas:[TEAM('football','nfl','13','Raiders'),TEAM('basketball','wnba','17','Aces'),TEAM('hockey','nhl','37','Golden Knights')],
}
const LEAGUE_LABELS={nfl:'NFL',nba:'NBA',wnba:'WNBA',mlb:'MLB','usa.1':'MLS',nhl:'NHL'}

function cityKey(value){return String(value||'atlanta').trim().toLowerCase().replace(/[\s-]+/g,'_')}
function seasonFor(team,now){
  const year=now.getUTCFullYear(),month=now.getUTCMonth()+1
  if((team.league==='nba'||team.league==='nhl')&&month>=7)return year+1
  return year
}
function scheduleUrl(team,now){
  const season=seasonFor(team,now)
  const base=`https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/teams/${team.id}/schedule?season=${season}`
  return team.league==='nfl'?base+'&seasontype=2':base
}
function competitor(row,homeAway){
  const item=(row?.competitors||[]).find(value=>value.homeAway===homeAway)||{}
  return{team:item.team?.displayName||'TBA',abbr:item.team?.abbreviation||'',logo:item.team?.logo||null,score:item.score??null,winner:Boolean(item.winner)}
}
function mapEvent(event,team){
  const competition=event?.competitions?.[0]||{}
  const type=competition.status?.type||{}
  const home=competitor(competition,'home'),away=competitor(competition,'away')
  return{
    id:`${team.league}:${event.id}`,league:LEAGUE_LABELS[team.league]||team.league.toUpperCase(),
    city_team:team.name,date:event.date,status:type.state||'pre',status_text:type.shortDetail||type.detail||type.description||'Scheduled',
    clock:competition.status?.displayClock||null,period:competition.status?.period||null,
    home,away,venue:competition.venue?.fullName||null,broadcasts:(competition.broadcasts||[]).flatMap(row=>row.names||[]),
    source_url:event.links?.[0]?.href||null,updated_at:new Date().toISOString(),
  }
}
async function loadTeam(team,now){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500)
  try{
    const response=await fetch(scheduleUrl(team,now),{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal})
    if(!response.ok)throw new Error(`${team.name} schedule HTTP ${response.status}`)
    const payload=await response.json()
    return(payload.events||[]).map(event=>mapEvent(event,team))
  }finally{clearTimeout(timer)}
}
function send(response,status,payload,cacheState='MISS'){
  response.statusCode=status
  response.setHeader('Content-Type','application/json; charset=utf-8')
  response.setHeader('Cache-Control',status===200?'public, s-maxage=30, stale-while-revalidate=300':'no-store')
  response.setHeader('X-Good-Times-Sports-Cache',cacheState)
  response.end(JSON.stringify(payload))
}
export default async function handler(request,response){
  if((request.method||'GET')!=='GET'){response.setHeader('Allow','GET');return send(response,405,{ok:false,error:'Method not allowed'})}
  const incoming=new URL(request.url||'/api/sports','https://thegoodtimesworldwide.com')
  const city=cityKey(incoming.searchParams.get('city')),teams=CITY_TEAMS[city]||[]
  const cached=CACHE.get(city),ttl=cached?.payload?.live?.length?30_000:5*60_000
  if(cached&&Date.now()-cached.at<ttl)return send(response,200,cached.payload,'HIT')
  const now=new Date()
  try{
    const settled=await Promise.allSettled(teams.map(team=>loadTeam(team,now)))
    const games=[...new Map(settled.flatMap(result=>result.status==='fulfilled'?result.value:[]).map(game=>[game.id,game])).values()]
      .sort((a,b)=>new Date(a.date)-new Date(b.date))
    const live=games.filter(game=>game.status==='in')
    const upcoming=games.filter(game=>game.status==='pre'&&new Date(game.date)>=new Date(now.getTime()-3_600_000)).slice(0,30)
    const recent=games.filter(game=>game.status==='post').slice(-12).reverse()
    const payload={ok:true,city,teams:teams.map(team=>({name:team.name,league:LEAGUE_LABELS[team.league]})),live,upcoming,recent,counts:{teams:teams.length,live:live.length,upcoming:upcoming.length,recent:recent.length},refreshed_at:now.toISOString(),source:'ESPN team schedules',partial:settled.some(result=>result.status==='rejected')}
    CACHE.set(city,{at:Date.now(),payload})
    return send(response,200,payload)
  }catch(error){
    if(cached)return send(response,200,{...cached.payload,stale:true},'STALE')
    return send(response,503,{ok:false,city,error:'City sports schedules are temporarily unavailable.',detail:error?.message||String(error)})
  }
}

