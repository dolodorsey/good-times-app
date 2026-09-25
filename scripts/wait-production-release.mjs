import { pathToFileURL } from 'node:url'

export function releaseMatches(payload, expectedSha) {
  return Boolean(/^[a-f0-9]{40}$/i.test(expectedSha || '') && payload?.ok === true &&
    payload.service === 'good-times' && payload.environment === 'production' &&
    payload.commit_sha === expectedSha)
}

export async function waitForProductionRelease({
  base = process.env.BASE_URL || 'https://thegoodtimesworldwide.com',
  expectedSha = process.env.GT_EXPECTED_SHA || process.env.GITHUB_SHA,
  attempts = 36, delayMs = 5000, fetchImpl = globalThis.fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const origin = new URL(base)
  if (origin.protocol !== 'https:' || !['thegoodtimesworldwide.com', 'www.thegoodtimesworldwide.com'].includes(origin.hostname)) throw new Error('Unapproved production origin')
  if (!/^[a-f0-9]{40}$/i.test(expectedSha || '')) throw new Error('Expected production SHA is required')
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(new URL('/api/release', origin), {
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      })
      const payload = await response.json()
      if (response.ok && releaseMatches(payload, expectedSha)) {
        console.log(`Verified production deployment SHA ${expectedSha}`)
        return payload
      }
    } catch { /* A deployment still replacing the old version is not a passing check. */ }
    if (attempt < attempts) await sleep(delayMs)
  }
  throw new Error('Expected production deployment did not become available; customer smoke was not run against another release')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await waitForProductionRelease()
}
