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

  if new.run_status = 'completed' then
    new.run_status := 'success';
  elsif new.run_status = 'failed' then
    new.run_status := 'error';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gt_normalize_scrape_run_status
on public.gt_scrape_runs;

create trigger trg_gt_normalize_scrape_run_status
before insert or update of status, run_status
on public.gt_scrape_runs
for each row
execute function public.gt_normalize_scrape_run_status();

update public.gt_scrape_runs
set run_status = case run_status
  when 'completed' then 'success'
  when 'failed' then 'error'
  else run_status
end
where run_status in ('completed','failed');

revoke all on function public.gt_normalize_scrape_run_status()
from public, anon, authenticated;
grant execute on function public.gt_normalize_scrape_run_status()
to service_role, postgres;

comment on function public.gt_normalize_scrape_run_status() is
'Normalizes GOOD TIMES scrape-run status and run_status terminal states to canonical success/error values before constraint validation and reporting.';

commit;
