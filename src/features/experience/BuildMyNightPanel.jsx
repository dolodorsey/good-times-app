import React, { useMemo, useState } from 'react'

const VIBES = ['Grown & sexy','High energy','Date night','Live music','Black-owned','Rooftop','Food first','Something different']
const BUDGETS = ['No preference','Under $50 each','$50–$100 each','$100–$200 each','Premium / VIP']

export default function BuildMyNightPanel({ cityName, busy = false, compact = false, onBuild }) {
  const [occasion,setOccasion]=useState('A night out')
  const [date,setDate]=useState('Tonight')
  const [groupSize,setGroupSize]=useState('2')
  const [area,setArea]=useState('No preference')
  const [budget,setBudget]=useState('No preference')
  const [vibe,setVibe]=useState('Grown & sexy')

  const prompt=useMemo(()=>{
    const people=Number(groupSize||1)
    return [
      `Build my night in ${cityName}.`,
      `Occasion: ${occasion}.`,
      `When: ${date}.`,
      `Group: ${people} ${people===1?'person':'people'}.`,
      `Vibe: ${vibe}.`,
      `Area: ${area}.`,
      `Budget: ${budget}.`,
      'Create a source-backed route with timing, a first stop, main move and optional late move. Keep travel logical and save it as an itinerary.',
    ].join(' ')
  },[area,budget,cityName,date,groupSize,occasion,vibe])

  return <section className={`gt4-night-brief ${compact?'compact':''}`} aria-labelledby="gt-build-night-title">
    <header>
      <span>{compact?'ADJUST THE BRIEF':'BUILD MY NIGHT'}</span>
      <h2 id="gt-build-night-title">Four choices. One complete route.</h2>
      <p>GOOD TIMES checks current events and verified places, then orders the night so it makes sense.</p>
    </header>
    <div className="gt4-night-fields">
      <label><span>When</span><select value={date} onChange={event=>setDate(event.target.value)}><option>Tonight</option><option>Tomorrow</option><option>This Friday</option><option>This Saturday</option><option>This weekend</option></select></label>
      <label><span>People</span><select value={groupSize} onChange={event=>setGroupSize(event.target.value)}>{Array.from({length:12},(_,index)=><option key={index+1} value={String(index+1)}>{index+1}</option>)}</select></label>
      <label><span>Vibe</span><select value={vibe} onChange={event=>setVibe(event.target.value)}>{VIBES.map(item=><option key={item}>{item}</option>)}</select></label>
      <label><span>Budget</span><select value={budget} onChange={event=>setBudget(event.target.value)}>{BUDGETS.map(item=><option key={item}>{item}</option>)}</select></label>
      <label className="wide"><span>Area</span><input value={area} onChange={event=>setArea(event.target.value)} placeholder="No preference, Midtown, Buckhead…"/></label>
      <label className="wide"><span>Occasion</span><input value={occasion} onChange={event=>setOccasion(event.target.value)} placeholder="Date, birthday, friends in town…"/></label>
    </div>
    <button className="gt4-night-submit" type="button" disabled={busy} onClick={()=>onBuild?.(prompt)}>{busy?'Building the route…':compact?'Update route ✦':'Build my night ✦'}</button>
    <small>Recommendations are not reservations. Current ticket and booking links remain attached to each stop.</small>
  </section>
}
