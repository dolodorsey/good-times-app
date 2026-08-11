import { useEffect } from 'react'

const BUILD_PATH='/build-my-night'
const textOf=element=>String(element?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()

function findBuildNav(){
  return [...document.querySelectorAll('.gt2-nav button')].find(button=>textOf(button).includes('build night'))
}
function findHomeNav(){
  return [...document.querySelectorAll('.gt2-nav button')].find(button=>textOf(button).includes('now'))
}
function scrollAppTop(){
  const content=document.querySelector('.gt2-content')
  if(content&&typeof content.scrollTo==='function')content.scrollTo({top:0,behavior:'instant'})
}
function openPlanner(){
  const nav=findBuildNav()
  if(!nav)return false
  nav.click()
  scrollAppTop()
  document.title='Build My Night | GOOD TIMES'
  return true
}

export default function BuildMyNightRouteHost(){
  useEffect(()=>{
    let alive=true
    let openedFromRoute=false

    const syncRoute=()=>{
      if(!alive)return
      if(window.location.pathname.replace(/\/$/,'')===BUILD_PATH){
        openedFromRoute=true
        if(!openPlanner())window.setTimeout(syncRoute,80)
      }else if(openedFromRoute){
        openedFromRoute=false
        findHomeNav()?.click()
        scrollAppTop()
        document.title='GOOD TIMES — Worldwide Experience Concierge'
      }
    }

    const onClick=event=>{
      const target=event.target instanceof Element?event.target.closest('button,a'):null
      if(!target)return
      const label=textOf(target)
      const isBuildEntry=target.classList.contains('gt2-command-launch')
        || label==='build my night'
        || label.includes('build night')
        || label==='build my first night'
      if(!isBuildEntry)return
      if(window.location.pathname.replace(/\/$/,'')!==BUILD_PATH){
        window.history.pushState({gtSurface:'build-my-night'},'',BUILD_PATH)
      }
      openedFromRoute=true
      document.title='Build My Night | GOOD TIMES'
    }

    document.addEventListener('click',onClick,true)
    window.addEventListener('popstate',syncRoute)
    syncRoute()
    return()=>{
      alive=false
      document.removeEventListener('click',onClick,true)
      window.removeEventListener('popstate',syncRoute)
    }
  },[])

  return null
}
