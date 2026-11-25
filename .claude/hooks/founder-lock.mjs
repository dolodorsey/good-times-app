#!/usr/bin/env node
// PreToolUse hook: block edits to founder-locked files. Exit 2 = block, stderr goes to Claude.
import fs from 'node:fs'
import path from 'node:path'
const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
if (process.env.GT_FOUNDER_OVERRIDE === '1') process.exit(0)
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const ti = input.tool_input || {}
const targets = [ti.file_path, ti.path, ti.notebook_path].filter(Boolean)
const cmd = typeof ti.command === 'string' ? ti.command : ''
const list = fs.readFileSync(path.join(root, '.claude/hooks/protected-paths.txt'), 'utf8')
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
const rel = p => path.relative(root, path.resolve(root, p)).split(path.sep).join('/')
const hit = targets.map(rel).find(t => list.some(p => t === p || (p.endsWith('/') && t.startsWith(p))))
  || (cmd && /(>|\bsed -i|\bmv |\brm |\bcp |\btee )/.test(cmd) && list.find(p => cmd.includes(p)))
if (hit) {
  console.error(`FOUNDER LOCK: "${hit}" is protected (GOOD TIMES visual/scope authority). ` +
    'Propose the change instead, or have the founder approve and rerun with GT_FOUNDER_OVERRIDE=1.')
  process.exit(2)
}
