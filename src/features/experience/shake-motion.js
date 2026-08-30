export function detectShakePlatform(userAgent = '') {
  const ua = String(userAgent || '').toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'web'
}

export function shakeImpulse(event) {
  if (!event) return 0
  const source = event.accelerationIncludingGravity || event.acceleration
  if (!source) return 0
  const magnitude = Math.sqrt(
    Number(source.x || 0) ** 2 +
    Number(source.y || 0) ** 2 +
    Number(source.z || 0) ** 2,
  )
  return event.accelerationIncludingGravity
    ? Math.abs(magnitude - 9.81)
    : magnitude
}

export function shakeThreshold(platform = 'web') {
  if (platform === 'ios') return 11.5
  if (platform === 'android') return 12
  return 12
}

export function shouldTriggerShake({ impulse, threshold, now, lastShakeAt, cooldownMs = 1400 }) {
  return Number(impulse) >= Number(threshold) && Number(now) - Number(lastShakeAt || 0) >= cooldownMs
}
