import React, { useEffect } from 'react'
import { initNative, isNative, registerPush } from '../../native.js'

const HOSTED_ORIGIN='https://thegoodtimesworldwide.com'

function buildAlertsAction(){
  const button=document.createElement('button')
  button.id='gt-native-alerts-action'
  button.type='button'
  const icon=document.createElement('b');icon.textContent='◉'
  const copy=document.createElement('span')
  const title=document.createElement('strong');title.textContent='Enable alerts'
  const detail=document.createElement('small');detail.textContent='Tonight picks, plan reminders and ticket updates'
  const arrow=document.createElement('em');arrow.textContent='›'
  copy.append(title,detail);button.append(icon,copy,arrow)
  button.addEventListener('click',async()=>{
    button.disabled=true;detail.textContent='Checking notification permission…'
    const status=await registerPush({requestPermission:true})
    if(status==='granted'){title.textContent='Alerts active';detail.textContent='GOOD TIMES notifications are connected to this device';arrow.textContent='✓'}
    else if(status==='denied'){title.textContent='Alerts disabled';detail.textContent='Notification access is blocked in your device settings';arrow.textContent='!'}
    else{title.textContent='Enable alerts';detail.textContent='Could not enable alerts. Tap to try again';arrow.textContent='›';button.disabled=false}
  })
  return button
}

export default function GoodTimesNativeBridge(){
  useEffect(()=>{
    if(!isNative)return undefined
    void initNative()
    let active=true
    void registerPush({requestPermission:false}).then(status=>{
      if(!active||status!=='granted')return
      const action=document.getElementById('gt-native-alerts-action')
      if(action){const strong=action.querySelector('strong');const small=action.querySelector('small');const em=action.querySelector('em');if(strong)strong.textContent='Alerts active';if(small)small.textContent='GOOD TIMES notifications are connected to this device';if(em)em.textContent='✓'}
    })

    const sync=()=>{
      document.querySelectorAll('img').forEach(img=>{
        const raw=img.getAttribute('src')||''
        if(raw.startsWith('/api/media?'))img.setAttribute('src',`${HOSTED_ORIGIN}${raw}`)
      })
      const links=document.querySelector('.gt-links-grid')
      if(links&&!document.getElementById('gt-native-alerts-action'))links.append(buildAlertsAction())
    }
    const observer=new MutationObserver(sync)
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']})
    sync()
    return()=>{active=false;observer.disconnect()}
  },[])
  return null
}
