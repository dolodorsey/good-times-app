-- Good Times invitation security: approved venue messages may contain ONLY the canonical venue portal domain.
-- This does not assert that the hostname's new /venues route is published; full HTTP + Auth QA is a separate gate.
alter table public.gt_portal_outreach_candidates
 add constraint gt_portal_official_claim_link_only
 check(target_status not in ('send_ready','sent_receipted') or
 (verified_public_claim_url='https://partners.thegoodtimesworldwide.com/venues?venue='||venue_id::text
 and strpos(coalesce(individualized_copy,''),verified_public_claim_url)>0));
