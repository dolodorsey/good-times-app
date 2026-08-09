import React, { Component, Suspense, lazy, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './premium-experience.css'
import './runtime.css'
import './features/experience/good-times-command.css'
import './features/experience/good-times-command-v2.css'
import './features/experience/good-times-live.css'
import './features/experience/good-times-scenes.css'
import './features/experience/good-times-connect.css'
import './features/experience/good-times-profile.css'
import './current-media.css'
// Phase 1/2 shell consolidation — load last so the canonical shell wins cascade ties.
import './features/experience/good-times-shell.css'
import { installRecoveryRedirect, parseRecoverySession, refreshStoredSession } from './gt-auth-session.js'
import { readSession } from './features/auth/client.js'
import { installGrowthTracking, recordGrowthEvent } from './growth.js'
import { isNative } from './native.js'

const LazyLiveApp = lazy(() => import('./features/experience/GoodTimesLiveApp.jsx'))
const LazyCommandApp = lazy(() => import('./features/experience/GoodTimesCommandApp.jsx'))
const LazyLegacyApp = lazy(() => import('./App.jsx'))
const LazyDirectRequest = lazy(() => import('./DirectRequest.jsx'))
const LazyPasswordRecovery = lazy(() => import('./PasswordRecovery.jsx'))
const LazyOnboarding = lazy(() => import('./features/onboarding/GoodTimesOnboarding.jsx'))
const LazyCompletionBridge = lazy(() => import('./features/experience/GoodTimesCompletionBridge.jsx'))
const LazyNavigationBridge = lazy(() => import('./features/experience/GoodTimesNavigationBridge.jsx'))
const LazyNativeBridge = lazy(() => import('./features/experience/GoodTimesNativeBridge.jsx'))
const LazyPaymentsLauncher = lazy(() => import('./features/experience/GoodTimesPaymentsBridge.jsx'))
const LazyConnectHub = lazy(() => import('./features/experience/GoodTimesConnectHub.jsx'))
const LazyAccountCenter = lazy(() => import('./features/experience/GoodTimesAccountCenter.jsx'))

const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const buildId = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || 'local-development'
const directRoutes = { '/join':'join','/concierge-request':'concierge-request','/trip':'trip','/group':'group' }
const HOSTED_API_ORIGIN='https://thegoodtimesworldwide.com'
const GT_CURRENT_MEDIA_BASE='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics'
const GT_CURRENT_LOGO=`${GT_CURRENT_MEDIA_BASE}/GOOD_TIMES_logo.png`
const GT_CURRENT_HOME=`${GT_CURRENT_MEDIA_BASE}/GOODTIMES_HOMESCREEN.png`
const GT_CURRENT_ANIMATION=`${GT_CURRENT_MEDIA_BASE}/GOOD_TIMES_ANIMATION.mp4`

function installDataRequestGuard(){
  if(typeof window==='undefined'||window.__GOOD_TIMES_FETCH_GUARD__)return
  window.__GOOD_TIMES_FETCH_GUARD__=true
  const nativeFetch=window.fetch.bind(window)
  window.fetch=(input,init)=>{
    try{
      const raw=typeof input==='string'?input:input?.url
      if(raw){
        let url=new URL(raw,window.location.origin)
        let changed=false
        if(url.pathname==='/api/data'){
          const eventLimit=Number.parseInt(url.searchParams.get('event_limit')||'0',10)
          const venueLimit=Number.parseInt(url.searchParams.get('venue_limit')||'0',10)
          if(!Number.isFinite(eventLimit)||eventLimit<=0||eventLimit>120){url.searchParams.set('event_limit','120');changed=true}
          if(!Number.isFinite(venueLimit)||venueLimit<=0||venueLimit>180){url.searchParams.set('venue_limit','180');changed=true}
          if(!url.searchParams.has('vibes')){
            try{
              const personalization=JSON.parse(localStorage.getItem('gt_personalization')||'{}')
              const vibes=Array.isArray(personalization?.vibes)?personalization.vibes.filter(Boolean).slice(0,5):[]
              if(vibes.length){url.searchParams.set('vibes',vibes.join(','));changed=true}
            }catch{}
          }
          if(url.searchParams.has('vibes')){url.pathname='/api/data-fast';changed=true}
        }
        if(isNative&&url.pathname.startsWith('/api/')){
          url=new URL(`${url.pathname}${url.search}${url.hash}`,HOSTED_API_ORIGIN)
          changed=true
        }
        if(changed){
          if(typeof input==='string')input=isNative?url.toString():`${url.pathname}${url.search}${url.hash}`
          else input=new Request(url.toString(),input)
        }
      }
    }catch(error){console.warn('[GOOD TIMES fetch guard]',error)}
    return nativeFetch(input,init)
  }
}

installRecoveryRedirect()
installDataRequestGuard()
installGrowthTracking()

class RuntimeBoundary extends Component {
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return{error}}
  componentDidCatch(error,details){console.error('GOOD TIMES runtime failure',error,details)}
  render(){
    if(!this.state.error)return this.props.children
    return <div className="gt-runtime-fallback" role="alert"><div className="gt-runtime-fallback__mark">GT</div><div className="gt-runtime-fallback__eyebrow">Experience interrupted</div><h1>Let’s reopen your night.</h1><p>Your account, saved places and plans remain intact.</p><button type="button" onClick={()=>window.location.reload()}>Reload GOOD TIMES</button></div>
  }
}
function RouteLoading({label='Opening GOOD TIMES'}){
  return <div className="gt-route-loading" role="status" aria-live="polite"><img src={GT_CURRENT_LOGO} alt=""/><div className="gt-route-loading__line"/><span>{label}</span></div>
}
function PremiumRoot({children,launch=false}){
  const[showLaunch,setShowLaunch]=useState(()=>launch&&sessionStorage.getItem('gt_premium_launch')!=='1')
  useEffect(()=>{if(!showLaunch)return undefined;sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1');const timer=setTimeout(()=>setShowLaunch(false),1250);return()=>clearTimeout(timer)},[showLaunch])
  if(showLaunch)return <div className="gt-launch" role="status" aria-label="Opening GOOD TIMES"><video className="gt-current-launch-video" autoPlay muted loop playsInline preload="metadata" poster={GT_CURRENT_HOME} src={GT_CURRENT_ANIMATION}/><div className="gt-launch__scene"/><div className="gt-launch__content"><img className="gt-launch__logo" src={GT_CURRENT_LOGO} alt="GOOD TIMES"/><div className="gt-launch__eyebrow">Worldwide experience concierge</div><div className="gt-launch__title">Your next move starts here.</div><div className="gt-launch__line"/></div></div>
  return <div className="gt-premium-experience" data-app="good-times" data-build={buildId}>{children}</div>
}

async function bootstrap(){
  const rootElement=document.getElementById('root')
  if(!rootElement)throw new Error('GOOD TIMES root element is missing')
  const recoverySession=parseRecoverySession(window.location.hash)
  const requestType=directRoutes[pathname]
  const legacyRoute=pathname==='/legacy'
  const commandRoute=pathname==='/command'
  if(!recoverySession)await refreshStoredSession()
  const hasSession=Boolean(readSession())
  recordGrowthEvent('app_open',{member:hasSession,route:requestType||pathname})
  if(!requestType&&!recoverySession)sessionStorage.setItem('gt_splash_shown','1')

  let route
  let loadingLabel='Opening GOOD TIMES Live'
  if(recoverySession){route=<LazyPasswordRecovery recoverySession={recoverySession}/>;loadingLabel='Securing your account'}
  else if(requestType){route=<LazyDirectRequest requestType={requestType}/>;loadingLabel='Opening your concierge request'}
  else if(!hasSession){route=<LazyOnboarding onComplete={(nextSession,prefs)=>{if(prefs){try{localStorage.setItem('gt_personalization',JSON.stringify({...prefs,updated_at:new Date().toISOString()}))}catch{}}window.location.reload()}}/>;loadingLabel='Opening your private concierge'}
  else if(legacyRoute){route=<LazyLegacyApp/>;loadingLabel='Opening legacy GOOD TIMES'}
  else if(commandRoute){route=<LazyCommandApp/>;loadingLabel='Opening command interface'}
  else route=<LazyLiveApp/>

  const showMemberTools=hasSession&&!requestType&&!recoverySession&&!legacyRoute&&!commandRoute
  ReactDOM.createRoot(rootElement).render(
    <RuntimeBoundary>
      <Suspense fallback={<RouteLoading label={loadingLabel}/>}>
        <PremiumRoot launch={showMemberTools}>
          {isNative?<LazyNativeBridge/>:null}
          {showMemberTools?<><LazyCompletionBridge/><LazyNavigationBridge/><LazyAccountCenter/></>:null}
          {route}
          {showMemberTools?<><LazyConnectHub/><LazyPaymentsLauncher/></>:null}
        </PremiumRoot>
      </Suspense>
    </RuntimeBoundary>
  )
}

bootstrap().catch(error=>{
  console.error('GOOD TIMES failed to start',error)
  const rootElement=document.getElementById('root')
  if(rootElement)ReactDOM.createRoot(rootElement).render(<RuntimeBoundary><div className="gt-runtime-fallback" role="alert"><div className="gt-runtime-fallback__mark">GT</div><h1>We couldn’t open GOOD TIMES.</h1><button type="button" onClick={()=>window.location.reload()}>Try again</button></div></RuntimeBoundary>)
})