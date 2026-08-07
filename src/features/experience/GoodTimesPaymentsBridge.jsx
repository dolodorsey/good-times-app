import React, { useEffect } from 'react'
import GoodTimesPaymentsLauncher from './GoodTimesPaymentsLauncher.jsx'
import { readSession } from '../auth/client.js'

const CHECKOUT_PATH='/functions/v1/khg-payment-checkout'

function openPayments(){
  const button=document.querySelector('button[aria-label="Tickets and paid experiences"]')
  if(button instanceof HTMLElement){button.click();return true}
  return false
}

export default function GoodTimesPaymentsBridge(){
  useEffect(()=>{
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

    const onOpen=()=>{openPayments()}
    const onTicketIntent=event=>{
      const target=event.target instanceof Element?event.target.closest('a,button'):null
      if(!target)return
      const label=String(target.textContent||'').trim().toLowerCase()
      const isLiveDetail=Boolean(target.closest('.gtlive-detail-copy'))
      const isTicketIntent=label==='tickets'||label==='get tickets'||label==='buy tickets'||label==='vip tickets'
      if(!isLiveDetail||!isTicketIntent)return
      event.preventDefault()
      event.stopPropagation()
      openPayments()
      try{window.dispatchEvent(new CustomEvent('gt:payment-intent-captured',{detail:{surface:'event_detail',label}}))}catch{}
    }

    window.addEventListener('gt:open-payments',onOpen)
    document.addEventListener('click',onTicketIntent,true)
    return()=>{
      window.fetch=previousFetch
      window.removeEventListener('gt:open-payments',onOpen)
      document.removeEventListener('click',onTicketIntent,true)
    }
  },[])
  return <GoodTimesPaymentsLauncher/>
}
