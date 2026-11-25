# GOOD TIMES security closeout — 2026-09-28

## Verified credential retirement

The previously exposed KHG Supabase legacy `service_role` credential has been retired without publishing its value.

- Modern KHG publishable/secret keys were already provisioned and GOOD TIMES public/server consumers were migrated.
- KHG legacy `anon` and `service_role` API keys were disabled through the Supabase Management API.
- The legacy HS256 signing key was moved from `previously_used` to `revoked`.
- A non-mutating protected Data API probe using the retired service-role bearer returned HTTP 401.
- The stale internal `supabase_goodtimes` record had its legacy key values scrubbed and was marked inactive.
- The infrastructure rotation record was marked completed with zero live legacy secrets.
- The owner explicitly accepted the known impact to the separate Halloween hourly cron and instructed this closeout to proceed.

## Historical scan policy

The repository still contains immutable historical commits with public Supabase anon/publishable values and one now-retired privileged JWT. Rewriting shared Git history is not required for release closeout after verified revocation.

`.gitleaksignore` therefore contains only exact `commit:file:rule:line` fingerprints. The validator:
1. re-reads each immutable source line from Git,
2. permits public Supabase findings only when their role/format is verified,
3. permits exactly one privileged fingerprint only when it matches the known historical KHG service-role identity,
4. rejects broad paths, rules, patterns, new commits, or additional private credentials.

Future private findings remain blocking.

## Release acceptance

A passing Secret Leak Gate must run against the complete fetched Git history, not only a pull-request delta. Credential values and private rotation material must never be committed to this repository.
