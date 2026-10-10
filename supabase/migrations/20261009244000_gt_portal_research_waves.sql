-- Research order only. Never mistake prioritization for verified contact or permission to send.
alter table public.gt_portal_outreach_candidates
 add column if not exists priority_wave integer check(priority_wave between 1 and 3),
 add column if not exists research_rank integer,
 add column if not exists priority_reason text;
with ranked as(
 select v.id,
 row_number() over(order by
 case when v.category_key in ('nightclub','lounge','bar','rooftop','nightlife','wine_bar','speakeasy','brunch','event_venue') then 0
  when v.category_key in ('restaurant','entertainment','food_and_dining','food_hall','comedy','jazz') then 1 else 2 end,
 case when nullif(trim(v.website),'') is not null then 0 else 1 end,
 coalesce(v.quality_score,0) desc, v.name, v.id) as rn,
 v.category_key,v.quality_score
 from public.gt_venues v join public.gt_portal_outreach_candidates c on c.venue_id=v.id
 where v.city_key='atlanta' and v.status='active' and v.is_verified is true
)
update public.gt_portal_outreach_candidates c set
 priority_wave=least(3,1+(r.rn-1)/100),
 research_rank=r.rn,
 priority_reason='Atlas-only research ordering: Atlanta active+verified; category '||coalesce(r.category_key,'unknown')||'; existing quality metadata '||coalesce(r.quality_score::text,'unknown')||'. Not a qualified lead.'
from ranked r where c.venue_id=r.id;
create index if not exists gt_portal_outreach_rank_idx on public.gt_portal_outreach_candidates(target_status,research_rank,venue_id);

create or replace function public.gt_portal_outreach_page(p_state text default 'research',p_limit integer default 35,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare n integer;off integer;total integer;items jsonb;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_state not in ('research','contact_qualified','copy_approved','send_ready','suppressed','sent_receipted','reply_received','claim_started','closed') then raise exception 'Unknown stage' using errcode='22023';end if;
 n:=least(greatest(coalesce(p_limit,35),1),75);
 off:=least(greatest(coalesce(p_offset,0),0),100000);
 select count(*) into total from public.gt_portal_outreach_candidates where target_status=p_state;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into items
 from(select venue_id,venue_name,public_website,public_phone,public_instagram,
  target_status,contact_name,contact_title,contact_email,email_evidence_url,email_verified_at,
  contact_reviewer_note,individualized_copy,copy_reviewer_note,copy_approved_at,
  dnc_clear,suppression_clear,portal_link_tested_at,auth_roundtrip_tested_at,
  muse_send_approved_at,last_outcome,priority_wave,research_rank,priority_reason
 from public.gt_portal_outreach_candidates
 where target_status=p_state
 order by research_rank nulls last,venue_name limit n offset off)t;
 return jsonb_build_object('status',p_state,'total',total,'offset',off,'limit',n,'items',items);
end;$f$;
revoke all on function public.gt_portal_outreach_page(text,integer,integer) from public,anon;
grant execute on function public.gt_portal_outreach_page(text,integer,integer) to authenticated,service_role;
