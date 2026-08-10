-- Collapse GOOD TIMES public event + venue reads into one database RPC.
-- The queries are fast inside Postgres; a single RPC removes duplicate network
-- round-trips from cold Vercel functions while retaining caller RLS via SECURITY INVOKER.

create or replace function public.gt_public_live_inventory(
  p_city text,
  p_service_date date,
  p_event_limit integer default 480,
  p_venue_limit integer default 360
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'events', coalesce((
      select jsonb_agg(to_jsonb(e))
      from (
        select
          id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,
          image_url,organizer,display_priority,good_times_score,category_key_v2,subcategory_key_v2,
          is_featured,is_curated,updated_at
        from public.gt_shows
        where city_key = p_city
          and show_date >= p_service_date
          and status in ('confirmed','tentative')
          and image_url is not null
          and ticket_url is not null
        order by show_date asc, good_times_score desc nulls last, display_priority asc nulls last
        limit least(greatest(coalesce(p_event_limit,480),1),720)
      ) e
    ), '[]'::jsonb),
    'venues', coalesce((
      select jsonb_agg(to_jsonb(v))
      from (
        select
          id,city_key,name,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,
          quality_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,
          instagram_handle,website,phone,booking_link,status,latitude,longitude,venue_category_key,venue_subcategory
        from public.v_gt_venue_taxonomy_directory
        where city_key = p_city
          and hero_image is not null
        order by quality_score desc nulls last, google_rating desc nulls last
        limit least(greatest(coalesce(p_venue_limit,360),1),540)
      ) v
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.gt_public_live_inventory(text,date,integer,integer) from public;
grant execute on function public.gt_public_live_inventory(text,date,integer,integer) to anon, authenticated;
notify pgrst, 'reload schema';
