import assert from 'node:assert/strict';
import { quoteIdentifier as quote } from './database.mjs';

// Synthetic fixtures exercise the current repository migrations in an isolated database.
export async function runPromotionScenario({ db, q, check }) {
  await check('unknown admission and inherited age defaults remain unknown',async()=>{
    const [r]=await q("select gt_private.gt_source_show_facts_v1($1::jsonb) as facts",[JSON.stringify({city:'atlanta',event_name:'Test',event_type:'networking',is_free:false,age_requirement:'18+'})]);
    assert.equal(r.facts.event_type,'special_event');assert.equal(r.facts.is_free,undefined);assert.equal(r.facts.age_requirement,undefined);
  });
  await check('full address matching retains unit, city and ZIP',async()=>{
    const [r]=await q("select gt_private.gt_full_address_key_v1('875 Battery Avenue SE #Ste 720, Atlanta, Georgia 30339 USA') as a, gt_private.gt_full_address_key_v1('875 Battery Ave SE Suite 720 Atlanta GA 30339') as b, gt_private.gt_full_address_key_v1('875 Battery Ave SE Atlanta GA 30339') as c, gt_private.gt_full_address_key_v1('875 Battery Ave') as d");
    assert.equal(r.a,r.b);assert.notEqual(r.a,r.c);assert.equal(r.d,null);
    for (const address of ['875 Battery Ave SE GA 30339', '875 Battery Ave SE Atlanta 30339', '875 Battery Ave SE Atlanta GA', '875 Battery Ave SE Houston GA 30339']) {
      const [incomplete] = await q('select gt_private.gt_full_address_key_v1($1) as key', [address]);
      assert.equal(incomplete.key, null, address);
    }
  });
  const priceFacts = async facts => (await q(
    'select gt_private.gt_source_show_facts_v1(to_jsonb(jsonb_populate_record(null::gt_sourced_events,$1::jsonb))) as facts',
    [JSON.stringify({ city: 'atlanta', event_name: 'Observed price', event_type: 'concert', raw_data: { source_observation: { version: 2, facts } } })],
  ))[0].facts;
  await check('latest v2 prices survive nullable typed columns and zero does not prove free admission', async () => {
    const paid = await priceFacts({ price_min: 15, price_max: 25, currency: 'usd', price_basis: 'per ticket' });
    assert.equal(paid.ticket_price_min, 15);
    assert.equal(paid.ticket_price_max, 25);
    assert.equal(paid.currency, 'USD');
    assert.equal(paid.price_basis, 'per ticket');
    const zero = await priceFacts({ price_min: 0, price_max: 0, currency: 'USD' });
    assert.equal(zero.ticket_price_min, 0);
    assert.equal(zero.is_free, null);
    assert.equal(zero.free_status, null);
  });
  await check('prices require valid currency, nonnegative numbers and a coherent range', async () => {
    for (const currency of [null, '', 'US$', 'DOLLARS']) {
      const facts = await priceFacts({ price_min: 15, price_max: 25, currency });
      assert.equal(facts.ticket_price_min, null);
      assert.equal(facts.ticket_price_max, null);
      assert.equal(facts.currency, null);
    }
    const negative = await priceFacts({ price_min: -5, price_max: -1, currency: 'USD' });
    assert.equal(negative.ticket_price_min, null);
    assert.equal(negative.ticket_price_max, null);
    const reversed = await priceFacts({ price_min: 25, price_max: 15, currency: 'USD' });
    assert.equal(reversed.ticket_price_min, null);
    assert.equal(reversed.ticket_price_max, null);
    const strings = await priceFacts({ price_min: '15', price_max: '25', currency: 'USD' });
    assert.equal(strings.ticket_price_min, null);
    assert.equal(strings.ticket_price_max, null);
  });
  const [venue]=await q("insert into gt_venues(city_key,name,slug,category_key,address,status,is_verified,verification_status,freshness_expires_at) values('atlanta','Test Theatre','test-theatre','entertainment','101 Example Street, Atlanta GA 30303','active',true,'verified_current',now()+interval '7 days') returning id");
  const [day]=await q("select ((now() at time zone 'America/New_York')::date+4)::text as d");
  async function source(time,name='A Performance',extra={}){
    const data={city:'atlanta',event_name:name,event_date:day.d,event_time:time,venue_name:'Test Theatre',venue_address:'101 Example St, Atlanta GA 30303',event_type:'concert',description:'Source description',ticket_url:'https://example.org/tickets',image_url:'https://example.org/image.jpg',source_name:'Approved Test Source',source_url:'https://example.org/event',is_verified:true,is_published:true,published_to_gt:false,...extra};
    data.raw_data ??= {};
    const fields=Object.keys(data).map(quote).join(',');
    const [r]=await q(`insert into public.gt_sourced_events(${fields}) select ${fields} from jsonb_populate_record(null::public.gt_sourced_events,$1) returning *`,[JSON.stringify(data)]);return r;
  }
  const a=await source('19:00'),b=await source('22:00');
  await check('dry run previews two performances without persistent writes',async()=>{
    const [r]=await q("select * from public.gt_promote_sourced_to_shows_internal('atlanta',true,25)");assert.equal(r.promoted_count,2);
    assert.equal((await q('select count(*)::int as n from gt_shows'))[0].n,0);assert.equal((await q('select count(*)::int as n from gt_private.gt_backend_change_receipts_v1'))[0].n,0);
  });
  await check('separate performances create distinct canonical IDs and actual venue links',async()=>{
    const [r]=await q("select * from public.gt_promote_sourced_to_shows_internal('atlanta',false,25)");assert.equal(r.promoted_count,2);assert.equal(r.matched_venue_count,2);
    const rows=await q('select id,venue_id,age_requirement from gt_shows');assert.equal(rows.length,2);assert.equal(new Set(rows.map(r=>r.id)).size,2);assert(rows.every(r=>r.venue_id===venue.id&&r.age_requirement===null));
  });
  const link=(await q('select * from gt_private.gt_source_show_links_v1 where source_event_id=$1',[a.id]))[0];
  await check('identical rerun is idempotent',async()=>{const [r]=await q("select * from public.gt_promote_sourced_to_shows_internal('atlanta',false,25)");assert.equal(r.promoted_count,0);assert.equal((await q('select count(*)::int as n from gt_shows'))[0].n,2)});
  await check('source changes update the mapped UUID without recreating it',async()=>{
    await q('update gt_sourced_events set event_time=\'20:00\',updated_at=now() where id=$1',[a.id]);
    assert.equal((await q('select published_to_gt from gt_sourced_events where id=$1',[a.id]))[0].published_to_gt,false);
    await q("select * from public.gt_promote_sourced_to_shows_internal('atlanta',false,25)");
    const [row]=await q('select id,show_time from gt_shows where id=$1',[link.show_id]);assert.equal(row.id,link.show_id);assert.equal(row.show_time,'20:00');assert.equal((await q('select count(*)::int as n from gt_shows'))[0].n,2);
  });
  await check('source refresh preserves editorial copy and flags',async()=>{
    await q("update gt_shows set description='Reviewed editorial copy',is_curated=true,display_priority=7,category_key_v2='manual_lane' where id=$1",[link.show_id]);
    await q("update gt_sourced_events set description='New collector text',ticket_url='https://example.org/new-tickets',updated_at=now() where id=$1",[a.id]);
    await q("select * from public.gt_promote_sourced_to_shows_internal('atlanta',false,25)");
    const [row]=await q('select * from gt_shows where id=$1',[link.show_id]);assert.equal(row.description,'Reviewed editorial copy');assert.equal(row.ticket_url,'https://example.org/new-tickets');assert.equal(row.is_curated,true);assert.equal(row.display_priority,7);assert.equal(row.category_key_v2,'manual_lane');
  });
  await check('source and fact-verification heartbeats do not enqueue a catalog rewrite', async () => {
    const [before] = await q('select to_jsonb(s) as row from gt_shows s where id=$1', [link.show_id]);
    const [receipts] = await q('select count(*)::int as n from gt_private.gt_backend_change_receipts_v1');
    await q("update gt_sourced_events set updated_at=now(),fact_verified_at=now(),valid_until=now()+interval '1 day',raw_data=raw_data||'{\"collected_at\":\"later\"}'::jsonb where id=$1", [a.id]);
    assert.equal((await q('select published_to_gt from gt_sourced_events where id=$1', [a.id]))[0].published_to_gt, true);
    const [run] = await q("select * from public.gt_promote_sourced_to_shows_internal('atlanta',false,25)");
    assert.equal(run.promoted_count, 0);
    assert.deepEqual((await q('select to_jsonb(s) as row from gt_shows s where id=$1', [link.show_id]))[0], before);
    assert.equal((await q('select count(*)::int as n from gt_private.gt_backend_change_receipts_v1'))[0].n, receipts.n);
  });
  await check('unreviewed new intake cannot publish',async()=>{await source('21:00','Pending',{is_verified:false,is_published:false});const [r]=await q("select * from public.gt_promote_sourced_to_shows_internal('atlanta',false,25)");assert.equal(r.promoted_count,0)});

  const promote=()=>q("select * from public.gt_promote_sourced_to_shows_internal('atlanta',false,25)");
  const mapped=async(id)=>(await q('select * from gt_private.gt_source_show_links_v1 where source_event_id=$1',[id]))[0];
  const observed=(state,free=null,availability=null)=>({version:2,facts:{eventStatus:state,isAccessibleForFree:free,availability}});
  await check('latest v2 nulls withdraw published source-owned prices without changing identity', async () => {
    const priceObservation = facts => ({ source_observation: { version: 2, facts } });
    const incoming = await source('16:00', 'Price observation withdrawal', {
      raw_data: priceObservation({ price_min: 15, price_max: 25, currency: 'USD', price_basis: 'per ticket' }),
    });
    await promote();
    const linked = await mapped(incoming.id);
    const [before] = await q('select id,ticket_price_min,ticket_price_max,currency,price_basis from gt_shows where id=$1', [linked.show_id]);
    assert.equal(Number(before.ticket_price_min), 15);
    assert.equal(Number(before.ticket_price_max), 25);
    assert.equal(before.currency, 'USD');
    await q('update gt_sourced_events set raw_data=$2::jsonb where id=$1', [incoming.id, JSON.stringify(priceObservation({ price_min: null, price_max: null, currency: null, price_basis: null }))]);
    assert.equal((await q('select published_to_gt from gt_sourced_events where id=$1', [incoming.id]))[0].published_to_gt, false);
    await promote();
    const [after] = await q('select id,ticket_price_min,ticket_price_max,currency,price_basis from gt_shows where id=$1', [linked.show_id]);
    assert.deepEqual(after, { id: before.id, ticket_price_min: null, ticket_price_max: null, currency: null, price_basis: null });
    assert.equal((await mapped(incoming.id)).show_id, linked.show_id);
  });
  await check('AM/PM time keys equal clock times without substituting doors for show time',async()=>{
    const [r]=await q("select gt_private.gt_time_key_v1('8PM') as a,gt_private.gt_time_key_v1('8:30 pm') as b,gt_private.gt_time_key_v1('12AM') as c,gt_private.gt_time_key_v1('12 PM') as d,gt_private.gt_time_key_v1('13PM') as e,gt_private.gt_time_key_v1(null) as f");
    assert.deepEqual(r,{a:'20:00',b:'20:30',c:'00:00',d:'12:00',e:'unparsed:13pm',f:'time_unknown'});
    const [facts]=await q("select gt_private.gt_source_show_facts_v1($1::jsonb) as facts",[JSON.stringify({city:'atlanta',event_name:'Doors only',event_type:'concert',event_time:null,doors_time:'8PM'})]);
    assert.equal(facts.facts.show_time,null);assert.equal(facts.facts.doors_time,'8PM');
    const [old]=await q("insert into gt_shows(city_key,event_name,show_date,show_time,event_type,venue_name,venue_address) values('atlanta','AMPM identity',$1,'20:00','concert','Test Theatre','101 Example Street, Atlanta GA 30303') returning id",[day.d]);
    const incoming=await source('8PM','AMPM identity');await promote();assert.equal((await mapped(incoming.id)).show_id,old.id);
  });
  await check('distinct native performances never collapse through the legacy title/time fallback',async()=>{
    const n1=await source('19:00','Native performances',{provider_occurrence_id:'provider:session-A'});
    const n2=await source('19:00','Native performances',{provider_occurrence_id:'provider:session-B'});
    await promote();const one=await mapped(n1.id),two=await mapped(n2.id);assert.notEqual(one.show_id,two.show_id);
    await q("update gt_sourced_events set event_name='Native updated',event_time='21:15',updated_at=now() where id=$1",[n1.id]);await promote();
    const [changed]=await q('select id,event_name,show_time from gt_shows where id=$1',[one.show_id]);assert.equal(changed.id,one.show_id);assert.equal(changed.show_time,'21:15');assert.equal(changed.event_name,'Native updated');
    const duplicate=await source('21:15','Native provider lookup',{provider_occurrence_id:'provider:session-A'});await promote();
    assert.equal((await mapped(duplicate.id)).show_id,one.show_id);assert.equal((await mapped(duplicate.id)).identity_method,'native_provider_occurrence');
    const anotherProvider=await source('19:00','Native performances',{provider_occurrence_id:'provider:session-B',source_url:'https://different-provider.example/event'});await promote();
    assert.notEqual((await mapped(anotherProvider.id)).show_id,two.show_id);
  });
  await check('withdrawals clear source-owned optional facts but retain manually edited facts',async()=>{
    const c=await source('18:00','Withdrawal test',{end_date:day.d,end_time:'22:00',ticket_price_min:15,ticket_price_max:25});await promote();const l=await mapped(c.id);
    await q("update gt_shows set show_time='18:45',image_url='https://editor.example/reviewed.jpg' where id=$1",[l.show_id]);
    await q('update gt_sourced_events set event_time=null,end_date=null,end_time=null,image_url=null,ticket_price_min=null,ticket_price_max=null,updated_at=now() where id=$1',[c.id]);await promote();
    const [row]=await q('select * from gt_shows where id=$1',[l.show_id]);assert.equal(row.show_time,'18:45');assert.equal(row.image_url,'https://editor.example/reviewed.jpg');
    assert.equal(row.end_date,null);assert.equal(row.end_time,null);assert.equal(row.ticket_price_min,null);assert.equal(row.ticket_price_max,null);assert.equal(row.fact_verified_at,null);
    const own=await source('19:00','Unknown time hold');await promote();const ownLink=await mapped(own.id);
    await q('update gt_sourced_events set event_time=null,updated_at=now() where id=$1',[own.id]);await promote();
    assert.equal((await q('select show_time from gt_shows where id=$1',[ownLink.show_id]))[0].show_time,null);
    const unknown=await source(null,'Unknown time hold');await promote();assert.equal(await mapped(unknown.id),undefined);
    assert.equal((await q('select reason from gt_private.gt_backend_change_receipts_v1 where source_event_id=$1 order by recorded_at desc limit 1',[unknown.id]))[0].reason,'unknown_time_occurrence_requires_review');
  });
  await check('latest cancellation evidence overrides stale raw shapes and unknown status never resurrects it',async()=>{
    const mixed=await source('20:00','Mixed cancellation',{raw_data:{eventStatus:'EventScheduled',jsonld:{eventStatus:'EventScheduled'},source_observation:observed('EventScheduled')}});
    await promote();const l=await mapped(mixed.id);
    await q("update gt_sourced_events set raw_data=raw_data||$2::jsonb,updated_at=now() where id=$1",[mixed.id,JSON.stringify({jsonld:{eventStatus:'EventCancelled'},source_observation:observed('EventCancelled')})]);
    assert.equal((await q('select published_to_gt from gt_sourced_events where id=$1',[mixed.id]))[0].published_to_gt,false);await promote();
    assert.equal((await q('select status from gt_shows where id=$1',[l.show_id]))[0].status,'cancelled');
    await q("update gt_sourced_events set raw_data=raw_data||$2::jsonb,updated_at=now() where id=$1",[mixed.id,JSON.stringify({source_observation:observed(null)})]);await promote();
    assert.equal((await q('select status from gt_shows where id=$1',[l.show_id]))[0].status,'cancelled');
    const [r]=await q('select gt_private.gt_source_show_facts_v1($1::jsonb) as facts',[JSON.stringify({city:'atlanta',event_name:'Mixed fallback',event_type:'concert',raw_data:{eventStatus:'EventScheduled',isAccessibleForFree:true,jsonld:{eventStatus:'EventPostponed'},source_observation:observed('EventPostponed',null)}})]);
    assert.equal(r.facts.status,'postponed');assert.equal(r.facts.is_free,undefined);
  });
  await check('venue moves update or hold name, address and canonical link coherently',async()=>{
    const [other]=await q("insert into gt_venues(city_key,name,slug,category_key,address,status,is_verified,verification_status,freshness_expires_at) values('atlanta','Second Theatre','second-theatre','entertainment','202 Example Street, Atlanta GA 30303','active',true,'verified_current',now()+interval '7 days') returning id");
    const move=await source('20:30','Venue move');await promote();const moveLink=await mapped(move.id);
    await q("update gt_sourced_events set venue_name='Second Theatre',venue_address='202 Example Street Atlanta GA 30303',updated_at=now() where id=$1",[move.id]);await promote();
    const [moved]=await q('select venue_id,venue_name,venue_address from gt_shows where id=$1',[moveLink.show_id]);assert.equal(moved.venue_id,other.id);assert.equal(moved.venue_name,'Second Theatre');
    assert.equal((await q('select venue_id from gt_sourced_events where id=$1',[move.id]))[0].venue_id,other.id);
    await q("update gt_sourced_events set venue_name='Unresolved Theatre',venue_address='303 Example Street Atlanta GA 30303',updated_at=now() where id=$1",[move.id]);await promote();
    const [unresolved]=await q('select venue_id,venue_name,venue_address from gt_shows where id=$1',[moveLink.show_id]);assert.equal(unresolved.venue_id,null);assert.equal(unresolved.venue_name,'Unresolved Theatre');
    const hold=await source('21:30','Manual venue move');await promote();const holdLink=await mapped(hold.id);
    await q("update gt_shows set venue_name='Manual venue name' where id=$1",[holdLink.show_id]);
    const [before]=await q('select venue_id,venue_name,venue_address from gt_shows where id=$1',[holdLink.show_id]);
    await q("update gt_sourced_events set venue_name='Second Theatre',venue_address='202 Example Street Atlanta GA 30303',updated_at=now() where id=$1",[hold.id]);await promote();
    assert.deepEqual((await q('select venue_id,venue_name,venue_address from gt_shows where id=$1',[holdLink.show_id]))[0],before);
    assert((await mapped(hold.id)).metadata.preserved_fields.includes('venue_change_requires_coherent_review'));
  });
  await check('default NULL dispatcher bounds total work and preserves non-Atlanta legacy behavior',async()=>{
    await source('17:00','Default Atlanta');await source('18:00','Default Atlanta');
    const h1=await source('17:00','Default Houston',{city:'houston'}),h2=await source('18:00','Default Houston',{city:'houston'});
    const [preview]=await q('select * from gt_promote_sourced_to_shows_internal(null,true,4)');assert.equal(preview.promoted_count,3);
    assert.equal((await q("select count(*)::int as n from gt_shows where event_name in ('Default Atlanta','Default Houston')"))[0].n,0);
    const [run]=await q('select * from gt_promote_sourced_to_shows_internal(null,false,4)');assert.equal(run.promoted_count,3);
    assert.deepEqual(new Set(run.cities_touched),new Set(['atlanta','houston']));
    assert.equal((await q("select count(*)::int as n from gt_shows where event_name='Default Atlanta'"))[0].n,2);
    assert.equal((await q("select count(*)::int as n from gt_shows where event_name='Default Houston'"))[0].n,1);
    assert.equal(await mapped(h1.id),undefined);assert.equal(await mapped(h2.id),undefined);
    await q("update gt_sourced_events set description='Non-Atlanta existing path remains unchanged' where id=$1",[h1.id]);
    assert.equal((await q('select published_to_gt from gt_sourced_events where id=$1',[h1.id]))[0].published_to_gt,true);
    await assert.rejects(()=>q("select * from gt_private.gt_promote_legacy_non_atlanta_v1('atlanta',false,1)"),/explicit_non_atlanta_city_required/);
    await assert.rejects(()=>q('select * from gt_private.gt_promote_legacy_non_atlanta_v1(null,false,1)'),/explicit_non_atlanta_city_required/);
  });
  await check('duplicate venue UUIDs at one full address are held',async()=>{await q("insert into gt_venues(city_key,name,slug,category_key,address,status,is_verified,verification_status,freshness_expires_at) values('atlanta','Duplicate Venue','duplicate-venue','entertainment','101 Example St Atlanta GA 30303','needs_reverification',false,'needs_review',null)");const [r]=await q("select gt_private.gt_resolve_venue_v1('atlanta','Test Theatre','101 Example Street Atlanta GA 30303') as r");assert.equal(r.r.venue_id,undefined);assert.equal(r.r.reason,'ambiguous_full_address')});
  await check('unprivileged roles cannot call internal publishing or reviewed mutation',async()=>{
    const rows=await q("select p.proname,has_function_privilege('anon',p.oid,'execute') as a,has_function_privilege('authenticated',p.oid,'execute') as u from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='gt_private' or p.proname in ('gt_promote_sourced_to_shows_internal','gt_apply_reviewed_listing_changes_v1'))");assert(rows.length>4);assert(rows.every(r=>!r.a&&!r.u));
  });
}
