-- See-All lanes read gt_shows directly, so a restrictive RLS policy limited every lane to the 65-row editorial selection.
-- This admits the same official-calendar events the Home feed now shows. Editorial selection still counts.
-- Every other public gate stays in the permissive policy: confirmed/tentative, current date, image, ticket link, venue.
create or replace function public.gt_public_atlanta_selected_v1(p_show_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'pg_catalog','public'
as $function$
  select exists(select 1 from public.gt_atlanta_editorial_selection_v1 s where s.show_id=p_show_id and s.selected_at>now()-interval '2 hours' and s.selected_at<=now()+interval '1 minute')
      or exists(select 1 from public.gt_shows x
                where x.id=p_show_id
                  and public.gt_is_official_calendar_source(x.source)
                  and x.updated_at>now()-interval '45 days'
                  and coalesce(x.category_key_v2,'')<>'needs_review'
                  and lower(coalesce(x.event_name,'')||' '||coalesce(x.venue_name,'')) !~ '(season tickets|season pass|parking pass|parking only|premium season|fast lane|vip upgrade|open.?mic|comedy school|workshop|audition|webinar|timeshare|make money|zoom|karaoke|shuttle|virtual event|^copy of[ :]|test event|sample event)');
$function$;

-- Official calendars only bump updated_at when a row changes, so a quiet calendar is not a stale one.
do $$ declare d text; begin
  select pg_get_functiondef('public.gt_public_live_inventory(text,date,integer,integer)'::regprocedure) into d;
  d:=replace(d,'interval ''21 days''','interval ''45 days''');
  execute d;
end $$;

-- The Dining explorer inner-joins gt_restaurant_profiles, so restored dining venues were invisible there.
-- Facets stay empty and needs_review stays true: cuisine comes from the venue's own sourced subcategory.
insert into public.gt_restaurant_profiles(entity_id,cuisine_tags,occasion_tags,meal_tags,vibe_tags,feature_tags,dietary_tags,ownership_tags,profile_confidence,profile_source,needs_review,evidence,updated_at)
select v.id,'{}','{}','{}','{}','{}','{}','{}',40,'official_site_restore_v1',true,jsonb_build_object('rule','active dining venue without a profile; facets stay empty until reviewed','website',v.website),now()
from public.gt_venues v
left join public.gt_restaurant_profiles p on p.entity_id=v.id
where v.city_key='atlanta' and v.status='active' and v.is_verified and v.verification_status='verified_current' and v.freshness_expires_at>now()
  and p.entity_id is null
  and v.category_key in ('restaurant','food_and_dining','brunch','coffee','food_hall','food_truck','wine_bar','bakery')
  and coalesce(v.subcategory,'') not in ('bowling_lounge','brewpub');

-- The Blind Pig's hero is a pop-up logo from its site, not a photo of the place.
update public.gt_venues v set metadata=coalesce(v.metadata,'{}'::jsonb)||jsonb_build_object('previous_hero_image',v.hero_image),hero_image=null,updated_at=now()
where v.city_key='atlanta' and v.id::text like 'abe5dcfa%';

select public.gt_refresh_atlanta_live_inventory_cache_v1();
