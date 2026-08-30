import test from 'node:test'
import assert from 'node:assert/strict'
import { detectShakePlatform, shakeImpulse, shakeThreshold, shouldTriggerShake } from '../src/features/experience/shake-motion.js'

test('detects mobile platforms', () => {
  assert.equal(detectShakePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), 'ios')
  assert.equal(detectShakePlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9)'), 'android')
  assert.equal(detectShakePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)'), 'web')
})

test('normalizes acceleration including gravity into shake impulse', () => {
  const resting = shakeImpulse({ accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 } })
  const shake = shakeImpulse({ accelerationIncludingGravity: { x: 15, y: 10, z: 12 } })
  assert.ok(resting < 0.01)
  assert.ok(shake > shakeThreshold('ios'))
})

test('honors threshold and cooldown', () => {
  assert.equal(shouldTriggerShake({ impulse: 13, threshold: 12, now: 5000, lastShakeAt: 1000 }), true)
  assert.equal(shouldTriggerShake({ impulse: 13, threshold: 12, now: 2000, lastShakeAt: 1000 }), false)
  assert.equal(shouldTriggerShake({ impulse: 8, threshold: 12, now: 5000, lastShakeAt: 1000 }), false)
})
