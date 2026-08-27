import fs from 'node:fs';

const file='src/App.jsx';
let src=fs.readFileSync(file,'utf8');

if(!src.includes('function WebDownloadPrompt(){')){
  const marker='/* ═══════════════════════════════════════════════════════\n   GOOD TIMES AUTH + ONBOARDING SYSTEM';
  const component=`function WebDownloadPrompt(){
  const[open,setOpen]=useState(false);
  useEffect(()=>{
    if(isNative)return;
    try{if(sessionStorage.getItem('gt_web_download_prompt_seen')==='1')return;}catch{}
    const t=setTimeout(()=>setOpen(true),900);
    return()=>clearTimeout(t);
  },[]);
  if(isNative||!open)return null;
  const ua=typeof navigator!=='undefined'?navigator.userAgent:'';
  const isiOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isAndroid=/Android/i.test(ua);
  const iosUrl=import.meta.env.VITE_IOS_APP_URL||'https://apps.apple.com/us/search?term=Good%20Times%20Worldwide';
  const androidUrl=import.meta.env.VITE_ANDROID_APP_URL||'https://play.google.com/store/apps/details?id=com.kollective.goodtimes';
  const close=()=>{try{sessionStorage.setItem('gt_web_download_prompt_seen','1')}catch{}setOpen(false)};
  const go=url=>{try{sessionStorage.setItem('gt_web_download_prompt_seen','1')}catch{}window.location.href=url;};
  return <div role="dialog" aria-modal="true" aria-label="Download the Good Times app" style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(2,3,8,.82)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'18px 14px calc(18px + env(safe-area-inset-bottom, 0px))'}} onClick={close}>
    <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:410,background:'linear-gradient(180deg,#111119,#09090f)',border:'1px solid rgba(212,168,83,.32)',borderRadius:26,padding:'20px 18px 18px',boxShadow:'0 28px 80px rgba(0,0,0,.55)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
        <div style={{width:52,height:52,borderRadius:16,border:'1px solid rgba(212,168,83,.4)',display:'grid',placeItems:'center',background:'rgba(212,168,83,.08)',overflow:'hidden'}}><img src="/good-times-logo.png" alt="Good Times" style={{width:'82%',height:'82%',objectFit:'contain'}}/></div>
        <div style={{flex:1}}><div style={{fontSize:10,letterSpacing:2.4,color:'#D4A853',fontWeight:800}}>GOOD TIMES APP</div><div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,lineHeight:1.05,color:'#F5F0E8',fontWeight:700,marginTop:3}}>The city moves better in the app.</div></div>
        <button onClick={close} aria-label="Continue on web" style={{width:34,height:34,borderRadius:17,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.05)',color:'#F5F0E8',fontSize:18,cursor:'pointer'}}>×</button>
      </div>
      <div style={{fontSize:13,color:'rgba(245,240,232,.68)',lineHeight:1.55,marginBottom:15}}>Get faster access to Build My Night, saved plans, live city picks, alerts, and the full Good Times experience.</div>
      <div style={{display:'grid',gap:9}}>
        {(!isAndroid)&&<button onClick={()=>go(iosUrl)} style={{width:'100%',border:0,borderRadius:14,padding:'14px 16px',background:'linear-gradient(135deg,#F4D889,#D4A853)',color:'#09090f',fontWeight:800,fontSize:14,cursor:'pointer'}}>Download for iPhone →</button>}
        {(!isiOS)&&<button onClick={()=>go(androidUrl)} style={{width:'100%',border:'1px solid rgba(212,168,83,.35)',borderRadius:14,padding:'13px 16px',background:'rgba(212,168,83,.07)',color:'#F5F0E8',fontWeight:750,fontSize:14,cursor:'pointer'}}>Download for Android →</button>}
        <button onClick={close} style={{width:'100%',border:0,background:'transparent',color:'rgba(245,240,232,.55)',padding:'8px',fontSize:12,cursor:'pointer'}}>Continue on the web</button>
      </div>
    </div>
  </div>;
}

`;
  if(src.includes(marker))src=src.replace(marker,component+marker);
}

if(!src.includes('<WebDownloadPrompt/>')){
  const shell='<div className="gt-app-shell" style={{height:"100vh",height:"100dvh",minHeight:0,background:C.bg,fontFamily:F.f,position:"relative",maxWidth:430,margin:"0 auto",overflow:"hidden",display:"flex",flexDirection:"column"}}>';
  if(src.includes(shell))src=src.replace(shell,shell+'\n      <WebDownloadPrompt/>');
}

fs.writeFileSync(file,src);
console.log('apply-web-download-prompt: complete');
