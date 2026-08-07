import React, { useEffect } from 'react'
import GoodTimesPaymentsLauncher from './GoodTimesPaymentsLauncher.jsx'

function openPayments(){
  const button=document.querySelector('button[aria-label="Tickets and paid experiences"]')
  if(button instanceof HTMLElement){button.click();return true}
  return false
}

export default function GoodTimesPaymentsBridge(){
  useEffect(()=>{
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
      try{
        window.dispatchEvent(new CustomEvent('gt:payment-intent-captured',{detail:{surface:'event_detail',label}}))
      }catch{}
    }
    window.addEventListener('gt:open-payments',onOpen)
    document.addEventListener('click',onTicketIntent,true)
    return()=>{
      window.removeEventListener('gt:open-payments',onOpen)
      document.removeEventListener('click',onTicketIntent,true)
    }
  },[])
  return <GoodTimesPaymentsLauncher/>
}
