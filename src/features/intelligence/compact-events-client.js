const cache=new Map()
export function eventScope(input={}){return{category:input.category||'',subcategory:input.subcategory||'',q:String(input.q||'').slice(0,120),mode:input.mode||'upcoming',date:input.date||'',to:input.to||'',limit:Math.min(48,Math.max(2,Number(input.limit)||24)),cursor:input.cursor||''}}
export async function loadCompactEvents(input={},signal){
 const scope=eventScope(input),params=new URLSearchParams(Object.entries(scope).filter(([,v])=>v!=='')),key=params.toString()
 const c=cache.get(key);if(c&&Date.now()-c.at<15000)return c.data
 // Requests with caller cancellation are deliberately not shared across independent scopes.
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();const timeout=setTimeout(abort,9000)
 try{const response=await fetch(`/api/discovery-events?${params}`,{signal:controller.signal,cache:'no-store'});const data=await response.json();if(!response.ok||!data?.ok||!Array.isArray(data.items))throw new Error(data?.error||'Events could not refresh. Please retry.');cache.set(key,{at:Date.now(),data});if(cache.size>40)cache.delete(cache.keys().next().value);return data}
 finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
}
