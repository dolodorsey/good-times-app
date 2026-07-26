import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import DirectRequest from './DirectRequest.jsx'

const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const directRoutes = {
  '/join': 'join',
  '/concierge-request': 'concierge-request',
  '/trip': 'trip',
  '/group': 'group',
}

const requestType = directRoutes[pathname]

ReactDOM.createRoot(document.getElementById('root')).render(
  requestType ? <DirectRequest requestType={requestType} /> : <App />
)
