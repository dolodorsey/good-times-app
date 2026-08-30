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
// Phase 1/2 shell consolidation — the canonical shell owns geometry.
import './features/experience/good-times-shell.css'
// Owner-approved rich experience loads after shell geometry so presentation can
// be cinematic without reintroducing the old layout collisions.
import './features/experience/good-times-rich.css'
// Final viewport contract owns fixed-control placement and safe-area spacing.
import './features/experience/good-times-responsive-contract.css'
import './features/experience/good-times-reference-update.css'
// App Review-specific device geometry loads last so older phone-shell rules
// cannot re-narrow the iPad or guest experience.
import './features/experience/good-times-app-review.css'
// Owner polish is the final visual authority for card density and homescreen motion.
import './features/experience/good-times-owner-polish.css'
// GOOD TIMES 2.0 is intentionally isolated behind gt3-* classes and loads last.
import './features/experience/good-times-v2.css'
import GoodTimesShellControl from './features/experience/GoodTimesShellControl.jsx'
import BuildMyNightRouteHost from './features/experience/BuildMyNightRouteHost.jsx'
import { installRecoveryRedirect, parseRecoverySession, refreshStoredSession } from './gt-auth-session.js'
import { readSession } from './features/auth/client.js'
import { installGrowthTracking, recordGrowthEvent } from './growth.js'
import { installMediaIntegrityGuard } from './media-integrity.js'
import { isNative } from './native.js'

const LazyLiveApp = lazy(() => import('./features/experience/GoodTimesLiveApp.jsx'))
const LazyCommandApp = lazy(() => import('./features/experience/GoodTimesCommandAppV2.jsx'))
const LazyLegacyApp = lazy(() => import('./App.jsx'))
const LazyDirectRequest = lazy(() => import('./DirectRequest.jsx'))
const LazyPasswordRecovery = lazy(() => import('./PasswordRecovery.jsx'))
const LazyOnboarding = lazy(() => import('./features/onboarding/GoodTimesOnboarding.jsx'))
const LazyCompletionBridge = lazy(() => import('./features/experience/GoodTimesCompletionBridge.jsx'))
const LazyNativeBridge = lazy(() => import('./features/experience/GoodTimesNativeBridge.jsx'))
const LazyPaymentsLauncher = lazy(() => import('./features/experience/GoodTimesPaymentsBridge.jsx'))
const LazyConnectHub = lazy(() => import('./features/experience/GoodTimesConnectHub.jsx'))
const LazyAccountCenter = lazy(() => import('./features/experience/GoodTimesAccountCenter.jsx'))
const LazyUtilityMenu = lazy(() => import('./features/experience/GoodTimesUtilityMenu.jsx'))
const LazyCreativeLayer = lazy(() => import('./features/experience/GoodTimesCreativeLayer.jsx'))
const LazyPartyPulse = lazy(() => import('./features/experience/GoodTimesPartyPulse.jsx'))

const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const buildId = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || 'local-development'
const directRoutes = { '/join':'join','/concierge-request':'concierge-request','/trip':'trip','/group':'group' }
const PROVIDER_ONBOARDING_URL='https://forms.thekollectivehospitality.com/f/good-times/provider-onboarding'
const providerRoutes=new Set(['/provider','/provider-onboarding','/become-a-provider'])
const HOSTED_API_ORIGIN='https://thegoodtimesworldwide.com'
const GT_CURRENT_MEDIA_BASE='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics'
const GT_CURRENT_LOGO=`${GT_CURRENT_MEDIA_BASE}/good_times/graphics/GOOD_TIMES_logo.png`
const GT_CURRENT_HOME=`${GT_CURRENT_MEDIA_BASE}/motion/goodtimes.jpg`
const GT_CURRENT_ANIMATION=`${GT_CURRENT_MEDIA_BASE}/kollective/animations/GOODTIMES.mp4`

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
installMediaIntegrityGuard()
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
function ProviderOpportunityLink(){
  return <a href="/provider" style={{position:'fixed',left:'50%',bottom:'max(16px,env(safe-area-inset-bottom))',transform:'translateX(-50%)',zIndex:80,padding:'10px 16px',borderRadius:999,border:'1px solid rgba(212,168,83,.45)',background:'rgba(6,6,12,.86)',backdropFilter:'blur(14px)',color:'#D4A853',fontSize:11,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',textDecoration:'none',whiteSpace:'nowrap'}}>Work with GOOD TIMES · Provider onboarding ↗</a>
}

function GuestAccessBar({onAuth}){
  return <>
    <div className="gt-guest-access" role="status">
      <div><strong>Browsing as guest</strong><span>Events, nightlife and local discovery are open without an account.</span></div>
      <button type="button" onClick={onAuth}>Sign in / Create account</button>
    </div>
    <style>{`
      .gt-guest-mode .gt2-nav button[data-gt-tab="concierge"],
      .gt-guest-mode .gt2-nav button[data-gt-tab="plans"],
      .gt-guest-mode .gt2-nav button[data-gt-tab="vault"],
      .gt-guest-mode .gt2-save,
      .gt-guest-mode .gt2-command-launch,
      .gt-guest-mode .gt2-detail-actions button{display:none!important}
      .gt-guest-mode .gt2-city{pointer-events:none!important;cursor:default!important;opacity:.85!important}
      .gt-guest-access{position:fixed;right:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:9500;display:flex;align-items:center;gap:10px;max-width:min(430px,calc(100vw - 24px));padding:10px 10px 10px 13px;border:1px solid rgba(245,204,117,.28);border-radius:16px;background:rgba(7,7,12,.94);backdrop-filter:blur(18px);box-shadow:0 14px 40px rgba(0,0,0,.42);color:#fffaf4;font-family:'DM Sans',system-ui,sans-serif}
      .gt-guest-access div{display:grid;gap:2px;min-width:0}
      .gt-guest-access strong{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#f5cc75}
      .gt-guest-access span{font-size:9px;line-height:1.35;color:rgba(255,255,255,.58)}
      .gt-guest-access button{flex:0 0 auto;min-height:40px;padding:0 12px;border-radius:11px;border:1px solid rgba(245,204,117,.36);background:#f5cc75;color:#09090d;font-size:10px;font-weight:900;white-space:nowrap}
      .gt-guest-back{position:fixed;left:14px;top:calc(14px + env(safe-area-inset-top,0px));z-index:9700;min-height:42px;padding:0 14px;border-radius:999px;border:1px solid rgba(245,204,117,.34);background:rgba(7,7,12,.92);color:#f5cc75;font:800 10px/1 'DM Sans',system-ui,sans-serif;letter-spacing:.05em}
      @media(max-width:600px){.gt-guest-access span{display:none}.gt-guest-access{left:12px;right:12px;justify-content:space-between}.gt-guest-access div{display:block}.gt-guest-access strong{font-size:9px}}
    `}</style>
  </>
}

function SignedOutGuestExperience(){
  const[showAuth,setShowAuth]=useState(false)
  const complete=(nextSession,prefs)=>{
    if(prefs){try{localStorage.setItem('gt_personalization',JSON.stringify({...prefs,updated_at:new Date().toISOString()}))}catch{}}
    if(nextSession)window.location.reload()
  }
  if(showAuth)return <>
    <LazyOnboarding onComplete={complete}/>
    <button type="button" className="gt-guest-back" onClick={()=>setShowAuth(false)}>← Continue as guest</button>
    <style>{`.gt-guest-back{position:fixed;left:14px;top:calc(14px + env(safe-area-inset-top,0px));zIndex:9700;min-height:42px;padding:0 14px;border-radius:999px;border:1px solid rgba(245,204,117,.34);background:rgba(7,7,12,.92);color:#f5cc75;font:800 10px/1 'DM Sans',system-ui,sans-serif;letter-spacing:.05em}`}</style>
  </>
  return <div className="gt-guest-mode">
    <LazyCreativeLayer/>
    <LazyCommandApp/>
    <LazyPartyPulse/>
    <GuestAccessBar onAuth={()=>setShowAuth(true)}/>
  </div>
}

async function bootstrap(){
  const rootElement=document.getElementById('root')
  if(!rootElement)throw new Error('GOOD TIMES root element is missing')
  if(providerRoutes.has(pathname)){
    window.location.replace(PROVIDER_ONBOARDING_URL)
    return
  }
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
  else if(!hasSession){route=<SignedOutGuestExperience/>;loadingLabel='Opening GOOD TIMES guest access'}
  else if(legacyRoute){route=<LazyLegacyApp/>;loadingLabel='Opening legacy GOOD TIMES'}
  else if(commandRoute){route=<LazyCommandApp/>;loadingLabel='Opening command interface'}
  else route=<><LazyCreativeLayer/><LazyCommandApp/><LazyPartyPulse/></>

  const showMemberTools=hasSession&&!requestType&&!recoverySession&&!legacyRoute&&!commandRoute
  const showShellControl=hasSession&&!requestType&&!recoverySession&&!legacyRoute
  const showProviderOpportunity=false
  ReactDOM.createRoot(rootElement).render(
    <RuntimeBoundary>
      <Suspense fallback={<RouteLoading label={loadingLabel}/> }>
        <PremiumRoot launch={showMemberTools}>
          {isNative?<LazyNativeBridge/>:null}
          {showMemberTools?<><LazyCompletionBridge/><LazyAccountCenter/><LazyUtilityMenu/><BuildMyNightRouteHost/></>:null}
          {route}
          {showProviderOpportunity?<ProviderOpportunityLink/>:null}
          {showShellControl?<GoodTimesShellControl/>:null}
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