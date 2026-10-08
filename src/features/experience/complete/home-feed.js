import {list} from './model.js'
// Retain typed identities and spread early cards across neighborhoods/categories.
export function diverseHomeItems(rows,limit=6){
 const seen=new Set(),unique=list(rows).filter(row=>{const id=row.event_key?`event:${row.event_key}`:`venue:${row.id||''}`;if(id==='venue:'||seen.has(id))return false;seen.add(id);return true})
 const selected=[],remaining=[...unique],counts=new Map()
 while(selected.length<limit&&remaining.length){
  let best=0,penalty=Infinity
  for(let i=0;i<remaining.length;i++){const r=remaining[i],keys=[`category:${r.category_key||''}`,`area:${r.neighborhood||r.venue_name||''}`],p=keys.reduce((sum,k)=>sum+(counts.get(k)||0),0);if(p<penalty){best=i;penalty=p}}
  const [row]=remaining.splice(best,1);selected.push(row)
  for(const k of [`category:${row.category_key||''}`,`area:${row.neighborhood||row.venue_name||''}`])counts.set(k,(counts.get(k)||0)+1)
 }
 return selected
}
export function homePlaceSelection(venues){return list(venues).filter(v=>v.id&&!v.event_key&&(!v.city_key||v.city_key==='atlanta')&&(!v.status||v.status==='active')&&!/housing|hotel|lodging|staycation|travel/.test(`${v.category_key} ${v.subcategory}`))}
