import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const main = read('src/main.jsx')
const live = read('src/features/experience/GoodTimesLiveApp.jsx')
const auth = read('src/features/auth/client.js')
const account = read('src/features/experience/GoodTimesAccountCenter.jsx')
const intelligence = read('src/features/intelligence/client.js')
const personalization = read('scripts/apply-growth-personalization.mjs')
const liveUx = read('scripts/apply-live-ux-polish.mjs')
const recommendationMigration = read('supabase/auth-migrations/20260808_capture_ai_itinerary_recommendation_sessions.sql')
const privacy = read('public/privacy.html')
const support = read('public/support.html')
const indexHtml = read('index.html')
const profileCss = read('src/features/experience/good-times-profile.css')

const mustContain = (text, markers) => markers.forEach(marker => assert.ok(text.includes(marker), `missing contract marker: ${marker}`))

test('authenticated bootstrap routes members into GOOD TIMES Live', () => {
  mustContain(main, ['LazyOnboarding', 'LazyLiveApp', 'readSession()', 'showMemberTools'])
})

test('signed-in navigation keeps the six primary customer surfaces', () => {
  mustContain(live, [
    "['home','⌂','Now']",
    "['dates','▦','Dates']",
    "['build','✦','Build']",
    "['plans','≋','Plans']",
    "['explore','◇','Explore']",
    "['vault','▣','Vault']",
  ])
})

test('city switching persists to the authenticated profile and reloads live inventory', () => {
  mustContain(live, [
    'const switchCity=async nextCity=>',
    'updatePreferences(session.user.id,{last_city:nextCity}',
    'await loadCity(nextCity)',
  ])
})

test('Vault save and unsave operations use the authenticated customer database', () => {
  mustContain(intelligence, [
    'export async function loadSavedItems',
    'export async function saveItem',
    'export async function unsaveItem',
    'gt_saved_items?on_conflict=user_id,item_type,item_id',
    "signalType: 'save'",
  ])
})

test('event and venue learning signals are persisted for the authenticated user', () => {
  mustContain(intelligence, [
    'export async function recordProductEvent',
    'export async function recordTasteSignal',
    'gt_product_events',
    'gt_taste_signals',
    'client_event_id: clientEventId',
    'auth_id: session.user.id',
  ])
})

test('ticket and reservation conversions feed the learning loop', () => {
  mustContain(personalization, [
    "trackConversion('ticket_click'",
    "trackConversion('reservation_click'",
    "eventName==='ticket_click'?'ticket_clicked'",
    "eventName==='reservation_click'?'reservation_clicked'",
  ])
})

test('plans can be routed and shared and the Vault exposes tickets', () => {
  mustContain(liveUx, [
    'function planDirectionsUrl(plan)',
    'const sharePlan=async plan=>',
    "vaultType==='tickets'",
    'goodtimes:open-tickets',
  ])
})

test('persisted AI itineraries create auditable recommendation sessions', () => {
  mustContain(recommendationMigration, [
    'gt_capture_ai_itinerary_recommendation_session',
    "'itinerary'",
    "formula_key='itinerary'",
    'gt_recommendation_sessions',
    'after insert on public.itineraries',
  ])
})

test('members have a visible account center with permanent deletion', () => {
  mustContain(main, ['LazyAccountCenter', '<LazyAccountCenter/>'])
  mustContain(account, [
    'GOOD TIMES ACCOUNT',
    'Delete account permanently',
    'deleteAccount(session)',
    '/privacy.html',
    '/support.html',
  ])
})

test('account deletion calls the authenticated server-side deletion function and clears local state', () => {
  mustContain(auth, [
    'export async function deleteAccount',
    '/functions/v1/delete-account',
    'Authorization: `Bearer ${bearer}`',
    "'gt_personalization'",
    "'gt_live_plans'",
  ])
})

test('store review privacy and support endpoints document deletion and privacy choices', () => {
  mustContain(privacy, ['Privacy Policy', 'delete your GOOD TIMES account', '/support.html', 'hello@thegoodtimesworldwide.com'])
  mustContain(support, ['Support & Privacy Choices', 'Delete your GOOD TIMES account', 'Delete account permanently', '/privacy.html'])
})

test('desktop web root is not trapped in a phone-width shell', () => {
  mustContain(indexHtml, ['#root{width:100%;max-width:none;', '@media(min-width:900px){body{padding:0}'])
  assert.equal(indexHtml.includes('max-width:430px;min-height:100dvh'), false, 'desktop root must not be capped at 430px')
})

test('member bridge controls cannot become viewport-sized overlays', () => {
  mustContain(profileCss, [
    '.gt-premium-experience>.gt-five-nav{',
    'min-height:0!important;',
    '.gt-premium-experience>button[aria-label="Open GOOD TIMES account"]{',
    'width:auto!important;',
    '@media (min-width:900px){',
    '.gt-premium-experience>.gtlive-app{',
    'max-width:none!important;',
  ])
})
