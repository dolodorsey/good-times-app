import fs from 'node:fs';

const file='src/App.jsx';
let src=fs.readFileSync(file,'utf8');

if(!src.includes('gt-now-density-v6')){
  const marker='  // City events\n  const cityEvents=useMemo';
  if(src.includes(marker)){
    src=src.replace(marker,`  useEffect(()=>{\n    const compactNow=()=>{\n      document.body.classList.toggle('gt-now-density-v6',screen==='now');\n      if(screen!==\"now\")return;\n      const leaves=[...document.querySelectorAll('div,span')].filter(el=>el.childElementCount===0);\n      const upcoming=leaves.find(el=>/UPCOMING\\s+(EXPERIENCES|EVENTS)/i.test(el.textContent||''));\n      if(upcoming){\n        let p=upcoming.parentElement;\n        for(let i=0;i<7&&p;i++,p=p.parentElement){\n          const r=p.getBoundingClientRect?.();\n          if(r&&r.width>300&&r.height>300&&r.height<760){p.classList.add('gt-now-hero-runtime');break;}\n        }\n      }\n      const tonight=leaves.find(el=>/^TONIGHT IN /i.test((el.textContent||'').trim()));\n      if(tonight){let p=tonight.parentElement;for(let i=0;i<4&&p;i++,p=p.parentElement){const r=p.getBoundingClientRect?.();if(r&&r.width>300&&r.height>80){p.classList.add('gt-now-first-content');break;}}}\n      const scroll=document.querySelector('.gt-screen-scroll');\n      if(scroll){scroll.style.overflowY='auto';scroll.style.touchAction='pan-y';scroll.style.webkitOverflowScrolling='touch';}\n    };\n    compactNow();\n    const mo=new MutationObserver(compactNow);mo.observe(document.body,{childList:true,subtree:true});\n    return()=>mo.disconnect();\n  },[screen]);\n\n  // City events\n  const cityEvents=useMemo`);
  }

  const styleNeedle='.gt-screen-host{isolation:isolate;}';
  if(src.includes(styleNeedle)){
    src=src.replace(styleNeedle,`${styleNeedle}\n        /* gt-now-density-v6 */\n        body.gt-now-density-v6 .gt-now-hero-runtime{height:clamp(210px,29vh,270px)!important;min-height:210px!important;max-height:270px!important;overflow:hidden!important;margin-bottom:0!important;}\n        body.gt-now-density-v6 .gt-now-hero-runtime img{object-fit:cover!important;object-position:center!important;}\n        body.gt-now-density-v6 .gt-now-first-content{margin-top:0!important;padding-top:14px!important;}\n        body.gt-now-density-v6 .gt-screen-scroll{scroll-padding-bottom:96px!important;}\n        @media(max-width:430px){body.gt-now-density-v6 .gt-now-hero-runtime{height:220px!important;min-height:220px!important;max-height:220px!important;}body.gt-now-density-v6 .gt-now-first-content{padding-top:10px!important;}}`);
  }
}

fs.writeFileSync(file,src);
console.log('apply-now-density-v6: complete');
