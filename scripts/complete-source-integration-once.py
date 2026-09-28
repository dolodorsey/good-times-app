"""One-time reviewed developer edit. Not imported by npm/build or runtime.
Applies bounded, hash-checked source integration; the resulting real source is committed before testing.
Never reads secrets, external files, or network; does not change production or recurring schedules.
"""
from pathlib import Path
import json,hashlib
ROOT=Path.cwd()
sha=lambda text:hashlib.sha256(text.encode()).hexdigest()
writes={}
def load(path,expected=None):
    p=ROOT/path
    assert p.resolve().is_relative_to(ROOT.resolve())
    text=p.read_text()
    if expected: assert sha(text)==expected, f'Concurrent source change: {path}'
    return text
def replace_once(text,old,new):
    assert text.count(old)==1, f'Changed integration anchor: {old[:100]}'
    return text.replace(old,new,1)
record=json.loads(load('scripts/complete-root-edits.json'))
source=load(record['path'],record['before_sha256']);lines=source.splitlines(True)
for edit in reversed(record['edits']):
    i,j=edit['start'],edit['end']
    if edit.get('prepend_guard'):
        assert j==i+1
        text=replace_once(lines[i],'{','{!COMPLETE_UPGRADE&&') if lines[i].count('{')==1 else lines[i].replace('{','{!COMPLETE_UPGRADE&&',1)
        text+=edit.get('append','')
    else:text=edit['text']
    lines[i:j]=[text]
updated=''.join(lines)
assert sha(updated)==record['after_sha256'],'Root integration bytes do not match reviewed local source'
writes[record['path']]=updated
p='index.html';s=load(p,'1108c512934c555ca5f5b887c8632f41a734e27f91c4c0275260c7b21f0f8154');writes[p]=replace_once(s,', maximum-scale=1.0, user-scalable=no','')
p='src/features/experience/CompactExplorePanel.jsx';s=load(p,'6df915f173f42b05b96886cb1a79fcb65c0d459d9f930797230366d327eab66a')
s=replace_once(s,"document.querySelector('.gt-compact-result-header')","document.querySelector('.gtc-event-results-start,.gt-compact-result-header')")
s=replace_once(s,'onMapMode, renderVenue })','onMapMode, renderVenue, renderEvents = null, eventsFirst = false })')
s=replace_once(s,'      <header className="gt-compact-result-header">','      {renderEvents && eventsFirst && <div className="gtc-event-results-start">{renderEvents()}</div>}\n      <header className="gt-compact-result-header">')
s=replace_once(s,"{selectedLabel || activeCategory?.name || 'Search results'}","{renderEvents?'Places':selectedLabel || activeCategory?.name || 'Search results'}")
s=replace_once(s,'    </>}\n  </section>','      {renderEvents && !eventsFirst && renderEvents()}\n    </>}\n  </section>')
assert sha(s)=='254301795b517dcd6ddd61cd88f2c067fba8c0ccefa0cef736faacbc2d8b6d4b';writes[p]=s
p='src/features/experience/good-times-founder-v4-restore.css';writes[p]="@import './good-times-complete.css';\n"+load(p,'94c7d841fe7370cf061d8870344aa10d4600fbdb350c5f988f80aad4facbec7e')
p='src/features/intelligence/client.js';s=load(p,'b4d6e3b8b823499b659db6e327342c07ff024f4787fd02962a2ac6cf5f1c1413');s=replace_once(s,"loadCanonicalEvents(city = 'atlanta', { limit = 500 } = {})","loadCanonicalEvents(city = 'atlanta', { limit = 500, throwOnError = false } = {})")
s=replace_once(s,"console.warn('[GOOD TIMES live data] Same-origin event gateway failed; event inventory is hidden until the verified gateway recovers.', gatewayError)\n    return []","console.warn('[GOOD TIMES live data] Same-origin event gateway failed; event inventory is hidden until the verified gateway recovers.', gatewayError)\n    if (throwOnError) throw gatewayError\n    return []")
writes[p]=s
p='vite.config.js';s=load(p,'44fc116398ae8585854346c6716e19a0e098de425af4a747c8da172d209ddbf6');writes[p]=replace_once(s,'  define: {\n',"  define: {\n    __GT_COMPLETE_UPGRADE__: JSON.stringify(process.env.GT_COMPLETE_UPGRADE === '1' || (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'release/gt-complete-compact-20260927')),\n")
p='vercel.json';s=load(p,'786346b28014b3ff737c1b25aa200d1f485c892f84ca975e858634440861b9c3');v=json.loads(s);v['headers'].append({'source':'/api/plan','headers':[{'key':'Access-Control-Allow-Methods','value':'POST, OPTIONS'}]});writes[p]=json.dumps(v,indent=2)+'\n'
p='src/features/experience/complete/Planner.jsx';s=load(p,'4b5d253e8bfcfc04da9d8fbc1efe5b74e85fd1e6af493831a18d8d8298e37505');s=replace_once(s,'import {selectedCityClock}', 'import {selectedCityClock,dateNumber}');s=replace_once(s,'setDraft(x=>editStops(x,action,i,value));setDirty(true)','const next=editStops(draft,action,i,value);setDraft(next);setDirty(true)');s=replace_once(s,'arrival=Number(old.time?.slice(0,2))','arrival=(dateNumber(old.date||plan.itinerary_date)-dateNumber(plan.itinerary_date))*1440+Number(old.time?.slice(0,2))');writes[p]=s
p='src/features/experience/complete/Collections.jsx';s=load(p,'55f4b7d5947f7b547140d4273265d6effe94d31c5b5582327d0f9c56cde33274');s=replace_once(s,'now,loading,error,onRetry})','now,loading,error,onRetry,sponsored=null})');writes[p]=replace_once(s,'<div className="gtc-collection-links">','{sponsored}<div className="gtc-collection-links">')
p='src/features/experience/good-times-complete.css';s=load(p,'1512df9c7282ce4ac888081d5507d381893d06982d08191754f45359c4105920');s=replace_once(s,'& .gt5-topbar{height:58px!important;min-height:58px!important;flex-basis:58px!important;padding:6px 16px!important;}','& .gt5-topbar{height:calc(58px + env(safe-area-inset-top))!important;min-height:calc(58px + env(safe-area-inset-top))!important;flex-basis:calc(58px + env(safe-area-inset-top))!important;padding:calc(6px + env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 6px max(16px,env(safe-area-inset-left))!important;}');s=replace_once(s,'padding:0 16px 20px!important;max-width:none!important;','padding:0 max(16px,env(safe-area-inset-right)) 20px max(16px,env(safe-area-inset-left))!important;max-width:none!important;');s+='\nhtml body.gt-complete-mode #root .gt5-app.gt5-complete .gtc-paid-placement{display:grid!important;grid-template-columns:70px minmax(0,1fr)!important;gap:10px!important;min-height:0!important;height:auto!important;margin:16px 0!important;padding:12px!important;border-radius:12px!important;background:#101214!important;border:1px solid #51482e!important}html body.gt-complete-mode #root .gt5-app.gt5-complete .gtc-paid-placement>span{grid-column:1/-1;font-size:10px!important;color:#f8d46a!important}html body.gt-complete-mode #root .gt5-app.gt5-complete .gtc-paid-placement>img{position:static!important;width:70px!important;height:70px!important;object-fit:cover!important;border-radius:8px!important}html body.gt-complete-mode #root .gt5-app.gt5-complete .gtc-paid-placement strong{font:600 16px/1.3 var(--gt5-sans)!important}html body.gt-complete-mode #root .gt5-app.gt5-complete .gtc-paid-placement p{font-size:12px!important;line-height:1.4!important}html body.gt-complete-mode #root .gt5-app.gt5-complete .gtc-paid-placement>a{grid-column:1/-1;min-height:44px!important;display:flex!important;align-items:center!important;padding:8px 10px!important;font-size:13px!important}\n';writes[p]=s
# No writes occur until every expected input and reviewed output has been validated.
for p,text in writes.items():(ROOT/p).write_text(text)
print('Applied reviewed source edits:', ', '.join(writes))
