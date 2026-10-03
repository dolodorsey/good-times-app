import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = readFileSync('.github/workflows/ios-build.yml', 'utf8')

test('iOS automatic release detects application changes on merge commits', () => {
  assert.match(workflow, /git diff --name-only HEAD\^1 HEAD/)
  assert.match(workflow, /git diff-tree --root --no-commit-id --name-only -r HEAD/)
  assert.doesNotMatch(workflow, /CHANGED=\$\(git diff-tree --no-commit-id --name-only -r HEAD\)/)
})

test('iOS release remains forced for manual workflow dispatch', () => {
  assert.match(workflow, /github\.event_name.*workflow_dispatch/)
  assert.match(workflow, /should-build=true/)
})
