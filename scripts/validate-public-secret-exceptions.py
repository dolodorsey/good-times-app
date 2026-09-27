#!/usr/bin/env python3
"""Validate immutable PUBLIC-key exceptions. Never outputs credential values."""
import base64
import json
from pathlib import Path
import re
import subprocess

FINGERPRINT = re.compile(r'([0-9a-f]{40}):([^:]+):(jwt|generic-api-key):([1-9][0-9]*)')
JWT = re.compile(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
PUBLIC = re.compile(r'\bsb_publishable_[A-Za-z0-9_-]+\b')


def public_line(rule, line):
    if 'sb_secret_' in line or 'service_role' in line:
        return False
    tokens = JWT.findall(line)
    if rule == 'jwt':
        if not tokens:
            return False
        for token in tokens:
            try:
                part = token.split('.')[1]
                claims = json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))
                # HS256 is an erroneous issuer in a reviewed historical anon-client
                # literal. It does NOT establish signature validity or private access.
                if claims.get('role') != 'anon' or claims.get('iss') not in ('supabase', 'HS256'):
                    return False
                if any(field in claims for field in ('sub', 'email', 'phone', 'session_id')):
                    return False
            except (ValueError, TypeError, UnicodeError):
                return False
        return True
    return rule == 'generic-api-key' and bool(PUBLIC.search(line)) and not tokens


def validate(entries):
    seen = set()
    for entry in entries:
        if not entry or entry.startswith('#'):
            continue
        match = FINGERPRINT.fullmatch(entry)
        if not match or entry in seen:
            raise ValueError('Exceptions require unique, immutable commit fingerprints')
        seen.add(entry)
        commit, path, rule, number = match.groups()
        result = subprocess.run(['git', 'show', commit + ':' + path], capture_output=True, check=False)
        if result.returncode:
            raise ValueError('Exception source is unavailable; refusing unverified waiver')
        lines = result.stdout.decode('utf-8').splitlines()
        index = int(number) - 1
        if index >= len(lines) or not public_line(rule, lines[index]):
            raise ValueError('Exception is not verified public-only: ' + entry)
    return len(seen)


def selftest():
    def fake(role, issuer='supabase', **extra):
        head = base64.urlsafe_b64encode(json.dumps({'alg': 'HS256'}).encode()).decode().rstrip('=')
        body = base64.urlsafe_b64encode(json.dumps({'iss': issuer, 'role': role, **extra}).encode()).decode().rstrip('=')
        return head + '.' + body + '.synthetic_test_signature_not_a_credential'
    assert public_line('jwt', fake('anon'))
    assert not public_line('jwt', fake('service_role'))
    assert not public_line('jwt', fake('authenticated'))
    assert not public_line('jwt', 'eyJbroken.invalid.invalid')
    assert not public_line('jwt', fake('anon') + ' ' + fake('service_role'))
    assert public_line('generic-api-key', 'sb_publishable_synthetic_test_only')
    assert not public_line('generic-api-key', 'sb_secret_synthetic_test_only')
    assert not public_line('generic-api-key', 'sb_publishable_synthetic_test_only sb_secret_synthetic_test_only')
    assert not FINGERPRINT.fullmatch('api/data.js:jwt:2')
    assert public_line('jwt', fake('anon', issuer='HS256'))
    assert not public_line('jwt', fake('service_role', issuer='HS256'))
    assert not public_line('jwt', fake('anon', issuer='unreviewed-provider'))
    assert not public_line('jwt', fake('anon', sub='synthetic-user'))
    print('13 public-exception safety assertions passed')


if __name__ == '__main__':
    selftest()
    total = validate(Path('.gitleaksignore').read_text().splitlines())
    print(f'{total} immutable public-key fingerprints verified; no private-key exception accepted')
