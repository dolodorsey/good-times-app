-- GOOD TIMES. Reconcile canonical Atlanta active/verified inventory against current public gt_venues RLS selection policy.
-- Do not delete records; identify entries requiring editorial/public-read readiness prior to invitation.
alter table public.gt_portal_outreach_candidates
 add column if not exists claim_lookup_eligible boolean not null default false,
 add column if not exists claim_lookup_evaluated_at timestamptz,
 add column if not exists claim_lookup_reason text;
with verified_public as (
 select v.id
 from public.gt_venues v
 where v.city_key='atlanta' and v.status='active' and v.is_verified=true
 and coalesce(lower(v.subcategory),'')<>all(array['supermarket','grocery_or_supermarket','liquor_store'])
 and not(coalesce(lower(v.category_key),'')='bookings' and coalesce(lower(v.subcategory),'')=any(array['supermarket','grocery_or_supermarket']))
 and (
  (coalesce(v.quality_score,0)>=55 or v.is_culture_pick is true or v.is_black_owned is true
   or v.hero_image like '%/brand-graphics/good_times/graphics/LOCATION_IMAGES/%')
  and (nullif(btrim(v.address),'') is not null or (v.latitude is not null and v.longitude is not null))
  and (nullif(btrim(v.website),'') is not null or nullif(btrim(v.phone),'') is not null
   or nullif(btrim(v.booking_link),'') is not null or
   (nullif(btrim(v.instagram_handle),'') is not null and lower(btrim(v.instagram_handle))<>'goodtimesworldwide'))
 )
)
update public.gt_portal_outreach_candidates c
set claim_lookup_eligible=(a.id is not null),claim_lookup_evaluated_at=now(),
claim_lookup_reason=case when a.id is not null then 'Matches current public gt_venues RLS eligibility at evaluation time; public API smoke test still required'
else 'Canonical record retained but excluded from current public gt_venues query by editorial/data/readiness rules; do not send claim invitation' end
from (select c2.venue_id, v.id from public.gt_portal_outreach_candidates c2 left join verified_public v on v.id=c2.venue_id) a
where c.venue_id=a.venue_id;
alter table public.gt_portal_outreach_candidates
 add constraint gt_portal_ready_requires_resolvable_venue
 check(target_status not in ('send_ready','sent_receipted') or (claim_lookup_eligible=true and claim_lookup_evaluated_at is not null));

with ranked as (
 select c.venue_id,row_number() over(order by c.claim_lookup_eligible desc,
 case when v.category_key in ('nightclub','lounge','bar','rooftop','nightlife','wine_bar','speakeasy','brunch','event_venue') then 0
 when v.category_key in ('restaurant','entertainment','food_and_dining','food_hall','comedy','jazz') then 1 else 2 end,
 case when nullif(btrim(v.website),'') is not null then 0 else 1 end,
 coalesce(v.quality_score,0) desc,v.name,c.venue_id) rn
 from public.gt_portal_outreach_candidates c join public.gt_venues v on v.id=c.venue_id)
update public.gt_portal_outreach_candidates c
set priority_wave=least(3,1+(r.rn-1)/100),research_rank=r.rn
from ranked r where c.venue_id=r.venue_id;
