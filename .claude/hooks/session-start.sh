#!/bin/sh
# SessionStart hook: stdout is added to Claude's context.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
echo "GOOD TIMES session | branch: $(git branch --show-current 2>/dev/null) | head: $(git log -1 --format='%h %s' 2>/dev/null)"
echo "Uncommitted files: $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
echo "Before editing: kos_resolve_context('good-times'), kos_resume, then kos_claim_resource. Atlanta only. Nav = Home/Discover/Plan/Saved/Profile. Protected files: .claude/hooks/protected-paths.txt"
