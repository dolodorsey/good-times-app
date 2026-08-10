import React, { useEffect } from 'react'
import GoodTimesPaymentsLauncher from './GoodTimesPaymentsLauncher.jsx'
import { readSession } from '../auth/client.js'
import { registerPaymentsOpener, requestPayments } from './good-times-payments-controller.js'

const CHECKOUT_PATH='/functions/v1/khg-payment-checkout'
const CATALOG_URL='https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/khg-payment-catalog?limit=100'
let catalogCache={loadedAt:0,events:[]}

function normalize(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function clickPaymentsLauncher(view='shop'){
  const button=document.querySelector('button[aria-label="Tickets and paid experiences"]')
  if(!(button instanceof HTMLElement))return false
  button.click()
  if(view==='wallet')queueMicrotask(()=>{
    const wallet=[...document.querySelectorAll('button')].find(node=>String(node.textContent||'').trim().toLowerCase().startsWith('my tickets'))
    if(wallet instanceof HTMLElement)wallet.click()
  })
  return true
}
async function loadOwnedEvents(){
  if(Date.now()-catalogCache.loadedAt<60000)return catalogCache.events
  try{
    const response=await fetch(CATALOG_URL,{headers:{Accept:'application/json'}})
    const payload=await response.json().catch(()=>null)
    if(response.ok&&Array.isArray(payload?.events))catalogCache={loadedAt:Date.now(),events:payload.events}
  }catch{}
  return catalogCache.events
}
function matchOwnedEvent(title,events){
  const needle=normalize(title)
  if(!needle)return null
  return events.find(item=>normalize(item.name)===needle)||events.find(item=>{
    const candidate=normalize(item.name)
    return candidate.length>5&&(candidate.includes(needle)||needle.includes(candidate))
  })||null
}

export default function GoodTimesPaymentsBridge(){
  useEffect(()=>{
    const unregisterPayments=registerPaymentsOpener(view=>clickPaymentsLauncher(view))
    const previousFetch=window.fetch.bind(window)
    window.fetch=async(input,init)=>{
      try{
        const raw=typeof input==='string'?input:input?.url
        if(raw&&String(raw).includes(CHECKOUT_PATH)&&String(init?.method||'GET').toUpperCase()==='POST'&&typeof init?.body==='string'){
          const body=JSON.parse(init.body)
          if(body?.source_app==='good_times'||body?.return_brand_key==='good_times'){
            const session=readSession()
            const user=session?.user||{}
            const metadata=user?.user_metadata||{}
            body.customer={
              ...(body.customer||{}),
              email:body.customer?.email||user.email||'',
              name:body.customer?.name||metadata.full_name||metadata.name||'',
              phone:body.customer?.phone||metadata.phone||'',
            }
            init={...init,body:JSON.stringify(body)}
          }
        }
      }catch(error){console.warn('[GOOD TIMES payments identity]',error)}
      return previousFetch(input,init)
    }

    const onOpen=event=>{requestPayments(event?.detail?.view||'shop')}
    const onTicketIntent=async event=>{
      const target=event.target instanceof Element?event.target.closest('a,button'):null
      if(!target)return
      const label=String(target.textContent||'').trim().toLowerCase()
      const detail=target.closest('.gtlive-detail-copy')
      const isTicketIntent=label==='tickets'||label==='get tickets'||label==='buy tickets'||label==='vip tickets'
      if(!detail||!isTicketIntent)return
      const href=target instanceof HTMLAnchorElement?target.href:''
      const title=detail.querySelector('h2')?.textContent||''
      event.preventDefault()
      event.stopPropagation()
      const owned=matchOwnedEvent(title,await loadOwnedEvents())
      if(owned){
        requestPayments('shop')
        try{window.dispatchEvent(new CustomEvent('gt:payment-intent-captured',{detail:{surface:'event_detail',label,event_id:owned.id,event_name:owned.name}}))}catch{}
        return
      }
      if(href){window.open(href,'_blank','noopener,noreferrer');return}
      requestPayments('shop')
    }

    window.addEventListener('gt:open-payments',onOpen)
    document.addEventListener('click',onTicketIntent,true)
    return()=>{
      unregisterPayments()
      window.fetch=previousFetch
      window.removeEventListener('gt:open-payments',onOpen)
      document.removeEventListener('click',onTicketIntent,true)
    }
  },[])
  return <GoodTimesPaymentsLauncher/>
}