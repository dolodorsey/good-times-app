# GOOD TIMES release/security repair — 2026-09-27

## Scope and status
Owner authorized repair. No UI, taxonomy, database records, production feature flags, or scheduler activation is included.

- Merged separately: PR #163, commit `090ffa483d2898f072cc2d835961d07362029878`, fixes failure reporting before checkout with `GH_REPO`.
- Initial redacted audit: run `36348666157`, source `8c17baf3c56a89ce039bd8a4bda0761ce1c5288a`.
- That audit found 74 historical occurrences: 73 public Supabase-key occurrences (70 unique immutable fingerprints), and one NON-PUBLIC finding. Current-tree scan found 19 public-key occurrences.
- This repair exempts only the reviewed immutable public fingerprints, validates their public role/format on every run, and makes Secret Leak Gate examine full fetched history for PRs as well as scheduled runs.
- It does NOT clear the remaining non-public finding or establish credential revocation. Keep this PR in draft and do not represent the release as security-certified while that finding remains.
- Credential values, private incident details and rotation evidence must not be posted to this public repository.

## Acceptance requirements
1. The exception validator passes its negative tests and confirms every fingerprint is an immutable public-only source line.
2. Gitleaks uses default detection rules and scans complete fetched history on every event. No global JWT/path/commit suppression, forced success, or skipped secret scan.
3. Remaining private credential is remediated through a coordinated credential rotation with all affected consumers verified. Deleting it from the latest file does not establish revocation. Never treat `previously_used` as `revoked`.
4. A scoped `SNAPSHOT_BOT_TOKEN` must be securely installed for this repository only, with the intended Contents/Pull requests access. Shared credentials must not be blindly copied into this workflow.
5. Run one authorized refresher cycle and verify validated cache -> data-only change -> full build -> PR event -> required checks on exact SHA -> exact-SHA merge -> production alias -> fallback armed/fresh.
6. Verify failure reporting opens or comments its issue even before checkout; #163 repairs that path independently.

## No unsafe shortcut
Do not disable legacy project keys without inventorying dependent clients and workers. Do not rewrite shared Git history or remove branch protections to make a badge green. No recurring job was re-enabled by this repair.
