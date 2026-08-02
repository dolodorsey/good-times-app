import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import DirectRequest from './DirectRequest.jsx'
import PasswordRecovery from './PasswordRecovery.jsx'
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

async function bootstrap() {
  const recoverySession = parseRecoverySession(window.location.hash)
  if (recoverySession) {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <PasswordRecovery recoverySession={recoverySession} />,
    )
    return
  }

  await refreshStoredSession()
  const requestType = directRoutes[pathname]
  ReactDOM.createRoot(document.getElementById('root')).render(
    requestType ? <DirectRequest requestType={requestType} /> : <App />,
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
