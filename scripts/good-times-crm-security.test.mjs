import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationDir = path.resolve(here, '../supabase/migrations');
const candidates = fs.readdirSync(migrationDir)
  .filter((name) => name.endsWith('_good_times_crm_privilege_hardening.sql'))
  .sort();

assert.equal(candidates.length, 1, 'expected one canonical Good Times CRM hardening migration');
const sql = fs.readFileSync(path.join(migrationDir, candidates[0]), 'utf8').toLowerCase();

test('Good Times CRM control-plane tables revoke all browser-role table privileges', () => {
  assert.match(sql, /revoke\s+all\s+privileges\s+on\s+table\s+public\.gt_crm_links\s+from\s+anon\s*,\s*authenticated\s*;/);
  assert.match(sql, /revoke\s+all\s+privileges\s+on\s+table\s+public\.gt_crm_outbox\s+from\s+anon\s*,\s*authenticated\s*;/);
  assert.match(sql, /grant\s+all\s+privileges\s+on\s+table\s+public\.gt_crm_links\s+to\s+service_role\s*;/);
  assert.match(sql, /grant\s+all\s+privileges\s+on\s+table\s+public\.gt_crm_outbox\s+to\s+service_role\s*;/);
});

test('Good Times CRM hardening stays non-destructive and brand-isolated', () => {
  assert.doesNotMatch(sql, /\b(drop\s+table|truncate\s+table|delete\s+from|update\s+public\.|insert\s+into)\b/);
  assert.doesNotMatch(sql, /\b(sos_|mission365_|mission_|oc_|luxe_|lm_|tempo_|bevco|casper_|kollective_)\b/);
  assert.doesNotMatch(sql, /grant\s+.+\s+to\s+(anon|authenticated)\b/);
});
