import test from 'node:test'
import assert from 'node:assert/strict'
import sportsHandler from '../api/sports.js'

function responseRecorder(){
  const headers={}
  return{
    statusCode:0,
    setHeader(name,value){headers[name]=value},
    end(body){this.body=body},
    headers,
  }
}

test('Atlanta Radar loads every configured professional team and caches the schedule response',async()=>{
  const originalFetch=globalThis.fetch
  let calls=0
  globalThis.__GOOD_TIMES_SPORTS_CACHE__?.clear()
  globalThis.fetch=async url=>{
    calls+=1
    const id=String(url).match(/teams\/(\d+)\/schedule/)?.[1]||'0'
    return{
      ok:true,
      async json(){return{events:[0,1].map(offset=>({
        id:`game-${calls}-${offset}`,
        date:`2099-09-0${offset+1}T23:00:00Z`,
        links:[{href:'https://www.espn.com/'}],
        competitions:[{
          status:{type:{state:'pre',shortDetail:'Sep 1 - 7:00 PM'}},
          venue:{fullName:'City Stadium'},
          competitors:[
            {homeAway:'home',score:{value:101,displayValue:'101'},team:{displayName:`Home ${id}`,abbreviation:'HME'}},
            {homeAway:'away',score:{value:99,displayValue:'99'},team:{displayName:'Visitors',abbreviation:'VIS'}},
          ],
        }],
      }))}}
    }
  }
  try{
    const first=responseRecorder()
    await sportsHandler({method:'GET',url:'/api/sports?city=atlanta'},first)
    const firstBody=JSON.parse(first.body)
    assert.equal(first.statusCode,200)
    assert.equal(firstBody.counts.teams,5)
    assert.deepEqual(firstBody.teams.map(team=>team.name),['Falcons','Hawks','Dream','Braves','Atlanta United'])
    assert.equal(firstBody.upcoming.length,10)
    assert.equal(new Set(firstBody.upcoming.slice(0,5).map(game=>game.city_team)).size,5)
    assert.equal(firstBody.upcoming[0].home.score,'101')
    assert.equal(firstBody.upcoming[0].away.score,'99')
    assert.equal(calls,5)

    const second=responseRecorder()
    await sportsHandler({method:'GET',url:'/api/sports?city=atlanta'},second)
    assert.equal(second.headers['X-Good-Times-Sports-Cache'],'HIT')
    assert.equal(calls,5)
  }finally{
    globalThis.fetch=originalFetch
    globalThis.__GOOD_TIMES_SPORTS_CACHE__?.clear()
  }
})

test('sports endpoint rejects mutations',async()=>{
  const response=responseRecorder()
  await sportsHandler({method:'POST',url:'/api/sports?city=atlanta'},response)
  assert.equal(response.statusCode,405)
  assert.equal(JSON.parse(response.body).ok,false)
})
