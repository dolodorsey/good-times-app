import React,{useState} from 'react'
import {Icon,SCENES} from './Kit.jsx'

// "Partner with GOOD TIMES" — lives under Profile (owner 2026-11-10). Three real paths: venues, promoters, advertisers.
// Submissions land in a review queue (public.gt_partner_requests via /api/partners); nothing is published automatically.
export const PARTNER_TYPES=[
 {id:'venue',label:'I run a venue',sub:'Restaurant, bar, lounge, club, attraction',icon:'building',image:SCENES.lounge,
  wants:[['listing','Get listed / update my listing'],['events','Post my weekly nights & events'],['photos','Add my photos'],['free','Add a Free In The A offer'],['featured','Featured placement']]},
 {id:'promoter',label:'I’m a promoter',sub:'Parties, day parties, concerts, recurring nights',icon:'music',image:SCENES.nightlife,
  wants:[['events','List my events'],['recurring','Add a weekly / monthly night'],['featured','Feature an event'],['free','Free entry / RSVP offer'],['collab','Content collab']]},
 {id:'advertiser',label:'I want ad space',sub:'Brands, businesses, campaigns',icon:'sparkle',image:SCENES.district,
  wants:[['home','Home screen banner'],['entertainment','Entertainment placement'],['places','Places placement'],['free','Free In The A sponsor'],['newsletter','Newsletter / social bundle']]},
]
const BUDGETS=['Under $250','$250–$1,000','$1,000–$5,000','$5,000+','Not sure yet']
const empty={business_name:'',contact_name:'',email:'',phone:'',instagram:'',website:'',neighborhood:'',details:'',budget:'',start_date:''}
export default function ListWithUs({onClose}){
 const [type,setType]=useState(null),[wants,setWants]=useState([]),[form,setForm]=useState(empty),[state,setState]=useState({status:'idle',error:''})
 const t=PARTNER_TYPES.find(x=>x.id===type)
 const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}))
 const toggle=id=>setWants(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id])
 const submit=async e=>{e.preventDefault();if(state.status==='sending')return
  if(!form.business_name.trim()||!form.contact_name.trim()||!(form.email.trim()||form.phone.trim())){setState({status:'error',error:'Add your business, your name, and an email or phone.'});return}
  setState({status:'sending',error:''})
  try{const r=await fetch('/api/partners',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({request:{...form,partner_type:type,interests:wants}})});const b=await r.json().catch(()=>({}));if(!r.ok||!b.ok)throw new Error(b.error||'Could not send right now.');setState({status:'sent',error:''})}
  catch(err){setState({status:'error',error:err.message})}}
 return <section className="gtk-partner" aria-label="Partner with GOOD TIMES">
  <header className="gtk-partner-head" style={{'--gtk-band-image':`url("${t?.image||SCENES.skyline}")`}}><span className="gtk-partner-art" aria-hidden="true"/>{onClose&&<button type="button" className="gtk-hero-back" onClick={onClose} aria-label="Back to Profile"><Icon name="back" size={20}/></button>}<small>PARTNER WITH GOOD TIMES</small><h2>Get in front of <em>Atlanta.</em></h2><p>Venues, promoters and brands — tell us what you need. Our team reviews every request.</p></header>
  {state.status==='sent'?<div className="gtk-partner-done" role="status"><Icon name="check" size={34}/><h3>Request received.</h3><p>Thanks, {form.contact_name.split(' ')[0]}. The GOOD TIMES team reviews every request and will reach out at {form.email||form.phone}. Nothing goes live until it’s verified.</p><button type="button" className="gtc-primary" onClick={onClose}>Back to Profile</button></div>:<>
  <ol className="gtk-partner-steps" aria-label="Steps"><li className={!type?'active':''}>Who you are</li><li className={type?'active':''}>What you need</li><li>Review</li></ol>
  <div className="gtk-partner-types" role="group" aria-label="I am">{PARTNER_TYPES.map(p=><button type="button" key={p.id} className={type===p.id?'active':''} aria-pressed={type===p.id} style={{'--gtk-partner-image':`url("${p.image}")`}} onClick={()=>{setType(p.id);setWants([])}}><span className="gtk-partner-type-art" aria-hidden="true"/><Icon name={p.icon} size={22}/><strong>{p.label}</strong><small>{p.sub}</small>{type===p.id&&<b aria-hidden="true">✓</b>}</button>)}</div>
  {t&&<form className="gtk-partner-form" onSubmit={submit}>
   <h3>What can we do for you?</h3>
   <div className="gtk-choices is-wrap" role="group" aria-label="What you need">{t.wants.map(([id,label])=><button type="button" key={id} className={wants.includes(id)?'active':''} aria-pressed={wants.includes(id)} onClick={()=>toggle(id)}><strong>{label}</strong></button>)}</div>
   <h3>Tell us about {type==='promoter'?'your events':type==='advertiser'?'your brand':'your venue'}</h3>
   <div className="gtk-partner-fields">
    <label>{type==='promoter'?'Brand / party name':'Business name'}<input value={form.business_name} onChange={set('business_name')} autoComplete="organization" required/></label>
    <label>Your name<input value={form.contact_name} onChange={set('contact_name')} autoComplete="name" required/></label>
    <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email"/></label>
    <label>Phone<input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel"/></label>
    <label>Instagram<input value={form.instagram} onChange={set('instagram')} placeholder="@handle"/></label>
    <label>Website<input type="url" value={form.website} onChange={set('website')} placeholder="https://"/></label>
    {type!=='advertiser'&&<label>Neighborhood<input value={form.neighborhood} onChange={set('neighborhood')} placeholder="Midtown, Buckhead…"/></label>}
    {type==='advertiser'&&<label>Monthly budget<select value={form.budget} onChange={set('budget')}><option value="">Choose</option>{BUDGETS.map(b=><option key={b}>{b}</option>)}</select></label>}
    <label>Start date<input type="date" value={form.start_date} onChange={set('start_date')}/></label>
    <label className="is-wide">{type==='promoter'?'Your nights & events (name, venue, day/time, ticket link)':type==='advertiser'?'Campaign goals':'Anything else we should know'}<textarea rows={4} maxLength={1500} value={form.details} onChange={set('details')}/></label>
   </div>
   {state.status==='error'&&<p className="gtk-partner-error" role="alert">{state.error}</p>}
   <button type="submit" className="gtc-primary gtk-partner-submit" disabled={state.status==='sending'}>{state.status==='sending'?'Sending…':'Send to the GOOD TIMES team'}<Icon name="arrow" size={18}/></button>
   <p className="gtc-note">We only use these details to follow up on this request. Paid placements are always labeled Sponsored.</p>
  </form>}</>}
 </section>
}
