#!/usr/bin/env node
/**
 * Keeps the admin Command Center OUT of the native app bundles.
 *
 * public/admin.html is copied into dist/ by vite and then into
 * ios/App/App/public (and android/.../assets/public) by `npx cap sync`. That
 * file contains a Supabase service_role credential, which would then be
 * readable inside the shipped IPA/AAB by anyone who unzips it — including App
 * Review. Per owner decision 2026-08-09 the page stays on the public web, but
 * it must never enter a native binary.
 *
 * Run AFTER `npx cap sync`. Fails the build if a privileged credential is still
 * present in native web assets afterwards.
 */
import fs from 'node:fs';
import path from 'node:path';

const NATIVE_WEB_ROOTS = [
  'ios/App/App/public',
  'android/app/src/main/assets/public',
];
const BLOCKED = ['admin.html'];

const JWT = /eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

let removed = 0;
for (const root of NATIVE_WEB_ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const name of BLOCKED) {
    const target = path.join(root, name);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
      console.log(`stripped ${target}`);
      removed += 1;
    }
  }
}

// Verify: no non-anon Supabase credential survives anywhere in native assets.
const offenders = [];
const walk = (p) => {
  let st;
  try { st = fs.statSync(p); } catch { return; }
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) walk(path.join(p, f)); return; }
  if (st.size > 8 * 1024 * 1024) return;
  let txt;
  try { txt = fs.readFileSync(p, 'utf8'); } catch { return; }
  for (const tok of txt.match(JWT) || []) {
    try {
      const role = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString('utf8'))?.role;
      if (role && role !== 'anon') offenders.push(`${p} -> role=${role}`);
    } catch { /* not a JWT we can read */ }
  }
};
NATIVE_WEB_ROOTS.forEach(walk);

if (offenders.length) {
  console.error('\nNATIVE BUNDLE CONTAINS A PRIVILEGED CREDENTIAL:');
  offenders.forEach((o) => console.error('  ' + o));
  console.error('\nRefusing to produce a native build.\n');
  process.exit(1);
}

console.log(`native web assets clean (${removed} file(s) stripped, no non-anon credential present)`);
