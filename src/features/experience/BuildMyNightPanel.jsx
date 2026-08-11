import React, { useMemo, useState } from 'react'
import { gtAssetUrl } from './good-times-assets.js'

const VIBE_CONFIG = [
  ['Grown & sexy','gt-cat-mood-bougie.webp'],
  ['High energy','gt-cat-mood-turnt.webp'],
  ['Date night','gt-cat-mood-date.webp'],
  ['Live music','gt-cat-music.webp'],
  ['Black-owned','gt-cat-culture.webp'],
  ['Rooftop','gt-bg-rooftop-lounge.webp'],
  ['Food first','gt-cat-dining.webp'],
  ['Something different','gt-cat-mood-explore.webp'],
]
const BUDGETS = ['No preference', 'Under $50 each', '$50–$100 each', '$100–$200 each', 'Premium / VIP']
const STEPS = ['Vibe','Basics','Preferences','Review']
const BG = path => gtAssetUrl(path,'good-times-backgrounds')

export default function BuildMyNightPanel({ cityName, busy = false, onBuild }) {
  const [occasion, setOccasion] = useState('A night out')
  const [date, setDate] = useState('Tonight')
  const [groupSize, setGroupSize] = useState('2')
  const [area, setArea] = useState('No preference')
  const [budget, setBudget] = useState('No preference')
  const [vibes, setVibes] = useState(['Grown & sexy'])
  const [step, setStep] = useState(0)

  const prompt = useMemo(() => {
    const people = Number(groupSize || 1)
    return [
      `Build my night in ${cityName}.`,
      `Occasion: ${occasion}.`,
      `When: ${date}.`,
      `Group: ${people} ${people === 1 ? 'person' : 'people'}.`,
      `Vibes: ${vibes.length ? vibes.join(', ') : 'open to strong recommendations'}.`,
      `Area: ${area}.`,
      `Budget: ${budget}.`,
      'Create a complete sequence with timing, dinner or first stop, the main experience, and an optional late-night move. Use only current source-backed events and verified venues. Save the result as an itinerary.',
    ].join(' ')
  }, [area, budget, cityName, date, groupSize, occasion, vibes])

  const toggleVibe = vibe => {
    setVibes(current => current.includes(vibe) ? current.filter(item => item !== vibe) : [...current, vibe].slice(0, 4))
  }

  const leadVibe=vibes[0]||'Something different'
  const leadArt=VIBE_CONFIG.find(([label])=>label===leadVibe)?.[1]||'gt-cat-mood-explore.webp'
  const planPreview=[
    ['01','START',leadVibe==='Food first'?'Dinner first':area==='No preference'?'Best opening move':area],
    ['02','MAIN MOVE',leadVibe==='High energy'?'Party / live energy':leadVibe],
    ['03','LATE',budget==='Premium / VIP'?'VIP after-hours':'Optional late-night move'],
  ]

  const goNext = () => setStep(current => Math.min(STEPS.length - 1, current + 1))
  const goBack = () => setStep(current => Math.max(0, current - 1))

  return <section className="gt2-builder gt2-builder-clickthrough" aria-labelledby="gt-build-night-title" style={{'--gt-build-art':`url("${BG(leadArt)}")`}}>
    <style>{`
      .gt2-builder-clickthrough{position:relative;overflow:hidden}.gt2-builder-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:16px 0 18px}.gt2-builder-progress button{min-height:38px;border:1px solid var(--gt2-line);border-radius:12px;background:#0d0d12;color:var(--gt2-muted);font-size:7px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.gt2-builder-progress button.active{border-color:rgba(241,213,154,.48);background:#332c20;color:var(--gt2-gold2)}.gt2-builder-stage{animation:gt2Fade .18s ease}.gt2-builder-stage-title{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:4px 0 14px}.gt2-builder-stage-title span{color:var(--gt2-gold2);font-size:7px;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.gt2-builder-stage-title h3{margin:5px 0 0;font:600 26px/1 'Cormorant Garamond',serif}.gt2-builder-stage-title small{max-width:170px;color:var(--gt2-muted);font-size:7px;line-height:1.45;text-align:right}.gt2-builder-review{display:grid;gap:8px}.gt2-builder-review>div{display:flex;justify-content:space-between;gap:12px;padding:12px 13px;border:1px solid var(--gt2-line);border-radius:13px;background:#0d0d12}.gt2-builder-review span{font-size:7px;letter-spacing:.1em;color:var(--gt2-muted);text-transform:uppercase}.gt2-builder-review strong{font-size:9px;text-align:right}.gt2-builder-actions{display:grid;grid-template-columns:auto 1fr;gap:8px;margin-top:16px}.gt2-builder-actions button{min-height:48px;border-radius:13px;font-size:8px;font-weight:900}.gt2-builder-back{min-width:88px;border:1px solid var(--gt2-line);background:#0d0d12;color:#fff}.gt2-builder-next{border:0;background:var(--gt2-gold2);color:#21180b}.gt2-builder-search-note{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:13px;padding:11px 12px;border:1px solid rgba(241,213,154,.12);border-radius:12px;background:rgba(255,255,255,.025);color:var(--gt2-muted);font-size:7px;line-height:1.4}.gt2-builder-search-note b{color:var(--gt2-gold2);white-space:nowrap}@media(max-width:390px){.gt2-builder-progress button{font-size:6px}.gt2-builder-stage-title{align-items:flex-start;flex-direction:column}.gt2-builder-stage-title small{text-align:left;max-width:none}}
    `}</style>

    <div className="gt2-builder-head">
      <span>INTERACTIVE CLICK-THROUGH PLANNER</span>
      <h2 id="gt-build-night-title">Build My Night</h2>
      <p>Click through the choices. GOOD TIMES uses every selection to build a real route from current events and verified places.</p>
    </div>

    <div className="gt2-builder-preview" aria-label="Live night preview">
      <div className="gt2-builder-preview-art"><span>{date.toUpperCase()}</span><strong>{cityName}</strong><small>{vibes.slice(0,2).join(' · ')}</small></div>
      <div className="gt2-builder-route">{planPreview.map(([index,label,value])=><div key={index}><span>{index}</span><div><small>{label}</small><strong>{value}</strong></div></div>)}</div>
    </div>

    <div className="gt2-builder-progress" aria-label="Build My Night steps">
      {STEPS.map((label,index)=><button type="button" key={label} className={step===index?'active':''} onClick={()=>setStep(index)}>{index+1}. {label}</button>)}
    </div>

    {step===0&&<div className="gt2-builder-stage">
      <div className="gt2-builder-stage-title"><div><span>STEP ONE</span><h3>What kind of night?</h3></div><small>Choose up to four. Your first choice becomes the lead vibe.</small></div>
      <div className="gt2-builder-vibes visual">
        <div>{VIBE_CONFIG.map(([vibe,art]) => <button
          type="button"
          key={vibe}
          className={vibes.includes(vibe) ? 'active' : ''}
          style={{'--gt-vibe-art':`url("${BG(art)}")`}}
          onClick={() => toggleVibe(vibe)}
        ><i/><strong>{vibe}</strong>{vibes.includes(vibe)&&<em>✓</em>}</button>)}</div>
      </div>
    </div>}

    {step===1&&<div className="gt2-builder-stage">
      <div className="gt2-builder-stage-title"><div><span>STEP TWO</span><h3>Set the basics.</h3></div><small>Tell us what you are celebrating, when you are going, and who is coming.</small></div>
      <div className="gt2-builder-grid">
        <label className="wide"><span>Occasion</span><input value={occasion} onChange={event => setOccasion(event.target.value)} placeholder="Birthday, date, friends in town…" /></label>
        <label><span>When</span><select value={date} onChange={event => setDate(event.target.value)}><option>Tonight</option><option>Tomorrow</option><option>This Friday</option><option>This Saturday</option><option>This weekend</option></select></label>
        <label><span>Group size</span><select value={groupSize} onChange={event => setGroupSize(event.target.value)}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={String(index + 1)}>{index + 1}</option>)}</select></label>
      </div>
    </div>}

    {step===2&&<div className="gt2-builder-stage">
      <div className="gt2-builder-stage-title"><div><span>STEP THREE</span><h3>Shape the route.</h3></div><small>Area and budget change the order and type of places GOOD TIMES ranks first.</small></div>
      <div className="gt2-builder-grid">
        <label className="wide"><span>Area</span><input value={area} onChange={event => setArea(event.target.value)} placeholder="Buckhead, Midtown, no preference…" /></label>
        <label className="wide"><span>Budget</span><select value={budget} onChange={event => setBudget(event.target.value)}>{BUDGETS.map(item => <option key={item}>{item}</option>)}</select></label>
      </div>
    </div>}

    {step===3&&<div className="gt2-builder-stage">
      <div className="gt2-builder-stage-title"><div><span>FINAL STEP</span><h3>Review your night.</h3></div><small>GOOD TIMES will use this exact setup—not a generic search—to build the itinerary.</small></div>
      <div className="gt2-builder-review">
        <div><span>Vibe</span><strong>{vibes.join(' · ') || 'Open to recommendations'}</strong></div>
        <div><span>Occasion</span><strong>{occasion}</strong></div>
        <div><span>When</span><strong>{date}</strong></div>
        <div><span>Group</span><strong>{groupSize}</strong></div>
        <div><span>Area</span><strong>{area}</strong></div>
        <div><span>Budget</span><strong>{budget}</strong></div>
      </div>
    </div>}

    <div className="gt2-builder-actions">
      <button className="gt2-builder-back" type="button" onClick={goBack} disabled={step===0||busy}>Back</button>
      {step<3?<button className="gt2-builder-next" type="button" onClick={goNext}>Continue →</button>:<button className="gt2-builder-submit" type="button" disabled={busy} onClick={() => onBuild?.(prompt)}>{busy ? 'Building your night…' : '✦ Build My Night'}</button>}
    </div>

    <div className="gt2-builder-search-note"><span>Prefer typing instead of clicking through?</span><b>Search GOOD TIMES below ↓</b></div>
    <small>Plans are recommendations, not confirmed reservations. Ticket and booking links remain visible for final action.</small>
  </section>
}
