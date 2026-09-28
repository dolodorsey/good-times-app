from pathlib import Path
changes={}
def load(p):return changes.get(p,Path(p).read_text())
def edit(p,old,new):
 s=load(p);assert s.count(old)==1,(p,old[:100]);changes[p]=s.replace(old,new,1)
edit('src/features/experience/complete/useBrowse.js','useBrowse(scope,enabled=true)','useBrowse(scope,enabled=true,endpoint=\'/api/browse\')')
edit('src/features/experience/complete/useBrowse.js','const signature=JSON.stringify(scope)','const signature=endpoint+JSON.stringify(scope)')
edit('src/features/experience/complete/useBrowse.js','fetch(`/api/browse?${params}`','fetch(`${endpoint}?${params}`')
p='src/features/experience/complete/Collections.jsx'
edit(p,"const [league,setLeague]=useState('All'),data=useBrowse({kind:'sports'}),games=data.items.filter(x=>league==='All'||x.league===league)","const [league,setLeague]=useState('All'),[date,setDate]=useState(selectedCityClock('atlanta',now).date),data=useBrowse({date},true,'/api/sports-live'),games=data.items.filter(x=>league==='All'||x.league===league)")
edit(p,'<Section title="Provider schedules" subtext="Only recently updated games are shown. No unverified live scores.">','<div className="gtc-controls"><label>Week starting<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button className="gtc-load-more" onClick={data.reload}>Refresh scores</button></div>{data.partial&&<p className="gtc-note" role="status">{data.notice}</p>}<Section title="Scores & next games" subtext={data.asOf?`ESPN · checked ${new Date(data.asOf).toLocaleTimeString(\'en-US\',{timeZone:\'America/New_York\',hour:\'numeric\',minute:\'2-digit\'})} ET`:\'Provider scores and schedules\'}>')
edit(p,"<h3>{g.home_team}<span>vs</span>{g.away_team}</h3>","<div className=\"gtc-game-teams\"><span>{g.home_logo&&<img src={g.home_logo} alt=\"\" onError={e=>{e.currentTarget.hidden=true}}/>}<strong>{g.home_team}</strong></span><span className=\"gtc-game-score\">{g.score_is_provider_reported?<b>{g.home_score} – {g.away_score}</b>:'vs'}<small>{g.status==='live'?'LIVE':g.status==='final'?'FINAL':g.status}</small></span><span>{g.away_logo&&<img src={g.away_logo} alt=\"\" onError={e=>{e.currentTarget.hidden=true}}/>}<strong>{g.away_team}</strong></span></div>")
edit(p,'<small>Schedule checked {displayDate(g.updated_at?.slice(0,10))}</small>','{g.status_detail&&<p>{g.status_detail}</p>}<ActionLink href={g.source_url}>Game details</ActionLink>')
p='src/features/experience/complete/Cards.jsx';edit(p,'<span>{kind}</span><small>{illustration?\'Choose your vibe\':\'Photo unavailable\'}</small>','{!illustration&&<><span>{kind}</span><small>Photo unavailable</small></>}')
p='src/features/experience/good-times-complete.css';changes[p]=load(p)+'''\nhtml body.gt-complete-mode #root .gt5-app.gt5-complete .gt5-toast{top:calc(8px + env(safe-area-inset-top))!important;bottom:auto!important;pointer-events:none!important;max-width:210px!important;font-size:12px!important} .gt5-complete .gtc-game-teams{display:grid;grid-template-columns:1fr auto 1fr;gap:5px;align-items:center;margin:10px 0}.gt5-complete .gtc-game-teams>span{min-width:0;text-align:center}.gt5-complete .gtc-game-teams img{display:block;width:34px;height:34px;object-fit:contain;margin:0 auto 6px}.gt5-complete .gtc-game-teams img[hidden]{display:none}.gt5-complete .gtc-game-teams strong{font-size:12px;line-height:1.25;display:block;overflow-wrap:break-word}.gt5-complete .gtc-game-score b{font:700 20px var(--gt5-sans)}.gt5-complete .gtc-game-score small{display:block;margin-top:5px}.gt5-complete .gtc-matchup>a{min-height:44px;display:flex;align-items:center;color:#f8d46a;font-size:12px;text-decoration:none}\n'''
p='scripts/complete-upgrade-fixtures.mjs';edit(p,"  if(u.pathname==='/api/browse'){","  if(u.pathname==='/api/sports-live')return route.fulfill(json({ok:true,items:[{id:'sports-fixture',league:'NFL',home_team:'Atlanta Falcons',away_team:'New Orleans Saints',game_date:'2026-09-27',game_time:'16:00',venue:'Fixture stadium',is_home_game:true,status:'live',home_score:0,away_score:7,score_is_provider_reported:true,source_url:'https://example.test/sports',updated_at:new Date(NOW).toISOString()}],nextCursor:null,asOf:new Date(NOW).toISOString(),source:'ESPN fixture',partial:false}));\n  if(u.pathname==='/api/browse'){")
p='scripts/complete-upgrade-evidence.mjs';edit(p,"import {chromium} from 'playwright-core'","import {chromium,webkit} from 'playwright-core'")
edit(p,"browser=await chromium.launch({headless:true,executablePath:process.env.GT_UI_CHROME_PATH||undefined,args:['--no-sandbox']})","browser=process.env.GT_COMPLETE_BROWSER==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:process.env.GT_UI_CHROME_PATH||undefined,args:['--no-sandbox']});report.browser=process.env.GT_COMPLETE_BROWSER||'chromium'")
p='scripts/complete-live-read.mjs';edit(p,"import {browse} from '../api/browse.js'","import {browse} from '../api/browse.js'\nimport {sportsLive} from '../api/sports-live.js'")
edit(p,'report.publicPassed=report.errors.length===0;',"try{const sports=await sportsLive('/api/sports-live');report.sports={ok:sports.ok,items:sports.items.length,leagues:[...new Set(sports.items.map(i=>i.league))],failedLeagues:sports.failedLeagues,asOf:sports.asOf};if(!sports.ok)report.errors.push({scope:'registered sports provider',error:'Provider did not return a valid response.'})}catch(e){report.errors.push({scope:'sports',error:e.message})}\nreport.publicPassed=report.errors.length===0;")
p='vite.config.js';edit(p,"JSON.stringify(process.env.GT_COMPLETE_UPGRADE === '1' || (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'release/gt-complete-compact-20260927'))","JSON.stringify(process.env.GT_COMPLETE_UPGRADE !== '0')")
p='.github/workflows/ui-regression.yml';edit(p,'      - name: Build production bundle\n        run: npm run build','      - name: Build retained legacy baseline\n        env:\n          GT_COMPLETE_UPGRADE: \'0\'\n        run: npm run build')
edit(p,'      - name: Upload rendered screenshots','''      - name: Build complete compact experience from the same commit
        env:
          GT_COMPLETE_UPGRADE: '1'
        run: npm run build

      - name: Install full browser engines for compact verification
        run: npx --no-install playwright-core install --with-deps chromium webkit

      - name: Verify complete Chromium screens and user journeys
        env:
          GT_COMPLETE_ARTIFACTS: ui-artifacts/complete/chromium
        run: node scripts/complete-upgrade-evidence.mjs

      - name: Verify complete WebKit screens and user journeys
        env:
          GT_COMPLETE_BROWSER: webkit
          GT_COMPLETE_ARTIFACTS: ui-artifacts/complete/webkit
        run: node scripts/complete-upgrade-evidence.mjs

      - name: Upload rendered screenshots''')
for p in ['AGENTS.md','src/features/experience/AGENTS.md','docs/GOOD_TIMES_SCREEN_CONTRACTS.md','docs/GOOD_TIMES_PRODUCT_UI_CONSTITUTION.md']:
 changes[p]=load(p)+'\n\n## Owner-authorized full compact upgrade — September 27–28, 2026\nThe owner instructed COMPLETE UPGRADE after approving compact two-column references. Read `docs/GOOD_TIMES_COMPLETE_RELEASE_CONTRACT.md`. This extends compact presentation across the canonical app, superseding oversized introductory layouts without removing protected taxonomy, five-tab navigation, privacy, accurate data, or independent release evidence. Default compiled full mode is reversible with GT_COMPLETE_UPGRADE=0. This does not authorize a new city, paused scheduler activation, fabricated data, or a claim that an App Store binary was updated.\n'
for p,s in changes.items():Path(p).write_text(s)
print('Prepared actual final-source changes:',', '.join(changes))
