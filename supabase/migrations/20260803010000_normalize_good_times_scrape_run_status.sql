begin;

-- Source Edge Functions historically record terminal states as completed/failed,
-- while gt_scrape_runs enforces success/error. Normalize the incoming values
-- before the table check constraint runs so operational evidence cannot fail
-- silently after a successful source refresh.
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

comment on function public.gt_normalize_scrape_run_status() is
'Normalizes source collector completed/failed terminal states to the canonical gt_scrape_runs success/error values before constraint validation.';

commit;
