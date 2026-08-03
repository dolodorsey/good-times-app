import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import DirectRequest from './DirectRequest.jsx'
import PasswordRecovery from './PasswordRecovery.jsx'
import './premium-experience.css'
import {
  installRecoveryRedirect,
  parseRecoverySession,
  refreshStoredSession,
} from './gt-auth-session.js'

const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const directRoutes = {
  '/join': 'join',
  '/concierge-request': 'concierge-request',
  '/trip': 'trip',
  '/group': 'group',
}

installRecoveryRedirect()

function PremiumRoot({ children, launch = false }) {
  const [showLaunch, setShowLaunch] = useState(
    () => launch && sessionStorage.getItem('gt_premium_launch') !== '1',
  )

  useEffect(() => {
    if (!showLaunch) return undefined

    // Replace the old seven-second splash with a short, intentional brand entry.
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
  const recoverySession = parseRecoverySession(window.location.hash)
  if (recoverySession) {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <PremiumRoot>
        <PasswordRecovery recoverySession={recoverySession} />
      </PremiumRoot>,
    )
    return
  }

  await refreshStoredSession()
  const requestType = directRoutes[pathname]

  // The premium launch replaces the legacy seven-second splash on the main app.
  if (!requestType) sessionStorage.setItem('gt_splash_shown', '1')

  ReactDOM.createRoot(document.getElementById('root')).render(
    <PremiumRoot launch={!requestType}>
      {requestType ? <DirectRequest requestType={requestType} /> : <App />}
    </PremiumRoot>,
  )
}

bootstrap()

const isNativeRuntime = Boolean(window.Capacitor?.isNativePlatform?.())
if ('serviceWorker' in navigator && !isNativeRuntime) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Good Times service worker registration failed', error)
    })
  })
}
