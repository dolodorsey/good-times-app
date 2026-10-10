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
test('sports uses only the registered fixed provider host and bounded dates',async()=>{let seen;const r=await sportsLive('/?league=NFL',{now,useCache:false,fetcher:async u=>{seen=new URL(u);return new Response(JSON.stringify(payload()),{status:200})}});assert.equal(seen.hostname,'site.api.espn.com');assert.equal(seen.searchParams.get('limit'),'100');assert.equal(seen.searchParams.get('dates'),'20260927');assert.equal(r.scope.to,r.scope.date);assert.equal(r.items.length,1)})
test('publishable key is never treated as a user bearer JWT',()=>{const h=publicApiHeaders('sb_publishable_TEST_ONLY_NOT_A_CREDENTIAL');assert.equal(h.Authorization,undefined);assert.equal(h.apikey,'sb_publishable_TEST_ONLY_NOT_A_CREDENTIAL');assert.throws(()=>publicApiHeaders('sb_secret_TEST_ONLY_NOT_A_CREDENTIAL'));assert.equal(publicApiHeaders('legacy-test').Authorization,'Bearer legacy-test')})

test('unknown provider state is not presented as scheduled',()=>{const g=mapGames(payload({state:'unknown',name:'STATUS_UNKNOWN'}),'NFL',scope,now)[0];assert.equal(g.status,'unknown');assert.equal(g.score_is_provider_reported,false);assert.equal(g.home_score,null)})
