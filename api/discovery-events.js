import {contentRead,send,assertMethod} from './compact-content.js'
import {parseScope,encodeCursor,showToEvent,eventMatches} from './compact-event-query.js'
export async function readEventPage(scope,now=Date.now()){
 let after=scope.after,more=true,items=[],scanned=0,loops=0;const ids=new Set()
 while(items.length<scope.limit&&more&&loops++<4){
  const rows=await contentRead('rpc/gt_compact_event_page_v1',{body:{p_start:scope.date,p_end:scope.to,p_category:scope.category||null,p_subcategory:scope.subcategory||null,p_query:scope.q||null,p_after_date:after?.date||null,p_after_id:after?.id||null,p_after_time:after?.time||null,p_limit:64}})
  if(!Array.isArray(rows))throw new Error('Invalid event response')
  more=rows.length===64
  for(let i=0;i<rows.length;i++){
   const row=rows[i];after={date:row.show_date,time:/^([01]\d|2[0-3]):[0-5]\d/.test(row.show_time||'')?row.show_time.slice(0,5):'99:99',id:row.id};scanned++
   const event=showToEvent(row,now)
   if(eventMatches(event,scope,now)&&!ids.has(event.event_key)){ids.add(event.event_key);items.push(event)}
   if(items.length===scope.limit){more=i<rows.length-1||more;break}
  }
 }
 return{ok:true,items,next_cursor:more&&after?encodeCursor({show_date:after.date,show_time:after.time,id:after.id},scope):null,count:more?null:items.length,count_type:more?'unknown':'page',as_of:new Date(now).toISOString(),signature:scope.signature,scanned,data_state:'success',scope:{city:'atlanta',category:scope.category,subcategory:scope.subcategory,date:scope.date,to:scope.to,mode:scope.mode}}
}
export default async function handler(req,res){if(!assertMethod(req,res,['GET']))return;let scope;try{scope=parseScope(new URL(req.url,'https://thegoodtimesworldwide.com').searchParams)}catch(e){return send(res,400,{ok:false,error:e.message})}try{return send(res,200,await readEventPage(scope),'public, s-maxage=15')}catch{return send(res,503,{ok:false,error:'Could not refresh these events. Please retry.',retryable:true,data_state:'error'})}}
