begin;

create or replace function public.gt_normalize_scrape_run_status()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.status = 'completed' then
    new.status := 'success';
  elsif new.status = 'failed' then
    new.status := 'error';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gt_normalize_scrape_run_status
on public.gt_scrape_runs;

create trigger trg_gt_normalize_scrape_run_status
before insert or update of status
on public.gt_scrape_runs
for each row
execute function public.gt_normalize_scrape_run_status();

revoke all on function public.gt_normalize_scrape_run_status()
from public, anon, authenticated;
grant execute on function public.gt_normalize_scrape_run_status()
to service_role, postgres;

commit;

-- Canonicalized historical run_status values remain success/error on rollback;
-- no operational evidence is deleted or made less consistent.
