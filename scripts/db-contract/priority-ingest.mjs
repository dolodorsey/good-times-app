import assert from 'node:assert/strict';

// Synthetic fixtures exercise the current repository migrations in an isolated database.
export async function runPriorityIngestScenario({ db, q, check }) {
  const [source]=await q("insert into gt_event_sources(source_name,source_url,city) values('Official Test Theatre','https://official.example/events','atlanta') returning id");
  await q('insert into gt_atlanta_priority_policy_v1 values($1,true,80)',[source.id]);
  const [venue]=await q("insert into gt_venues(city_key,name,slug,category_key,address,status,is_verified,verification_status,freshness_expires_at) values('atlanta','Test Theatre','test','entertainment','101 Example Street Atlanta GA 30303','active',true,'verified_current',now()+interval '7 days') returning id");
  const [clock]=await q("select ((now() at time zone 'America/New_York')::date+5)::text as day,now()::text as observed");
  const event=(patch={})=>({name:'A Named Performer',date:clock.day,time:'19:00',endDate:clock.day,endTime:'21:00',venue:'Test Theatre',address:'101 Example St, Atlanta GA 30303',locality:'Atlanta',eventType:'concert',sourceUrl:'https://official.example/events/named-performer',ticket:'https://tickets.example/performance',image:'https://official.example/image.jpg',cancelled:false,soldOut:false,verified:true,publication:true,publicationReason:'verified_candidate_not_homepage_guarantee',raw:{collected_at:clock.observed,eventStatus:'https://schema.org/EventScheduled',scope:'atlanta'},...patch});
  const ingest=async(events)=>(await q('select gt_ingest_priority_events_v1($1,$2::jsonb) as result',[source.id,JSON.stringify(events)]))[0].result;
  await check('official intake preserves two performances and links canonical venue',async()=>{
    const r=await ingest([event(),event({time:'22:00',endDate:null,endTime:null})]);assert.equal(r.new_show_candidates,2);
    const rows=await q('select id,show_time,venue_id,end_time from gt_shows order by show_time');assert.equal(rows.length,2);assert(rows.every(r=>r.venue_id===venue.id));assert.equal(rows[0].end_time,'21:00');assert.equal(rows[1].end_time,null);
  });
  const [show]=await q("select * from gt_shows where show_time='19:00'");
  await check('repeat official observation reuses both show UUIDs and writes outcomes',async()=>{
    const r=await ingest([event(),event({time:'22:00',endDate:null,endTime:null})]);assert.equal(r.new_show_candidates,0);assert.equal((await q('select count(*)::int as n from gt_shows'))[0].n,2);
    assert((await q('select count(*)::int as n from gt_private.gt_backend_change_receipts_v1'))[0].n>=4);
  });
  await check('ambiguous legacy occurrence is held without changing either canonical row',async()=>{
    await q("insert into gt_shows(city_key,event_name,event_type,show_date,show_time,venue_name,venue_address) select 'atlanta','Ambiguous','concert',$1::date,'20:00','Test Theatre','101 Example Street Atlanta GA 30303' from generate_series(1,2)",[clock.day]);
    const before=await q("select to_jsonb(s) as row from gt_shows s where event_name='Ambiguous' order by id");
    const r=await ingest([event({name:'Ambiguous',time:'20:00'})]);assert.equal(r.ambiguous_occurrences,1);assert.equal(r.new_show_candidates,0);
    assert.deepEqual(await q("select to_jsonb(s) as row from gt_shows s where event_name='Ambiguous' order by id"),before);
    const [staged]=await q("select is_published,published_to_gt from gt_sourced_events where event_name='Ambiguous'");assert.equal(staged.is_published,false);assert.equal(staged.published_to_gt,false);
  });
  await check('cancellation updates the existing show and retains history and linkage',async()=>{
    const r=await ingest([event({cancelled:true,publication:false,raw:{collected_at:clock.observed,eventStatus:'https://schema.org/EventCancelled',scope:'atlanta'}})]);
    assert.equal(r.new_show_candidates,0);const [s]=await q('select id,status from gt_shows where id=$1',[show.id]);assert.equal(s.status,'cancelled');assert.equal(s.id,show.id);
    assert.equal((await q('select count(*)::int as n from gt_private.gt_source_show_links_v1 where show_id=$1',[show.id]))[0].n,1);
  });
  await check('unverified official observation cannot publish or cancel a show',async()=>{
    const r=await ingest([event({name:'Unverified',verified:false})]);assert.equal(r.new_show_candidates,0);
    assert.equal((await q("select count(*)::int as n from gt_shows where event_name='Unverified'"))[0].n,0);
    await ingest([event({verified:false,publication:false,cancelled:true,raw:{collected_at:clock.observed,eventStatus:'https://schema.org/EventPostponed',scope:'atlanta'}})]);
    assert.equal((await q('select status from gt_shows where id=$1',[show.id]))[0].status,'cancelled');
  });
  await check('manual cancelled status and reviewed links survive absent or contradictory source status',async()=>{
    await ingest([event({name:'Reviewed manual facts'})]);
    const [original]=await q("select * from gt_shows where event_name='Reviewed manual facts'");
    await q("update gt_shows set status='cancelled',ticket_url='https://reviewed.example/ticket',image_url='https://reviewed.example/image',source_url='https://reviewed.example/details' where id=$1",[original.id]);
    const raw={collected_at:clock.observed,source_observation:{version:2,facts:{eventStatus:null,isAccessibleForFree:null,availability:null,price_min:null,price_max:null,currency:null,price_basis:null}}};
    await ingest([event({name:'Reviewed manual facts',ticket:'https://provider.example/new-ticket',image:'https://provider.example/new-image',sourceUrl:'https://official.example/events/revised',raw})]);
    let [current]=await q('select * from gt_shows where id=$1',[original.id]);
    assert.equal(current.status,'cancelled');assert.equal(current.ticket_url,'https://reviewed.example/ticket');assert.equal(current.image_url,'https://reviewed.example/image');assert.equal(current.source_url,'https://reviewed.example/details');
    const [absentEvidence]=await q('select event_status,eligible from gt_atlanta_event_evidence_v1 where show_id=$1',[original.id]);assert.equal(absentEvidence.event_status,'unknown');assert.equal(absentEvidence.eligible,false);
    await ingest([event({name:'Reviewed manual facts'})]);
    const [contradictoryEvidence]=await q('select event_status,eligible from gt_atlanta_event_evidence_v1 where show_id=$1',[original.id]);assert.equal(contradictoryEvidence.event_status,'confirmed');assert.equal(contradictoryEvidence.eligible,false);
    [current]=await q('select * from gt_shows where id=$1',[original.id]);assert.equal(current.status,'cancelled');assert.equal(current.ticket_url,'https://reviewed.example/ticket');
  });
  await check('owned cancellation propagates while missing status cannot undo it',async()=>{
    await ingest([event({name:'Owned status'})]);
    const [s]=await q("select id from gt_shows where event_name='Owned status'");
    const cancelled=event({name:'Owned status',cancelled:true,publication:false,raw:{collected_at:clock.observed,eventStatus:'https://schema.org/EventCancelled'}});
    await ingest([cancelled]);assert.equal((await q('select status from gt_shows where id=$1',[s.id]))[0].status,'cancelled');
    await ingest([event({name:'Owned status',raw:{collected_at:clock.observed}})]);
    assert.equal((await q('select status from gt_shows where id=$1',[s.id]))[0].status,'cancelled');
    const [sourceRow]=await q("select * from gt_sourced_events where event_name='Owned status'");
    assert.equal(sourceRow.is_verified,true);assert.equal(sourceRow.is_published,true);assert.equal(sourceRow.published_to_gt,true);
    const [unknownEvidence]=await q('select event_status,eligible from gt_atlanta_event_evidence_v1 where show_id=$1',[s.id]);assert.equal(unknownEvidence.event_status,'unknown');assert.equal(unknownEvidence.eligible,false);
    await ingest([event({name:'Owned status'})]);
    assert.equal((await q('select status from gt_shows where id=$1',[s.id]))[0].status,'confirmed');
  });
  await check('source publication holds, annotations and field locks survive official refresh',async()=>{
    await ingest([event({name:'Held source controls'}),event({name:'Locked source field'})]);
    const [heldShow]=await q("select * from gt_shows where event_name='Held source controls'");
    await q("update gt_sourced_events set is_published=false,raw_data=raw_data||'{\"manual_note\":\"Keep on hold\",\"reviewed_taxonomy\":\"manual-lane\"}'::jsonb where event_name='Held source controls'");
    const heldResult=await ingest([event({name:'Held source controls',ticket:'https://new.example/held-ticket'})]);
    const [heldReceipt]=await q('select outcome,reason from gt_private.gt_backend_change_receipts_v1 where batch_id=$1',[heldResult.receipt_batch_id]);assert.equal(heldReceipt.outcome,'held');assert.equal(heldReceipt.reason,'existing_review_controls_or_unverified_observation');assert.equal(heldResult.held_out_of_show_inventory,1);
    assert.equal((await q('select eligible from gt_atlanta_event_evidence_v1 where show_id=$1',[heldShow.id]))[0].eligible,false);
    const [heldSource]=await q("select * from gt_sourced_events where event_name='Held source controls'");
    assert.equal(heldSource.is_published,false);assert.equal(heldSource.raw_data.manual_note,'Keep on hold');assert.equal(heldSource.raw_data.reviewed_taxonomy,'manual-lane');assert.equal(heldSource.ticket_url,heldShow.ticket_url);
    assert.equal((await q('select ticket_url from gt_shows where id=$1',[heldShow.id]))[0].ticket_url,heldShow.ticket_url);
    await q("update gt_sourced_events set raw_data=raw_data||'{\"locked_fields\":[\"ticket_url\"]}'::jsonb where event_name='Locked source field'");
    await ingest([event({name:'Locked source field',ticket:'https://new.example/locked-ticket'})]);
    assert.equal((await q("select ticket_url from gt_shows where event_name='Locked source field'"))[0].ticket_url,event().ticket);
    assert.equal((await q("select ticket_url from gt_sourced_events where event_name='Locked source field'"))[0].ticket_url,event().ticket);
  });
  await check('unverified refresh never queues trusted cancellation facts for the generic promoter',async()=>{
    await ingest([event({name:'Unverified cancellation guard'})]);
    await ingest([event({name:'Unverified cancellation guard',verified:false,cancelled:true,publication:false,raw:{collected_at:clock.observed,eventStatus:'EventCancelled'}})]);
    const [staged]=await q("select * from gt_sourced_events where event_name='Unverified cancellation guard'");
    assert.equal(staged.is_verified,true);assert.equal(staged.is_published,true);assert.equal(staged.published_to_gt,true);
    assert.equal(staged.raw_data.source_observation.facts.eventStatus,'https://schema.org/EventScheduled');
    assert.equal(staged.raw_data.last_held_observation.source_observation.facts.eventStatus,'EventCancelled');
    await q("select * from gt_promote_sourced_to_shows_internal('atlanta',false,100)");
    assert.equal((await q("select status from gt_shows where event_name='Unverified cancellation guard'"))[0].status,'confirmed');
  });
  await check('owned end and price facts can be withdrawn while reviewed price overrides remain',async()=>{
    const priced=(name,price)=>event({name,raw:{collected_at:clock.observed,source_observation:{version:2,facts:{eventStatus:'EventScheduled',isAccessibleForFree:false,availability:null,price_min:price,price_max:price,currency:price===null?null:'USD',price_basis:null}}}});
    await ingest([priced('Owned price',45),priced('Reviewed price',45)]);
    const [initial]=await q("select ticket_price_min,currency from gt_shows where event_name='Owned price'");assert.equal(Number(initial.ticket_price_min),45);assert.equal(initial.currency,'USD');
    await q("update gt_shows set ticket_price_min=73,ticket_price_max=73,currency='CAD' where event_name='Reviewed price'");
    await ingest([{...priced('Owned price',null),endDate:null,endTime:null},{...priced('Reviewed price',null),endDate:null,endTime:null}]);
    const [owned]=await q("select * from gt_shows where event_name='Owned price'");assert.equal(owned.ticket_price_min,null);assert.equal(owned.ticket_price_max,null);assert.equal(owned.currency,null);assert.equal(owned.end_date,null);assert.equal(owned.end_time,null);
    const [reviewed]=await q("select * from gt_shows where event_name='Reviewed price'");assert.equal(Number(reviewed.ticket_price_min),73);assert.equal(Number(reviewed.ticket_price_max),73);assert.equal(reviewed.currency,'CAD');
  });
  await check('official source path preserves reviewed curation against scoring side effects',async()=>{
    await q("update gt_shows set is_curated=true,is_featured=true,display_priority=7,quality_score=92,good_times_score=91,category_key_v2='manual_lane',subcategory_key_v2='manual_child' where id=$1",[show.id]);
    await db.exec("create function public.test_priority_scoring() returns trigger language plpgsql as $$ begin new.is_curated:=false;new.is_featured:=false;new.display_priority:=50;new.quality_score:=1;new.good_times_score:=1;new.category_key_v2:='computed';new.subcategory_key_v2:='computed';return new;end;$$; create trigger a_scoring_fixture before update on gt_shows for each row execute function test_priority_scoring();");
    await ingest([event({ticket:'https://tickets.example/reissued'})]);
    const [s]=await q('select * from gt_shows where id=$1',[show.id]);assert.equal(s.ticket_url,'https://tickets.example/reissued');assert.equal(s.is_curated,true);assert.equal(s.is_featured,true);assert.equal(s.display_priority,7);assert.equal(s.quality_score,92);assert.equal(Number(s.good_times_score),91);assert.equal(s.category_key_v2,'manual_lane');
  });
  await check('ordinary browser roles cannot execute official ingestion',async()=>{const [r]=await q("select has_function_privilege('anon','public.gt_ingest_priority_events_v1(uuid,jsonb)','execute') as a,has_function_privilege('authenticated','public.gt_ingest_priority_events_v1(uuid,jsonb)','execute') as u");assert.equal(r.a,false);assert.equal(r.u,false)});
}
