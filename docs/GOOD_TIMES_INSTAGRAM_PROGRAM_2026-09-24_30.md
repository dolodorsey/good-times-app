# GOOD TIMES Instagram Program — Atlanta Launch

**Account:** @GOODTIMESWORLDWIDE  
**Market:** Atlanta only  
**Program version:** atlanta-launch-2026-09-24_30-v1  
**Caption standard:** gt-top-tier-copy-v2  
**Entity tagging standard:** gt-top-tier-entity-tagging-v2  
**Supabase batch:** gt-ig-atl-2026-09-24_30-v1  
**Canonical graphics folder:** https://drive.google.com/drive/folders/1d1iE9S-i-WWV5keq1l5NJgoRJRHLb0q6  
**Canonical marketing root:** 1OjxHeuwZnD6_vI4WOGz8i4BJ61BsR9Ya

## Publishing cadence
Feed: 08:30, 11:30, 14:30, 17:30, 20:30 ET daily.  
Stories: 09:00, 12:00, 16:00, 19:00, 23:00 ET using the day's feed graphics/details as three-frame story repurposes.

## Top-tier caption standard
Every caption should read like an Atlanta culture/editorial page, not an event database.

Structure:
1. Culture-forward opening hook.
2. Specific useful context: who / what / where / when.
3. Natural @mentions of verified involved entities.
4. One social CTA built around save, send, choose, or group-chat action.
5. 3–4 specific hashtags; no generic hashtag wall.

No generic engagement farming, filler copy, invented facts, invented handles, or cross-brand assets.

## Entity tagging standard
If a post directly features an identifiable venue, organizer, event, restaurant, artist, team, host, or creator with a verified current Instagram handle:

- @mention the entity naturally in the caption.
- Pass the same account into Instagram's native media `user_tags` payload for feed images.
- Carry the account into Story mention metadata when the post is repurposed.
- For roundup graphics, tag multiple verified featured entities.
- Never tag unrelated accounts solely for reach.
- Never imply paid partnership or formal collaboration unless approved.

Native tagging execution path:
`GOOD TIMES content record -> BOH social bridge -> MCP social runtime -> official Meta API user_tags`

Verified handles currently used include:
- @poncecitymarket
- @atlantabeltline
- @eavstrut
- @collect_a_con
- @aidswalkatlanta
- @lcf_georgia
- @atlutd
- @prattpullmandistrict
- @atlbotanical
- @cottoitalian
- @sargentatlanta
- @sozouatl

## Content mix
Weekend/event radar; Free Atlanta; experience discovery; event-day reminders; restaurants/first looks; brunch/rooftops/hidden gems; nightlife/after-dark; week-ahead discovery.

## Runtime QA
The exact 35 caption + graphic packages, schedule timestamps, Drive references, QA packets, native media-tag metadata, and execution records live in Kollective BOH Supabase:
- `growth_content_operations`
- `company_execution_queue`
- `company_channel_plans`
- `marketing_asset_source_laws.source_registry.verified_packages`

Current batch QA:
- 35 total feed packages.
- 35 ready to publish.
- 0 owner-review holds.
- 35 upgraded to the v2 caption/tagging standard.
- 25 carry native media entity tags.
- Remaining posts are generic editorial/guide assets where no specific verified entity should be force-tagged.

## Provider routing
Canonical Meta account: @goodtimesworldwide. Provider execution uses the isolated GOOD TIMES direct Meta path. Native image tags are sent as Meta `user_tags`. HighLevel remains a CRM/engagement support lane unless its social-planner connector is explicitly verified for this account.

## Brand isolation
GOOD TIMES assets, audience, captions, entity tags, reporting, and provider receipts remain fully separate from every other Kollective entity.
