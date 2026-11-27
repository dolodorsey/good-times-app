#!/usr/bin/env python3
"""Validate exact Gitleaks historical exceptions without printing secret values."""
import base64, hashlib, json, re, subprocess
from pathlib import Path

FINGERPRINT = re.compile(r'([0-9a-f]{40}):([^:]+):(jwt|generic-api-key):([1-9][0-9]*)')
JWT = re.compile(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
PUBLIC = re.compile(r'\bsb_publishable_[A-Za-z0-9_-]+\b')
REVIEWED_ISSUERS = frozenset(('supabase','HS256','sup'))
# Exact historical prose that a heuristic scanner mistook for a generic API key.
# These are not credentials; require an exact immutable commit/path/line match.
_DOC_LINE = '- Adaptive access CTA: ' + ''.join(('Tickets/RSVP/', 'Guest List/', 'Free/Sold Out/', 'Resale.'))
REVIEWED_PROSE = {
    '80f4fa0f73fd9cb61c9cee8f83ac4a14c7c7d872:docs/all-pages/20_Event_Detail.md:generic-api-key:18': _DOC_LINE,
    '733de0880c41b125acc772b2875c2ea579971d91:scripts/validate-secret-exceptions.py:generic-api-key:18': "        '" + _DOC_LINE + "',",
    "d3235593e8112273955159560509b13bfcf6fddb:scripts/validate-secret-exceptions.py:generic-api-key:13": "    '80f4fa0f73fd9cb61ccee8f83ac4a14c7c7d872:docs/all-pages/20_Event_Detail.md:generic-api-key:18': '" + _DOC_LINE + "',",
    "d3235593e8112273955159560509b13bfcf6fddb:scripts/validate-secret-exceptions.py:generic-api-key:14": "    '733de0880c41b125acc772b2875c2ea579971d91:scripts/validate-secret-exceptions.py:generic-api-key:18': \"        '" + _DOC_LINE + "',\",",
    "041eba7a78365e329aea3936925c8bf51500a393:scripts/validate-secret-exceptions.py:generic-api-key:13": "    '80f4fa0f73fd9cb61c9cee8f83ac4a14c7c7d872:docs/all-pages/20_Event_Detail.md:generic-api-key:18': '" + _DOC_LINE + "',",
}

# A third party's own public key inside its image-CDN link (Maggiano's Builder.io photo),
# copied from the venue's website. Not a KHG credential; nothing to rotate. The photo
# loads identically without it, so the data and the snapshot refresher now strip it.
# Exact fingerprint + host + key fingerprint (sha256 prefix) — never the value itself.
THIRD_PARTY_CDN_KEY = re.compile(r'https://cdn\.builder\.io/[^\s\'"]*?[?&]apiKey=([0-9a-f]{32})')
REVIEWED_THIRD_PARTY_CDN = {
    '186d360360fdca5d0c929635ba8560dd44637018:supabase/data-fixes/20261112_venue_photos_and_duplicates.sql:generic-api-key:69': 'f140b1aa50',
}

def third_party_cdn_line(entry,rule,line):
    expected=REVIEWED_THIRD_PARTY_CDN.get(entry)
    if not expected or rule != 'generic-api-key': return False
    if 'sb_secret_' in line or 'service_role' in line or JWT.search(line): return False
    keys=THIRD_PARTY_CDN_KEY.findall(line)
    if not keys or len(keys) != len(re.findall(r'(?i)api_?key=',line)): return False
    return all(hashlib.sha256(k.encode()).hexdigest()[:10] == expected for k in keys)

RETIRED_PRIVATE = frozenset({
    '17816714552bcb22947486e035c75df50ed54699:public/admin.html:jwt:143',
})

def claims(token):
    part=token.split('.')[1]
    return json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))

def public_line(rule,line):
    if 'sb_secret_' in line or 'service_role' in line:
        return False
    tokens=JWT.findall(line)
    if rule == 'jwt':
        if not tokens: return False
        for token in tokens:
            try:
                c=claims(token)
                if not isinstance(c,dict): return False
                if c.get('role') != 'anon' or c.get('iss') not in REVIEWED_ISSUERS: return False
                if any(k in c for k in ('sub','email','phone','session_id')): return False
            except Exception:
                return False
        return True
    return rule == 'generic-api-key' and bool(PUBLIC.search(line)) and not tokens

def retired_private_line(rule,line):
    if rule != 'jwt': return False
    tokens=JWT.findall(line)
    if len(tokens) != 1: return False
    try:
        c=claims(tokens[0])
    except Exception:
        return False
    return (
        isinstance(c,dict)
        and c.get('iss') == 'supabase'
        and c.get('ref') == 'dzlmtvodpyhetvektfuo'
        and c.get('role') == 'service_role'
        and not any(k in c for k in ('sub','email','phone','session_id'))
    )

def validate(entries):
    seen=set(); public_count=0; retired_count=0; failures=[]
    for entry in entries:
        if not entry or entry.startswith('#'): continue
        m=FINGERPRINT.fullmatch(entry)
        if not m or entry in seen:
            failures.append(entry + ' (invalid or duplicate fingerprint)')
            continue
        seen.add(entry)
        commit,path,rule,number=m.groups()
        result=subprocess.run(['git','show',commit+':'+path],capture_output=True,check=False)
        if result.returncode:
            failures.append(entry + ' (source unavailable)')
            continue
        lines=result.stdout.decode('utf-8',errors='replace').splitlines()
        idx=int(number)-1
        if idx >= len(lines):
            failures.append(entry + ' (line unavailable)')
            continue
        line=lines[idx]
        if entry in RETIRED_PRIVATE:
            if not retired_private_line(rule,line):
                failures.append(entry + ' (retired-private source no longer matches exact expected identity)')
            else:
                retired_count += 1
        elif entry in REVIEWED_PROSE and rule == 'generic-api-key' and line == REVIEWED_PROSE[entry]:
            public_count += 1
        elif third_party_cdn_line(entry,rule,line):
            public_count += 1
        elif public_line(rule,line):
            public_count += 1
        else:
            failures.append(entry + ' (not verified public and not approved retired-private fingerprint)')
    if failures:
        raise ValueError('Unverified Gitleaks exceptions:\\n'+'\\n'.join(failures))
    if retired_count != len(RETIRED_PRIVATE):
        raise ValueError('Retired-private baseline count mismatch')
    return public_count,retired_count,len(seen)

def selftest():
    def fake(role,issuer='supabase',ref='fixture',**extra):
        h=base64.urlsafe_b64encode(json.dumps({'alg':'HS256'}).encode()).decode().rstrip('=')
        b=base64.urlsafe_b64encode(json.dumps({'iss':issuer,'ref':ref,'role':role,**extra}).encode()).decode().rstrip('=')
        return h+'.'+b+'.synthetic_test_signature'
    assert public_line('jwt',fake('anon'))
    assert not public_line('jwt',fake('service_role'))
    assert public_line('generic-api-key','sb_publishable_synthetic_test_only')
    assert not public_line('generic-api-key','sb_secret_synthetic_test_only')
    assert retired_private_line('jwt',fake('service_role',ref='dzlmtvodpyhetvektfuo'))
    assert not retired_private_line('jwt',fake('anon',ref='dzlmtvodpyhetvektfuo'))
    assert not retired_private_line('jwt',fake('service_role',ref='other-project'))
    assert not FINGERPRINT.fullmatch('public/admin.html:jwt:143')
    fp=next(iter(REVIEWED_THIRD_PARTY_CDN))
    assert not third_party_cdn_line(fp,'generic-api-key',"'https://cdn.builder.io/o/a?apiKey="+'0'*32+"'")
    assert not third_party_cdn_line('0'*40+':x.sql:generic-api-key:1','generic-api-key','https://cdn.builder.io/o/a?apiKey='+'0'*32)
    assert not third_party_cdn_line(fp,'generic-api-key','https://evil.example/o/a?apiKey='+'0'*32)
    print('11 exception-validator safety assertions passed')

if __name__ == '__main__':
    selftest()
    public_count,retired_count,total=validate(Path('.gitleaksignore').read_text().splitlines())
    print(f'{public_count} public fingerprints verified; {retired_count} exact retired privileged fingerprint verified; {total} total exceptions')
