import React,{useEffect,useState}from'react'
import{createPortal}from'react-dom'

const buttonText=element=>String(element?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()

export default function GoodTimesShellControl(){
  const[header,setHeader]=useState(null)
  const[isHome,setIsHome]=useState(true)

  useEffect(()=>{
    const sync=()=>{
      setHeader(document.querySelector('.gt2-topbar'))
      setIsHome(Boolean(document.querySelector('.gt2-nav button[data-gt-tab="home"].active')))
    }
    sync()
    const observer=new MutationObserver(sync)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>observer.disconnect()
  },[])

  const goBack=()=>{
    const close=document.querySelector('.gt2-backdrop .gt2-sheet-close, .gt2-backdrop .gt2-close')
    if(close instanceof HTMLElement){close.click();return}

    const nav=[...document.querySelectorAll('.gt2-nav button')]
    const active=nav.find(button=>button.classList.contains('active'))
    const home=nav.find(button=>buttonText(button).includes('now')||buttonText(button).includes('home'))
    if(active&&home&&active!==home){home.click();return}

    if(window.history.length>1){window.history.back();return}
    if(home instanceof HTMLElement){home.click();return}
    document.querySelector('.gt2-content')?.scrollTo?.({top:0,behavior:'smooth'})
  }

  return <>
    <style>{`
      .gt-premium-experience>.gt2-app{height:100dvh!important;min-height:0!important;padding-bottom:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
      .gt2-topbar{position:relative!important;top:auto!important;flex:0 0 70px!important;justify-content:flex-start!important;gap:8px!important}
      .gt2-topbar .gt-shell-back{order:-1}.gt2-topbar .gt2-brand{order:0;margin-right:auto}.gt2-topbar .gt2-city{order:1}
      .gt2-content{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;scroll-padding-top:70px!important}
      .gt2-nav{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;width:100%!important;max-width:none!important;flex:0 0 auto!important;z-index:80!important}
      .gt2-search{position:sticky!important;top:0!important;z-index:65!important}
      .gt-shell-back{height:39px;min-width:58px;padding:0 9px;border-radius:12px;border:1px solid rgba(241,213,154,.18);background:#111016;color:#f1d59a;display:flex;align-items:center;justify-content:center;gap:4px;font:900 7px 'DM Sans',sans-serif;letter-spacing:.08em;flex:0 0 auto}
      .gt-shell-back span{font-size:19px;line-height:1;margin-top:-2px}
      @media(max-width:390px){.gt2-topbar{padding-left:10px!important;padding-right:10px!important}.gt-shell-back{min-width:42px;padding:0 7px;font-size:0}.gt-shell-back span{font-size:22px}.gt2-brand strong{font-size:13px}.gt2-brand small{display:none}.gt2-city{padding:0 9px!important}}
    `}</style>
    {header&&!isHome?createPortal(<button type="button" className="gt-shell-back" onClick={goBack} aria-label="Go back"><span>‹</span>BACK</button>,header):null}
  </>
}
