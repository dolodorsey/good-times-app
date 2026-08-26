import fs from 'node:fs';
const file='src/App.jsx';
let src=fs.readFileSync(file,'utf8');
const once=(from,to,label)=>{if(!src.includes(from)) throw new Error(`apply-concierge-ui-v3: missing ${label}`);src=src.replace(from,to)};

// 1) Discover becomes editorial/ranked instead of a taxonomy count wall.
once(
`          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>EXPLORE</div>
            <div style={{fontSize:28,fontFamily:F.s,fontWeight:700,marginBottom:6}}>Discover {city.name}</div>
            <div style={{fontSize:14,color:C.textSec}}>{exploreCategories.length} categories · {exploreCategories.reduce((n,c)=>n+(c.subs?.length||0),0)} subcategories</div>
          </div>`,
`          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,letterSpacing:3,color:C.gold,fontWeight:700,marginBottom:7}}>DISCOVER</div>
            <div style={{fontSize:30,fontFamily:F.s,fontWeight:700,marginBottom:6}}>Know {city.name}.</div>
            <div style={{fontSize:13,color:C.textSec}}>The best places and biggest things — ranked, not dumped into a directory.</div>
          </div>
          {(()=>{
            const future=cityEvents.filter(e=>e.date&&e.date>=todayStr&&e.source!=="venue"&&e.source!=="daily_event");
            const concerts=future.filter(e=>(e.category||"").match(/concert|music|jazz/)||e.source==="show").slice(0,6);
            const eventsTop=future.filter(e=>!(e.category||"").match(/concert|music|jazz|sports/)).slice(0,6);
            const night=future.filter(e=>(e.category||"").match(/nightlife|party|day_party/)).slice(0,6);
            const collections=[
              {t:"Upcoming Concerts",sub:"The shows worth planning around",items:concerts},
              {t:"Biggest Events",sub:"What people will be talking about",items:eventsTop},
              {t:"Best Nightlife",sub:"The strongest moves after dark",items:night}
            ].filter(c=>c.items.length);
            return <div style={{marginBottom:18}}>{collections.map(c=><div key={c.t} style={{marginBottom:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:8}}><div><div style={{fontSize:18,fontFamily:F.s,fontWeight:700}}>{c.t}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{c.sub}</div></div><button onClick={()=>navigate("calendar")} style={{background:"none",border:"none",color:C.gold,fontSize:11,fontWeight:700}}>See all ›</button></div>
              <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:2}}>{c.items.map(e=><div key={e.id} style={{minWidth:170,maxWidth:170}}><EventCard e={e} compact onClick={()=>{setDetail(e);navigate("detail")}}/></div>)}</div>
            </div>)}</div>;
          })()}
          <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:18,paddingBottom:2}}>
            {["Dining","Nightlife","Live Music","Date Night","Brunch","Rooftops","Culture","Sports"].map(label=>{const cat=exploreCategories.find(c=>c.name===label||c.subs?.includes(label));return <button key={label} onClick={()=>cat&&setExploreSheet(cat)} style={{...V(false),whiteSpace:"nowrap",padding:"9px 13px",fontSize:11}}>{label}</button>})}
          </div>`,
'explore hero'
);

// De-emphasize category inventory language.
src=src.replaceAll('>{cat.subs.length} types<','>Explore<');
src=src.replaceAll('>{exploreSheet.subs.length} categories in {city.name}<','>Good Times picks in {city.name}<');

// 2) Build My Night results become complete plans with swappable individual stops.
once(
`                            {stop.why&&<div style={{fontSize:13,color:C.textSec,fontStyle:"italic",marginTop:3}}>"{stop.why}"</div>}
                          </div>`,
`                            {stop.why&&<div style={{fontSize:12,color:C.textSec,fontStyle:"italic",marginTop:3}}>{stop.why}</div>}
                            <button onClick={()=>{const pool=[...cityEvents].filter(e=>e.id!==stop.event.id&&!plan.stops.some(s=>s.event?.id===e.id));if(!pool.length)return;const replacement=pool[Math.floor(Math.random()*pool.length)];setPlanResult(prev=>prev.map((p,pidx)=>pidx!==pi?p:{...p,stops:p.stops.map((s,sidx)=>sidx===si?{...s,event:replacement,why:"Swapped by Good Times"}:s)}));showToast("Stop swapped ✦")}} style={{marginTop:7,background:"transparent",border:`1px solid ${C.gold}35`,color:C.gold,borderRadius:8,padding:"5px 9px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Swap this stop</button>
                          </div>`,
'plan stop swap'
);
src=src.replace('Pick one. Lock it. Go.','Three complete nights. Swap any stop.');
src=src.replace('Lock This Plan','Use This Night');

// 3) Reduce persistent chrome / party-board footprint and overall mobile density.
src=src.replace('paddingBottom:"calc(104px + env(safe-area-inset-bottom, 0px))"','paddingBottom:"calc(88px + env(safe-area-inset-bottom, 0px))"');
src=src.replaceAll('marginBottom:24','marginBottom:18');
src=src.replaceAll('padding:"20px"','padding:"16px"');
src=src.replaceAll('height:160,position:"relative"','height:140,position:"relative"');

// Runtime CSS catches current/legacy Party Board implementations without depending on one component name.
once(
`        .gt-screen-host{isolation:isolate;}`,
`        .gt-screen-host{isolation:isolate;}
        .gt-party-board,[data-party-board],[class*="party-board"],[class*="PartyBoard"]{max-height:56px!important;min-height:48px!important;overflow:hidden!important;transition:max-height .25s ease!important;}
        .gt-party-board img,[data-party-board] img,[class*="party-board"] img,[class*="PartyBoard"] img{display:none!important;}
        .gt-screen-scroll h1,.gt-screen-scroll h2{scroll-margin-top:72px;}`,
'compact runtime css'
);

fs.writeFileSync(file,src);
console.log('apply-concierge-ui-v3: complete');
