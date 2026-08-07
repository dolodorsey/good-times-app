import React, { useEffect } from 'react'
import GoodTimesPaymentsLauncher from './GoodTimesPaymentsLauncher.jsx'

export default function GoodTimesPaymentsBridge(){
  useEffect(()=>{
    const open=()=>{
      const button=document.querySelector('button[aria-label="Tickets and paid experiences"]')
      if(button instanceof HTMLElement)button.click()
    }
    window.addEventListener('gt:open-payments',open)
    return()=>window.removeEventListener('gt:open-payments',open)
  },[])
  return <GoodTimesPaymentsLauncher/>
}
