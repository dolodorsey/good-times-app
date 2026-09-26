import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const main = read('src/main.jsx')
const app = read('src/features/experience/GoodTimesCommandAppV4.jsx')
const auth = read('src/features/auth/client.js')
const intelligence = read('src/features/intelligence/client.js')
const radar = read('src/features/experience/good-times-radar.js')
const hardening = read('src/features/experience/good-times-v2-hardening.css')
const v3css = read('src/features/experience/good-times-v3.css')
const v4css = read('src/features/experience/good-times-v4.css')
const taxonomyBrowser = read('src/features/experience/ExploreTaxonomyBrowser.jsx')
const privacy = read('public/privacy.html')
const support = read('public/support.html')
const recommendationMigration = read('supabase/auth-migrations/20260808_capture_ai_itinerary_recommendation_sessions.sql')

const mustContain = (text, markers) => markers.forEach(marker => assert.ok(text.includes(marker), `missing contract marker: ${marker}`))

test('authenticated bootstrap routes members into the integrated GOOD TIMES V4 app', () => {
  mustContain(main, ['GoodTimesCommandAppV4.jsx','LazyOnboarding','readSession()','launchMemberV4'])
  assert.doesNotMatch(main,/LazyLiveApp/)
  assert.doesNotMatch(main,/LazyAccountCenter/)
})

test('signed-in navigation uses five protected customer jobs', () => {
  mustContain(app, ["['home','⌂','Home']","['discover','⌕','Discover']","['plan','＋','Plan']","['saved','▣','Saved']","['profile','◎','Profile']"])
  const navLine=app.split('\n').find(line=>line.startsWith('const NAV='))||''
  assert.doesNotMatch(navLine,/radar/i)
  assert.doesNotMatch(navLine,/vault/i)
  assert.doesNotMatch(navLine,/concierge/i)
  mustContain(app,["savedView==='plans'","savedView==='saved'"])
})

test('Discover preserves real category and subcategory traversal behind editorial lanes', () => {
  mustContain(app,['Eat Well','Turn Up','Be There','Stay Right','Do More','ExploreTaxonomyBrowser','selectedCategory','selectedSubcategory','onCategory={setSelectedCategory}','onSubcategory={setSelectedSubcategory}'])
  mustContain(taxonomyBrowser,['SUBCATEGORIES','loadExploreDirectory','onSubcategory?.(subcategory.subcategory_key)','All categories'])
})

test('launch scope pins saved profiles and customer inventory to Atlanta', () => {
  mustContain(app, ["const c='atlanta';setCity(c)","updatePreferences(session.user.id,{last_city:'atlanta',home_city:'atlanta'", "const changeCity=async()=>{const c='atlanta'",'await refresh(c)'])
  mustContain(intelligence, ["function normalizeCity(_city)","return 'atlanta'"])
})

test('Saved operations use the authenticated customer database', () => {
  mustContain(intelligence, ['export async function loadSavedItems','export async function saveItem','export async function unsaveItem','gt_saved_items?on_conflict=user_id,item_type,item_id',"signalType: 'save'"])
})

test('event and venue learning signals remain persisted', () => {
  mustContain(intelligence, ['export async function recordProductEvent','export async function recordTasteSignal','gt_product_events','gt_taste_signals','client_event_id: clientEventId','auth_id: session.user.id'])
  mustContain(app,['recordProductEvent','recordTasteSignal'])
})

test('Radar follows, alert preferences and alert queue remain integrated without replacing Plan', () => {
  mustContain(radar,['loadRadarState','followEntity','unfollowEntity','saveRadarPreferences','enqueueRadarAlert'])
  mustContain(app,['Follow + alerts','Never Miss','Just announced','Presales','Selling fast','WE MONITOR WHAT MATTERS.'])
  const navLine=app.split('\n').find(line=>line.startsWith('const NAV='))||''
  assert.doesNotMatch(navLine,/radar/i)
})

test('persisted AI itineraries create auditable recommendation sessions', () => {
  mustContain(recommendationMigration, ['gt_capture_ai_itinerary_recommendation_session',"'itinerary'","formula_key='itinerary'",'gt_recommendation_sessions','after insert on public.itineraries'])
})

test('account deletion API and customer privacy/support endpoints remain available', () => {
  mustContain(auth, ['export async function deleteAccount','/functions/v1/delete-account','Authorization: `Bearer ${bearer}`',"'gt_personalization'","'gt_live_plans'"])
  mustContain(privacy, ['Privacy Policy', 'delete your GOOD TIMES account', '/support.html', 'hello@thegoodtimesworldwide.com'])
  mustContain(support, ['Support & Privacy Choices', 'Delete your GOOD TIMES account', 'Delete account permanently', '/privacy.html'])
})

test('desktop browser remains app mode and V4 stays inside that shell', () => {
  mustContain(hardening,['body.gt-app-mode #root','max-width:460px!important','height:min(920px,calc(100dvh - 28px))!important'])
  mustContain(v4css,['.gt5-app{width:100%;height:100%','.gt5-main{position:relative;flex:1 1 auto','.gt5-nav{position:absolute'])
})

test('legacy bridge controls remain unmounted and inherited V3 suppression still protects the V4 shell', () => {
  for(const marker of ['GoodTimesShellControl','BuildMyNightRouteHost','LazyUtilityMenu','LazyPaymentsLauncher','LazyConnectHub','LazyAccountCenter','LazyPartyPulse','LazyCreativeLayer']) assert.equal(main.includes(marker),false,`legacy overlay mounted: ${marker}`)
  mustContain(main,['good-times-v3.css','good-times-v4.css'])
  mustContain(v3css,['pointer-events:none!important'])
})

test('current launch media remains mounted and V4 CSS loads after V3', () => {
  mustContain(main, ['GT_CURRENT_LOGO','GT_CURRENT_HOME','GT_CURRENT_ANIMATION','good-times-v2-hardening.css','good-times-v3.css','good-times-v4.css'])
  assert.ok(main.indexOf('good-times-v4.css')>main.indexOf('good-times-v3.css'))
})
