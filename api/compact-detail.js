import{contentRead,send,assertMethod,uuid}from'./compact-content.js'
import{showToEvent}from'./compact-event-query.js'
import{selectedCityClock,dateNumber}from'../src/features/experience/good-times-event-clock.js'
export async function publicDetails(type,ids){
 if(!ids.length||ids.length>48||ids.some(id=>!uuid(id)))throw Object.assign(new Error('Invalid item identifiers.'),{status:400})
 if(type==='event'){
  const clock=selectedCityClock('atlanta'),to=new Date((dateNumber(clock.date)+366)*86400000).toISOString().slice(0,10)
  const rows=await contentRead('rpc/gt_compact_event_page_v1',{body:{p_start:clock.serviceDate,p_end:to,p_ids:ids,p_limit:48}})
  return rows.map(r=>showToEvent(r)).filter(Boolean)
 }
 if(type!=='venue')throw Object.assign(new Error('Invalid item type.'),{status:400})
 return contentRead(`gt_venues?select=id,name,city_key,address,neighborhood,category_key,subcategory,short_desc,long_desc,hero_image,website,phone,booking_link,hours_summary,dress_code,price_range,verified_at,freshness_expires_at&id=in.(${ids.join(',')})&city_key=eq.atlanta&status=eq.active&is_verified=eq.true&verification_status=eq.verified_current&freshness_expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=48`)
}
export default async function handler(req,res){if(!assertMethod(req,res,['GET']))return;const p=new URL(req.url,'https://thegoodtimesworldwide.com').searchParams,ids=(p.get('ids')||p.get('id')||'').split(',');try{const rows=await publicDetails(p.get('type')||'venue',ids);return send(res,200,{ok:true,item:rows[0]||null,items:rows},'private, max-age=15')}catch(e){return send(res,e.status||503,{ok:false,error:e.status===400?e.message:'Details could not refresh. Please retry.'})}}
