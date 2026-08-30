import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const main = read('src/main.jsx')
const app = read('src/features/experience/GoodTimesCommandAppV2.jsx')
const auth = read('src/features/auth/client.js')
const intelligence = read('src/features/intelligence/client.js')
const radar = read('src/features/experience/good-times-radar.js')
const hardening = read('src/features/experience/good-times-v2-hardening.css')
const privacy = read('public/privacy.html')
const support = read('public/support.html')
const recommendationMigration = read('supabase/auth-migrations/20260808_capture_ai_itinerary_recommendation_sessions.sql')

const mustContain = (text, markers) => markers.forEach(marker => assert.ok(text.includes(marker), `missing contract marker: ${marker}`))

test('authenticated bootstrap routes members into the integrated GOOD TIMES V2 app', () => {
  mustContain(main, ['GoodTimesCommandAppV2.jsx','LazyOnboarding','readSession()','launchMemberV2'])
  assert.doesNotMatch(main,/LazyLiveApp/)
  assert.doesNotMatch(main,/LazyAccountCenter/)
})

test('signed-in navigation uses the five primary customer surfaces', () => {
  mustContain(app, ["['home','⌂','Now']","['discover','◇','Discover']","['concierge','✦','Concierge']","['plans','≋','Plans']","['saved','♡','Saved']"])
})

test('city switching persists and reloads canonical inventory', () => {
  mustContain(app, ['const changeCity=async c=>','updatePreferences(session.user.id,{last_city:c}','await refresh(c)'])
})

test('Saved operations use the authenticated customer database', () => {
  mustContain(intelligence, ['export async function loadSavedItems','export async function saveItem','export async function unsaveItem','gt_saved_items?on_conflict=user_id,item_type,item_id',"signalType: 'save'"])
})

test('event and venue learning signals remain persisted', () => {
  mustContain(intelligence, ['export async function recordProductEvent','export async function recordTasteSignal','gt_product_events','gt_taste_signals','client_event_id: clientEventId','auth_id: session.user.id'])
  mustContain(app,['recordProductEvent','recordTasteSignal'])
})

test('Radar follows, alert preferences and alert queue are integrated', () => {
  mustContain(radar,['loadRadarState','followEntity','unfollowEntity','saveRadarPreferences','enqueueRadarAlert'])
  mustContain(app,['Follow + alerts','Never Miss','Just announced','Presales','Selling fast','RADAR WATCHLIST'])
})

test('persisted AI itineraries create auditable recommendation sessions', () => {
  mustContain(recommendationMigration, ['gt_capture_ai_itinerary_recommendation_session',"'itinerary'","formula_key='itinerary'",'gt_recommendation_sessions','after insert on public.itineraries'])
})

test('account deletion API and customer privacy/support endpoints remain available', () => {
  mustContain(auth, ['export async function deleteAccount','/functions/v1/delete-account','Authorization: `Bearer ${bearer}`',"'gt_personalization'","'gt_live_plans'"])
  mustContain(privacy, ['Privacy Policy', 'delete your GOOD TIMES account', '/support.html', 'hello@thegoodtimesworldwide.com'])
  mustContain(support, ['Support & Privacy Choices', 'Delete your GOOD TIMES account', 'Delete account permanently', '/privacy.html'])
})

test('desktop browser is intentionally presented as app mode instead of a stretched website', () => {
  mustContain(hardening,['body.gt-app-mode #root','max-width:460px!important','height:min(920px,calc(100dvh - 28px))!important','.gt3-desktop-nav{display:none!important}'])
})

test('legacy bridge controls are not mounted around the V2 product', () => {
  for(const marker of ['GoodTimesShellControl','BuildMyNightRouteHost','LazyUtilityMenu','LazyPaymentsLauncher','LazyConnectHub','LazyAccountCenter','LazyPartyPulse','LazyCreativeLayer']) assert.equal(main.includes(marker),false,`legacy overlay mounted: ${marker}`)
})

test('current launch media is mounted and the V2 hardening layer loads last', () => {
  mustContain(main, ['GT_CURRENT_LOGO','GT_CURRENT_HOME','GT_CURRENT_ANIMATION','good-times-v2-hardening.css'])
  assert.ok(main.indexOf('good-times-v2-hardening.css')>main.indexOf('good-times-v2.css'))
})
