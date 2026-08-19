-- Enterprise App Intelligence Registry
-- Central routing metadata only. Each app remains isolated and keeps its own domain logic.

create table if not exists public.khg_app_intelligence_profiles (
  app_key text primary key,
  brand_key text not null,
  display_name text not null,
  purpose text not null,
  repo_slug text,
  vercel_project_id text,
  skill_key text not null,
  intelligence_director text not null,
  specialist_agents text[] not null default '{}',
  shared_guardians text[] not null default '{}',
  ranking_rules jsonb not null default '{}'::jsonb,
  blocked_signals text[] not null default '{}',
  release_gates jsonb not null default '{}'::jsonb,
  brand_isolation_key text not null,
  status text not null default 'active' check (status in ('active','planned','paused','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.khg_app_intelligence_profiles enable row level security;
revoke all on public.khg_app_intelligence_profiles from anon,authenticated;

comment on table public.khg_app_intelligence_profiles is
  'Internal enterprise registry for app-specific intelligence and reliability routing. Profiles never authorize cross-brand data mixing.';

insert into public.khg_app_intelligence_profiles(
  app_key,brand_key,display_name,purpose,repo_slug,vercel_project_id,skill_key,intelligence_director,
  specialist_agents,shared_guardians,ranking_rules,blocked_signals,release_gates,brand_isolation_key,status
)
values
(
  'good_times','good_times','GOOD TIMES','Culture-first discovery of events, venues, nightlife, food, art, music, sports, travel, and experiences.',
  'dolodorsey/good-times-app','prj_XScizxpsIoCggXakSla6dNGfjr01','good-times-intelligence','gt_intelligence_director',
  array['gt_culture_editor','gt_tastemaker_scout','gt_source_authority','gt_fact_verifier','gt_visual_research','gt_feed_diversity','gt_freshness_sentinel'],
  array['gt_release_guardian','app_data_integrity_guardian','app_source_trust_guardian','app_visual_quality_guardian'],
  '{"cultural_relevance":25,"experience_quality":20,"source_authority":15,"current_momentum":15,"visual_quality":10,"uniqueness":10,"proximity":5,"seo_weight":0,"personalization":"post_quality_overlay"}'::jsonb,
  array['seo_rank_as_quality','distance_first','google_rating_as_primary_authority','curator_image_default','single_source_publish','stock_impersonation','retired_provider'],
  '{"build":true,"unit_tests":true,"app_intelligence_tests":true,"visual_tests":true,"schema_compatibility":true,"rls_security":true,"core_journey_smoke":true,"runtime_errors":true,"rollback_ready":true}'::jsonb,
  'good_times','active'
),
(
  'sos','sos','S.O.S.','Urgent and community-support resource navigation where verified availability and suitability outrank raw proximity.',
  'dolodorsey/sos-app','prj_wQB404rB9g8cqXEyFJ07I3Mst6Ye','app-intelligence-director','sos_intelligence_director',
  array['sos_resource_verifier','sos_availability_checker','sos_eligibility_interpreter','sos_contact_validator','sos_safety_escalation_guardian'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_source_trust_guardian','app_release_guardian'],
  '{"verified_availability":30,"suitability":20,"eligibility":15,"contact_confidence":15,"accessibility":10,"response_likelihood":5,"proximity":5}'::jsonb,
  array['distance_first','unverified_resource','stale_hours','broken_contact','single_source_critical_fact'],
  '{"build":true,"resource_integrity":true,"critical_contacts":true,"availability_freshness":true,"core_journey_smoke":true,"runtime_errors":true}'::jsonb,
  'sos','active'
),
(
  'help_911','help_911','HELP 911','Emergency-help navigation with official-source verification, live contact integrity, and high-risk freshness controls.',
  null,'prj_iWgCBYT1cPmjOzCWhLtI7uWUeHo4','app-intelligence-director','h911_intelligence_director',
  array['h911_emergency_resource_verifier','h911_hours_availability_sentinel','h911_official_source_guardian','h911_critical_contact_monitor'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_source_trust_guardian','app_release_guardian'],
  '{"official_verification":30,"verified_availability":25,"suitability":20,"contact_confidence":15,"accessibility":5,"proximity":5}'::jsonb,
  array['distance_first','stale_emergency_resource','broken_phone','expired_program','unverified_eligibility'],
  '{"build":true,"official_source_check":true,"critical_contacts":true,"availability_freshness":true,"core_journey_smoke":true,"runtime_errors":true}'::jsonb,
  'help_911','active'
),
(
  'mission_365','mission_365','MISSION 365','Impact, giving, nonprofit, volunteer, program, grant, training, and opportunity intelligence.',
  'dolodorsey/mission-365','prj_Tuq5y7kTRpAxgyvgfrT0jEQuqeOK','app-intelligence-director','m365_intelligence_director',
  array['m365_nonprofit_verifier','m365_impact_evidence_analyst','m365_opportunity_intelligence_agent','m365_fund_flow_guardian','m365_program_freshness_sentinel'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_source_trust_guardian','app_release_guardian'],
  '{"legitimacy":25,"impact_evidence":20,"opportunity_value":20,"eligibility_fit":15,"freshness":10,"advancement_or_earning_potential":10,"seo_weight":0}'::jsonb,
  array['seo_rank_as_quality','fundraising_copy_as_impact','unverified_nonprofit','expired_program','stale_opportunity'],
  '{"build":true,"payments_or_fund_flow":true,"program_integrity":true,"opportunity_freshness":true,"core_journey_smoke":true,"runtime_errors":true}'::jsonb,
  'mission_365','active'
),
(
  'on_call','on_call','ON CALL','Service-provider marketplace matching users to reliable, verified, available providers.',
  'dolodorsey/on-call-app','prj_1aLikArNUQ6KrRx97ufkzM0edLi0','app-intelligence-director','oncall_intelligence_director',
  array['oncall_provider_verifier','oncall_service_quality_analyst','oncall_availability_router','oncall_trust_dispute_guardian','oncall_pricing_value_analyst'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_source_trust_guardian','app_release_guardian'],
  '{"verification":20,"completion_history":20,"response_reliability":15,"qualification":15,"availability":10,"dispute_rate":10,"value":5,"proximity":5}'::jsonb,
  array['distance_first','unverified_provider','fake_rating','provider_brand_leakage','unresolved_dispute_risk'],
  '{"build":true,"provider_identity":true,"booking_flow":true,"payments":true,"availability":true,"core_journey_smoke":true,"runtime_errors":true}'::jsonb,
  'on_call','active'
),
(
  'resource_exchange','resource_exchange','RESOURCE EXCHANGE','Verified resource and provider discovery with high match quality, identity resolution, and stale/duplicate suppression.',
  null,'prj_N6Zz389x5ZOTBeolaFcNWvH6a17f','app-intelligence-director','rx_intelligence_director',
  array['rx_resource_identity_resolver','rx_listing_verifier','rx_duplicate_stale_guardian','rx_match_quality_agent'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_source_trust_guardian','app_release_guardian'],
  '{"verified_fit":30,"usefulness":25,"identity_confidence":15,"freshness":15,"availability":10,"proximity":5}'::jsonb,
  array['keyword_stuffing','distance_first','duplicate_entity','stale_listing','unverified_match'],
  '{"build":true,"identity_resolution":true,"duplicate_check":true,"freshness":true,"core_journey_smoke":true,"runtime_errors":true}'::jsonb,
  'resource_exchange','active'
),
(
  'casper_universe','casper_group','CASPER UNIVERSE','Food ordering, loyalty, rewards, menu, inventory, vendor, and customer-experience operations.',
  null,'prj_PBT5d5nS0v1s9bhoKkXgHmY92KEo','app-intelligence-director','casper_intelligence_director',
  array['casper_menu_integrity_agent','casper_vendor_intelligence_agent','casper_inventory_availability_guardian','casper_order_flow_guardian','casper_loyalty_economy_guardian'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_visual_quality_guardian','app_release_guardian'],
  '{"menu_accuracy":25,"inventory_truth":20,"order_reliability":20,"vendor_reliability":15,"loyalty_integrity":10,"product_visual_truth":10}'::jsonb,
  array['wrong_product_image','stale_price','invalid_modifier','inventory_mismatch','loyalty_balance_drift','cross_brand_menu_merge'],
  '{"build":true,"menu_integrity":true,"order_flow":true,"payments":true,"loyalty":true,"inventory":true,"core_journey_smoke":true,"runtime_errors":true}'::jsonb,
  'casper_group','active'
),
(
  'casper_boh','casper_group','CASPER BOH','Back-of-house food operations, vendor, purchasing, inventory, menu, fulfillment, and staff workflows.',
  null,'prj_YXFBGKkmIQ9mhK7OgFOWspFPF5q','app-intelligence-director','casper_boh_intelligence_director',
  array['casper_vendor_intelligence_agent','casper_inventory_availability_guardian','casper_menu_integrity_agent','casper_purchasing_guardian','casper_fulfillment_guardian'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_release_guardian'],
  '{"inventory_truth":25,"vendor_reliability":20,"purchase_accuracy":20,"menu_accuracy":15,"fulfillment_reliability":15,"cost_variance":5}'::jsonb,
  array['inventory_guessing','stale_vendor_price','cross_brand_purchase','unapproved_menu_change'],
  '{"build":true,"inventory":true,"vendor_data":true,"purchasing":true,"fulfillment":true,"runtime_errors":true}'::jsonb,
  'casper_group','active'
),
(
  'kollective_customer','kollective','KOLLECTIVE CUSTOMER','Customer-facing hospitality ecosystem for venues, events, memberships, reservations, access, and experiences.',
  null,'prj_7UwoccJYRoVTaB5dgU6NTaDRDN3A','app-intelligence-director','kollective_customer_intelligence_director',
  array['kollective_experience_router','kollective_venue_event_verifier','kollective_membership_access_guardian','kollective_reservation_flow_guardian'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_visual_quality_guardian','app_release_guardian'],
  '{"experience_fit":25,"availability":20,"membership_access_accuracy":20,"reservation_integrity":20,"visual_truth":10,"proximity":5}'::jsonb,
  array['brand_merge','wrong_membership_access','stale_availability','wrong_venue_image','distance_first'],
  '{"build":true,"auth":true,"membership_access":true,"reservations":true,"payments":true,"core_journey_smoke":true,"runtime_errors":true}'::jsonb,
  'kollective','active'
),
(
  'kollective_enterprise','kollective','KOLLECTIVE ENTERPRISE','Internal enterprise operating system for brand health, objectives, agent fleets, credentials references, deployments, and executive visibility.',
  null,'prj_JVFVdekFOv4YH4UN8qlgxkvZ7PiW','app-intelligence-director','khg_enterprise_health_director',
  array['khg_objective_integrity_agent','khg_agent_fleet_guardian','khg_credential_reference_guardian','khg_deployment_governor'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_release_guardian'],
  '{"system_health":30,"objective_integrity":20,"agent_health":20,"deployment_health":15,"credential_reference_integrity":15}'::jsonb,
  array['brand_record_collapse','raw_secret_exposure','fake_healthy_status','hidden_failed_agent','silent_deployment_failure'],
  '{"build":true,"agent_health":true,"credential_reference_integrity":true,"deployment_health":true,"auditability":true,"runtime_errors":true}'::jsonb,
  'kollective','active'
),
(
  'khg_dashboard','kollective','KHG DASHBOARD','Executive command center for the full enterprise while preserving independent brand and app boundaries.',
  null,'prj_HTMPpcQjAQ6cjXv8S0ahJtqOuow0','app-intelligence-director','khg_dashboard_intelligence_director',
  array['khg_enterprise_health_director','khg_objective_integrity_agent','khg_agent_fleet_guardian','khg_deployment_governor'],
  array['app_reliability_guardian','app_data_integrity_guardian','app_release_guardian'],
  '{"data_freshness":25,"system_health":25,"brand_isolation":20,"objective_integrity":15,"deployment_health":15}'::jsonb,
  array['brand_record_collapse','stale_dashboard_snapshot','fake_healthy_status','hidden_regression'],
  '{"build":true,"data_freshness":true,"brand_isolation":true,"agent_health":true,"deployment_health":true,"runtime_errors":true}'::jsonb,
  'kollective','active'
)
on conflict(app_key) do update set
  brand_key=excluded.brand_key,
  display_name=excluded.display_name,
  purpose=excluded.purpose,
  repo_slug=excluded.repo_slug,
  vercel_project_id=excluded.vercel_project_id,
  skill_key=excluded.skill_key,
  intelligence_director=excluded.intelligence_director,
  specialist_agents=excluded.specialist_agents,
  shared_guardians=excluded.shared_guardians,
  ranking_rules=excluded.ranking_rules,
  blocked_signals=excluded.blocked_signals,
  release_gates=excluded.release_gates,
  brand_isolation_key=excluded.brand_isolation_key,
  status=excluded.status,
  updated_at=now();

create or replace view public.v_khg_app_intelligence_registry
with (security_invoker=true) as
select
  app_key,brand_key,display_name,purpose,repo_slug,vercel_project_id,skill_key,
  intelligence_director,specialist_agents,shared_guardians,ranking_rules,blocked_signals,
  release_gates,brand_isolation_key,status,updated_at
from public.khg_app_intelligence_profiles;

revoke all on public.v_khg_app_intelligence_registry from anon,authenticated;
