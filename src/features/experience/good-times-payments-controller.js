let opener=null
let pendingView=null

function normalizeView(view){return view==='wallet'?'wallet':'shop'}

export function registerPaymentsOpener(handler){
  opener=typeof handler==='function'?handler:null
  if(opener&&pendingView){
    const next=pendingView
    pendingView=null
    queueMicrotask(()=>opener?.(next))
  }
  return()=>{if(opener===handler)opener=null}
}

export function requestPayments(view='shop'){
  const next=normalizeView(view)
  if(opener){opener(next);return true}
  pendingView=next
  return false
}
