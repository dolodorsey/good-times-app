#!/usr/bin/env python3
"""Validate immutable PUBLIC-key exceptions. Never outputs credential values."""
import base64
import json
from pathlib import Path
import re
import subprocess
import sys

FINGERPRINT = re.compile(r'([0-9a-f]{40}):([^:]+):(jwt|generic-api-key):([1-9][0-9]*)')
JWT = re.compile(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
PUBLIC = re.compile(r'\bsb_publishable_[A-Za-z0-9_-]+\b')


def public_line(rule, line):
    # Disallow private-looking material even when a public key shares the line.
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
                if claims.get('role') != 'anon' or claims.get('iss') != 'supabase':
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
    def fake(role):
        head = base64.urlsafe_b64encode(json.dumps({'alg': 'HS256'}).encode()).decode().rstrip('=')
        body = base64.urlsafe_b64encode(json.dumps({'iss': 'supabase', 'role': role}).encode()).decode().rstrip('=')
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
    print('9 public-exception safety assertions passed')


if __name__ == '__main__':
    selftest()
    total = validate(Path('.gitleaksignore').read_text().splitlines())
    print(f'{total} immutable public-key fingerprints verified; no private-key exception accepted')
