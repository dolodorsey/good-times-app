/* One-time remote workspace materialization. Never called by npm build or production. */
const fs=require('node:fs');const cp=require('node:child_process');const assert=require('node:assert/strict')
const root='src/features/experience/GoodTimesCommandAppV4.jsx'
const expected={
  [root]:'b88411429e4f13109aa1a3794b851b27d23e1668',
  'src/features/experience/ExploreTaxonomyBrowser.jsx':'12c91ec9acabc605bcec038e1daf2334e4ea5caa',
  'vite.config.js':'ade45b4a10e4ed9e5f16c6849642d26cdd1b49f3',
}
for(const [file,sha]of Object.entries(expected))assert.equal(cp.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim(),sha,`Upstream changed: ${file}. Reconcile before applying.`)
function replace(file,old,next){let text=fs.readFileSync(file,'utf8');assert.equal(text.split(old).length-1,1,`Expected exactly one anchor in ${file}: ${old.slice(0,70)}`);fs.writeFileSync(file,text.replace(old,next))}
replace(root,"import'./good-times-this-week.css'","import'./good-times-this-week.css'\nimport {compactPilotEnabled} from './compact-directory-query.js'\nimport './good-times-compact-pilot.css'")
replace(root,"export default function GoodTimesCommandAppV4({onAuth=null}){","export default function GoodTimesCommandAppV4({onAuth=null}){\n  const compact=useMemo(()=>compactPilotEnabled({hostname:window.location.hostname,search:window.location.search,preview:typeof __GT_COMPACT_PREVIEW__!=='undefined'&&__GT_COMPACT_PREVIEW__}),[])")
replace(root,'<div className="gt5-app" data-screen={tab}>','<div className="gt5-app" data-screen={tab} data-compact={compact?\'true\':undefined}>')
const oldGo="const goTab=id=>{if(id==='radar'){returnTab.current=PRIMARY_TABS.has(tab)?tab:'home'}setTab(id);if(id!=='discover'){setSelectedCategory(null);setSelectedSubcategory(null);setDirectoryOpen(false)}document.querySelector('.gt5-main')?.scrollTo?.({top:0,behavior:'instant'})}"
const newGo="const goTab=id=>{if(id==='radar'){returnTab.current=PRIMARY_TABS.has(tab)?tab:'home'}setTab(id);if(compact&&id==='discover'){setQuery('');setIntent('');setSelectedCategory(null);setSelectedSubcategory(null);setDirectoryOpen(false);setMapMode(false)}else if(id!=='discover'){setSelectedCategory(null);setSelectedSubcategory(null);setDirectoryOpen(false)}document.querySelector('.gt5-main')?.scrollTo?.({top:0,behavior:'instant'})}"
replace(root,oldGo,newGo)
const hero='<Hero eyebrow={`EXPLORE ${cityLabel(city).toUpperCase()}`} title="Discover" subtitle="Curated for your good times." image={heroMedia} className="gt5-compact-hero"/>'
replace(root,hero,'{compact?<div className="gtc-discover-title"><h1>Discover {cityLabel(city)}</h1><span>Find your next good time</span></div>:'+hero+'}')
let text=fs.readFileSync(root,'utf8')
const searchStart='        <div className="gt5-discover-search">'
const searchEnd='</button></div>'
const start=text.indexOf(searchStart),end=text.indexOf(searchEnd,start)+searchEnd.length
assert.ok(start>0&&end>start,'Discover search anchor missing')
const originalSearch=text.slice(start,end).trim()
const compactSearch='<div className="gtc-search"><span aria-hidden="true">⌕</span><input aria-label="Search venues and categories" value={query} onChange={e=>setQuery(e.target.value)} placeholder={selectedCategory?"Search this category…":"Search venues, areas or categories…"}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery(\'\')}>×</button>}</div>'
text=text.slice(0,start)+'        {compact?'+compactSearch+':'+originalSearch+'}'+text.slice(end)
fs.writeFileSync(root,text)
// Preserve legacy routes and assertions; compact controls have their own canonical scopes.
text=fs.readFileSync(root,'utf8')
for(const name of ['gt5-intents','gt5-secondary-intents']){
  const begin=`        <div className="${name}">`,index=text.indexOf(begin)
  assert.ok(index>=0,`Missing ${name}`)
  const close=text.indexOf('</div>',index)+6
  assert.ok(close>index)
  text=text.slice(0,index)+'        {!compact&&'+text.slice(index,close).trim()+'}'+text.slice(close)
}
fs.writeFileSync(root,text)
replace(root,"{!query&&!intent&&!selectedCategory&&!directoryOpen&&<div className=\"gt5-lanes\">","{!compact&&!query&&!intent&&!selectedCategory&&!directoryOpen&&<div className=\"gt5-lanes\">")
replace(root,'{(intent||query)&&<><Section kicker="LIVE EXPERIENCES"','{!compact&&(intent||query)&&<><Section kicker="LIVE EXPERIENCES"')
replace(root,"{selectedCategory==='entertainment'&&<Section", "{!compact&&selectedCategory==='entertainment'&&<Section")
replace(root,'<AdSlot placement="discover_inline" city={city}/>','{!compact&&<AdSlot placement="discover_inline" city={city}/>}')
replace(root,'<ExploreTaxonomyBrowser externalSearch taxonomy={taxonomy}','<ExploreTaxonomyBrowser compact={compact} externalSearch taxonomy={taxonomy}')
const explore='src/features/experience/ExploreTaxonomyBrowser.jsx'
replace(explore,"import React, { useEffect, useMemo, useState } from 'react'","import React, { useEffect, useMemo, useState } from 'react'\nimport CompactTaxonomyBrowser from './CompactTaxonomyBrowser.jsx'")
replace(explore,'export default function ExploreTaxonomyBrowser({','function LegacyExploreTaxonomyBrowser({')
fs.appendFileSync(explore,"\n// Owner-approved compact preview retains the legacy implementation and the full taxonomy.\nexport default function ExploreTaxonomyBrowser(props) {\n  return props.compact ? <CompactTaxonomyBrowser {...props}/> : <LegacyExploreTaxonomyBrowser {...props}/>\n}\n")
replace('vite.config.js','  plugins: [react()],',"  plugins: [react()],\n  define: { __GT_COMPACT_PREVIEW__: JSON.stringify(process.env.VERCEL_ENV === 'preview') },")
const amendment='\n\n## September 27, 2026 — approved compact pilot\n\nRead `docs/GOOD_TIMES_COMPACT_PILOT_2026-09-27.md` for this owner-authorized change. The opt-in preview replaces oversized Discover/category/subcategory presentation with a compact two-column variant. Full active taxonomy, empty types, Directory/Map, detail return, Save/Plan, five-tab navigation, source truth and existing release gates remain binding. Production defaults and scheduled jobs are unchanged. Generated mockup facts are not approved inventory. No browser or production acceptance is implied by code or CI alone.\n'
for(const file of ['AGENTS.md','src/features/experience/AGENTS.md','docs/GOOD_TIMES_PRODUCT_UI_CONSTITUTION.md','docs/GOOD_TIMES_SCREEN_CONTRACTS.md'])fs.appendFileSync(file,amendment)
console.log('Materialized compact pilot into canonical source files. No build-time source substitution.')
