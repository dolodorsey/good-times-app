import { readFile, writeFile } from 'node:fs/promises'

const path = new URL('../src/App.jsx', import.meta.url)
let source = await readFile(path, 'utf8')

function replaceExact(search, replacement, expectedCount, label) {
  const count = source.split(search).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`)
  }
  source = source.split(search).join(replacement)
}

replaceExact(
  'import { initNative, isNative, isIOS, tapHaptic, shareEvent, openLink, registerPush } from "./native";\n',
  'import { initNative, isNative, isIOS, tapHaptic, shareEvent, openLink, registerPush } from "./native";\nimport { localTodayISO } from "./direct-request-validation.js";\n',
  1,
  'local date import',
)

replaceExact(
  'new Date().toISOString().split("T")[0]',
  'localTodayISO()',
  2,
  'local date calculation',
)

replaceExact(
  'const capped=Math.min(rating,4);',
  'const capped=Math.max(0,Math.min(Number(rating)||0,5));',
  1,
  'five-star rendering',
)

await writeFile(path, source)
