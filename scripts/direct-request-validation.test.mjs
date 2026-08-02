import test from 'node:test'
import assert from 'node:assert/strict'
import { localTodayISO, validateDirectRequest } from '../src/direct-request-validation.js'

const base = {
  full_name: 'Dolo Dorsey',
  email: 'dolo@example.com',
  phone: '404-555-0123',
  city: 'Atlanta',
  preferred_date: '2026-08-03',
  end_date: '',
  group_size: '',
  occasion: '',
  interests: '',
  budget: '',
  notes: '',
  sms_consent: false,
}

test('formats local dates without UTC rollover', () => {
  assert.equal(localTodayISO(new Date(2026, 7, 2, 23, 30)), '2026-08-02')
})

test('accepts a valid membership request without SMS consent', () => {
  const result = validateDirectRequest({ ...base, interests: 'Dining and culture' }, 'join', '2026-08-02')
  assert.equal(result.valid, true)
})

test('rejects past concierge dates', () => {
  const result = validateDirectRequest({ ...base, preferred_date: '2026-08-01', notes: 'Plan a birthday dinner.' }, 'concierge-request', '2026-08-02')
  assert.equal(result.valid, false)
  assert.match(result.errors.preferred_date, /future date/i)
})

test('rejects reversed trip ranges', () => {
  const result = validateDirectRequest({ ...base, preferred_date: '2026-08-05', end_date: '2026-08-04', group_size: '4' }, 'trip', '2026-08-02')
  assert.equal(result.valid, false)
  assert.match(result.errors.end_date, /on or after/i)
})

test('rejects non-integer and oversized group sizes', () => {
  assert.equal(validateDirectRequest({ ...base, group_size: '2.5', occasion: 'Birthday' }, 'group', '2026-08-02').valid, false)
  assert.equal(validateDirectRequest({ ...base, group_size: '1001', occasion: 'Birthday' }, 'group', '2026-08-02').valid, false)
})

test('accepts a valid group request', () => {
  const result = validateDirectRequest({ ...base, group_size: '12', occasion: 'Birthday' }, 'group', '2026-08-02')
  assert.equal(result.valid, true)
})
