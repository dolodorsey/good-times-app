import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationPath = new URL('../supabase/migrations/20260831234121_good_times_public_ads_security_hardening.sql', import.meta.url);
const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase();

test('Good Times public ad view is forced to security invoker', () => {
  assert.match(sql, /alter\s+view\s+public\.v_gt_active_ads\s+set\s*\(\s*security_invoker\s*=\s*true\s*\)/);
});

test('Good Times ad security migration is scoped only to the public ad view', () => {
  assert.match(sql, /public\.v_gt_active_ads/);
  assert.doesNotMatch(sql, /\b(drop\s+table|truncate|delete\s+from)\b/);
  assert.doesNotMatch(sql, /\b(sos_|mission_|bevco|kollective_)\b/);
});
