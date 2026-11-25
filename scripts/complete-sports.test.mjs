import test from 'node:test'
import assert from 'node:assert/strict'
import {sportsScope,mapGames,sportsLive} from '../api/sports-live.js'
import {publicApiHeaders} from '../src/lib/public-api-headers.js'
const now=Date.parse('2026-09-27T20:00:00Z'),scope=sportsScope('/api/sports-live',now)
function payload({home='Atlanta Falcons',away='New Orleans Saints',state='in',name='STATUS_IN_PROGRESS',h='0',a='7',date='2026-09-27T20:00:00Z'}={}){return {events:[{id:'fixture-1',date,status:{type:{state,name,shortDetail:'Q1'}},competitions:[{venue:{fullName:'Fixture stadium'},competitors:[{homeAway:'home',team:{displayName:home,abbreviation:'ATL'},score:h},{homeAway:'away',team:{displayName:away,abbreviation:'NO'},score:a}]}]}]}}
test('sports supports five configured Atlanta team leagues',()=>assert.deepEqual(scope.leagues,['NFL','NBA','MLB','WNBA','MLS']))
test('sports rejects unknown leagues, malformed and excessive dates',()=>{assert.throws(()=>sportsScope('/?league=evil',now));assert.throws(()=>sportsScope('/?date=2026-02-31',now));assert.throws(()=>sportsScope('/?date=2020-01-01',now))})
test('unrelated cities cannot enter Atlanta team following',()=>assert.equal(mapGames(payload({home:'Los Angeles Rams',away:'Dallas Cowboys'}),'NFL',scope,now).length,0))
test('away fixtures remain explicitly away',()=>assert.equal(mapGames(payload({home:'New Orleans Saints',away:'Atlanta Falcons'}),'NFL',scope,now)[0].is_home_game,false))
test('zero is a real live score and is retained',()=>{const g=mapGames(payload(),'NFL',scope,now)[0];assert.equal(g.home_score,0);assert.equal(g.away_score,7);assert.equal(g.status,'live');assert.equal(g.source_timestamp_kind,'fetched_at')})
test('scheduled default zeros are not live scores',()=>{const g=mapGames(payload({state:'pre',name:'STATUS_SCHEDULED'}),'NFL',scope,now)[0];assert.equal(g.home_score,null);assert.equal(g.score_is_provider_reported,false)})
test('unknown dates or provider shape never become fabricated fixtures',()=>{assert.equal(mapGames(payload({date:'invalid'}),'NFL',scope,now).length,0);assert.throws(()=>mapGames({},'NFL',scope,now))})
test('failed league is disclosed, not mislabeled as no games',async()=>{const r=await sportsLive('/?league=NFL',{now,useCache:false,fetcher:async()=>new Response('{}',{status:503})});assert.equal(r.ok,false);assert.deepEqual(r.failedLeagues,['NFL'])})
test('sports uses only the registered fixed provider host and bounded dates',async()=>{let seen;const r=await sportsLive('/?league=NFL',{now,useCache:false,fetcher:async u=>{seen=new URL(u);return new Response(JSON.stringify(payload()),{status:200})}});assert.equal(seen.hostname,'site.api.espn.com');assert.equal(seen.searchParams.get('limit'),'100');assert.equal(r.items.length,1)})
test('publishable key is never treated as a user bearer JWT',()=>{const h=publicApiHeaders('sb_publishable_TEST_ONLY_NOT_A_CREDENTIAL');assert.equal(h.Authorization,undefined);assert.equal(h.apikey,'sb_publishable_TEST_ONLY_NOT_A_CREDENTIAL');assert.throws(()=>publicApiHeaders('sb_secret_TEST_ONLY_NOT_A_CREDENTIAL'));assert.equal(publicApiHeaders('legacy-test').Authorization,'Bearer legacy-test')})

test('team board maps a live game with scores and a scheduled next game', async () => {
  const { mapTeam, ATL_TEAMS } = await import('../api/sports-live.js')
  const side = (id, abbr, name, homeAway, score) => ({ homeAway, score, team: { id, abbreviation: abbr, displayName: name } })
  const payload = state => ({ team: { id: '1', record: { items: [{ summary: '7-5' }] }, nextEvent: [{ id: '9', date: '2026-11-14T01:00Z', links: [{ href: 'https://www.espn.com/nba/game/_/gameId/9' }], competitions: [{ date: '2026-11-14T01:00Z', status: { type: { state, shortDetail: state === 'in' ? 'Q3 5:21' : '11/13 - 8:00 PM EST' } }, venue: { fullName: 'United Center' }, competitors: [side('2', 'CHI', 'Chicago Bulls', 'home', { displayValue: '88' }), side('1', 'ATL', 'Atlanta Hawks', 'away', { displayValue: '91' })] }] }] } })
  const hawks = ATL_TEAMS.find(t => t.key === 'hawks')
  const next = mapTeam(hawks, payload('pre'))
  assert.equal(next.game.state, 'scheduled'); assert.equal(next.game.team_score, null); assert.equal(next.game.is_home, false); assert.equal(next.game.date, '2026-11-13'); assert.equal(next.game.time, '20:00'); assert.equal(next.record, '7-5')
  const live = mapTeam(hawks, payload('in'))
  assert.equal(live.game.state, 'live'); assert.equal(live.game.team_score, '91'); assert.equal(live.game.opponent_score, '88'); assert.equal(live.game.detail, 'Q3 5:21')
  assert.equal(mapTeam(ATL_TEAMS.find(t => t.key === 'dream'), { team: { id: '5' } }).game, null)
})
