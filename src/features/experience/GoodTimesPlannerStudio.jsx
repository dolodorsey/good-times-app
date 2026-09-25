import React, { useEffect, useRef, useState } from 'react'
import { categoryEditorialMedia } from './good-times-editorial-media.js'
import { PLAN_MODES, canonicalPlanMode, cityDate, buildPlanPrompt, validateDraft, eligibleShakeVenues, nextShakePick } from './good-times-ux-model.js'

const blankDraft = () => ({ occasion:'Something different', date:cityDate(), time:'18:00', adults:'2', children:'0', budget:'', area:'', notes:'' })
const MOODS = [['Date night','dining'],['Family day','experience'],['Dinner with friends','dining'],['Live music','live music'],['Night out','nightlife'],['Something different','experience']]
function useDraft(session, mode) {
  const key = `gt_ux_draft_v1:${session?.user?.id || 'guest'}:${mode}`
  const [draft,setDraft] = useState(() => {
    try { const stored=JSON.parse(sessionStorage.getItem(key)||'null'); return stored && typeof stored==='object' ? {...blankDraft(),...stored} : blankDraft() } catch { return blankDraft() }
  })
  useEffect(()=>{try{sessionStorage.setItem(key,JSON.stringify(draft))}catch{}},[key,draft])
  return [draft,patch=>setDraft(current=>({...current,...patch}))]
}
function moodArtwork(label,art){return label==='Family day'?'/city-atlanta.png':categoryEditorialMedia(art,[],'atlanta')}
function Field({label,error,children}) { return <label className="gt-ux-field"><span>{label}</span>{children}{error&&<small className="gt-ux-error">{error}</small>}</label> }
function Basics({draft,patch,errors={},compact=false}) {
  return <div className={`gt-ux-fields ${compact?'gt-ux-fields-compact':''}`}>
    <Field label="Date" error={errors.date}><input type="date" aria-label="Plan date" min={cityDate()} value={draft.date} onChange={e=>patch({date:e.target.value})} aria-invalid={!!errors.date}/></Field>
    <Field label="Start time · Atlanta" error={errors.time}><input type="time" aria-label="Plan start time" value={draft.time} onChange={e=>patch({time:e.target.value})} aria-invalid={!!errors.time}/></Field>
    <Field label="Adults" error={errors.adults}><input type="number" min="1" max="50" inputMode="numeric" value={draft.adults} onChange={e=>patch({adults:e.target.value})} aria-invalid={!!errors.adults}/></Field>
    <Field label="Children" error={errors.children}><input type="number" min="0" max="50" inputMode="numeric" value={draft.children} onChange={e=>patch({children:e.target.value})} aria-invalid={!!errors.children}/></Field>
    <Field label="Total group budget ($)" error={errors.budget}><input type="number" min="0" inputMode="decimal" placeholder="Open budget" value={draft.budget} onChange={e=>patch({budget:e.target.value})} aria-invalid={!!errors.budget}/></Field>
    <Field label="Neighborhood"><input value={draft.area} placeholder="Anywhere in Atlanta" maxLength={80} onChange={e=>patch({area:e.target.value})}/></Field>
  </div>
}
function DraftSummary({draft}) { return <div className="gt-ux-draft-summary"><span>{draft.occasion}</span><span>{draft.date} · {draft.time} ET</span><span>{Number(draft.adults)||0} adults{Number(draft.children)>0?` + ${draft.children} children`:''}</span><span>{draft.budget===''?'Budget open':`$${draft.budget} total`}</span></div> }
function UseBuild({onBuild,busy,children}) {
  // Every mode has a synchronous submission guard, not just a disabled button.
  const locked=useRef(false), [working,setWorking]=useState(false), [message,setMessage]=useState('')
  const submit=async prompt=>{
    if(locked.current||busy)return null
    locked.current=true;setWorking(true);setMessage('Checking current inventory, timing and your requirements…')
    try { const result=await onBuild(prompt,'itinerary');setMessage(result?.itinerary?'Draft created. Review each stop before booking.':result?.message||'No verified plan was returned. Adjust your requirements and try again.');return result }
    catch(error){setMessage(error?.message||'The plan could not be verified. Please try again.');return null}
    finally{locked.current=false;setWorking(false)}
  }
  return children({submit,working:working||busy,message,setMessage})
}
function ClickThroughPlanner({session,onBuild,busy}) {
  const[draft,patch]=useDraft(session,'click'),[step,setStep]=useState(0),[errors,setErrors]=useState({})
  const next=()=>{if(step===1){const found=validateDraft(draft);setErrors(found);if(Object.keys(found).length)return}setStep(x=>Math.min(2,x+1))}
  return <UseBuild onBuild={onBuild} busy={busy}>{({submit,working,message})=><section className="gt-ux-planner-panel" aria-label="Click-through plan builder">
    <div className="gt-ux-stephead"><span>BUILD IT</span><strong>{step+1} / 3</strong></div>
    <div className="gt-ux-progress" aria-label={`Step ${step+1} of 3`}>{['The occasion','The details','Your plan'].map((label,index)=><span className={index<=step?'active':''} key={label}>{label}</span>)}</div>
    <h2>{['What kind of good time?','Make it work for your people.','Your brief. Your good time.'][step]}</h2>
    {step===0&&<div className="gt-ux-moods">{MOODS.map(([label,art])=><button key={label} aria-pressed={draft.occasion===label} className={draft.occasion===label?'active':''} style={{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.82),rgba(0,0,0,.12)),url("${moodArtwork(label,art)}")`}} onClick={()=>patch({occasion:label,...(label==='Family day'&&Number(draft.children)===0?{children:'1'}:{})})}><span>{label}</span>{draft.occasion===label&&<b aria-hidden="true">✓</b>}</button>)}</div>}
    {step===1&&<><Basics draft={draft} patch={patch} errors={errors}/><Field label="Anything else we should know?"><textarea rows={3} value={draft.notes} maxLength={1000} placeholder="Accessibility, dietary needs, indoor activities, music…" onChange={e=>patch({notes:e.target.value})}/></Field></>}
    {step===2&&<><DraftSummary draft={draft}/>{draft.notes&&<p className="gt-ux-note">{draft.notes}</p>}<p className="gt-ux-note">GOOD TIMES checks your request against current listings. Unknown prices or availability remain unconfirmed.</p></>}
    {message&&<p className="gt-ux-status" role="status">{message}</p>}
    {Object.keys(errors).length>0&&step===1&&<p className="gt-ux-error" role="alert">Check the highlighted details before continuing.</p>}
    <div className="gt-ux-actions">{step>0&&<button onClick={()=>setStep(x=>x-1)} disabled={working}>Back</button>}{step<2?<button className="primary" onClick={next}>Continue <span aria-hidden="true">→</span></button>:<button className="primary" disabled={working} onClick={()=>void submit(buildPlanPrompt(draft))}>{working?'Building…':'Create my draft plan'} <span aria-hidden="true">↗</span></button>}</div>
  </section>}</UseBuild>
}
function ShakePlanner({session,venues,onOpen,onBuild,busy}) {
  const[draft,patch]=useDraft(session,'shake'),[picked,setPicked]=useState(null),[recent,setRecent]=useState([]),[enabled,setEnabled]=useState(false),[motionMessage,setMotionMessage]=useState('Tap to choose. Phone motion is optional.'),[errors,setErrors]=useState({}),[details,setDetails]=useState(false)
  const lastMotion=useRef(0), previous=useRef(null), pickRef=useRef(null)
  const choose=()=>{
    const found=validateDraft(draft);setErrors(found);if(Object.keys(found).length){setDetails(true);return}
    const pool=eligibleShakeVenues(venues,draft), next=nextShakePick(pool,recent)
    if(!next){setMotionMessage('No source-backed starting points match these filters. Adjust the area or use Ask GOOD TIMES.');return}
    setPicked(next);setRecent(rows=>[...rows,String(next.id)].slice(-8));setMotionMessage('A starting point, not a booking. Build a plan to check the rest of your requirements.')
  }
  pickRef.current=choose
  useEffect(()=>{if(!enabled)return undefined;const listener=e=>{const a=e.accelerationIncludingGravity||e.acceleration;if(!a)return;const next=[a.x||0,a.y||0,a.z||0], old=previous.current;previous.current=next;if(!old)return;const impulse=Math.sqrt(next.reduce((sum,v,i)=>sum+(v-old[i])**2,0));if(impulse>18&&Date.now()-lastMotion.current>1600){lastMotion.current=Date.now();pickRef.current?.()}};window.addEventListener('devicemotion',listener);return()=>window.removeEventListener('devicemotion',listener)},[enabled])
  const enable=async()=>{try{if(typeof window.DeviceMotionEvent==='undefined')throw new Error('unavailable');if(typeof window.DeviceMotionEvent.requestPermission==='function'&&await window.DeviceMotionEvent.requestPermission()!=='granted')throw new Error('denied');setEnabled(true);setMotionMessage('Motion enabled. Shake your phone, or use the button.')}catch{setEnabled(false);setMotionMessage('Motion is unavailable or not enabled. Tap to shake still works.')}}
  return <UseBuild onBuild={onBuild} busy={busy}>{({submit,working,message})=><section className="gt-ux-planner-panel gt-ux-shake" aria-label="Shake plan builder">
    <span className="gt-ux-eyebrow">SHAKE IT</span><h2>Less deciding.<br/><em>More doing.</em></h2><p>A real place to start. A complete plan when you’re ready.</p>
    <button className="gt-ux-shake-orb" onClick={choose} disabled={working} aria-label="Tap to shake"><span aria-hidden="true">✦</span><strong>{picked?'Shake again':'Tap to shake'}</strong></button>
    <div className="gt-ux-actions"><button onClick={()=>setDetails(x=>!x)} aria-expanded={details}>{details?'Hide details':'Set my preferences'}</button><button onClick={()=>enabled?setEnabled(false):void enable()}>{enabled?'Turn motion off':'Enable phone shake'}</button></div>
    {details&&<Basics draft={draft} patch={patch} errors={errors} compact/>}
    <p className="gt-ux-status" role="status">{motionMessage}</p>
    {picked&&<div className="gt-ux-shake-result">{picked.hero_image&&<img src={picked.hero_image} alt=""/>}<div><span>YOUR STARTING POINT</span><h3>{picked.name}</h3><p>{picked.neighborhood||'Atlanta'}{picked.price_range?` · ${picked.price_range}`:''}</p><p className="gt-ux-note">Hours, age rules and total cost still need verification.</p><div className="gt-ux-actions"><button onClick={()=>onOpen(picked)}>View place</button><button className="primary" disabled={working} onClick={()=>void submit(buildPlanPrompt(draft,{anchor:picked}))}>{working?'Building…':'Keep it & build a plan'}</button></div></div></div>}
    {message&&<p className="gt-ux-status" role="status">{message}</p>}
  </section>}</UseBuild>
}
function AskPlanner({session,onBuild,busy,initialText=''}) {
  const[draft,patch]=useDraft(session,'ask'),[text,setText]=useState(initialText),[messages,setMessages]=useState([])
  useEffect(()=>{if(initialText)setText(initialText)},[initialText])
  const suggestions=['Family afternoon, mostly indoors','Dinner and live music for two','Something different with friends']
  return <UseBuild onBuild={onBuild} busy={busy}>{({submit,working,message})=>{
    const send=async()=>{const clean=text.trim();if(!clean||working)return;setText('');const history=messages.map(row=>`${row.role}: ${row.text}`).join('\n');setMessages(rows=>[...rows,{role:'You',text:clean}]);const result=await submit(`Plan in Atlanta. User request: ${clean}\n${history?`Conversation context (retain accepted constraints):\n${history.slice(-4000)}\n`:''}Use only verified current inventory. If essential details are missing, ask a specific question rather than guessing. Never invent prices, hours, availability, reservations or confirmation. Return a draft, not a booking.`);setMessages(rows=>[...rows,{role:'GOOD TIMES',text:result?.message||(result?.itinerary?'Your draft is ready to review. Nothing has been booked.':'I couldn’t verify a plan. Try a more specific date, area or budget.')}]);patch({notes:clean})}
    return <section className="gt-ux-planner-panel gt-ux-ask" aria-label="Ask GOOD TIMES planner"><span className="gt-ux-eyebrow">ASK GOOD TIMES</span><h2>Tell us the idea.</h2><p>People, place, time, budget. Speak naturally.</p>
      <div className="gt-ux-conversation" role="log" aria-live="polite">{messages.map((row,index)=><article key={index} className={row.role==='You'?'from-user':''}><strong>{row.role}</strong><p>{row.text}</p></article>)}</div>
      <form onSubmit={e=>{e.preventDefault();void send()}} className="gt-ux-composer"><label htmlFor="gt-ux-ask-input">Your request</label><textarea id="gt-ux-ask-input" value={text} maxLength={1500} rows={4} placeholder="Two adults and two kids, Saturday afternoon, under $150 total, near Midtown…" onChange={e=>setText(e.target.value)}/><div><small>Suggestions are not reservations.</small><button className="primary" type="submit" disabled={!text.trim()||working}>{working?'Checking…':'Ask GOOD TIMES'} <span aria-hidden="true">↑</span></button></div></form>
      {!messages.length&&<div className="gt-ux-suggestions">{suggestions.map(value=><button key={value} onClick={()=>setText(value)}>{value} <span aria-hidden="true">↗</span></button>)}</div>}
      {working&&<p className="gt-ux-status" role="status">{message}</p>}
    </section>
  }}</UseBuild>
}
export default function GoodTimesPlannerStudio({session,mode,onMode,venues,onOpen,onBuild,busy,initialText='',heroImage}) {
  const current=canonicalPlanMode(mode), shell=useRef(null)
  return <section ref={shell} className="gt-ux-planner" aria-label="Plan your good time"><header className="gt-ux-pagehead" style={{'--ux-art':`url("${heroImage||''}")`}}><span>GOOD TIMES · ATLANTA</span><h1>A good time.<br/><em>Your way.</em></h1><p>Build it. Shake it. Ask us.</p></header><div className="gt-ux-plan-tabs" role="tablist" aria-label="Planning methods">{PLAN_MODES.map(([id,title,description])=><button role="tab" id={`gt-ux-tab-${id}`} aria-controls={`gt-ux-panel-${id}`} aria-selected={current===id} key={id} onClick={()=>{onMode(id);shell.current?.closest('.gt5-main')?.scrollTo({top:0,behavior:'auto'})}}><span>{id==='click'?'01':id==='shake'?'02':'03'}</span><strong>{title}</strong><small>{description}</small></button>)}</div>
    <div id="gt-ux-panel-click" role="tabpanel" aria-labelledby="gt-ux-tab-click" hidden={current!=='click'}><ClickThroughPlanner session={session} onBuild={onBuild} busy={busy}/></div>
    <div id="gt-ux-panel-shake" role="tabpanel" aria-labelledby="gt-ux-tab-shake" hidden={current!=='shake'}>{current==='shake'&&<ShakePlanner session={session} venues={venues} onOpen={onOpen} onBuild={onBuild} busy={busy}/>}</div>
    <div id="gt-ux-panel-ask" role="tabpanel" aria-labelledby="gt-ux-tab-ask" hidden={current!=='ask'}><AskPlanner session={session} onBuild={onBuild} busy={busy} initialText={initialText}/></div>
  </section>
}
