import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync(new URL('../supabase/migrations/20260819062000_good_times_media_publisher_attribution.sql',import.meta.url),'utf8')

test('approved media publisher requires verified non-stock known-rights candidates',()=>{
  assert.match(sql,/subject_verified=true/)
  assert.match(sql,/coalesce\(is_stock,false\)=false/)
  assert.match(sql,/copyright_denied/)
  assert.match(sql,/unknown/)
})

test('venue media replacement carries provenance and verification state',()=>{
  assert.match(sql,/photo_status='verified'/)
  assert.match(sql,/photo_source=selected_source/)
  assert.match(sql,/photo_credit=selected_credit/)
  assert.match(sql,/metadata->>'attribution'/)
})

test('publisher stays server-side only',()=>{
  assert.match(sql,/revoke all on function public\.gt_apply_best_approved_media\(text,text\) from public,anon,authenticated/)
  assert.match(sql,/grant execute on function public\.gt_apply_best_approved_media\(text,text\) to service_role/)
})
