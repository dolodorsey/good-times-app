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
import { installRecoveryRedirect, parseRecoverySession, refreshStoredSession } from './gt-auth-session.js'
import { readSession } from './features/auth/client.js'
import { installGrowthTracking, recordGrowthEvent } from './growth.js'

const LazyLiveApp = lazy(() => import('./features/experience/GoodTimesLiveApp.jsx'))
const LazyCommandApp = lazy(() => import('./features/experience/GoodTimesCommandApp.jsx'))
const LazyLegacyApp = lazy(() => import('./App.jsx'))
const LazyDirectRequest = lazy(() => import('./DirectRequest.jsx'))
const LazyPasswordRecovery = lazy(() => import('./PasswordRecovery.jsx'))
const LazyOnboarding = lazy(() => import('./features/onboarding/GoodTimesOnboarding.jsx'))
const LazyPaymentsLauncher = lazy(() => import('./features/experience/GoodTimesPaymentsBridge.jsx'))
const LazyConnectHub = lazy(() => import('./features/experience/GoodTimesConnectHub.jsx'))

const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const buildId = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || 'local-development'
const directRoutes = { '/join':'join','/concierge-request':'concierge-request','/trip':'trip','/group':'group' }

function installDataRequestGuard(){
  if(typeof window==='undefined'||window.__GOOD_TIMES_FETCH_GUARD__)return
  window.__GOOD_TIMES_FETCH_GUARD__=true
  const nativeFetch=window.fetch.bind(window)
  window.fetch=(input,init)=>{
    try{
      const raw=typeof input==='string'?input:input?.url
      if(raw){
        const url=new URL(raw,window.location.origin)
        if(url.pathname==='/api/data'){
          const eventLimit=Number.parseInt(url.searchParams.get('event_limit')||'0',10)
          const venueLimit=Number.parseInt(url.searchParams.get('venue_limit')||'0',10)
          if(!Number.isFinite(eventLimit)||eventLimit<=0||eventLimit>120)url.searchParams.set('event_limit','120')
          if(!Number.isFinite(venueLimit)||venueLimit<=0||venueLimit>180)url.searchParams.set('venue_limit','180')
          if(!url.searchParams.has('vibes')){
            try{
              const personalization=JSON.parse(localStorage.getItem('gt_personalization')||'{}')
              const vibes=Array.isArray(personalization?.vibes)?personalization.vibes.filter(Boolean).slice(0,5):[]
              if(vibes.length)url.searchParams.set('vibes',vibes.join(','))
            }catch{}
          }
          if(typeof input==='string')input=`${url.pathname}${url.search}${url.hash}`
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
  return <div className="gt-route-loading" role="status" aria-live="polite"><img src="/good-times-logo.png" alt=""/><div className="gt-route-loading__line"/><span>{label}</span></div>
}
function PremiumRoot({children,launch=false}){
  const[showLaunch,setShowLaunch]=useState(()=>launch&&sessionStorage.getItem('gt_premium_launch')!=='1')
  useEffect(()=>{if(!showLaunch)return undefined;sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1');const timer=setTimeout(()=>setShowLaunch(false),1250);return()=>clearTimeout(timer)},[showLaunch])
  if(showLaunch)return <div className="gt-launch" role="status" aria-label="Opening GOOD TIMES"><div className="gt-launch__scene"/><div className="gt-launch__content"><img className="gt-launch__logo" src="/good-times-logo.png" alt="GOOD TIMES"/><div className="gt-launch__eyebrow">Worldwide experience concierge</div><div className="gt-launch__title">Your next move starts here.</div><div className="gt-launch__line"/></div></div>
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