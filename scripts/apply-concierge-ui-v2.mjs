import fs from 'node:fs';

const file = 'src/App.jsx';
let src = fs.readFileSync(file, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!src.includes(from)) {
    throw new Error(`apply-concierge-ui-v2: missing ${label}`);
  }
  src = src.replace(from, to);
};

// 1) Navigation: real history stack + scroll restoration.
replaceOnce(
`  const[screen,setScreen]=useState("now");
  const[prevScreen,setPrev]=useState("now");
  const[navScreen,setNav]=useState("now");`,
`  const[screen,setScreen]=useState("now");
  const[prevScreen,setPrev]=useState("now");
  const[navScreen,setNav]=useState("now");
  const navHistoryRef=useRef([]);
  const scrollStateRef=useRef(new Map());`,
'navigation state'
);

replaceOnce(
`  const navigate=useCallback((s,n)=>{
    setPrev(screen);
    setScreen(s);
    if(["now","ent","calendar","plans","planforme","explore","map","vault"].includes(n||s))setNav(n||s);
    window.scrollTo({top:0,behavior:"instant"});
  },[screen]);

  const goBack=useCallback(()=>{
    if(["now","ent","calendar","plans","planforme","explore","map","vault"].includes(prevScreen)){
      setScreen(prevScreen);setNav(prevScreen);
    }else setScreen(navScreen);
  },[prevScreen,navScreen]);`,
`  const navigate=useCallback((s,n,opts={})=>{
    const scroller=document.querySelector('.gt-screen-scroll');
    scrollStateRef.current.set(screen,scroller?.scrollTop||0);
    if(!opts.replace&&s!==screen){
      navHistoryRef.current.push({screen,nav:navScreen,scrollTop:scroller?.scrollTop||0});
      if(navHistoryRef.current.length>40)navHistoryRef.current.shift();
    }
    setPrev(screen);
    setScreen(s);
    const targetNav=n||s;
    if(["now","plans","planforme","explore","vault"].includes(targetNav))setNav(targetNav);
    requestAnimationFrame(()=>{
      const next=document.querySelector('.gt-screen-scroll');
      if(next)next.scrollTop=opts.restore?scrollStateRef.current.get(s)||0:0;
    });
  },[screen,navScreen]);

  const goBack=useCallback(()=>{
    const last=navHistoryRef.current.pop();
    if(last){
      setScreen(last.screen);
      setPrev(navHistoryRef.current.at(-1)?.screen||"now");
      if(["now","plans","planforme","explore","vault"].includes(last.nav))setNav(last.nav);
      requestAnimationFrame(()=>{
        const scroller=document.querySelector('.gt-screen-scroll');
        if(scroller)scroller.scrollTop=last.scrollTop||0;
      });
      return;
    }
    setScreen(navScreen);
  },[navScreen]);`,
'navigation callbacks'
);

// Browser / device back uses the same app history instead of dumping the user on Home.
replaceOnce(
`  // City events
  const cityEvents=useMemo`,
`  useEffect(()=>{
    const onPopState=()=>goBack();
    window.addEventListener('popstate',onPopState);
    return()=>window.removeEventListener('popstate',onPopState);
  },[goBack]);

  // City events
  const cityEvents=useMemo`,
'browser back binding'
);

// 2) Five-tab concierge IA. Dates stays available as a Discover filter/screen, not primary navigation.
replaceOnce(
`  const navDefs=[
    {id:"now",l:"Now",emoji:"🔥"},
    {id:"explore",l:"Explore",emoji:"🧭"},
    {id:"planforme",l:"Build My Night",emoji:"✨",primary:true},
    {id:"calendar",l:"Dates",emoji:"📅"},
    {id:"vault",l:"Vault",emoji:"🔒"}
  ];`,
`  const navDefs=[
    {id:"now",l:"Now",emoji:"✦"},
    {id:"explore",l:"Discover",emoji:"⌁"},
    {id:"planforme",l:"Build",emoji:"✦",primary:true},
    {id:"plans",l:"Plans",emoji:"≋"},
    {id:"vault",l:"Vault",emoji:"◇"}
  ];`,
'five-tab navigation'
);

// 3) Build My Night taxonomy: stop mixing moods, occasions and preferences in one bucket.
src = src.replace(/\/\/ Plan For Me questions\nconst kn=\[[\s\S]*?\n\];\n\n\/\/ CHANGE #8:/, `// Plan For Me questions — concierge v2: WHO → ENERGY → PRIORITIES → TIME → BUDGET
const kn=[
  {id:"group",q:"Who is this night for?",sub:"Start with the people, not a form",multi:false,opts:[{id:"solo",l:"Solo",i:"◉",c:"#D4A853",d:"Just me"},{id:"duo",l:"Date / Me + 1",i:"♡",c:"#C8A96E",d:"Two people"},{id:"crew",l:"Friends",i:"✦",c:"#FFB86B",d:"3-8 people"},{id:"mob",l:"Big Group",i:"◆",c:"#FF6B6B",d:"8+ people"}]},
  {id:"mood",q:"What energy are we on?",sub:"Good Times will shape the route around this",multi:false,opts:[{id:"date",l:"Grown & Sexy",i:"✦",c:"#C8A96E",d:"Polished, intimate, adult"},{id:"turnt",l:"High Energy",i:"↑",c:"#FF6B6B",d:"Outside all night"},{id:"chill",l:"Chill",i:"≈",c:"#90EE90",d:"Easy, low-pressure"},{id:"bougie",l:"Upscale",i:"◇",c:"#D4A853",d:"Dress up and impress"},{id:"family",l:"Family",i:"○",c:"#BFA97A",d:"Good for everybody"},{id:"explore",l:"Surprise Me",i:"?",c:"#D4A853",d:"Show me something different"}]},
  {id:"vibes",q:"What matters tonight?",sub:"Pick the ingredients — Good Times handles the sequence",multi:true,opts:[{id:"food",l:"Dinner",i:"◌",c:"#FFB86B"},{id:"music",l:"Live Music",i:"♫",c:"#FF6B6B"},{id:"drinks",l:"Cocktails",i:"◇",c:"#C39BD3"},{id:"dancing",l:"Dancing",i:"↟",c:"#FF69B4"},{id:"rooftop",l:"Rooftop",i:"△",c:"#D4A853"},{id:"hookah",l:"Hookah",i:"≈",c:"#D4A853"},{id:"comedy",l:"Comedy",i:"☺",c:"#C8A96E"},{id:"sports",l:"Sports",i:"◉",c:"#6BFFB8"},{id:"culture",l:"Culture",i:"✧",c:"#C8A96E"},{id:"black_owned",l:"Black-Owned",i:"★",c:"#D4A853"}]},
  {id:"time",q:"When are we starting?",sub:"We will only recommend moves that fit the clock",multi:false,opts:[{id:"afternoon",l:"Afternoon",i:"☀",c:"#FFB86B",d:"12-5pm"},{id:"evening",l:"Early Evening",i:"◐",c:"#C8A96E",d:"5-8pm"},{id:"night",l:"Night",i:"●",c:"#B86BFF",d:"8pm-midnight"},{id:"latenight",l:"Late Night",i:"◒",c:"#D4A853",d:"After midnight"}]},
  {id:"budget",q:"What are we spending?",sub:"Per person for the full route",multi:false,opts:[{id:"low",l:"Under $50",i:"$",c:"#6BFFB8"},{id:"mid",l:"$50–150",i:"$$",c:"#FFB86B"},{id:"high",l:"$150–300",i:"$$$",c:"#D4A853"},{id:"unlimited",l:"No Limit",i:"$$$$",c:"#FF6B6B"}]}
];

// CHANGE #8:`);

// Upgrade the Now screen copy from event-directory language to concierge language.
replaceOnce(
`            <div style={{fontSize:26,fontFamily:F.s,fontWeight:700,lineHeight:1.15,marginBottom:4,color:"#FFFFFF"}}>What's the move?</div>
            <div style={{fontSize:12,color:"#FFFFFF"}}>
              {realm==="today"?"Today":"Tonight"} in {city.name} {"\\u00B7"} {realmEvents.length>0?\`${realmEvents.length} experiences\`:"Check this week"}
            </div>`,
`            <div style={{fontSize:11,letterSpacing:3,color:C.gold,fontWeight:700,marginBottom:7}}>GOOD TIMES · {city.name.toUpperCase()}</div>
            <div style={{fontSize:29,fontFamily:F.s,fontWeight:700,lineHeight:1.08,marginBottom:6,color:"#FFFFFF"}}>{hour<12?"Good morning.":hour<17?"Good afternoon.":"Good evening."}</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.82)"}}>Here’s what’s actually worth doing {realm==="week"?"this week":realm==="today"?"today":"tonight"}.</div>`,
'Now hero copy'
);

src = src
  .replace('<SectionHead t="CITY HIGHLIGHTS" icon={"\\u{2728}"} color={C.a4}/>', '<SectionHead t="YOUR TOP PICKS" icon={"\\u{2728}"} color={C.a4}/>')
  .replace('<span style={{fontSize:10,color:C.muted,marginLeft:"auto"}}>{pool.length} events</span>', '<span style={{fontSize:10,color:C.muted,marginLeft:"auto"}}>Ranked for right now</span>')
  .replace('onClick={()=>navigate("calendar")} style={{...V(false),width:"100%",marginTop:10,padding:"10px",textAlign:"center",fontSize:12}}>See all {pool.length}', 'onClick={()=>navigate("explore","explore")} style={{...V(false),width:"100%",marginTop:10,padding:"10px",textAlign:"center",fontSize:12}}>Discover more');

// Build screen positioning + quick intent starters.
replaceOnce(
`            <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>CONCIERGE</div>
            <div style={{fontSize:28,fontFamily:F.s,fontWeight:700,marginBottom:6}}>Build your perfect night</div>
            <div style={{fontSize:14,color:C.textSec}}>Tell us your vibe {"\\u00B7"} We handle the rest</div>`,
`            <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>LIVE EXPERIENCE AGENT</div>
            <div style={{fontSize:31,fontFamily:F.s,fontWeight:700,marginBottom:6}}>Build My Night</div>
            <div style={{fontSize:14,color:C.textSec}}>Give us the intent. Good Times builds the route.</div>`,
'Build My Night heading'
);

replaceOnce(
`          {!planResult&&!planLoading&&<>
            <div style={{display:"flex",gap:6,marginBottom:28,justifyContent:"center"}}>`,
`          {!planResult&&!planLoading&&<>
            {planStep===0&&<div style={{marginBottom:18}}>
              <div style={{fontSize:10,letterSpacing:2.4,color:C.gold,fontWeight:700,marginBottom:9}}>START WITH A DIRECTION</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {l:"Grown & Sexy",group:"duo",mood:"date",v:["food","drinks"]},
                  {l:"We Outside",group:"crew",mood:"turnt",v:["drinks","dancing"]},
                  {l:"Dinner + Live Music",group:"duo",mood:"date",v:["food","music"]},
                  {l:"Surprise Me",group:"crew",mood:"explore",v:[]}
                ].map(x=><button key={x.l} onClick={()=>{tapHaptic();setPlanChoices({group:x.group,mood:x.mood});setPlanVibes(x.v);setPlanStep(2)}} style={{...K,padding:"13px 12px",textAlign:"left",border:"1px solid rgba(212,168,83,.25)",color:C.text,fontSize:12,fontWeight:700,cursor:"pointer"}}>{x.l}<div style={{fontSize:10,color:C.muted,fontWeight:500,marginTop:3}}>Prefill and refine →</div></button>)}
              </div>
            </div>}
            <div style={{display:"flex",gap:6,marginBottom:20,justifyContent:"center"}}>`,
'Build quick starters'
);

fs.writeFileSync(file, src);
console.log('apply-concierge-ui-v2: complete');
