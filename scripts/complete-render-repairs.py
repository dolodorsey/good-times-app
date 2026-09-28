from pathlib import Path
# Fix actual measured render defects without lowering density or overflow assertions.
def edit(path,old,new):
 p=Path(path);s=p.read_text();assert s.count(old)==1,(path,old);p.write_text(s.replace(old,new,1))
edit('src/features/experience/good-times-complete.css','.gt-premium-experience{height:100%!important;min-height:0!important;width:100%!important;}','.gt-premium-experience{height:100%!important;min-height:0!important;width:100%!important;max-width:none!important;}')
edit('src/features/experience/good-times-complete.css',' & .gtc-home,& .gtc-events,',' & .gt2-explore-browser.gt-compact-explore{padding:0!important;margin:0!important;max-width:none!important;width:100%!important;}\n & .gtc-home,& .gtc-events,')
edit('src/features/experience/complete/Cards.jsx','displayDate(item.event_date)}',"displayDate(item.event_date,{month:'short',day:'numeric'})}")
# The map iframe receives no fixture session; only the top-level loopback page is initialized.
edit('scripts/complete-upgrade-fixtures.mjs',"await context.addInitScript(({now,user})=>{if(!['localhost'","await context.addInitScript(({now,user})=>{if(window!==window.top)return;if(!['localhost'")
