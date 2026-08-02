import { useState } from 'react'
import { GT_SESSION_KEY, updateRecoveryPassword } from './gt-auth-session.js'

export default function PasswordRecovery({ recoverySession }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const user = await updateRecoveryPassword({
        accessToken: recoverySession.access_token,
        password,
      })
      localStorage.setItem(GT_SESSION_KEY, JSON.stringify({
        ...recoverySession,
        user,
      }))
      history.replaceState(null, '', location.pathname)
      setComplete(true)
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to update password.')
    } finally {
      setLoading(false)
    }
  }

  if (complete) {
    return (
      <main style={styles.shell}>
        <section style={styles.card}>
          <div style={styles.eyebrow}>GOOD TIMES</div>
          <h1 style={styles.heading}>Password updated</h1>
          <p style={styles.copy}>Your password has been changed successfully. Continue into Good Times with your new credentials.</p>
          <button type="button" style={styles.button} onClick={() => location.replace('/')}>Continue</button>
        </section>
      </main>
    )
  }

  return (
    <main style={styles.shell}>
      <form style={styles.card} onSubmit={submit}>
        <div style={styles.eyebrow}>GOOD TIMES</div>
        <h1 style={styles.heading}>Create a new password</h1>
        <p style={styles.copy}>Use at least eight characters. This link can only be used once.</p>
        <label style={styles.label}>
          New password
          <input
            style={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>
        <label style={styles.label}>
          Confirm password
          <input
            style={styles.input}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>
        {error ? <div role="alert" style={styles.error}>{error}</div> : null}
        <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.65 : 1 }}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </main>
  )
}

const styles = {
  shell: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: 'radial-gradient(circle at top, #201a0d 0%, #06060c 58%)',
    color: '#fff',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 420,
    boxSizing: 'border-box',
    padding: 28,
    borderRadius: 22,
    border: '1px solid rgba(212, 168, 83, 0.28)',
    background: 'rgba(18, 18, 18, 0.92)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
  },
  eyebrow: { color: '#D4A853', letterSpacing: '0.24em', fontSize: 12, fontWeight: 800, marginBottom: 18 },
  heading: { margin: '0 0 10px', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30 },
  copy: { margin: '0 0 24px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, fontSize: 14 },
  label: { display: 'grid', gap: 8, marginBottom: 16, color: 'rgba(255,255,255,0.74)', fontSize: 13, fontWeight: 700 },
  input: { width: '100%', boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#fff', padding: '14px 16px', fontSize: 16 },
  button: { width: '100%', border: 0, borderRadius: 14, padding: '15px 18px', background: 'linear-gradient(135deg, #D4A853, #B8942F)', color: '#0A0A0F', fontWeight: 800, fontSize: 15, cursor: 'pointer' },
  error: { marginBottom: 16, borderRadius: 12, padding: 12, background: 'rgba(239,68,68,0.13)', border: '1px solid rgba(239,68,68,0.34)', color: '#ff8f8f', fontSize: 13 },
}
