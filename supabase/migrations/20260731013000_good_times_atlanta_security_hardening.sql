-- GOOD TIMES Atlanta release hardening.

create or replace function public.gt_clean_taxonomy_token(raw_value text)
returns text
language sql
immutable
parallel safe
set search_path=public
as $$
  select nullif(
    trim(both '_' from regexp_replace(lower(coalesce(raw_value,'')),'[^a-z0-9]+','_','g')),
    ''
  );
$$;

do $$
begin
  alter table public.gt_banners
    add constraint gt_banners_no_markup
    check (
      headline !~ '[<>]'
      and coalesce(subheadline,'') !~ '[<>]'
      and internal_name !~ '[<>]'
    );
exception when duplicate_object then null;
end $$;
