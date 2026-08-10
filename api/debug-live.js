import { inferCustomerTaxonomy } from './data.js'
import { cityClock } from './data-live.js'

const URL='https://dzlmtvodpyhetvektfuo.supabase.co'
const KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const SELECT=['id','event_name','event_type','genre','city_key','show_date','show_time','venue_name','ticket_url','image_url','category_key_v2','subcategory_key_v2','updated_at'].join(',')
function minutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1}
function safeImage(value){const text=String(value||'').trim();return Boolean(text&&!/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(text)&&!/[?&]key=/i.test(text))}
function inspect(item,clock){
  const taxonomy=inferCustomerTaxonomy(item)
  const title=String(item.event_name||'').trim()
  const venue=String(item.venue_name||'').trim()
  const start=minutes(item.show_time)
  const stale=item.show_date===clock.serviceDate&&start>=0&&start<clock.serviceMinute-(6*60)
  const venueBlocked=!venue||/^(atlanta|houston|miami|dallas|charlotte|phoenix|scottsdale|las vegas|los angeles|new york|washington dc|tba|tbd|online|virtual|warehouse)$/i.test(venue)
  const textBlocked=/\b(online reserved|zoom id|virtual event|sold out|mon-fri 2026|make money fast|timeshare|webinar)\b/i.test(`${title} ${venue}`)
  return {id:item.id,title,show_date:item.show_date,show_time:item.show_time,venue,taxonomy,has_image:safeImage(item.image_url),has_ticket:Boolean(item.ticket_url),stale,venueBlocked,textBlocked,ready:Boolean(title&&venue&&taxonomy.category&&safeImage(item.image_url)&&item.ticket_url&&!stale&&!venueBlocked&&!textBlocked)}
}
export default async function handler(request,response){
  const clock=cityClock('atlanta')
  const path=`gt_shows?select=${SELECT}&city_key=eq.atlanta&show_date=eq.${clock.serviceDate}&status=in.(confirmed,tentative)&image_url=not.is.null&ticket_url=not.is.null&order=show_time.desc.nullslast&limit=100`
  const upstream=await fetch(`${URL}/rest/v1/${path}`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,Accept:'application/json'},cache:'no-store'})
  const rows=await upstream.json()
  const inspected=Array.isArray(rows)?rows.map(item=>inspect(item,clock)):[]
  response.statusCode=upstream.ok?200:upstream.status
  response.setHeader('Content-Type','application/json')
  response.setHeader('Cache-Control','no-store')
  response.end(JSON.stringify({clock,raw:inspected.length,ready:inspected.filter(item=>item.ready).length,rows:inspected}))
}
