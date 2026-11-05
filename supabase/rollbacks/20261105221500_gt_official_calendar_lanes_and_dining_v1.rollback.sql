-- Rollback: See-All lanes return to the editorial selection only. Dining profiles carry profile_source so they can be removed.
create or replace function public.gt_public_atlanta_selected_v1(p_show_id uuid)
returns boolean language sql stable security definer set search_path to 'pg_catalog','public'
as $function$ select exists(select 1 from public.gt_atlanta_editorial_selection_v1 s where s.show_id=p_show_id and s.selected_at>now()-interval '2 hours' and s.selected_at<=now()+interval '1 minute'); $function$;
delete from public.gt_restaurant_profiles where profile_source='official_site_restore_v1';
