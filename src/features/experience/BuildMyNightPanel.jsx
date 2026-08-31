import React, { useMemo, useState } from 'react'
import { gtAssetUrl } from './good-times-assets.js'

const VIBES = [
  ['Grown & sexy','gt-cat-mood-bougie.webp'],['High energy','gt-cat-nightlife.webp'],
  ['Date night','gt-cat-mood-date.webp'],['Live music','gt-cat-music.webp'],
  ['Black-owned','gt-cat-culture.webp'],['Rooftop','gt-bg-rooftop-lounge.webp'],
  ['Food first','gt-cat-dining.webp'],['Something different','gt-cat-adventure.webp'],
]
const STEPS = ['Mood','Anchor','Details','Route']
const DATES = ['Tonight','Tomorrow','Friday','Saturday','This weekend']
const BUDGETS = ['Open','$','$$','$$$','VIP']
const OCCASIONS = ['Night out','Date','Birthday','Friends in town','Celebration']
const BG = path => gtAssetUrl(path,'good-times-backgrounds')
const itemKey = item => item?.event_key ? `event:${item.event_key}` : `venue:${item?.id}`
const itemName = item => item?.title || item?.name || 'GOOD TIMES pick'
const itemMeta = item => item?.event_key
  ? [item.event_date,item.event_time,item.venue_name].filter(Boolean).join(' · ')
  : [item?.neighborhood,item?.price_range,item?.google_rating&&`★ ${item.google_rating}`].filter(Boolean).join(' · ')
const imageFor = item => item?.image_url || item?.hero_image || null
const initials = value => String(value || 'GT').split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase() || 'GT'

function PlannerMedia({ item }) {
  const [failed,setFailed]=useState(false)
  const src=imageFor(item)
  if(src&&!failed)return <img src={src} alt={itemName(item)} onError={()=>setFailed(true)}/>
  return <i aria-label={`${itemName(item)} image unavailable`}>{initials(itemName(item))}</i>
}

function matchesVibes(item,vibes){
  const text=[itemName(item),item?.category_key,item?.subcategory_key,item?.subcategory,item?.neighborhood,...(item?.vibe_tags||[]),...(item?.culture_tags||[])].filter(Boolean).join(' ').toLowerCase()
  return vibes.reduce((score,vibe)=>score+(text.includes(vibe.toLowerCase().replace(' & ',' '))?2:0),0)
}
export default function BuildMyNightPanel({ cityName, events = [], venues = [], busy = false, onBuild }) {
  const [vibes,setVibes]=useState(['Grown & sexy'])
  const [step,setStep]=useState(0)
  const [anchorKey,setAnchorKey]=useState('')
  const [date,setDate]=useState('Tonight')
  const [people,setPeople]=useState(2)
  const [budget,setBudget]=useState('Open')
  const [occasion,setOccasion]=useState('Night out')
  const [area,setArea]=useState('Anywhere')
  const [routeShift,setRouteShift]=useState(0)

  const choices=useMemo(()=>[...events.slice(0,18),...venues.slice(0,18)]
    .sort((a,b)=>matchesVibes(b,vibes)-matchesVibes(a,vibes))
    .slice(0,8),[events,venues,vibes])
  const anchor=choices.find(item=>itemKey(item)===anchorKey)||choices[0]||null
  const areas=useMemo(()=>['Anywhere',...new Set(venues.map(v=>v.neighborhood).filter(Boolean))].slice(0,7),[venues])
  const foodPlaces=useMemo(()=>venues.filter(v=>/food|restaurant|dining|brunch|cocktail|wine/i.test([v.category_key,v.subcategory,v.name].join(' '))),[venues])
  const latePlaces=useMemo(()=>venues.filter(v=>/night|lounge|rooftop|bar|music|entertainment/i.test([v.category_key,v.subcategory,v.name].join(' '))),[venues])
  const firstPool=foodPlaces.length?foodPlaces:venues
  const latePool=latePlaces.length?latePlaces:venues
  const route=useMemo(()=>{
    const main=anchor||events[(routeShift)%Math.max(events.length,1)]||venues[0]
    const pickUnique=(pool,offset,excluded)=>{
      for(let index=0;index<pool.length;index+=1){
        const candidate=pool[(offset+index)%pool.length]
        if(candidate&&!excluded.has(itemKey(candidate)))return candidate
      }
      return null
    }
    const mainKey=itemKey(main)
    const first=pickUnique(firstPool,routeShift,new Set([mainKey]))||main
    const last=pickUnique(latePool,routeShift+1,new Set([mainKey,itemKey(first)]))||pickUnique(venues,routeShift+2,new Set([mainKey,itemKey(first)]))||main
    return [first,main,last].filter(Boolean)
  },[anchor,events,firstPool,latePool,routeShift,venues])

  const prompt=useMemo(()=>[
    `Build a complete ${occasion.toLowerCase()} in ${cityName} for ${date.toLowerCase()}.`,
    `${people} ${people===1?'person':'people'}.`,
    `Vibes: ${vibes.join(', ')||'surprise me'}.`,
    `Budget: ${budget}. Area: ${area}.`,
    anchor?`Build around ${itemName(anchor)}${anchor?.venue_name?` at ${anchor.venue_name}`:''}.`:'Choose the strongest current anchor.',
    `Preferred route shape: ${route.map(itemName).join(' → ')}.`,
    'Use only current source-backed events and verified places. Check timing and travel order, include action links, and save it as an itinerary.',
  ].join(' '),[anchor,area,budget,cityName,date,occasion,people,route,vibes])

  const toggleVibe=vibe=>setVibes(current=>current.includes(vibe)?current.filter(value=>value!==vibe):[...current,vibe].slice(0,3))
  const next=()=>setStep(current=>Math.min(3,current+1))
  const back=()=>setStep(current=>Math.max(0,current-1))

  return <section className="gt2-builder gt2-builder-live" aria-labelledby="gt-build-night-title">
    <header className="gt2-builder-head">
      <span>LIVE ROUTE BUILDER</span><h2 id="gt-build-night-title">Build My Night</h2>
      <p>Make a few choices and watch the route change. Every card comes from current events or verified places.</p>
    </header>

    <div className="gt2-builder-progress" aria-label="Planner progress">{STEPS.map((label,index)=><button type="button" key={label} className={step===index?'active':index<step?'done':''} onClick={()=>setStep(index)}><b>{index<step?'✓':index+1}</b><span>{label}</span></button>)}</div>

    {step===0&&<section className="gt2-builder-stage"><div className="gt2-builder-stage-title"><div><span>1 · SET THE ENERGY</span><h3>What should the night feel like?</h3></div><small>Pick up to three. The live options reorder immediately.</small></div><div className="gt2-builder-vibes visual"><div>{VIBES.map(([vibe,art])=><button type="button" key={vibe} className={vibes.includes(vibe)?'active':''} style={{'--gt-vibe-art':`url("${BG(art)}")`}} onClick={()=>toggleVibe(vibe)}><i/><strong>{vibe}</strong>{vibes.includes(vibe)&&<em>✓</em>}</button>)}</div></div></section>}

    {step===1&&<section className="gt2-builder-stage"><div className="gt2-builder-stage-title"><div><span>2 · CHOOSE THE ANCHOR</span><h3>What is the one must-do?</h3></div><small>Choose an actual event or place. GOOD TIMES builds around it.</small></div><div className="gt2-builder-anchors">{choices.map(item=><button type="button" key={itemKey(item)} className={itemKey(anchor)===itemKey(item)?'active':''} onClick={()=>setAnchorKey(itemKey(item))}><PlannerMedia item={item}/><span><small>{item.event_key?'EVENT':'PLACE'}</small><strong>{itemName(item)}</strong><em>{itemMeta(item)||cityName}</em></span><b>{itemKey(anchor)===itemKey(item)?'✓':'+'}</b></button>)}</div></section>}

    {step===2&&<section className="gt2-builder-stage"><div className="gt2-builder-stage-title"><div><span>3 · SET THE GUARDRAILS</span><h3>Shape it without filling out a form.</h3></div><small>Tap choices. Nothing here sends you to a dead-end screen.</small></div><div className="gt2-builder-pickers"><label><span>WHEN</span><div>{DATES.map(value=><button type="button" className={date===value?'active':''} onClick={()=>setDate(value)} key={value}>{value}</button>)}</div></label><label><span>OCCASION</span><div>{OCCASIONS.map(value=><button type="button" className={occasion===value?'active':''} onClick={()=>setOccasion(value)} key={value}>{value}</button>)}</div></label><label><span>PEOPLE</span><div className="gt2-builder-stepper"><button type="button" onClick={()=>setPeople(value=>Math.max(1,value-1))}>−</button><strong>{people}</strong><button type="button" onClick={()=>setPeople(value=>Math.min(12,value+1))}>+</button></div></label><label><span>BUDGET</span><div>{BUDGETS.map(value=><button type="button" className={budget===value?'active':''} onClick={()=>setBudget(value)} key={value}>{value}</button>)}</div></label><label className="wide"><span>AREA</span><div>{areas.map(value=><button type="button" className={area===value?'active':''} onClick={()=>setArea(value)} key={value}>{value}</button>)}</div></label></div></section>}

    {step===3&&<section className="gt2-builder-stage"><div className="gt2-builder-stage-title"><div><span>4 · EDIT THE ROUTE</span><h3>Your night, assembled live.</h3></div><small>Not feeling it? Swap the route before GOOD TIMES checks final timing.</small></div><div className="gt2-builder-route-meta"><span>{date}</span><span>{occasion}</span><span>{people} {people===1?'person':'people'}</span><span>{budget}</span><span>{area}</span></div><div className="gt2-builder-live-route">{route.map((item,index)=><article key={`${itemKey(item)}:${index}`}><b>0{index+1}</b><PlannerMedia item={item}/><span><small>{['START','MAIN MOVE','LATE MOVE'][index]}</small><strong>{itemName(item)}</strong><em>{itemMeta(item)||cityName}</em></span></article>)}</div><button className="gt2-builder-swap" type="button" onClick={()=>setRouteShift(value=>value+1)}>↻ Swap all three suggestions</button></section>}

    <div className="gt2-builder-actions"><button className="gt2-builder-back" type="button" onClick={back} disabled={step===0||busy}>Back</button>{step<3?<button className="gt2-builder-next" type="button" onClick={next}>Continue →</button>:<button className="gt2-builder-submit" type="button" disabled={busy} onClick={()=>onBuild?.(prompt)}>{busy?'Checking timing…':'Build this route ✦'}</button>}</div>
    <small>Recommendations are not reservations. Current ticket and booking links remain attached for final action.</small>
  </section>
}
