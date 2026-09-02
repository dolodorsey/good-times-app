import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationPath = new URL('../supabase/migrations/20260902193925_good_times_revoke_client_crm_grants.sql', import.meta.url);
const rawSql = fs.readFileSync(migrationPath, 'utf8');
const sql = rawSql
  .replace(/--.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .toLowerCase();

test('Good Times CRM control-plane tables are server-only', () => {
  for (const table of ['gt_crm_links', 'gt_crm_outbox']) {
    assert.match(sql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`));
    assert.match(sql, new RegExp(`revoke\\s+all\\s+privileges\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon\\s*,\\s*authenticated`));
    assert.match(sql, new RegExp(`grant\\s+all\\s+privileges\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+service_role`));
  }
});

test('Good Times CRM hardening is non-destructive and brand-isolated', () => {
  assert.doesNotMatch(sql, /\b(drop\s+(table|view|schema)|truncate|delete\s+from|update\s+public\.|insert\s+into)\b/);
  assert.doesNotMatch(sql, /\b(sos_|oc_|mission365_|tempo_|lm_|casper_|bevco_|noir_|iconic_)\b/);
  const referencedGtObjects = [...sql.matchAll(/public\.(gt_[a-z0-9_]+)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(referencedGtObjects)].sort(), ['gt_crm_links', 'gt_crm_outbox']);
});
