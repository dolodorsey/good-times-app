import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationPath = new URL('../supabase/migrations/20260902202000_good_times_revoke_client_crm_grants.sql', import.meta.url);
const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase();

test('Good Times CRM control-plane tables revoke direct browser-role access', () => {
  assert.match(sql, /revoke\s+all\s+privileges\s+on\s+table\s+public\.gt_crm_links\s+from\s+anon\s*,\s*authenticated/);
  assert.match(sql, /revoke\s+all\s+privileges\s+on\s+table\s+public\.gt_crm_outbox\s+from\s+anon\s*,\s*authenticated/);
  assert.match(sql, /grant\s+all\s+privileges\s+on\s+table\s+public\.gt_crm_links\s+to\s+service_role/);
  assert.match(sql, /grant\s+all\s+privileges\s+on\s+table\s+public\.gt_crm_outbox\s+to\s+service_role/);
});

test('Good Times CRM hardening is non-destructive and brand-isolated', () => {
  assert.doesNotMatch(sql, /\b(drop\s+table|truncate\s+table|delete\s+from|update\s+public\.|insert\s+into)\b/);
  assert.doesNotMatch(sql, /\b(sos_|mission365_|mission_|oc_|tempo_|luxe_|casper_|bevco_|water_)\b/);
});
