import React,{useEffect,useMemo,useState} from 'react'
import AdSlot from './AdSlot.jsx'
import {Icon,SCENES,Rail} from './Kit.jsx'
import {safeImage,cleanTitle} from './model.js'
import {FREE_CATEGORIES,freeEvents,badgeFor,sourceLabel,expiresLabel,offerActions,inCategory,endingSoon,featuredOfTheDay,isThisWeekend,
  trackOffer,savedOfferIds,toggleSavedOffer,shareOffer,loadOffers,attribution} from './free-in-the-a.js'

const openLink=href=>{try{window.open(href,'_blank','noopener,noreferrer')}catch{/* */}}

/** Entertainment entry banner — premium, its own identity, one tap into FREE IN THE A. */
export function FreeInTheABanner({count=0,onOpen}){
  return <button type="button" className="gtf-banner" onClick={onOpen} aria-label="Open FREE IN THE A">
    <span className="gtf-banner-art" aria-hidden="true"/>
    <span className="gtf-banner-gift" aria-hidden="true"><Icon name="gift" size={26}/></span>
    <span className="gtf-banner-copy"><small>NEW · ATLANTA</small><strong>FREE IN THE A</strong><em>Free Food. Free Events. Free Experiences. Real Deals.</em></span>
    <span className="gtf-banner-cta">{count>0?`${count} live`:'Explore'}<Icon name="arrow" size={16}/></span>
  </button>
}

function OfferCard({offer,saved,onOpen,onSave,size='md'}){
  const img=safeImage(offer.image_url)
  useEffect(()=>{trackOffer('impression',{offer})},[offer])
  const exp=expiresLabel(offer)
  return <article className={`gtf-card gtf-card-${size} is-${offer.offer_type}`}>
    <button type="button" className="gtf-card-open" onClick={()=>onOpen(offer)} aria-label={`${offer.title} — ${offer.merchant_name}`}>
      <span className="gtf-card-media" style={img?{backgroundImage:`url("${img}")`}:undefined}>{!img&&<span className="gtf-no-photo"><Icon name="gift" size={26}/><small>Verified photo coming soon</small></span>}</span>
      <span className="gtf-badge">{badgeFor(offer)}</span>
      <span className="gtf-card-copy">
        <small>{(FREE_CATEGORIES.find(c=>c.id===offer.category)||{}).label||'Free'}</small>
        <strong>{cleanTitle(offer.title)}</strong>
        <span>{offer.merchant_name}{offer.location&&offer.location!==offer.merchant_name?` · ${offer.location}`:''}</span>
        {exp&&<em>{exp}</em>}
      </span>
    </button>
    {onSave&&<button type="button" className={`gtf-save ${saved?'is-saved':''}`} aria-pressed={saved} aria-label={saved?'Remove from saved':'Save offer'} onClick={()=>onSave(offer)}><Icon name="heart" size={18}/></button>}
  </article>
}

function OfferSheet({offer,saved,onClose,onSave,onEvent}){
  const [shared,setShared]=useState('')
  useEffect(()=>{trackOffer('detail_view',{offer})},[offer])
  useEffect(()=>{const k=e=>e.key==='Escape'&&onClose();window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[onClose])
  const img=safeImage(offer.image_url)
  const facts=[
    ['Offer',badgeFor(offer)],['Value',offer.actual_value],['Where',offer.location||offer.merchant_name],
    ['Participating',(offer.participating_locations||[]).join(' · ')||null],['Ends',expiresLabel(offer)],
    ['Requirements',offer.requirements],['How to claim',offer.redemption_instructions||({online:'Online',in_store:'In store',app:'In the merchant’s app',rsvp:'RSVP',ticket:'Free ticket',entry_form:'Official entry form',show_code:'Show this offer'})[offer.claim_method]],
    ['Source',sourceLabel(offer)],
  ].filter(([,v])=>v)
  return <div className="gtf-sheet-wrap" role="dialog" aria-modal="true" aria-label={offer.title} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <article className="gtf-sheet">
      <header className="gtf-sheet-hero" style={img?{backgroundImage:`linear-gradient(180deg,rgba(5,6,7,.05),rgba(5,6,7,.92)),url("${img}")`}:undefined}>
        <button type="button" className="gtf-close" onClick={onClose} aria-label="Close offer"><Icon name="back" size={18}/></button>
        <span className="gtf-badge">{badgeFor(offer)}</span>
        <small>FREE IN THE A</small><h2>{cleanTitle(offer.title)}</h2><p>{offer.merchant_name}</p>
      </header>
      {offer.description&&<p className="gtf-desc">{offer.description}</p>}
      <dl className="gtf-facts">{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="gtf-actions">
        {offerActions(offer).map(a=><button key={a.id} type="button" className={a.id==='details'?'':'primary'} onClick={()=>{trackOffer(a.track,{offer});if(a.open&&offer.kind==='event'){onClose();onEvent?.(offer.event)}else if(a.href)openLink(a.href)}}>{a.label}<Icon name="arrow" size={15}/></button>)}
        <button type="button" onClick={async()=>{trackOffer('share',{offer});setShared(await shareOffer(offer))}}><Icon name="share" size={15}/>{shared==='copied'?'Link copied':'Share'}</button>
        <button type="button" aria-pressed={saved} onClick={()=>onSave(offer)}><Icon name="heart" size={15}/>{saved?'Saved':'Save'}</button>
      </div>
      <p className="gtf-fine">GOOD TIMES lists only offers verified with the merchant or an official source. Claiming happens with the merchant; terms are theirs. {offer.kind!=='event'&&offer.verified_at?`Last verified ${new Date(offer.verified_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}.`:''}</p>
    </article>
  </div>
}

function AlertsOptIn(){
  const [state,setState]=useState(()=>{try{return localStorage.getItem('gt-free-alerts')||'off'}catch{return 'off'}})
  const on=async()=>{let perm='default';try{if('Notification' in window)perm=await Notification.requestPermission()}catch{/* */}
    const next=perm==='granted'?'on':'listed';try{localStorage.setItem('gt-free-alerts',next)}catch{/* */};setState(next);trackOffer('alert_opt_in')}
  return <section className="gtf-alerts"><Icon name="bell" size={22}/><div><strong>Freebie Alerts</strong><small>{state==='off'?'Optional. We only notify you with your permission.':state==='on'?'You’re in. Alerts arrive as verified freebies go live.':'You’re on the list — turn on notifications in your browser anytime.'}</small></div>{state==='off'&&<button type="button" onClick={on}>Turn on</button>}</section>
}

export default function FreeInTheA({city='atlanta',events=[],now=Date.now(),initialOfferId=null,onBack,onEvent}){
  const [offers,setOffers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const [cat,setCat]=useState('all'),[open,setOpen]=useState(null),[saved,setSaved]=useState(()=>savedOfferIds())
  useEffect(()=>{let live=true;attribution();trackOffer('section_view');loadOffers(city).then(r=>{if(live)setOffers(r)}).catch(e=>live&&setError(e.message)).finally(()=>live&&setLoading(false));return()=>{live=false}},[city])
  const all=useMemo(()=>[...offers,...freeEvents(events,now)],[offers,events,now])
  useEffect(()=>{if(!initialOfferId||!all.length)return;const hit=all.find(o=>o.id===initialOfferId);if(hit){setOpen(hit);try{const s=JSON.parse(sessionStorage.getItem('gt-free-utm')||'{}');if(/instagram|ig/i.test(s.utm_source||''))trackOffer('ig_referral',{offer:hit})}catch{/* */}}},[initialOfferId,all])
  const featured=useMemo(()=>featuredOfTheDay(all,now),[all,now])
  const trending=useMemo(()=>all.filter(o=>o.kind!=='event').slice(0,10),[all])
  const ending=useMemo(()=>endingSoon(all,now).slice(0,10),[all,now])
  const weekend=useMemo(()=>all.filter(o=>isThisWeekend(o,now)).slice(0,12),[all,now])
  const counts=useMemo(()=>Object.fromEntries(FREE_CATEGORIES.map(c=>[c.id,inCategory(all,c.id,now).length])),[all,now])
  const list=useMemo(()=>cat==='all'?all:inCategory(all,cat,now),[all,cat,now])
  const save=o=>{const s=toggleSavedOffer(o.id);setSaved(new Set(s));if(s.has(o.id))trackOffer('save',{offer:o})}
  const pick=c=>{setCat(c);if(c!=='all')trackOffer('category_view',{category:c})}
  const card=(o,size)=><OfferCard key={o.id} offer={o} size={size} saved={saved.has(o.id)} onOpen={setOpen} onSave={save}/>
  const catMeta=FREE_CATEGORIES.find(c=>c.id===cat)
  return <section className="gtf-root" aria-label="FREE IN THE A">
    <header className="gtf-hero" style={{'--gtf-hero':`url("${SCENES.district}")`}}>
      <button type="button" className="gtf-back" onClick={onBack} aria-label="Back to Entertainment"><Icon name="back" size={18}/></button>
      <small>GOOD TIMES · ATLANTA</small>
      <h1><span aria-hidden="true">🎁</span> FREE IN <em>THE A</em></h1>
      <p>Free Food. Free Events. Free Experiences. Real Deals.</p>
    </header>
    <nav className="gtf-cats" aria-label="FREE IN THE A categories">
      <button type="button" className={cat==='all'?'active':''} aria-pressed={cat==='all'} onClick={()=>pick('all')}>All</button>
      {FREE_CATEGORIES.map(c=><button type="button" key={c.id} className={cat===c.id?'active':''} aria-pressed={cat===c.id} onClick={()=>pick(c.id)}><Icon name={c.icon} size={15}/>{c.label}{counts[c.id]>0&&<b>{counts[c.id]}</b>}</button>)}
    </nav>
    {error&&all.length>0&&<p className="gtf-note" role="status">{error}</p>}
    {loading&&!all.length?<div className="gtf-skeleton" aria-busy="true"/>:cat==='all'?<>
      {featured&&<section className="gtf-featured"><header><small>FEATURED FREEBIE OF THE DAY</small></header>{card(featured,'lg')}</section>}
      {trending.length>0&&<Rail title="Trending" accent="Freebies" kicker="CURATED BY GOOD TIMES" className="gtf-rail">{trending.map(o=>card(o))}</Rail>}
      {ending.length>0&&<Rail title="Ending" accent="Soon" kicker="CONFIRMED EXPIRATION DATES" className="gtf-rail">{ending.map(o=>card(o))}</Rail>}
      {weekend.length>0&&<Rail title="Free This" accent="Weekend" kicker="FRI – SUN" className="gtf-rail">{weekend.map(o=>card(o))}</Rail>}
      {FREE_CATEGORIES.filter(c=>!['today','weekend'].includes(c.id)).map(c=>{const rows=inCategory(all,c.id,now);return rows.length?<Rail key={c.id} title={c.label} kicker={c.blurb.toUpperCase()} className="gtf-rail" onSeeAll={()=>pick(c.id)}>{rows.slice(0,10).map(o=>card(o))}</Rail>:null})}
      {!all.length&&<Empty/>}
      <AdSlot placement="free" slot={0}/>
      <AlertsOptIn/>
      <SubmitInvite/>
    </>:<section className="gtf-grid-wrap"><header><h2>{catMeta?.label}</h2><p>{catMeta?.blurb}</p></header>{list.length?<div className="gtf-grid">{list.map(o=>card(o))}</div>:<Empty category={catMeta}/>}<AlertsOptIn/></section>}
    {open&&<OfferSheet offer={open} saved={saved.has(open.id)} onClose={()=>setOpen(null)} onSave={save} onEvent={onEvent}/>}
  </section>
}

function Empty({category}){
  return <div className="gtf-empty"><Icon name="gift" size={34}/><strong>{category?`No verified ${category.label.toLowerCase()} right now`:'Fresh freebies are being verified'}</strong><p>GOOD TIMES only lists offers we can confirm with the merchant or an official source — no fake deals. Turn on Freebie Alerts and we’ll let you know when new ones go live.</p></div>
}
function SubmitInvite(){
  const [open,setOpen]=useState(false),[state,setState]=useState('idle'),[msg,setMsg]=useState('')
  const submit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries([...f.entries()].map(([k,v])=>[k,String(v).trim()]));setState('busy')
    try{const r=await fetch('/api/offers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'submit',offer:{...body,city_key:'atlanta'}})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j.error||'Submission failed');setState('done');setMsg('Received. Our team verifies every offer with the source before it goes live.')}catch(err){setState('idle');setMsg(err.message)}}
  if(!open)return <button type="button" className="gtf-submit" onClick={()=>setOpen(true)}><Icon name="plus" size={18}/><span><strong>Got a freebie or deal for Atlanta?</strong><small>Businesses can submit offers. Every submission is reviewed and verified before it goes live.</small></span><Icon name="chevron" size={16}/></button>
  return <form className="gtf-form" onSubmit={submit}>
    <h3>Submit an offer</h3>
    <label>Business name<input name="merchant_name" required maxLength={160}/></label>
    <label>Offer title<input name="title" required minLength={3} maxLength={140} placeholder="Free wings with any drink, Tuesdays"/></label>
    <label>Category<select name="category" required defaultValue="food_drinks">{FREE_CATEGORIES.filter(c=>!['today','weekend'].includes(c.id)).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <label>Offer type<select name="offer_type" required defaultValue="free"><option value="free">Free</option><option value="free_with_purchase">Free with purchase</option><option value="discount">Discount</option><option value="giveaway">Giveaway</option></select></label>
    <label>Official link (where customers can confirm it)<input name="source_url" type="url" required pattern="https://.*" placeholder="https://"/></label>
    <label>Requirements / fine print<textarea name="requirements" maxLength={1000}/></label>
    <label>Ends on<input name="expires_at" type="date"/></label>
    <label>Your email or phone (for verification)<input name="submitter_contact" required maxLength={200}/></label>
    <button type="submit" disabled={state==='busy'||state==='done'}>{state==='busy'?'Sending…':state==='done'?'Submitted':'Submit for review'}</button>
    {msg&&<p role="status" className="gtf-note">{msg}</p>}
  </form>
}
