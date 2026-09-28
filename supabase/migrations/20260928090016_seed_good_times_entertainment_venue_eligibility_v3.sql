-- GOOD TIMES production reconciliation.
-- Applied to content project dzlmtvodpyhetvektfuo as migration 20260928090016.
-- Adds narrow venue-eligibility rules for Entertainment lanes that already have verified Atlanta-area entities.
-- This links canonical venues to discovery contexts; it does not duplicate venues or activate sourcing.

insert into public.gt_venue_taxonomy_eligibility(
  id,venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,
  confidence,rationale,is_active,created_at,updated_at
)
select gen_random_uuid(),x.venue_category_key,x.venue_subcategory_pattern,
       'entertainment',x.subcategory_key,x.confidence,x.rationale,true,now(),now()
from (values
  ('experiences','observation_wheel','ent_observation_rides',100,'Verified observation-wheel venues directly support Skyline & Observation Rides.'),
  ('event_venue','sim_racing','ent_sim_racing',100,'Verified dedicated sim-racing venues directly support Racing & Simulators.'),
  ('entertainment','driving_experience','ent_sim_racing',90,'Verified driving-experience venues with simulator offerings support Racing & Simulators.'),
  ('culture','transportation_museum|aviation_museum','ent_trains_transport',95,'Verified transportation and aviation museums directly support Trains & Transportation discovery.'),
  ('entertainment','driving_edutainment_family','ent_trains_transport',85,'Verified driving-edutainment venues support family transportation experiences.'),
  ('entertainment','active_indoor_play|indoor_active_play|indoor_playground|indoor_play_sensory|inclusive_sensory_play','ent_indoor_playgrounds',95,'Explicit verified indoor-play classifications directly support Indoor Playgrounds.'),
  ('entertainment','trampoline_adventure_park','ent_trampoline_adventure',100,'Verified trampoline-adventure parks directly support Trampoline & Adventure Parks.')
) as x(venue_category_key,venue_subcategory_pattern,subcategory_key,confidence,rationale)
where not exists (
  select 1
  from public.gt_venue_taxonomy_eligibility e
  where e.venue_category_key=x.venue_category_key
    and coalesce(e.venue_subcategory_pattern,'')=coalesce(x.venue_subcategory_pattern,'')
    and e.category_key='entertainment'
    and e.subcategory_key=x.subcategory_key
);
