import fs from 'node:fs';

const file='src/App.jsx';
let src=fs.readFileSync(file,'utf8');

if(!src.includes('gt-guest-scroll-fix')){
  const marker='  // City events\n  const cityEvents=useMemo';
  if(src.includes(marker)){
    src=src.replace(marker,`  useEffect(()=>{\n    if(isNative)return;\n    const fixGuest=()=>{\n      document.documentElement.classList.add('gt-web-guest-scroll-ok');\n      document.body.classList.add('gt-web-guest-scroll-ok');\n      const scroll=document.querySelector('.gt-screen-scroll');\n      if(scroll){scroll.style.overflowY='auto';scroll.style.touchAction='pan-y';scroll.style.webkitOverflowScrolling='touch';}\n      const nodes=[...document.querySelectorAll('div,span')];\n      const label=nodes.find(el=>el.childElementCount===0&&el.textContent?.trim().toUpperCase()==='BROWSING AS GUEST');\n      if(label){\n        let p=label.parentElement;\n        for(let i=0;i<5&&p;i++,p=p.parentElement){\n          const r=p.getBoundingClientRect?.();\n          if(r&&r.width>260&&r.height>55&&r.height<180){p.classList.add('gt-guest-banner-runtime');break;}\n        }\n      }\n    };\n    fixGuest();\n    const mo=new MutationObserver(fixGuest);mo.observe(document.body,{childList:true,subtree:true});\n    return()=>mo.disconnect();\n  },[screen]);\n\n  // City events\n  const cityEvents=useMemo`);
  }

  const styleNeedle='.gt-screen-host{isolation:isolate;}';
  if(src.includes(styleNeedle)){
    src=src.replace(styleNeedle,`${styleNeedle}\n        /* gt-guest-scroll-fix */\n        html.gt-web-guest-scroll-ok,body.gt-web-guest-scroll-ok{overflow:hidden!important;overscroll-behavior:none!important;}\n        .gt-screen-scroll{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;}\n        .gt-guest-banner-runtime{position:relative!important;inset:auto!important;z-index:5!important;min-height:44px!important;max-height:54px!important;height:auto!important;margin:8px 14px 10px!important;padding:8px 10px!important;border-radius:14px!important;box-shadow:none!important;}\n        .gt-guest-banner-runtime *{font-size:11px!important;}\n        .gt-guest-banner-runtime button{min-height:34px!important;padding:7px 10px!important;font-size:10.5px!important;white-space:nowrap!important;}\n        @media(max-width:430px){.gt-guest-banner-runtime{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;}}`);
  }
}

fs.writeFileSync(file,src);
console.log('apply-guest-scroll-fix: complete');
