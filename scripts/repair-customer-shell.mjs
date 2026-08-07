import fs from 'node:fs';

const path = new URL('../src/App.jsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');
const original = source;

function replaceOnce(needle, replacement, label) {
  const i = source.indexOf(needle);
  if (i < 0) {
    if (source.includes(replacement)) return;
    throw new Error(`Missing ${label}`);
  }
  source = source.slice(0, i) + replacement + source.slice(i + needle.length);
}

replaceOnce(
`const ScrollWrap=({children})=>(
  <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.f,position:"relative",overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:90,color:C.text}}>
    <div style={{position:"relative",zIndex:10}}>{children}</div>
  </div>
);`,
`const ScrollWrap=({children})=>(
  <div className="gt-screen-scroll" style={{height:"100%",minHeight:0,background:C.bg,fontFamily:F.f,position:"relative",overflowY:"auto",overflowX:"hidden",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch",paddingBottom:"calc(104px + env(safe-area-inset-bottom, 0px))",color:C.text}}>
    <div style={{position:"relative",zIndex:10,minHeight:"100%"}}>{children}</div>
  </div>
);`,
'ScrollWrap',
);

source = source.replace(
'.gt-collage-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#06060C}',
'.gt-collage-wrap{height:100vh;height:100dvh;min-height:0;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#06060C}',
);
source = source.replace(
'.gt-collage-app{position:relative;z-index:2;width:100%;max-width:430px;min-height:100vh;box-shadow:0 0 100px rgba(0,0,0,0.6)}',
'.gt-collage-app{position:relative;z-index:2;width:100%;max-width:430px;height:100vh;height:100dvh;min-height:0;overflow:hidden;box-shadow:0 0 100px rgba(0,0,0,0.6)}',
);

replaceOnce(
`  const navDefs=[
    {id:"now",l:"Now",emoji:"🔥"},
    {id:"calendar",l:"Dates",emoji:"📅"},
    {id:"plans",l:"Itinerary",emoji:"📋"},
    {id:"planforme",l:"Build My Night",emoji:"✨"},
    {id:"explore",l:"Explore",emoji:"🧭"},
    {id:"map",l:"Map",emoji:"📍"},
    {id:"vault",l:"Vault",emoji:"🔒"}
  ];`,
`  const navDefs=[
    {id:"now",l:"Now",emoji:"🔥"},
    {id:"explore",l:"Explore",emoji:"🧭"},
    {id:"planforme",l:"Build My Night",emoji:"✨",primary:true},
    {id:"calendar",l:"Dates",emoji:"📅"},
    {id:"vault",l:"Vault",emoji:"🔒"}
  ];`,
'core navigation',
);

replaceOnce(
`    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.f,position:"relative",maxWidth:430,margin:"0 auto"}}>
      {renderScreen()}`,
`    <div className="gt-app-shell" style={{height:"100vh",height:"100dvh",minHeight:0,background:C.bg,fontFamily:F.f,position:"relative",maxWidth:430,margin:"0 auto",overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <main className="gt-screen-host" style={{flex:"1 1 auto",minHeight:0,overflow:"hidden",position:"relative"}}>{renderScreen()}</main>`,
'app shell',
);

source = source.replace(
'position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430',
'position:"absolute",bottom:0,left:0,right:0,width:"100%",maxWidth:430',
);

source = source.replace(
`<div style={{width:36,height:36,borderRadius:12,background:active?\`linear-gradient(135deg,rgba(212,168,83,0.2),rgba(212,168,83,0.08))\`:"rgba(212,168,83,0.04)",border:active?\`1px solid \${C.gold}40\`:"1px solid rgba(212,168,83,0.12)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s",boxShadow:active?"0 0 12px rgba(212,168,83,0.2)":"none"}}>`,
`<div style={{width:n.primary?46:36,height:n.primary?46:36,borderRadius:n.primary?16:12,marginTop:n.primary?-9:0,background:n.primary?\`linear-gradient(135deg,\${C.gold},#B8942F)\`:active?\`linear-gradient(135deg,rgba(212,168,83,0.2),rgba(212,168,83,0.08))\`:"rgba(212,168,83,0.04)",border:n.primary?"1px solid rgba(255,255,255,.35)":active?\`1px solid \${C.gold}40\`:"1px solid rgba(212,168,83,0.12)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s",boxShadow:n.primary?"0 8px 24px rgba(212,168,83,.42)":active?"0 0 12px rgba(212,168,83,0.2)":"none"}}>`,
);

const exploreAdMarker = `{/* Ad Space instead of HugLife events */}`;
const ctaStart = `<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"4px 0 22px"}}>`;
const ctaBlock = `          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"4px 0 22px"}}>
            <button onClick={()=>navigate("planforme","planforme")} style={{...V(true),padding:"15px 12px",fontSize:13,fontWeight:800,textAlign:"center"}}>✨ Build My Night</button>
            <button onClick={()=>navigate("plans","plans")} style={{...V(false),padding:"15px 12px",fontSize:13,fontWeight:700,textAlign:"center"}}>📋 My Itinerary</button>
          </div>\n`;

// Remove every previously generated Explore CTA, including duplicates from older non-idempotent runs.
let markerIndex = source.indexOf(exploreAdMarker);
if (markerIndex < 0) throw new Error('Missing Explore ad marker');
const ctaRanges = [];
let cursor = 0;
while (true) {
  const start = source.indexOf(ctaStart, cursor);
  if (start < 0 || start >= markerIndex) break;
  const endTag = source.indexOf('</div>', start);
  if (endTag < 0) break;
  const end = endTag + '</div>'.length;
  const segment = source.slice(start, end);
  if (segment.includes('✨ Build My Night</button>') && segment.includes('📋 My Itinerary</button>')) {
    const lineStart = source.lastIndexOf('\n', start) + 1;
    const nextNewline = source.indexOf('\n', end);
    ctaRanges.push([lineStart, nextNewline < 0 ? end : nextNewline + 1]);
  }
  cursor = end;
}
for (let i = ctaRanges.length - 1; i >= 0; i -= 1) {
  const [start, end] = ctaRanges[i];
  source = source.slice(0, start) + source.slice(end);
}
markerIndex = source.indexOf(exploreAdMarker);
const markerLineStart = source.lastIndexOf('\n', markerIndex) + 1;
const markerLineEndRaw = source.indexOf('\n', markerIndex);
const markerLineEnd = markerLineEndRaw < 0 ? source.length : markerLineEndRaw + 1;
source = source.slice(0, markerLineStart) + ctaBlock + `          ${exploreAdMarker}\n` + source.slice(markerLineEnd);

source = source.replace(
`<div style={{fontSize:14,color:C.textSec}}>{exploreCategories.length} categories to explore</div>`,
`<div style={{fontSize:14,color:C.textSec}}>{exploreCategories.length} categories · {exploreCategories.reduce((n,c)=>n+(c.subs?.length||0),0)} subcategories</div>`,
);

// Normalize the fixed-shell CSS cluster to exactly one copy.
const cssCluster = `        html,body,#root{height:100%;min-height:0;overflow:hidden;}
        .gt-screen-scroll{scrollbar-width:none;touch-action:pan-y;}
        .gt-screen-host{isolation:isolate;}
        @supports(height:100dvh){.gt-app-shell,.gt-collage-wrap,.gt-collage-app{height:100dvh!important;}}\n`;
source = source.split(cssCluster).join('');
source = source.replace(
  '::-webkit-scrollbar{display:none;}',
  `::-webkit-scrollbar{display:none;}\n${cssCluster.trimEnd()}`,
);

if (source === original) console.log('Customer shell already repaired.');
else {
  fs.writeFileSync(path, source);
  console.log('Customer shell repaired.');
}
