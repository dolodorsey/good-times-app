import React, { Component, Suspense, lazy, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './premium-experience.css'
import './runtime.css'
import {
  installRecoveryRedirect,
  parseRecoverySession,
  refreshStoredSession,
} from './gt-auth-session.js'
import { readSession } from './features/auth/client.js'

const LazyApp = lazy(() => import('./App.jsx'))
const LazyDirectRequest = lazy(() => import('./DirectRequest.jsx'))
const LazyPasswordRecovery = lazy(() => import('./PasswordRecovery.jsx'))
const LazyOnboarding = lazy(() => import('./features/onboarding/GoodTimesOnboarding.jsx'))

const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const directRoutes = {
  '/join': 'join',
  '/concierge-request': 'concierge-request',
  '/trip': 'trip',
  '/group': 'group',
}

installRecoveryRedirect()

class RuntimeBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, details) {
    console.error('GOOD TIMES runtime failure', error, details)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="gt-runtime-fallback" role="alert">
        <div className="gt-runtime-fallback__mark">GT</div>
        <div className="gt-runtime-fallback__eyebrow">Concierge interrupted</div>
        <h1>Let’s reopen your night.</h1>
        <p>Your account and saved plans are still intact. Reload the experience to reconnect.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload Good Times
        </button>
      </div>
    )
  }
}

function RouteLoading({ label = 'Curating your experience' }) {
  return (
    <div className="gt-route-loading" role="status" aria-live="polite">
      <img src="/good-times-logo.png" alt="" />
      <div className="gt-route-loading__line" />
      <span>{label}</span>
    </div>
  )
}

function PremiumRoot({ children, launch = false }) {
  const [showLaunch, setShowLaunch] = useState(
    () => launch && sessionStorage.getItem('gt_premium_launch') !== '1',
  )

  useEffect(() => {
    if (!showLaunch) return undefined

    sessionStorage.setItem('gt_premium_launch', '1')
    sessionStorage.setItem('gt_splash_shown', '1')
    const timer = window.setTimeout(() => setShowLaunch(false), 1650)
    return () => window.clearTimeout(timer)
  }, [showLaunch])

  if (showLaunch) {
    return (
      <div className="gt-launch" role="status" aria-label="Opening Good Times">
        <div className="gt-launch__scene" />
        <div className="gt-launch__content">
          <img className="gt-launch__logo" src="/good-times-logo.png" alt="Good Times" />
          <div className="gt-launch__eyebrow">Worldwide concierge</div>
          <div className="gt-launch__title">Your night starts here.</div>
          <div className="gt-launch__line" />
        </div>
      </div>
    )
  }

  return (
    <div className="gt-premium-experience" data-app="good-times">
      {children}
    </div>
  )
}

async function bootstrap() {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('GOOD TIMES root element is missing')

  const recoverySession = parseRecoverySession(window.location.hash)
  const requestType = directRoutes[pathname]

  if (!recoverySession) await refreshStoredSession()
  const hasSession = Boolean(readSession())
  if (!requestType && !recoverySession) sessionStorage.setItem('gt_splash_shown', '1')

  let route
  let loadingLabel = 'Curating your experience'

  if (recoverySession) {
    route = <LazyPasswordRecovery recoverySession={recoverySession} />
    loadingLabel = 'Securing your account'
  } else if (requestType) {
    route = <LazyDirectRequest requestType={requestType} />
    loadingLabel = 'Opening your concierge request'
  } else if (!hasSession) {
    route = <LazyOnboarding onComplete={() => window.location.reload()} />
    loadingLabel = 'Opening your private concierge'
  } else {
    route = <LazyApp />
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RuntimeBoundary>
        <Suspense fallback={<RouteLoading label={loadingLabel} />}>
          <PremiumRoot launch={!requestType && !recoverySession && hasSession}>{route}</PremiumRoot>
        </Suspense>
      </RuntimeBoundary>
    </React.StrictMode>,
  )
}

bootstrap().catch((error) => {
  console.error('GOOD TIMES failed to start', error)
  const rootElement = document.getElementById('root')
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <RuntimeBoundary>
        <div className="gt-runtime-fallback" role="alert">
          <div className="gt-runtime-fallback__mark">GT</div>
          <h1>We couldn’t open Good Times.</h1>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </RuntimeBoundary>,
    )
  }
})

const isNativeRuntime = Boolean(window.Capacitor?.isNativePlatform?.())
if ('serviceWorker' in navigator && !isNativeRuntime) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Good Times service worker registration failed', error)
    })
  })
}
