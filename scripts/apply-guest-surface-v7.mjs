import fs from 'node:fs';

const appFile='src/features/experience/GoodTimesCommandApp.jsx';
const mainFile='src/main.jsx';
const cssFile='src/features/experience/good-times-guest-v7.css';

let app=fs.readFileSync(appFile,'utf8');
let main=fs.readFileSync(mainFile,'utf8');

app=app.replace(/const TAB_CONFIG = \[[\s\S]*?\n\]/,`const TAB_CONFIG = [
  ['home', '⌂', 'Now'],
  ['explore', '◇', 'Discover'],
  ['concierge', '✦', 'Build'],
  ['plans', '≋', 'Plans'],
  ['vault', '▣', 'Vault'],
]`);
app=app.replaceAll("Explore city ›","Discover city ›");
app=app.replaceAll("Open calendar ›","See this week ›");

main=main.replace(`      .gt-guest-mode .gt2-nav button[data-gt-tab="concierge"],\n      .gt-guest-mode .gt2-nav button[data-gt-tab="plans"],\n      .gt-guest-mode .gt2-nav button[data-gt-tab="vault"],\n      .gt-guest-mode .gt2-save,`, `      .gt-guest-mode .gt2-save,`);
main=main.replace('Events, nightlife and local discovery are open without an account.','Browse freely. Sign in only to save, personalize and keep your plans.');
if(!main.includes("good-times-guest-v7.css")){
  main=main.replace("import './features/experience/good-times-owner-polish.css'", "import './features/experience/good-times-owner-polish.css'\nimport './features/experience/good-times-guest-v7.css'");
}

const css=`/* GOOD TIMES guest web surface v7 — final authority */
.gt-guest-mode{height:100dvh;min-height:0;display:block;overflow:hidden;background:#06060b}
.gt-guest-mode .gt2-app{height:100dvh!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
.gt-guest-mode .gt2-topbar{height:62px!important;flex:0 0 62px!important;padding:0 14px!important;position:relative!important;top:auto!important}
.gt-guest-mode .gt2-brand .gt2-mark{width:38px!important;height:38px!important}
.gt-guest-mode .gt2-brand strong{font-size:14px!important}.gt-guest-mode .gt2-brand small{font-size:5.5px!important}
.gt-guest-mode .gt2-city{height:36px!important;padding:0 11px!important}
.gt-guest-mode .gt2-content{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;overscroll-behavior-y:contain!important;padding-bottom:84px!important;padding-top:52px!important}
.gt-guest-mode .gt2-hero{height:275px!important;min-height:275px!important;max-height:275px!important;background-position:center 34%!important}
.gt-guest-mode .gt2-hero-copy{left:16px!important;right:96px!important;bottom:18px!important}
.gt-guest-mode .gt2-hero-copy h1{font-size:30px!important;line-height:.96!important;max-width:300px!important;margin:7px 0 7px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
.gt-guest-mode .gt2-hero-copy p{font-size:8px!important;line-height:1.35!important;margin:0!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
.gt-guest-mode .gt2-hero-copy>div{margin-top:9px!important}.gt-guest-mode .gt2-hero-copy button{min-height:36px!important;padding:0 11px!important}
.gt-guest-mode .gt2-hero-index{width:57px!important;height:57px!important;right:14px!important;top:14px!important}.gt-guest-mode .gt2-hero-index strong{font-size:17px!important}.gt-guest-mode .gt2-hero-index small{font-size:4px!important}
.gt-guest-mode .gt2-command-launch{min-height:60px!important;margin:-10px 12px 10px!important;width:calc(100% - 24px)!important;padding:9px 11px!important;border-radius:16px!important}
.gt-guest-mode .gt2-command-launch>span{width:36px!important;height:36px!important}.gt-guest-mode .gt2-command-launch strong{font-size:14px!important}
.gt-guest-mode .gt2-pulse{margin:0 12px!important;padding:9px 5px!important;border-radius:14px!important}.gt-guest-mode .gt2-pulse strong{font-size:18px!important}
.gt-guest-mode .gt2-section{padding-top:20px!important}.gt-guest-mode .gt2-section-title{padding:0 13px!important;margin-bottom:10px!important}.gt-guest-mode .gt2-section-title h2{font-size:24px!important}
.gt-guest-mode .gt-party-pulse{position:absolute!important;top:64px!important;left:10px!important;right:10px!important;z-index:70!important;width:auto!important;max-width:none!important}
.gt-guest-mode .gt-party-peek{min-height:48px!important;height:48px!important;padding:5px 9px!important;border-radius:14px!important;gap:7px!important;overflow:hidden!important}
.gt-guest-mode .gt-party-live{font-size:6px!important}.gt-guest-mode .gt-party-peek-copy small{font-size:5.5px!important}.gt-guest-mode .gt-party-peek-copy strong{font-size:10px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.gt-guest-mode .gt-party-peek-copy em{display:none!important}.gt-guest-mode .gt-party-count{width:30px!important;height:30px!important;min-width:30px!important;font-size:10px!important}
.gt-guest-mode .gt-guest-access{left:10px!important;right:10px!important;bottom:calc(68px + env(safe-area-inset-bottom,0px))!important;max-width:none!important;min-height:42px!important;padding:6px 7px 6px 10px!important;border-radius:13px!important;box-shadow:0 8px 24px rgba(0,0,0,.28)!important;pointer-events:auto!important}
.gt-guest-mode .gt-guest-access strong{font-size:8px!important}.gt-guest-mode .gt-guest-access span{display:block!important;font-size:7px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:210px!important}.gt-guest-mode .gt-guest-access button{min-height:32px!important;padding:0 9px!important;font-size:8px!important;border-radius:9px!important}
.gt-guest-mode .gt2-nav{position:absolute!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;z-index:90!important;display:grid!important;grid-template-columns:repeat(5,1fr)!important;padding-bottom:env(safe-area-inset-bottom,0px)!important;background:rgba(5,7,11,.97)!important;backdrop-filter:blur(24px)!important}
.gt-guest-mode .gt2-nav button{min-width:0!important;padding-left:2px!important;padding-right:2px!important}.gt-guest-mode .gt2-nav button small{font-size:7px!important}.gt-guest-mode .gt2-nav button[data-gt-tab="concierge"] span{color:#f5cc75!important}
@media(max-width:390px){.gt-guest-mode .gt2-hero{height:250px!important;min-height:250px!important;max-height:250px!important}.gt-guest-mode .gt2-hero-copy h1{font-size:27px!important}.gt-guest-mode .gt-guest-access span{display:none!important}}
`;
fs.writeFileSync(cssFile,css);
fs.writeFileSync(appFile,app);
fs.writeFileSync(mainFile,main);
console.log('apply-guest-surface-v7: actual guest shell patched');
