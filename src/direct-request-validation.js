const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function localTodayISO(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function validGroupSize(value, required) {
  if (value === '' || value === null || value === undefined) return !required
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 && number <= 1000
}

export function validateDirectRequest(form, requestType, todayISO = localTodayISO()) {
  const errors = {}
  const fullName = String(form.full_name || '').trim()
  const email = String(form.email || '').trim()
  const phoneDigits = String(form.phone || '').replace(/\D/g, '')
  const city = String(form.city || '').trim()
  const preferredDate = String(form.preferred_date || '')
  const endDate = String(form.end_date || '')
  const interests = String(form.interests || '').trim()
  const notes = String(form.notes || '').trim()
  const occasion = String(form.occasion || '').trim()

  if (fullName.length < 2 || fullName.length > 120) errors.full_name = 'Enter a valid full name.'
  if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.'
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 15)) errors.phone = 'Enter a valid mobile number.'
  if (city.length < 2 || city.length > 120) errors.city = 'Enter a valid city.'

  if (requestType !== 'join') {
    if (!preferredDate) errors.preferred_date = 'Choose a preferred date.'
    else if (preferredDate < todayISO) errors.preferred_date = 'Choose today or a future date.'
  }

  if (requestType === 'join' && interests.length < 2) errors.interests = 'Tell us what you are interested in.'
  if (requestType === 'concierge-request' && notes.length < 10) errors.notes = 'Add at least 10 characters about what you need planned.'
  if (requestType === 'trip') {
    if (!endDate) errors.end_date = 'Choose a trip end date.'
    else if (preferredDate && endDate < preferredDate) errors.end_date = 'Trip end must be on or after trip start.'
    if (!validGroupSize(form.group_size, true)) errors.group_size = 'Group size must be between 1 and 1,000.'
  }
  if (requestType === 'group') {
    if (!validGroupSize(form.group_size, true)) errors.group_size = 'Group size must be between 1 and 1,000.'
    if (occasion.length < 2) errors.occasion = 'Enter the occasion.'
  }
  if (requestType === 'concierge-request' && !validGroupSize(form.group_size, false)) {
    errors.group_size = 'Group size must be between 1 and 1,000.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
