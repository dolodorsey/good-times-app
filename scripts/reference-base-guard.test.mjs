import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const main=read('src/main.jsx')
const authority='features/experience/good-times-founder-v4-restore.css'
test('reference-base stylesheet is the final eager CSS authority',()=>{
 const imports=[...main.matchAll(/import\s+['"]\.\/([^'"]+\.css)['"]/g)].map(m=>m[1])
 assert.equal(imports.at(-1),authority,'A later global stylesheet may silently redesign GOOD TIMES')
 assert.equal(imports.filter(x=>x===authority).length,1)
})
test('reference-base retains protected palette, editorial typography and responsive controls',()=>{
 const css=read(`src/${authority}`)
 for(const value of ['#050607','#f8d46a','--gt5-serif','--gt5-sans','.gt5-brand .gt5-mark','.gt5-home-quick small','.gt5-lanes','.gt5-nav','prefers-reduced-motion'])assert.ok(css.includes(value),`Missing protected reference token/rule ${value}`)
 assert.match(css,/font-family:var\(--gt5-serif\)!important/,'Editorial hierarchy must win inherited global overrides')
 assert.ok(!/#ff9b85|#78dbcb|#c5adff|#90c9ff/.test(css),'Superseded category palette returned')
})
test('owner editorial artwork cannot silently be replaced',()=>{
 const bytes=readFileSync(new URL('../public/reference-base/atlanta-rooftop.webp',import.meta.url))
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'bf0e1f69441e899c6cb4d75949f693831e6b74ef75b286577c83957333dfaeb7')
})
test('reference review stays inside the existing required UI regression job',()=>{
 const workflow=read('.github/workflows/ui-regression.yml')
 assert.ok(workflow.includes('scripts/reference-base-rendered.test.mjs'),'Required geometry job must run reference proof')
 assert.ok(workflow.includes('scripts/customer-enhancements-rendered.test.mjs'),'Existing interaction tests must not be removed')
 assert.ok(workflow.includes('scripts/home-discover-reference-rendered.test.mjs'),'Existing composition tests must not be removed')
 assert.ok(!workflow.includes('continue-on-error: true'),'Reference errors must not be ignored')
})
