import fs from 'node:fs'

const path = new URL('../src/features/intelligence/client.js', import.meta.url)
let source = fs.readFileSync(path, 'utf8')
source = source.replace(
  /\n  if \(normalizedCity === 'atlanta'\) \{[\s\S]*?\n  \}\n\n  const rows = await fetchJson\(/,
  '\n  const rows = await fetchJson(',
)
if (source.includes('gt_public_atlanta_feed')) {
  throw new Error('Legacy full-feed fallback remains in the production customer client')
}
fs.writeFileSync(path, source)
console.log('GOOD TIMES expensive fallback removed.')
