import hashlib
import json
import os
import sys
import time
from pathlib import Path

import jwt
import requests

BASE='https://api.appstoreconnect.apple.com/v1'
BUNDLE='com.kollective.goodtimes'
VERSION='1.1.0'
LOCALE='en-US'
EXPECTED_BUILD='298'
ROOT=Path(os.environ.get('GT_UI_ARTIFACTS','ui-artifacts'))/'app-store'
EVIDENCE=Path(os.environ.get('RUNNER_TEMP','/tmp'))/'good-times-app-store-finalize.json'


def headers():
    now=int(time.time())
    token=jwt.encode({'iss':os.environ['ASC_ISSUER_ID'],'iat':now,'exp':now+900,'aud':'appstoreconnect-v1'},os.environ['ASC_PRIVATE_KEY'],algorithm='ES256',headers={'kid':os.environ['ASC_KEY_ID'],'typ':'JWT'})
    return {'Authorization':f'Bearer {token}','Content-Type':'application/json'}


def req(method,path,params=None,payload=None,ok=(200,201,204)):
    r=requests.request(method,BASE+path,headers=headers(),params=params,json=payload,timeout=60)
    if r.status_code not in ok:
        raise RuntimeError(f'{method} {path} HTTP {r.status_code}: {r.text[:7000]}')
    return {} if r.status_code==204 or not r.content else r.json()


def resolve():
    apps=req('GET','/apps',{'filter[bundleId]':BUNDLE,'limit':'10'})['data']
    exact=[a for a in apps if a.get('attributes',{}).get('bundleId')==BUNDLE]
    if len(exact)!=1: raise RuntimeError(f'Expected one GOOD TIMES app, found {len(exact)}')
    app_id=exact[0]['id']
    versions=req('GET',f'/apps/{app_id}/appStoreVersions',{'limit':'200'})['data']
    vm=[v for v in versions if v.get('attributes',{}).get('platform')=='IOS' and v.get('attributes',{}).get('versionString')==VERSION]
    if len(vm)!=1: raise RuntimeError(f'Expected one iOS {VERSION}, found {len(vm)}')
    version=vm[0]; vid=version['id']
    locs=req('GET',f'/appStoreVersions/{vid}/appStoreVersionLocalizations',{'filter[locale]':LOCALE,'limit':'50'})['data']
    if len(locs)!=1: raise RuntimeError(f'Expected one {LOCALE} version localization, found {len(locs)}')
    return app_id,vid,locs[0]['id']


def screenshot_sets(loc_id):
    sets=req('GET',f'/appStoreVersionLocalizations/{loc_id}/appScreenshotSets',{'limit':'200'})['data']
    out={}
    for s in sets:
        dtype=s.get('attributes',{}).get('screenshotDisplayType')
        shots=req('GET',f'/appScreenshotSets/{s["id"]}/appScreenshots',{'limit':'200'})['data']
        out.setdefault(dtype,[]).append({'set':s,'shots':shots})
    return out


def is_complete(entry):
    shots=entry['shots']
    return len(shots)>=3 and all((x.get('attributes',{}).get('assetDeliveryState') or {}).get('state')=='COMPLETE' for x in shots)


def reserve_upload(set_id,file_path):
    raw=file_path.read_bytes()
    reservation=req('POST','/appScreenshots',payload={'data':{'type':'appScreenshots','attributes':{'fileSize':len(raw),'fileName':file_path.name},'relationships':{'appScreenshotSet':{'data':{'type':'appScreenshotSets','id':set_id}}}}})['data']
    sid=reservation['id']; operations=reservation.get('attributes',{}).get('uploadOperations') or []
    if not operations: raise RuntimeError(f'No upload operations for {file_path}')
    for op in operations:
        offset=int(op['offset']); length=int(op['length'])
        hdr={h['name']:h['value'] for h in op.get('requestHeaders',[])}
        r=requests.request(op.get('method','PUT'),op['url'],headers=hdr,data=raw[offset:offset+length],timeout=120)
        if not r.ok: raise RuntimeError(f'Binary upload failed {file_path.name}: {r.status_code} {r.text[:1000]}')
    req('PATCH',f'/appScreenshots/{sid}',payload={'data':{'type':'appScreenshots','id':sid,'attributes':{'uploaded':True,'sourceFileChecksum':hashlib.md5(raw).hexdigest()}}})
    return sid


def ensure_iphone(loc_id):
    dtype='APP_IPHONE_67'; files=sorted((ROOT/'iphone-6.9').glob('*.png'))
    if len(files)<3: raise RuntimeError(f'Missing validated iPhone screenshots: {files}')
    current=screenshot_sets(loc_id).get(dtype,[])
    if len(current)==1 and is_complete(current[0]) and len(current[0]['shots'])==3:
        return current[0]['set']['id'],[x['id'] for x in current[0]['shots']],False
    for entry in current:
        req('DELETE',f'/appScreenshotSets/{entry["set"]["id"]}')
    created=req('POST','/appScreenshotSets',payload={'data':{'type':'appScreenshotSets','attributes':{'screenshotDisplayType':dtype},'relationships':{'appStoreVersionLocalization':{'data':{'type':'appStoreVersionLocalizations','id':loc_id}}}}})['data']
    set_id=created['id']; ids=[reserve_upload(set_id,f) for f in files]
    deadline=time.time()+420
    while time.time()<deadline:
        shots=req('GET',f'/appScreenshotSets/{set_id}/appScreenshots',{'limit':'200'})['data']
        states=[(x.get('attributes',{}).get('assetDeliveryState') or {}).get('state') for x in shots]
        if len(shots)==3 and all(x=='COMPLETE' for x in states): return set_id,[x['id'] for x in shots],True
        if any(x=='FAILED' for x in states): raise RuntimeError(f'iPhone screenshot processing failed: {states}')
        time.sleep(10)
    raise RuntimeError('Timed out waiting for iPhone screenshot processing')


def verify_ready(app_id,vid,loc_id):
    sets=screenshot_sets(loc_id)
    summary={}
    for dtype in ('APP_IPHONE_67','APP_IPAD_PRO_3GEN_129'):
        entries=sets.get(dtype,[])
        summary[dtype]=[{'setId':e['set']['id'],'count':len(e['shots']),'complete':is_complete(e)} for e in entries]
        if len(entries)!=1 or len(entries[0]['shots'])!=3 or not is_complete(entries[0]):
            raise RuntimeError(f'{dtype} is not exactly one COMPLETE 3-shot set: {summary[dtype]}')
    build_rel=req('GET',f'/appStoreVersions/{vid}/relationships/build')['data']
    if not build_rel: raise RuntimeError('No build attached')
    build=req('GET',f'/builds/{build_rel["id"]}')['data']; ba=build.get('attributes',{})
    if str(ba.get('version'))!=EXPECTED_BUILD or ba.get('processingState')!='VALID' or ba.get('buildAudienceType')!='APP_STORE_ELIGIBLE':
        raise RuntimeError(f'Unexpected attached build: {ba}')
    review=req('GET',f'/appStoreVersions/{vid}/appStoreReviewDetail')['data']['attributes']
    if not review.get('demoAccountRequired') or not review.get('demoAccountName') or not review.get('demoAccountPassword'):
        raise RuntimeError('Review demo account is incomplete')
    return summary,{'id':build['id'],'number':ba.get('version'),'uploadedDate':ba.get('uploadedDate'),'processingState':ba.get('processingState'),'audience':ba.get('buildAudienceType')}


def submit(app_id,vid):
    subs=req('GET',f'/apps/{app_id}/reviewSubmissions',{'limit':'200'})['data']
    unresolved=[s for s in subs if s.get('attributes',{}).get('state')=='UNRESOLVED_ISSUES']
    if len(unresolved)!=1: raise RuntimeError(f'Expected one UNRESOLVED_ISSUES submission, found {len(unresolved)}')
    sid=unresolved[0]['id']
    payload={'data':{'type':'reviewSubmissions','id':sid,'attributes':{'submitted':True}}}
    transient='Version is not ready to be submitted yet, please try again later.'
    last=None
    for attempt in range(1,31):
        r=requests.patch(BASE+f'/reviewSubmissions/{sid}',headers=headers(),json=payload,timeout=60)
        if r.ok:
            final=req('GET',f'/reviewSubmissions/{sid}')['data']; return {'submitted':True,'id':sid,'state':final.get('attributes',{}).get('state'),'attempt':attempt}
        last={'status':r.status_code,'body':r.text[:7000],'attempt':attempt}
        if r.status_code==409 and transient in r.text:
            time.sleep(20)
            continue
        raise RuntimeError(f'Resubmission failed: {last}')
    raise RuntimeError(f'Resubmission never became ready: {last}')


def main():
    app_id,vid,loc_id=resolve()
    set_id,shot_ids,created=ensure_iphone(loc_id)
    sets,build=verify_ready(app_id,vid,loc_id)
    # Allow App Store Connect to settle after any screenshot-set write.
    if created: time.sleep(120)
    result=submit(app_id,vid)
    evidence={'ok':True,'appId':app_id,'versionId':vid,'version':VERSION,'iphoneSetId':set_id,'iphoneScreenshotIds':shot_ids,'iphoneSetCreated':created,'screenshotSets':sets,'attachedBuild':build,'reviewSubmission':result}
    EVIDENCE.write_text(json.dumps(evidence,indent=2),encoding='utf-8'); print(json.dumps(evidence,indent=2))

if __name__=='__main__':
    try: main()
    except Exception as exc:
        EVIDENCE.write_text(json.dumps({'ok':False,'error':str(exc)},indent=2),encoding='utf-8')
        print(str(exc),file=sys.stderr); sys.exit(1)
