import fs from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => fs.readFileSync(new URL(path, root), 'utf8')
const write = (path, content) => fs.writeFileSync(new URL(path, root), content)

function ensure(source, marker, insertAfter, addition, label) {
  if (source.includes(marker)) return source
  if (!source.includes(insertAfter)) throw new Error(`GOOD TIMES rich experience patch failed: ${label}`)
  return source.replace(insertAfter, `${insertAfter}${addition}`)
}

// Restore the richer customer product as the signed-in default. The stabilization
// bridge remains in the repository for rollback/reference, but must not replace
// or even ship as part of the active Command experience's customer navigation.
{
  const path = 'src/main.jsx'
  let source = read(path)

  source = ensure(
    source,
    "import './features/experience/good-times-rich.css'",
    "import './features/experience/good-times-shell.css'",
    "\nimport './features/experience/good-times-rich.css'",
    'rich stylesheet import',
  )
  source = ensure(
    source,
    "import './features/experience/good-times-rich-hud.css'",
    "import './features/experience/good-times-rich.css'",
    "\nimport './features/experience/good-times-rich-hud.css'",
    'Party Board HUD stylesheet import',
  )
  source = ensure(
    source,
    "const LazyCreativeLayer = lazy(() => import('./features/experience/GoodTimesCreativeLayer.jsx'))",
    "const LazyAccountCenter = lazy(() => import('./features/experience/GoodTimesAccountCenter.jsx'))",
    "\nconst LazyCreativeLayer = lazy(() => import('./features/experience/GoodTimesCreativeLayer.jsx'))\nconst LazyPartyPulse = lazy(() => import('./features/experience/GoodTimesPartyPulse.jsx'))",
    'rich experience lazy imports',
  )

  source = source.replace(
    "  else route=<LazyLiveApp/>",
    "  else route=<><LazyCreativeLayer/><LazyCommandApp/><LazyPartyPulse/></>",
  )
  source = source.replace(
    "{showMemberTools?<><LazyCompletionBridge/><LazyNavigationBridge/><LazyAccountCenter/></>:null}",
    "{showMemberTools?<><LazyCompletionBridge/><LazyAccountCenter/></>:null}",
  )
  source = source.replace(
    "const LazyNavigationBridge = lazy(() => import('./features/experience/GoodTimesNavigationBridge.jsx'))\n",
    '',
  )

  // Owner-reviewed current media. Never let the retired collage home image or
  // older animation sneak back into launch/loading because those surfaces sit
  // outside GoodTimesCreativeLayer.
  source = source.replace(
    "const GT_CURRENT_MEDIA_BASE='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics'\nconst GT_CURRENT_LOGO=`${GT_CURRENT_MEDIA_BASE}/GOOD_TIMES_logo.png`\nconst GT_CURRENT_HOME=`${GT_CURRENT_MEDIA_BASE}/GOODTIMES_HOMESCREEN.png`\nconst GT_CURRENT_ANIMATION=`${GT_CURRENT_MEDIA_BASE}/GOOD_TIMES_ANIMATION.mp4`",
    "const GT_CURRENT_MEDIA_BASE='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics'\nconst GT_CURRENT_LOGO=`${GT_CURRENT_MEDIA_BASE}/good_times/graphics/GOOD_TIMES_logo.png`\nconst GT_CURRENT_HOME=`${GT_CURRENT_MEDIA_BASE}/motion/goodtimes.jpg`\nconst GT_CURRENT_ANIMATION=`${GT_CURRENT_MEDIA_BASE}/kollective/animations/GOODTIMES.mp4`",
  )

  if (!source.includes("else route=<><LazyCreativeLayer/><LazyCommandApp/><LazyPartyPulse/></>")) throw new Error('Rich Command experience is not the signed-in default')
  if (!source.includes("good-times-rich-hud.css")) throw new Error('Party Board HUD layout guard is missing')
  if (source.includes('LazyNavigationBridge')) throw new Error('NavigationBridge is still present in the active customer bootstrap')
  if (!source.includes('/motion/goodtimes.jpg') || !source.includes('/kollective/animations/GOODTIMES.mp4')) throw new Error('Current launch media is not enforced')
  if (source.includes('GT_CURRENT_HOME=`${GT_CURRENT_MEDIA_BASE}/GOODTIMES_HOMESCREEN.png`')) throw new Error('Retired launch poster is still active')
  write(path, source)
}

// Onboarding is rendered before the signed-in creative layer, so it must use the
// same current media pack rather than the retired August collage assets.
{
  const path = 'src/features/onboarding/GoodTimesOnboarding.jsx'
  let source = read(path)
  source = source.replace(
    "const BG_BASE = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics'\nconst CURRENT_LOGO = `${BG_BASE}/GOOD_TIMES_logo.png`\nconst CURRENT_HOME = `${BG_BASE}/GOODTIMES_HOMESCREEN.png`\nconst CURRENT_ANIMATION = `${BG_BASE}/GOOD_TIMES_ANIMATION.mp4`",
    "const BG_BASE = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics'\nconst CURRENT_LOGO = `${BG_BASE}/good_times/graphics/GOOD_TIMES_logo.png`\nconst CURRENT_HOME = `${BG_BASE}/motion/goodtimes.jpg`\nconst CURRENT_ANIMATION = `${BG_BASE}/kollective/animations/GOODTIMES.mp4`",
  )
  if (!source.includes('/motion/goodtimes.jpg') || !source.includes('/kollective/animations/GOODTIMES.mp4')) throw new Error('Current onboarding media is not enforced')
  if (source.includes('/GOODTIMES_HOMESCREEN.png') || source.includes('/GOOD_TIMES_ANIMATION.mp4')) throw new Error('Retired onboarding media is still active')
  write(path, source)
}

// Make the product language explicit and let the live Party Board hand a
// source-backed party/club event directly into Build My Night for refinement.
{
  const path = 'src/features/experience/GoodTimesCommandApp.jsx'
  let source = read(path)
  source = source.replace("['concierge', '✦', 'Build Night']", "['concierge', '✦', 'Build My Night']")

  const listener = `\n  useEffect(() => {\n    const handleBuildSeed = event => {\n      const item = event?.detail || {}\n      if (!item.title) return\n      const when = item.event_date ? \` on \${formatDate(item.event_date, true)}\` : ''\n      const where = item.venue_name ? \` at \${item.venue_name}\` : ''\n      const time = item.event_time ? \` around \${formatTime(item.event_time)}\` : ''\n      setTab('concierge')\n      setConciergeQuery(\`Build a complete night around \${item.title}\${where}\${when}\${time}. Add the best source-backed first stop and late-night move, and keep this event as the main move.\`)\n      window.setTimeout(() => document.querySelector('.gt2-composer textarea')?.focus(), 100)\n    }\n    window.addEventListener('goodtimes:build-seed', handleBuildSeed)\n    return () => window.removeEventListener('goodtimes:build-seed', handleBuildSeed)\n  }, [])\n\n`
  if (!source.includes("window.addEventListener('goodtimes:build-seed'")) {
    const anchor = '  const planAroundEvent = event => {'
    if (!source.includes(anchor)) throw new Error('Could not install Party Board → Build My Night bridge')
    source = source.replace(anchor, `${listener}${anchor}`)
  }

  if (!source.includes("['concierge', '✦', 'Build My Night']")) throw new Error('Build My Night is missing from the customer toolbar')
  if (!source.includes("['explore', '◇', 'Explore']")) throw new Error('Explore is missing from the customer toolbar')
  if (!source.includes("goodtimes:build-seed")) throw new Error('Party Board cannot seed Build My Night')
  write(path, source)
}

console.log('GOOD TIMES rich interactive experience applied.')
