import fs from 'node:fs';

const file='src/App.jsx';
let src=fs.readFileSync(file,'utf8');

// 1) Canonical five-tab shell. Dates remains a secondary Discover/calendar action.
src=src.replace(/const navDefs=\[[\s\S]*?\n  \];/,`const navDefs=[
    {id:"now",l:"Now",emoji:"✦"},
    {id:"explore",l:"Discover",emoji:"◇"},
    {id:"planforme",l:"Build",emoji:"✦",primary:true},
    {id:"plans",l:"Plans",emoji:"≋"},
    {id:"vault",l:"Vault",emoji:"▢"}
  ];`);

// 2) Explore -> Discover: editorial answers first, compact directory second.
const exStart=src.indexOf('// ═══ EXPLORE ═══');
const exEnd=src.indexOf('// ═══ MAP ═══',exStart);
if(exStart>0&&exEnd>exStart){
  let ex=src.slice(exStart,exEnd);

  const editorial=`          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,letterSpacing:3,color:C.gold,fontWeight:700,marginBottom:6}}>DISCOVER</div>
            <div style={{fontSize:30,fontFamily:F.s,fontWeight:700,marginBottom:5}}>Know ${'${city.name}'}.</div>
            <div style={{fontSize:13,color:C.textSec,lineHeight:1.45}}>The best places, events and experiences — ranked by Good Times.</div>
          </div>
          {(()=>{
            const future=cityEvents.filter(e=>e.date&&e.date>=todayStr&&e.source!=="venue"&&e.source!=="daily_event");
            const tonight=cityEvents.filter(e=>e.date===todayStr).slice(0,6);
            const concerts=future.filter(e=>(e.category||"").match(/concert|music|jazz/)||e.source==="show").slice(0,6);
            const weekendEnd=new Date();weekendEnd.setDate(weekendEnd.getDate()+7);const weekendEndStr=weekendEnd.toISOString().split("T")[0];
            const weekend=future.filter(e=>e.date<=weekendEndStr).slice(0,6);
            const dining=events.filter(e=>e.city===city.name&&(e.source==="venue"||e.source==="happening")&&(e.category||"").match(/restaurant|brunch|food|wine_bar/)).slice(0,6);
            const dateNight=events.filter(e=>e.city===city.name&&(e.source==="venue"||e.source==="happening")&&(e.category||"").match(/restaurant|rooftop|jazz|wine_bar|speakeasy/)).slice(0,6);
            const collections=[
              {t:"Top Right Now",sub:"The strongest moves for this moment",items:tonight},
              {t:"Best Restaurants Right Now",sub:"Good Times picks worth the reservation",items:dining},
              {t:"Upcoming Concerts",sub:"Shows worth planning around",items:concerts},
              {t:"Date Night",sub:"Places that make the night easy",items:dateNight},
              {t:"This Week",sub:"Worth putting on the calendar",items:weekend}
            ].filter(c=>c.items.length);
            return <div style={{marginBottom:16}}>{collections.map(c=><div key={c.t} style={{marginBottom:17}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:12,marginBottom:8}}>
                <div><div style={{fontSize:18,fontFamily:F.s,fontWeight:700}}>{c.t}</div><div style={{fontSize:10.5,color:C.muted,marginTop:2}}>{c.sub}</div></div>
                <button onClick={()=>navigate(c.t==="Upcoming Concerts"?"calendar":"explore","explore")} style={{background:"none",border:"none",color:C.gold,fontSize:10.5,fontWeight:700,whiteSpace:"nowrap",cursor:"pointer"}}>See all ›</button>
              </div>
              <div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:3,scrollSnapType:"x mandatory"}}>
                {c.items.map((e,i)=><button key={(e.id||e.title||c.t)+i} onClick={()=>{if(e.source==="venue"){setSearchOpen(true);setSearch(e.title||e.name||"")}else{setDetail(e);navigate("detail")}}} style={{...K,minWidth:158,maxWidth:158,padding:0,overflow:"hidden",textAlign:"left",cursor:"pointer",scrollSnapAlign:"start",border:"1px solid rgba(212,168,83,.16)"}}>
                  <div style={{height:92,background:C.bgCard,overflow:"hidden"}}><img src={wn(e)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/></div>
                  <div style={{padding:"9px 10px 10px"}}><div style={{fontSize:12,fontWeight:700,lineHeight:1.25,color:C.text,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{e.title||e.name}</div><div style={{fontSize:9.5,color:C.muted,marginTop:4}}>{e.neighborhood||e.venue||e.city||city.name}</div></div>
                </button>)}
              </div>
            </div>)}</div>;
          })()}
          <div style={{display:"flex",gap:7,overflowX:"auto",marginBottom:16,paddingBottom:2}}>
            {["Dinner","Date Night","Nightlife","Live Music","Brunch","Family","Black Atlanta","Something Different"].map(label=><button key={label} onClick={()=>{const needle=label==="Dinner"?"Dining":label==="Black Atlanta"?"Black Culture":label==="Something Different"?"Attractions":label;const cat=exploreCategories.find(c=>c.name?.includes(needle)||c.subs?.some(s=>String(s).includes(needle)));if(cat)setExploreSheet(cat)}} style={{...V(false),whiteSpace:"nowrap",padding:"8px 12px",fontSize:10.5}}>{label}</button>)}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"2px 0 10px"}}><div><div style={{fontSize:10,letterSpacing:2.2,color:C.gold,fontWeight:700}}>EXPLORE BY CATEGORY</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>Browse the full city only when you need it.</div></div></div>`;

  // Replace either the old directory-first header or the v3 editorial header/collections with v5.
  ex=ex.replace(/\s*<div style=\{\{(?:textAlign:"center"|marginBottom:18)[\s\S]*?(?=<div style=\{\{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24\}\}>)/,`\n${editorial}\n          `);

  // Compact the category directory and remove database-count emphasis.
  ex=ex.replace('gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24','gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:18');
  ex=ex.replaceAll('height:130,position:"relative"','height:96,position:"relative"');
  ex=ex.replaceAll('fontSize:30','fontSize:20');
  ex=ex.replaceAll('fontSize:15,fontWeight:700','fontSize:12.5,fontWeight:700');
  ex=ex.replace(/<div style=\{\{fontSize:12,color:"#FFFFFF"[^}]*\}\}>\{cat\.subs\.length\} types<\/div>/g,'<div style={{fontSize:9.5,color:"rgba(255,255,255,.72)"}}>Open collection</div>');
  ex=ex.replace(/<div style=\{\{fontSize:12,color:"#FFFFFF"[^}]*\}\}>Explore<\/div>/g,'<div style={{fontSize:9.5,color:"rgba(255,255,255,.72)"}}>Open collection</div>');

  // Use category-correct real photography where we have a current trusted venue image.
  const imgMap=`{\n                "Arts, Museums & Culture":"https://highmuseum-redesign.s3.amazonaws.com/uploads/2023/02/DSC08446.jpg",\n                "Arts & Museums & Culture":"https://highmuseum-redesign.s3.amazonaws.com/uploads/2023/02/DSC08446.jpg",\n                "Games, Trivia & Interactive":"https://cdn.theescapegame.com/images/3bootchj/production/6d67e5c6025210716bf9edc4a710f9c3a0dcca90-1284x1049.png",\n                "Travel, Hotels & Staycations":"https://symphony.cdn.tambourine.com/the-starling/media/thewren-experience-happenings-liveatatl-629a8e079a9ae.jpeg",\n                "Concerts & Live Music":"https://img1.wsimg.com/isteam/ip/e08d1acf-dabc-4e55-b762-b843bd7f8daa/IMG_6022.jpeg",\n                "Family & Kids":"https://images.unsplash.com/photo-1469022563149-aa64dbd37daa?w=1200&h=675&fit=crop",\n                "Wellness & Fitness":"https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=1200&h=675&fit=crop",\n                "Business, Tech & Professional":"https://images.unsplash.com/photo-1540575467063-178f50002991?w=1200&h=675&fit=crop",\n                "Fashion, Beauty & Shopping":"https://images.unsplash.com/photo-1555529669-e69e7f0acf47?w=1200&h=675&fit=crop",\n                "Attractions & Experiences":"https://cdn.theescapegame.com/images/3bootchj/production/6d67e5c6025210716bf9edc4a710f9c3a0dcca90-1284x1049.png"\n              }`;
  ex=ex.replace('src={Ne.ex[cat.id]||Ne.v[0]}',`src={(${imgMap})[cat.name]||Ne.ex[cat.id]||Ne.v[0]}`);

  src=src.slice(0,exStart)+ex+src.slice(exEnd);
}

// 3) Mobile shell density: compact Party Board/search, smaller inner chrome, and robust sticky behavior.
// Add a runtime marker because several generations of the Party Board exist in production builds.
const browserBind='  // City events\n  const cityEvents=useMemo';
if(src.includes(browserBind)){
  src=src.replace(browserBind,`  useEffect(()=>{\n    const compact=()=>{\n      const nodes=[...document.querySelectorAll('div,span')];\n      const label=nodes.find(el=>el.childElementCount===0&&el.textContent?.trim().toUpperCase()==='PARTY BOARD');\n      if(label){\n        let p=label.parentElement;\n        for(let i=0;i<5&&p;i++,p=p.parentElement){\n          const r=p.getBoundingClientRect?.();\n          if(r&&r.width>300&&r.height>70&&r.height<220){p.classList.add('gt-party-board-runtime');break;}\n        }\n      }\n      const input=document.querySelector('input[placeholder*="Search venue"],input[placeholder*="Search Good Times"]');\n      if(input){input.classList.add('gt-discover-search-input');let p=input.parentElement;if(p)p.classList.add('gt-discover-search-wrap');}\n    };\n    compact();const mo=new MutationObserver(compact);mo.observe(document.body,{childList:true,subtree:true});return()=>mo.disconnect();\n  },[screen]);\n\n  // City events\n  const cityEvents=useMemo`);
}

// Compact mini-header at source level too.
src=src.replace('padding:"8px 16px 4px"','padding:"5px 14px 2px"');
src=src.replace('width:30,height:30,borderRadius:"50%"','width:28,height:28,borderRadius:"50%"');

// Inject late CSS that wins over older inline-ish component generations via !important.
const styleNeedle='.gt-screen-host{isolation:isolate;}';
if(src.includes(styleNeedle)&&!src.includes('.gt-party-board-runtime{')){
  src=src.replace(styleNeedle,`${styleNeedle}\n        .gt-party-board-runtime{max-height:54px!important;min-height:50px!important;height:54px!important;overflow:hidden!important;padding-top:4px!important;padding-bottom:4px!important;transition:max-height .22s ease!important;}\n        .gt-party-board-runtime img{display:none!important;}\n        .gt-discover-search-wrap{max-height:58px!important;min-height:52px!important;margin-top:6px!important;margin-bottom:10px!important;}\n        .gt-discover-search-input{height:52px!important;min-height:52px!important;padding-top:0!important;padding-bottom:0!important;font-size:15px!important;}\n        @media(max-width:430px){.gt-screen-scroll{scroll-padding-top:68px}.gt-party-board-runtime{position:sticky!important;top:0!important;z-index:30!important;}}`);
}

fs.writeFileSync(file,src);
console.log('apply-discover-v5: complete');
