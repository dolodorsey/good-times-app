import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateDirectRequest} from '../src/direct-request-validation.js';
const source=fs.readFileSync('src/DirectRequest.jsx','utf8');
test('request button disables for submission, not incomplete input',()=>{
 assert.ok(source.includes("disabled={status === 'submitting'}"));
 assert.ok(source.includes("aria-busy={status === 'submitting'}"));
 assert.ok(!source.includes('disabled={!canSubmit}'));
});
test('custom validation rejects invalid phone despite native tel acceptance',()=>{
 const form={full_name:'Quality Audit',email:'qa@example.invalid',city:'Atlanta',phone:'123',interests:'Dining'};
 const result=validateDirectRequest(form,'join','2026-09-13');
 assert.equal(result.valid,false);assert.match(result.errors.phone,/mobile/);
 assert.ok(source.includes("if (!canSubmit)"));assert.ok(source.includes('role="alert"'));
});
test('busy submission guard does not turn the ongoing request into an error',()=>{
 assert.ok(source.indexOf("if (status === 'submitting') return;")<source.indexOf('if (!canSubmit)'));
});
test('request fields fit narrow screens without a fixed 230px minimum',()=>{
 assert.ok(source.includes('repeat(auto-fit,minmax(min(230px,100%),1fr))'));
});
