import React,{useCallback,useEffect,useState} from 'react'
import {FREE_CATEGORIES} from './free-in-the-a.js'

// FREE IN THE A admin console (?gt-admin=free). Talks to the gt-offers-admin edge function with an admin key kept
// only in this tab's sessionStorage. Approval is impossible without verification (database-enforced).
const API='https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-offers-admin'
const CATS=FREE_CATEGORIES.filter(c=>!['today','weekend'].includes(c.id))
const getKey=()=>{try{return sessionStorage.getItem('gt-free-admin-key')||''}catch{return ''}}

export default function FreeAdmin({onClose}){
  const [key,setKey]=useState(getKey),[draftKey,setDraftKey]=useState(''),[tab,setTab]=useState('queue'),[rows,setRows]=useState([]),[metrics,setMetrics]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false)
  const call=useCallback(async body=>{setBusy(true);setMsg('');try{const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json','x-gt-admin-key':key},body:JSON.stringify({reviewer:'good-times-admin',...body})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}catch(e){setMsg(e.message);if(/unauthorized/i.test(e.message)){try{sessionStorage.removeItem('gt-free-admin-key')}catch{/* */}setKey('')}return null}finally{setBusy(false)}},[key])
  const load=useCallback(async()=>{const j=await call({action:'queue'});if(j)setRows(j.offers||[])},[call])
  useEffect(()=>{if(key&&tab==='queue')load();if(key&&tab==='metrics')call({action:'metrics'}).then(j=>j&&setMetrics(j))},[key,tab,load,call])
  const review=async(id,op,extra={})=>{const j=await call({action:'review',id,op,...extra});if(j){setMsg(`${op} ✓`);load()}}
  if(!key)return <section className="gtf-root gtf-admin"><header className="gtf-hero"><small>ADMIN</small><h1>FREE IN <em>THE A</em></h1><p>Offer approvals, edits and reporting.</p></header>
    <form className="gtf-form" onSubmit={e=>{e.preventDefault();try{sessionStorage.setItem('gt-free-admin-key',draftKey.trim())}catch{/* */}setKey(draftKey.trim())}}><label>Admin key<input type="password" value={draftKey} onChange={e=>setDraftKey(e.target.value)} autoComplete="off" required/></label><button type="submit">Open console</button>{msg&&<p className="gtf-note">{msg}</p>}<button type="button" onClick={onClose}>Back to app</button></form></section>
  return <section className="gtf-root gtf-admin">
    <header className="gtf-hero"><small>ADMIN</small><h1>FREE IN <em>THE A</em></h1><p>Nothing publishes until it is verified and approved.</p></header>
    <nav className="gtf-cats">{[['queue','Queue'],['new','Add offer'],['metrics','Metrics']].map(([id,l])=><button key={id} type="button" className={tab===id?'active':''} onClick={()=>setTab(id)}>{l}</button>)}<button type="button" onClick={()=>{try{sessionStorage.removeItem('gt-free-admin-key')}catch{/* */}setKey('')}}>Lock</button><button type="button" onClick={onClose}>Exit</button></nav>
    {msg&&<p className="gtf-note" role="status">{msg}</p>}
    {tab==='queue'&&<div className="gtf-admin-list">{busy&&!rows.length?<p className="gtf-note">Loading…</p>:!rows.length?<p className="gtf-note">No offers yet. Add one or wait for partner submissions.</p>:rows.map(o=><article key={o.id} className="gtf-admin-row">
      <div><strong>{o.title}</strong><small>{o.merchant_name} · {o.category} · {o.offer_type}{o.expires_at?` · ends ${new Date(o.expires_at).toLocaleDateString()}`:''}</small>
        <p className="gtf-admin-chips"><span>{o.approval_status}</span><span>{o.verification_status}</span>{o.featured&&<span>featured</span>}{o.duplicate_count>0&&<span className="warn">{o.duplicate_count} possible duplicate</span>}{o.is_expired&&<span className="warn">expired</span>}{o.source_type==='partner'&&<span>partner</span>}</p>
        {o.source_url?<a href={o.source_url} target="_blank" rel="noreferrer noopener">{o.source_url}</a>:<em>No source URL — cannot verify</em>}{o.submitter_contact&&<small>Contact: {o.submitter_contact}</small>}</div>
      <div className="gtf-admin-actions">
        <button type="button" onClick={()=>{const u=window.prompt('Official source URL you checked (https://…)',o.source_url||'');if(u&&/^https:\/\//.test(u))review(o.id,'verify',{source_url:u})}}>Verify</button>
        <button type="button" disabled={o.verification_status!=='verified'} onClick={()=>review(o.id,'approve')}>Approve</button>
        <button type="button" onClick={()=>{const n=window.prompt('Reason for rejection');if(n!==null)review(o.id,'reject',{note:n})}}>Reject</button>
        <button type="button" onClick={()=>{const n=window.prompt('What is wrong with this offer?');if(n!==null)review(o.id,'flag',{note:n})}}>Flag</button>
        <button type="button" onClick={()=>review(o.id,o.featured?'unfeature':'feature')}>{o.featured?'Unfeature':'Feature'}</button>
        <button type="button" onClick={()=>{const d=window.prompt('New end date (YYYY-MM-DD)');if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d))review(o.id,'set_expiration',{expires_at:`${d}T23:59:00-05:00`})}}>Set end</button>
        <button type="button" onClick={()=>review(o.id,'expire')}>Expire</button>
      </div></article>)}</div>}
    {tab==='new'&&<form className="gtf-form" onSubmit={async e=>{e.preventDefault();const f=Object.fromEntries([...new FormData(e.currentTarget).entries()].map(([k,v])=>[k,String(v).trim()]).filter(([,v])=>v));if(f.expires_at)f.expires_at=`${f.expires_at}T23:59:00-05:00`;if(f.starts_at)f.starts_at=`${f.starts_at}T00:00:00-05:00`;const j=await call({action:'upsert',offer:{...f,city_key:'atlanta'}});if(j){setMsg('Saved to the queue as pending. Verify, then approve.');e.currentTarget.reset()}}}>
      <h3>New offer (lands as pending)</h3>
      <label>Offer title<input name="title" required minLength={3} maxLength={140}/></label>
      <label>Merchant / brand / venue<input name="merchant_name" required/></label>
      <label>Category<select name="category" required>{CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      <label>Offer type<select name="offer_type" required><option value="free">Free</option><option value="free_with_purchase">Free with purchase</option><option value="discount">Discount</option><option value="giveaway">Giveaway</option></select></label>
      <label>Description<textarea name="description" maxLength={2000}/></label>
      <label>Real merchant/venue image (https)<input name="image_url" type="url" pattern="https://.*"/></label>
      <label>Location (address)<input name="location"/></label>
      <label>Participating locations (comma separated)<input name="participating_locations"/></label>
      <label>Verified value (e.g. “$12 entrée”, “20% off”)<input name="actual_value"/></label>
      <label>Requirements / restrictions<textarea name="requirements"/></label>
      <label>Claim method<select name="claim_method"><option value="">—</option><option value="online">Online</option><option value="in_store">In store</option><option value="app">Merchant app</option><option value="rsvp">RSVP</option><option value="ticket">Free ticket</option><option value="entry_form">Official entry form</option><option value="show_code">Show this offer</option></select></label>
      <label>Claim link (https)<input name="claim_url" type="url" pattern="https://.*"/></label>
      <label>Redemption instructions<textarea name="redemption_instructions"/></label>
      <label>Official source link (https)<input name="source_url" type="url" pattern="https://.*" required/></label>
      <label>Starts<input name="starts_at" type="date"/></label>
      <label>Ends<input name="expires_at" type="date"/></label>
      <button type="submit" disabled={busy}>Save to queue</button>
    </form>}
    {tab==='metrics'&&metrics&&<div className="gtf-admin-metrics">
      <p className="gtf-note">Last 30 days (raw events; claim clicks are not confirmed redemptions). Expired / invalid rate: {metrics.expired_or_invalid_rate}%.</p>
      <dl className="gtf-facts">{Object.entries(metrics.last30||{}).map(([k,v])=><div key={k}><dt>{k.replace(/_/g,' ')}</dt><dd>{v}</dd></div>)}</dl>
      <h3>Traffic sources</h3><dl className="gtf-facts">{Object.entries(metrics.sources||{}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <h3>By offer</h3><table className="gtf-table"><thead><tr><th>Offer</th><th>Views</th><th>Saves</th><th>Shares</th><th>Claim clicks</th><th>IG</th></tr></thead><tbody>{(metrics.offers||[]).map(o=><tr key={o.offer_id}><td>{o.title}</td><td>{o.detail_views}</td><td>{o.saves}</td><td>{o.shares}</td><td>{o.claim_clicks}</td><td>{o.instagram_referrals}</td></tr>)}</tbody></table>
    </div>}
  </section>
}
