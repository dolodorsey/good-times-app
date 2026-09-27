#!/usr/bin/env python3
"""Metadata-only security triage: no environment-key inspection or raw reports."""
import base64
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

JWT = re.compile(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
PUBLIC = re.compile(r'sb_publishable_[A-Za-z0-9_-]+')


def metadata(finding, scope):
    path = finding['File']
    commit = finding.get('Commit', '')
    if scope == 'history':
        if not re.fullmatch(r'[0-9a-f]{40}', commit):
            raise RuntimeError('Invalid finding commit')
        source = subprocess.run(['git', 'show', commit + ':' + path], capture_output=True, check=False)
        if source.returncode:
            return 'unclassified-source-unavailable'
        lines = source.stdout.decode('utf-8', errors='replace').splitlines()
    else:
        resolved = Path(path).resolve()
        if not resolved.is_relative_to(Path.cwd()):
            raise RuntimeError('Out-of-tree source')
        lines = resolved.read_text(errors='replace').splitlines()
    start = max(0, finding['StartLine'] - 1)
    selected = '\n'.join(lines[start:finding.get('EndLine', finding['StartLine'])])
    values = JWT.findall(selected)
    classes = []
    for value in values:
        try:
            payload = value.split('.')[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
            classes.append('anon-jwt' if isinstance(claims, dict) and claims.get('role') == 'anon' else 'PRIVILEGED-OR-OTHER-JWT')
        except (ValueError, TypeError, UnicodeError):
            classes.append('MALFORMED-JWT')
    if finding['RuleID'] == 'generic-api-key' and PUBLIC.search(selected):
        classes.append('public-publishable-key')
    if not classes:
        return 'UNCLASSIFIED'
    return ','.join(sorted(set(classes)))


def main():
    if subprocess.check_output(['git', 'rev-parse', '--is-shallow-repository'], text=True).strip() != 'false':
        raise RuntimeError('Full history is required')
    configured = Path('.gitleaksignore').exists()
    with tempfile.TemporaryDirectory(prefix='gt-redacted-', dir=os.environ.get('RUNNER_TEMP')) as directory:
        for scope in ['history', 'current']:
            report = Path(directory) / (scope + '.json')
            command = ['gitleaks', 'detect', '--redact=100', '--no-banner', '--report-format=json', '--report-path=' + str(report), '--exit-code=2', '--log-level=error']
            command.append('--log-opts=--full-history --all' if scope == 'history' else '--no-git')
            result = subprocess.run(command, capture_output=True, check=False)
            if result.returncode not in [0, 2] or not report.exists():
                raise RuntimeError('Scanner error; refusing to treat it as success')
            findings = json.loads(report.read_text())
            safe = [{'fingerprint': f.get('Fingerprint'), 'file': f['File'], 'line': f['StartLine'], 'classification': metadata(f, scope)} for f in findings]
            print(json.dumps({'scope': scope, 'configured_fingerprint_exceptions': configured, 'count': len(findings), 'findings': safe}, indent=2))
    print('Diagnostic classification only. Configured fingerprint exceptions, when present, apply. No credential revocation or clean-security certification claimed.')


if __name__ == '__main__':
    main()
