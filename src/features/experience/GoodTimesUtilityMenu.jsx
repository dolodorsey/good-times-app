import React, { useEffect, useState } from 'react'

function clickControl(selector){
  const target=document.querySelector(selector)
  if(target instanceof HTMLElement){target.click();return true}
  return false
}

export default function GoodTimesUtilityMenu(){
  const[mobile,setMobile]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width:899px)').matches)
  const[open,setOpen]=useState(false)

  useEffect(()=>{
    const media=window.matchMedia('(max-width:899px)')
    const onChange=event=>{setMobile(event.matches);if(!event.matches)setOpen(false)}
    media.addEventListener?.('change',onChange)
    return()=>media.removeEventListener?.('change',onChange)
  },[])

  useEffect(()=>{
    const close=event=>{if(event.key==='Escape')setOpen(false)}
    window.addEventListener('keydown',close)
    return()=>window.removeEventListener('keydown',close)
  },[])

  if(!mobile)return null

  const run=(selector)=>{setOpen(false);window.setTimeout(()=>clickControl(selector),0)}
  return <div className={`gt-mobile-utilities ${open?'open':''}`}>
    {open&&<div className="gt-mobile-utilities__menu" role="menu" aria-label="GOOD TIMES utilities">
      <button type="button" role="menuitem" onClick={()=>run('.gt-connect-fab')}><span>＋</span><b>Connect</b><small>Current · Network · Links</small></button>
      <button type="button" role="menuitem" onClick={()=>run('button[aria-label="Tickets and paid experiences"]')}><span>✦</span><b>Tickets</b><small>Tickets · VIP · Wallet</small></button>
      <button type="button" role="menuitem" onClick={()=>run('button[aria-label="Open GOOD TIMES account"]')}><span>◎</span><b>Account</b><small>Profile · Privacy · Sign out</small></button>
    </div>}
    <button className="gt-mobile-utilities__orb" type="button" aria-label={open?'Close GOOD TIMES utilities':'Open GOOD TIMES utilities'} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
      <span>{open?'×':'✦'}</span>
    </button>
  </div>
}
