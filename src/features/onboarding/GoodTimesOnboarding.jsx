import React, { useMemo, useState } from 'react'
import {
  friendlyAuthError,
  requestPasswordReset,
  signIn,
  signUp,
  storeSession,
  updatePreferences,
} from '../auth/client.js'
import { AGE_OPTIONS, CITY_OPTIONS, VIBE_OPTIONS } from './options.js'

const BG_BASE = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/good-times-backgrounds'
const GOLD = '#D4A853'
const FONT = "'DM Sans', sans-serif"
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"

const shell = {
  minHeight: '100dvh',
  color: '#fff',
  background: '#06060C',
  fontFamily: FONT,
  position: 'relative',
  overflow: 'hidden',
}
const field = {
  width: '100%', padding: '14px 16px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.07)',
  color: '#fff', fontSize: 15, outline: 'none', fontFamily: FONT,
}
const primary = (enabled = true) => ({
  width: '100%', minHeight: 52, padding: '0 20px', border: 0, borderRadius: 14,
  background: enabled ? `linear-gradient(135deg,${GOLD},#B8942F)` : 'rgba(255,255,255,.08)',
  color: enabled ? '#09090d' : 'rgba(255,255,255,.3)', fontWeight: 800,
  fontSize: 16, cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: FONT,
})

function Background({ video = false }) {
  return <>
    {video ? <video autoPlay muted loop playsInline src={`${BG_BASE}/gt-homescreen-video.mp4`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      : <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG_BASE}/gt-bg-nightlife-district.webp)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(6,6,12,.25),rgba(6,6,12,.82) 55%,#06060C 100%)' }} />
  </>
}

function Progress({ step }) {
  return <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
    {[0, 1, 2].map(index => <div key={index} style={{ width: 54, height: 3, borderRadius: 99, background: index <= step ? GOLD : 'rgba(255,255,255,.15)' }} />)}
  </div>
}

export default function GoodTimesOnboarding({ onComplete }) {
  const [screen, setScreen] = useState('welcome')
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('atlanta')
  const [vibes, setVibes] = useState([])
  const [age, setAge] = useState('')
  const [session, setSession] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const authValid = emailValid && password.length >= 8 && (mode === 'signin' || name.trim().length >= 2)
  const selectedCity = useMemo(() => CITY_OPTIONS.find(option => option.id === city), [city])

  const authenticate = async () => {
    if (!authValid || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'signin') {
        const nextSession = await signIn(email.trim(), password)
        storeSession(nextSession)
        onComplete(nextSession, null)
        return
      }

      const signup = await signUp(email.trim(), password, name.trim(), city)
      let nextSession = signup?.session || null
      if (!nextSession) {
        try { nextSession = await signIn(email.trim(), password) } catch { /* confirmation may be required */ }
      }
      if (!nextSession?.access_token) {
        setNotice('Your account was created. Check your email to confirm it, then sign in.')
        setMode('signin')
        return
      }
      storeSession(nextSession)
      setSession(nextSession)
      setScreen('city')
    } catch (authError) {
      setError(friendlyAuthError(authError))
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    if (!session || !age || vibes.length === 0) return
    setBusy(true)
    const preferences = { home_city: city, vibe_preferences: vibes, tab_interests: vibes, age_range: age }
    await updatePreferences(session.user?.id, preferences, session.access_token).catch(() => false)
    setBusy(false)
    onComplete(session, { city, vibes, age })
  }

  if (screen === 'welcome') return <div style={{ ...shell, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'column', padding: '40px 24px 64px', textAlign: 'center' }}>
    <Background video />
    <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 360 }}>
      <img src="/good-times-logo.png" alt="Good Times" style={{ height: 58, objectFit: 'contain', marginBottom: 18 }} />
      <h1 style={{ fontFamily: SERIF, fontSize: 46, fontWeight: 300, letterSpacing: '.14em', textTransform: 'uppercase', margin: '0 0 10px' }}>Good Times</h1>
      <p style={{ color: 'rgba(255,255,255,.58)', lineHeight: 1.6, margin: '0 0 34px' }}>Your city. Your vibe. Your night.<br />Curated for you.</p>
      <button style={primary()} onClick={() => { setMode('signup'); setScreen('auth') }}>Get Started</button>
      <button onClick={() => { setMode('signin'); setScreen('auth') }} style={{ ...primary(), marginTop: 12, color: GOLD, background: 'rgba(255,255,255,.06)', border: `1px solid ${GOLD}55` }}>I Already Have an Account</button>
    </div>
  </div>

  if (screen === 'auth' || screen === 'forgot') return <div style={{ ...shell, display: 'flex', flexDirection: 'column' }}>
    <Background />
    <div style={{ position: 'relative', zIndex: 2, padding: '18px 20px' }}>
      <button onClick={() => setScreen(screen === 'forgot' ? 'auth' : 'welcome')} style={{ color: 'rgba(255,255,255,.58)', background: 'none', border: 0, cursor: 'pointer' }}>← Back</button>
    </div>
    <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 370 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ color: GOLD, fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 800 }}>Worldwide Concierge</div>
          <h2 style={{ fontFamily: SERIF, fontSize: 34, margin: '10px 0 4px' }}>{screen === 'forgot' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
        </div>
        {screen === 'forgot' ? <>
          <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="Email address" style={field} />
          <button disabled={!emailValid || busy} onClick={async () => {
            setBusy(true); setError(''); setNotice('')
            try { await requestPasswordReset(email.trim()); setNotice('Check your email for the secure reset link.') }
            catch (resetError) { setError(friendlyAuthError(resetError)) }
            finally { setBusy(false) }
          }} style={{ ...primary(emailValid && !busy), marginTop: 16 }}>{busy ? 'Sending…' : 'Send Reset Link'}</button>
        </> : <>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.08)', padding: 4, borderRadius: 12, marginBottom: 18 }}>
            {['signup', 'signin'].map(value => <button key={value} onClick={() => { setMode(value); setError(''); setNotice('') }} style={{ flex: 1, padding: 10, border: 0, borderRadius: 9, background: mode === value ? GOLD : 'transparent', color: mode === value ? '#08080d' : 'rgba(255,255,255,.55)', fontWeight: 800, cursor: 'pointer' }}>{value === 'signup' ? 'Sign Up' : 'Sign In'}</button>)}
          </div>
          {mode === 'signup' && <input value={name} onChange={event => setName(event.target.value)} placeholder="Full name" style={{ ...field, marginBottom: 12 }} />}
          <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="Email address" style={{ ...field, marginBottom: 12 }} />
          <input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Password — 8+ characters" style={field} />
          <button disabled={!authValid || busy} onClick={authenticate} style={{ ...primary(authValid && !busy), marginTop: 16 }}>{busy ? 'Opening…' : mode === 'signup' ? 'Create Account' : 'Sign In'}</button>
          {mode === 'signin' && <button onClick={() => { setScreen('forgot'); setError(''); setNotice('') }} style={{ width: '100%', marginTop: 14, background: 'none', border: 0, color: 'rgba(255,255,255,.55)', cursor: 'pointer' }}>Forgot password?</button>}
        </>}
        {error && <div role="alert" style={{ marginTop: 14, padding: 12, borderRadius: 10, color: '#ff8585', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)' }}>{error}</div>}
        {notice && <div style={{ marginTop: 14, padding: 12, borderRadius: 10, color: '#f2d48d', background: 'rgba(212,168,83,.1)', border: '1px solid rgba(212,168,83,.25)', lineHeight: 1.5 }}>{notice}</div>}
      </div>
    </div>
  </div>

  const step = screen === 'city' ? 0 : screen === 'vibes' ? 1 : 2
  return <div style={{ ...shell, padding: '52px 24px 32px', display: 'flex', flexDirection: 'column' }}>
    <Progress step={step} />
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ color: GOLD, fontSize: 11, letterSpacing: '.2em', fontWeight: 800 }}>STEP {step + 1} OF 3</div>
      <h2 style={{ fontFamily: SERIF, fontSize: 34, margin: '10px 0 4px' }}>{screen === 'city' ? 'Choose your city' : screen === 'vibes' ? 'Choose your vibes' : 'Choose your age range'}</h2>
      {screen === 'city' && <p style={{ color: 'rgba(255,255,255,.5)' }}>Currently selected: {selectedCity?.name}</p>}
    </div>
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: screen === 'age' ? '1fr' : '1fr 1fr', gap: 10, alignContent: 'start', maxWidth: 430, width: '100%', margin: '0 auto' }}>
      {screen === 'city' && CITY_OPTIONS.map(option => <button key={option.id} onClick={() => setCity(option.id)} style={{ padding: 18, borderRadius: 15, border: city === option.id ? `2px solid ${GOLD}` : '1px solid rgba(255,255,255,.12)', background: city === option.id ? 'rgba(212,168,83,.14)' : 'rgba(255,255,255,.05)', color: city === option.id ? GOLD : '#fff', cursor: 'pointer' }}><div style={{ fontSize: 26 }}>{option.emoji}</div><strong>{option.name}</strong></button>)}
      {screen === 'vibes' && VIBE_OPTIONS.map(option => { const selected = vibes.includes(option.id); return <button key={option.id} onClick={() => setVibes(current => selected ? current.filter(value => value !== option.id) : [...current, option.id])} style={{ padding: 16, borderRadius: 15, border: selected ? `2px solid ${option.color}` : '1px solid rgba(255,255,255,.12)', background: selected ? `${option.color}20` : 'rgba(255,255,255,.05)', color: selected ? option.color : '#fff', cursor: 'pointer' }}><div style={{ fontSize: 24 }}>{option.icon}</div><strong>{option.label}</strong></button> })}
      {screen === 'age' && AGE_OPTIONS.map(option => <button key={option} onClick={() => setAge(option)} style={{ padding: '18px 22px', textAlign: 'left', borderRadius: 15, border: age === option ? `2px solid ${GOLD}` : '1px solid rgba(255,255,255,.12)', background: age === option ? 'rgba(212,168,83,.14)' : 'rgba(255,255,255,.05)', color: age === option ? GOLD : '#fff', fontSize: 18, fontWeight: 800, cursor: 'pointer' }}>{option}</button>)}
    </div>
    {screen === 'city' && <button onClick={() => setScreen('vibes')} style={{ ...primary(), marginTop: 18 }}>Continue</button>}
    {screen === 'vibes' && <button disabled={vibes.length === 0} onClick={() => setScreen('age')} style={{ ...primary(vibes.length > 0), marginTop: 18 }}>Continue — {vibes.length} selected</button>}
    {screen === 'age' && <button disabled={!age || busy} onClick={finish} style={{ ...primary(Boolean(age) && !busy), marginTop: 18 }}>{busy ? 'Saving…' : 'Open Good Times'}</button>}
  </div>
}
