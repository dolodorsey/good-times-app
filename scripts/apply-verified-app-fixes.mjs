import { readFile, writeFile } from 'node:fs/promises'

const path = new URL('../src/App.jsx', import.meta.url)
let source = await readFile(path, 'utf8')

function countOf(value) {
  return source.split(value).length - 1
}

function replacePending(search, replacement, pendingCount, label) {
  const pending = countOf(search)
  const applied = countOf(replacement)
  if (pending === pendingCount) {
    source = source.split(search).join(replacement)
    return
  }
  if (pending === 0 && applied >= pendingCount) return
  throw new Error(`${label}: expected ${pendingCount} pending or applied matches; found pending=${pending}, applied=${applied}`)
}

replacePending(
  'import { initNative, isNative, isIOS, tapHaptic, shareEvent, openLink, registerPush } from "./native";\n',
  'import { initNative, isNative, isIOS, tapHaptic, shareEvent, openLink, registerPush } from "./native";\nimport { localTodayISO } from "./direct-request-validation.js";\n',
  1,
  'local date import',
)

replacePending(
  'new Date().toISOString().split("T")[0]',
  'localTodayISO()',
  3,
  'local date calculation',
)

replacePending(
  'const capped=Math.min(rating,4);',
  'const capped=Math.max(0,Math.min(Number(rating)||0,5));',
  1,
  'five-star rendering',
)

replacePending(
  `    // Global image error handler — hides broken images\n    const imgErr=(e)=>{if(e.target.tagName==='IMG')e.target.setAttribute('data-error','true')};\n    document.addEventListener('error',imgErr,true);\n    return()=>document.removeEventListener('error',imgErr,true);\n    // Global image error handler — hides broken images instead of showing broken icon\n    const handleImgError=(e)=>{if(e.target.tagName==='IMG'){e.target.setAttribute('data-error','true');e.target.style.opacity='0';e.target.style.height='0';}};\n    document.addEventListener('error',handleImgError,true);\n    return()=>document.removeEventListener('error',handleImgError,true);`,
  `    // Global image error handler — remove broken media without leaving dead icons.\n    const imgErr=(e)=>{if(e.target.tagName==='IMG'){e.target.setAttribute('data-error','true');e.target.style.display='none';}};\n    document.addEventListener('error',imgErr,true);\n    return()=>document.removeEventListener('error',imgErr,true);`,
  1,
  'image error handler',
)

await writeFile(path, source)
