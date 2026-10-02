# CLAUDE.md — GOOD TIMES

Claude sessions in this repo operate inside **Kollective OS**. Read in this order before changing anything:

1. `AGENTS.md` — product/UI constitution (authoritative).
2. `docs/GOOD_TIMES_REFERENCE_BASE_LOCK.md` — visual reference lock and release evidence.
3. `kos_resolve_context("good-times")` via the `kollective` MCP server — live founder decisions, locks, capabilities, open work and active claims. If it disagrees with a file here, stop and surface the conflict; do not pick one silently.

## Non-negotiables (summarised — AGENTS.md wins on any difference)
- **Atlanta only** on every customer-facing surface. Never re-enable other cities from inventory.
- **Bottom nav is exactly Home / Discover / Plan / Saved / Profile.** Plan is the center action. Radar opens from the bell. Entertainment is a Discover category, never a sixth tab.
- **Visual authority:** `src/features/experience/good-times-founder-v4-restore.css`, measured against the founder's nine GOOD TIMES STANDARD screens (941×1672). No new global theme, palette or font.
- **Mockup content is never data.** Venue facts, ratings, addresses, dates, CONFIRMED states and the reference identity come from verified records only.
- **Never commit credentials.** Reference Supabase credential rows by name.

## Kollective OS protocol
1. `kos_resolve_context` → 2. `kos_resume` → 3. `kos_claim_resource` (e.g. `good-times:ui`, `good-times:api`) before editing; if claimed by another executor, work elsewhere →
4. work on a branch, never directly on `main` → 5. `npm test && npm run build` plus the rendered reference checks →
6. `kos_checkpoint` with evidence (SHA, deployment id, screenshot hashes) → 7. `kos_record_receipt` for any external action →
8. `kos_release_claim`.

A Vercel `READY` build is not proof the app works. Only the founder marks work done.

## Protected files
Edits to the files listed in `.claude/hooks/protected-paths.txt` are blocked by a hook. Founder-approved changes run with `GT_FOUNDER_OVERRIDE=1` and must cite the approval in the commit message.
