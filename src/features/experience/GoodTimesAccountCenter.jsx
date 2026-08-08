import React, { useMemo, useState } from 'react'
import { clearSession, deleteAccount, readSession } from '../auth/client.js'

const panelStyle={position:'fixed',inset:0,zIndex:9600,background:'linear-gradient(180deg,rgba(5,5,9,.98),#07070c)',color:'#fffaf4',overflowY:'auto',fontFamily:"'DM Sans',system-ui,sans-serif"}
const cardStyle={border:'1px solid rgba(255,255,255,.09)',borderRadius:20,background:'rgba(255,255,255,.035)',padding:16}
const linkStyle={display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:54,padding:'0 14px',borderRadius:14,border:'1px solid rgba(255,255,255,.09)',background:'rgba(255,255,255,.025)',color:'#fffaf4',textDecoration:'none',fontSize:12,fontWeight:800}

export default function GoodTimesAccountCenter(){
  const session=useMemo(()=>readSession(),[])
  const[open,setOpen]=useState(false)
  const[deleting,setDeleting]=useState(false)
  const[error,setError]=useState('')

  const signOut=()=>{clearSession();window.location.assign('/')}
  const removeAccount=async()=>{
    if(deleting)return
    const confirmed=window.confirm('Delete your GOOD TIMES account permanently? Your profile, saves, plans, personalization history and account access will be removed. This cannot be undone.')
    if(!confirmed)return
    setDeleting(true);setError('')
    try{
      await deleteAccount(session)
      window.alert('Your GOOD TIMES account has been deleted.')
      window.location.assign('/')
    }catch(nextError){
      setError(nextError instanceof Error?nextError.message:'Account deletion failed. Please retry or contact support.')
      setDeleting(false)
    }
  }

  return <>
    <button type="button" aria-label="Open GOOD TIMES account" onClick={()=>setOpen(true)} style={{position:'fixed',right:14,bottom:'calc(82px + env(safe-area-inset-bottom,0px))',zIndex:9250,minHeight:38,padding:'0 12px',borderRadius:999,border:'1px solid rgba(245,204,117,.34)',background:'rgba(7,7,12,.88)',backdropFilter:'blur(14px)',color:'#f5cc75',boxShadow:'0 10px 28px rgba(0,0,0,.32)',fontSize:9,fontWeight:900,letterSpacing:'.1em'}}>◎ ACCOUNT</button>

    {open&&<section aria-label="GOOD TIMES account" style={panelStyle}>
      <div style={{maxWidth:540,margin:'0 auto',minHeight:'100%',padding:'calc(18px + env(safe-area-inset-top,0px)) 18px calc(30px + env(safe-area-inset-bottom,0px))'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><div style={{fontSize:9,fontWeight:900,letterSpacing:'.18em',color:'#f5cc75'}}>GOOD TIMES ACCOUNT</div><h1 style={{margin:'7px 0 0',font:"700 38px/1 'Playfair Display',serif",letterSpacing:'-.04em'}}>Your account.</h1></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close account" style={{width:42,height:42,borderRadius:99,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.04)',color:'#fff',fontSize:22}}>×</button></div>

        <div style={{...cardStyle,marginTop:22}}><div style={{fontSize:9,fontWeight:900,letterSpacing:'.12em',color:'rgba(255,255,255,.45)'}}>SIGNED IN AS</div><div style={{marginTop:7,fontSize:15,fontWeight:800,overflowWrap:'anywhere'}}>{session?.user?.email||'GOOD TIMES member'}</div><p style={{margin:'8px 0 0',color:'rgba(255,255,255,.52)',fontSize:11,lineHeight:1.55}}>Your saves, plans, city preferences and recommendation signals are tied to this account.</p></div>

        <div style={{marginTop:18,display:'grid',gap:9}}><a href="/privacy.html" target="_blank" rel="noreferrer" style={linkStyle}><span>Privacy Policy</span><span style={{color:'#f5cc75'}}>›</span></a><a href="/support.html" target="_blank" rel="noreferrer" style={linkStyle}><span>Support & Privacy Choices</span><span style={{color:'#f5cc75'}}>›</span></a></div>

        <div style={{marginTop:18,...cardStyle}}><div style={{fontSize:9,fontWeight:900,letterSpacing:'.12em',color:'rgba(255,255,255,.45)'}}>ACCOUNT ACTIONS</div><button type="button" onClick={signOut} style={{width:'100%',minHeight:48,marginTop:12,borderRadius:14,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.04)',color:'#fff',fontSize:11,fontWeight:900}}>Sign out</button><button type="button" disabled={deleting} onClick={removeAccount} style={{width:'100%',minHeight:48,marginTop:9,borderRadius:14,border:'1px solid rgba(255,92,92,.36)',background:'rgba(255,68,68,.08)',color:'#ffaaaa',fontSize:11,fontWeight:900,opacity:deleting?.66:1}}>{deleting?'Deleting account…':'Delete account permanently'}</button>{error&&<div role="alert" style={{marginTop:10,padding:11,borderRadius:12,background:'rgba(255,68,68,.1)',color:'#ffc2c2',fontSize:10,lineHeight:1.5}}>{error}</div>}<p style={{margin:'11px 0 0',color:'rgba(255,255,255,.42)',fontSize:9,lineHeight:1.55}}>Deletion removes your GOOD TIMES account and associated customer data. This action cannot be undone.</p></div>
      </div>
    </section>}
  </>
}
