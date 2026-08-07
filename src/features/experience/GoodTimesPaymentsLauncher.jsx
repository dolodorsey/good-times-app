import React, { useEffect, useMemo, useState } from 'react'
import { openLink, tapHaptic } from '../../native.js'

const CHECKOUT_URL='https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/khg-payment-checkout'
const CATALOG_URL='https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/khg-payment-catalog'
const RETURN_ORIGIN='https://thegoodtimesworldwide.com'

const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((Number(cents)||0)/100)

export default function GoodTimesPaymentsLauncher(){
  const[open,setOpen]=useState(false)
  const[events,setEvents]=useState([])
  const[loading,setLoading]=useState(false)
  const[busy,setBusy]=useState('')
  const[error,setError]=useState('')
  const[cityFilter,setCityFilter]=useState('all')

  useEffect(()=>{if(open&&events.length===0)void load()},[open])

  async function load(){
    setLoading(true);setError('')
    try{
      const response=await fetch(`${CATALOG_URL}?limit=60`,{headers:{Accept:'application/json'}})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Tickets are unavailable')
      setEvents(data.events||[])
    }catch(err){setError(err instanceof Error?err.message:'Tickets are unavailable')}
    finally{setLoading(false)}
  }

  const cities=useMemo(()=>['all',...Array.from(new Set(events.map(event=>event.city).filter(Boolean)))],[events])
  const visible=useMemo(()=>cityFilter==='all'?events:events.filter(event=>event.city===cityFilter),[events,cityFilter])

  async function buy(event,tier){
    const key=`${event.id}:${tier.id}`
    setBusy(key);setError('');void tapHaptic()
    try{
      const response=await fetch(CHECKOUT_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json',Origin:RETURN_ORIGIN},
        body:JSON.stringify({
          action:'ticket',
          ticket_tier_id:tier.id,
          quantity:1,
          source_app:'good_times',
          return_brand_key:'good_times',
          return_origin:RETURN_ORIGIN,
        }),
      })
      const data=await response.json()
      if(!response.ok||!data.checkout_url)throw new Error(data.error||'Secure checkout is unavailable')
      await openLink(data.checkout_url)
    }catch(err){setError(err instanceof Error?err.message:'Secure checkout is unavailable')}
    finally{setBusy('')}
  }

  return <>
    <button
      type="button"
      aria-label="Tickets and paid experiences"
      onClick={()=>{void tapHaptic();setOpen(true)}}
      style={{position:'fixed',right:18,bottom:'calc(84px + env(safe-area-inset-bottom, 0px))',zIndex:8500,border:'1px solid rgba(212,168,83,.55)',background:'linear-gradient(135deg,rgba(19,18,25,.98),rgba(35,28,18,.98))',color:'#F5F0E8',height:48,padding:'0 17px',borderRadius:999,display:'flex',alignItems:'center',gap:9,fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:12,letterSpacing:'.08em',textTransform:'uppercase',boxShadow:'0 14px 40px rgba(0,0,0,.34)',cursor:'pointer'}}
    >
      <span style={{fontSize:16,color:'#D4A853'}}>✦</span> Tickets
    </button>

    {open&&<div role="dialog" aria-modal="true" aria-label="GOOD TIMES tickets" style={{position:'fixed',inset:0,zIndex:9000,background:'rgba(4,4,8,.78)',backdropFilter:'blur(12px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <section style={{width:'min(760px,100%)',maxHeight:'86vh',overflow:'hidden',borderRadius:'28px 28px 0 0',background:'#0B0B11',border:'1px solid rgba(212,168,83,.18)',boxShadow:'0 -30px 90px rgba(0,0,0,.55)',color:'#F5F0E8'}}>
        <div style={{padding:'20px 20px 14px',borderBottom:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'flex-start',gap:14}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,letterSpacing:'.24em',textTransform:'uppercase',color:'#D4A853',fontWeight:800}}>GOOD TIMES ACCESS</div>
            <div style={{fontFamily:"'Cormorant Garamond','Playfair Display',serif",fontSize:'clamp(28px,6vw,42px)',fontWeight:400,marginTop:3}}>Tickets & VIP</div>
            <div style={{fontSize:12,color:'rgba(245,240,232,.56)',marginTop:5}}>Paid KOLLECTIVE events, sections and ticket tiers. Checkout is secured by Stripe.</div>
          </div>
          <button type="button" onClick={()=>setOpen(false)} aria-label="Close tickets" style={{width:38,height:38,borderRadius:99,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.05)',color:'#F5F0E8',fontSize:20,cursor:'pointer'}}>×</button>
        </div>

        {cities.length>2&&<div style={{display:'flex',gap:7,overflowX:'auto',padding:'12px 18px 4px'}}>
          {cities.map(city=><button key={city} type="button" onClick={()=>setCityFilter(city)} style={{whiteSpace:'nowrap',border:`1px solid ${cityFilter===city?'#D4A853':'rgba(255,255,255,.10)'}`,background:cityFilter===city?'rgba(212,168,83,.16)':'rgba(255,255,255,.03)',color:cityFilter===city?'#F2D58F':'rgba(245,240,232,.62)',borderRadius:99,padding:'8px 12px',fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',cursor:'pointer'}}>{city==='all'?'All cities':city}</button>)}
        </div>}

        <div style={{overflowY:'auto',maxHeight:'calc(86vh - 130px)',padding:'14px 18px 34px'}}>
          {loading&&<div style={{padding:'54px 20px',textAlign:'center',color:'rgba(245,240,232,.55)',fontSize:12,letterSpacing:'.12em',textTransform:'uppercase'}}>Loading live ticket inventory…</div>}
          {error&&<div role="alert" style={{padding:'13px 14px',border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.08)',borderRadius:14,color:'#FFB7B7',fontSize:12,marginBottom:12}}>{error}</div>}
          {!loading&&visible.length===0&&<div style={{padding:'44px 20px',textAlign:'center'}}><div style={{fontSize:22,fontFamily:"'Playfair Display',serif"}}>No paid tiers are on sale yet.</div><div style={{fontSize:12,color:'rgba(245,240,232,.48)',marginTop:8}}>Free RSVPs remain free. Paid inventory appears here automatically when activated.</div></div>}
          <div style={{display:'grid',gap:12}}>
            {visible.map(event=><article key={event.id} style={{border:'1px solid rgba(255,255,255,.09)',background:'linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.025))',borderRadius:18,padding:16}}>
              <div style={{fontSize:9,letterSpacing:'.15em',textTransform:'uppercase',color:'#D4A853',fontWeight:800}}>{event.event_date} · {event.city}</div>
              <div style={{fontSize:20,fontWeight:800,marginTop:6}}>{event.name}</div>
              {event.venue&&<div style={{fontSize:11,color:'rgba(245,240,232,.50)',marginTop:3}}>{event.venue}</div>}
              <div style={{display:'grid',gap:7,marginTop:13}}>
                {event.ticket_tiers.map(tier=>{
                  const key=`${event.id}:${tier.id}`;const active=busy===key
                  return <button key={tier.id} type="button" disabled={Boolean(busy)} onClick={()=>buy(event,tier)} style={{minHeight:48,borderRadius:13,border:'1px solid rgba(212,168,83,.22)',background:'rgba(212,168,83,.075)',color:'#F5F0E8',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',cursor:busy?'wait':'pointer',opacity:busy&&!active?.55:1}}>
                    <div style={{flex:1,textAlign:'left'}}><div style={{fontSize:12,fontWeight:800}}>{tier.tier_label}</div><div style={{fontSize:9,color:'rgba(245,240,232,.45)',marginTop:2}}>{tier.capacity?`${tier.capacity} capacity`:'Live inventory'}</div></div>
                    <div style={{fontSize:14,fontWeight:900,color:'#F2D58F'}}>{money(tier.price_cents)}</div>
                    <div style={{fontSize:11,color:'rgba(245,240,232,.50)'}}>{active?'Opening…':'Buy →'}</div>
                  </button>
                })}
              </div>
            </article>)}
          </div>
        </div>
      </section>
    </div>}
  </>
}
