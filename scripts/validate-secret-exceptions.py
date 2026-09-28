#!/usr/bin/env python3
"""Validate exact Gitleaks historical exceptions without printing secret values."""
import base64, json, re, subprocess
from pathlib import Path

FINGERPRINT = re.compile(r'([0-9a-f]{40}):([^:]+):(jwt|generic-api-key):([1-9][0-9]*)')
JWT = re.compile(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
PUBLIC = re.compile(r'\bsb_publishable_[A-Za-z0-9_-]+\b')
REVIEWED_ISSUERS = frozenset(('supabase','HS256','sup'))
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
    print('8 exception-validator safety assertions passed')

if __name__ == '__main__':
    selftest()
    public_count,retired_count,total=validate(Path('.gitleaksignore').read_text().splitlines())
    print(f'{public_count} public fingerprints verified; {retired_count} exact retired privileged fingerprint verified; {total} total exceptions')
