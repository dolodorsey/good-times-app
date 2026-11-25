import assert from 'node:assert/strict';

// Synthetic fixtures exercise the current repository migrations in an isolated database.
export async function runReviewedIngestScenario({ db, q, check }) {
  const [venue]=await q("insert into gt_venues(city_key,name,slug,category_key,address,status,is_verified,verification_status,freshness_expires_at) values('atlanta','Review Hall','review-hall','event_venue','101 Example Street, Atlanta GA 30303','active',true,'verified_current',now()+interval '7 days') returning *");
  const makeShow=async(name='Reviewed source event')=>(await q("insert into gt_shows(city_key,event_name,event_type,show_date,show_time,venue_name,venue_address,source_url,status,updated_at,is_curated,is_featured,display_priority,category_key_v2,good_times_score,quality_score) values('atlanta',$1,'concert',current_date+2,'20:00','Review Hall','101 Example Street, Atlanta GA 30303','https://example.org/event','confirmed',now()-interval '10 days',true,true,7,'concerts_live_music',93,89) returning to_jsonb(gt_shows) as row",[name]))[0].row;
  const evidence=(await q("select jsonb_build_object('source_url','https://example.org/event','verified_at',clock_timestamp()-interval '1 second','reason','Official detail page confirms this specific change') as e"))[0].e;
  const payload=(row,patch,extra={})=>({row_key:'Event_Occurrences:'+row.id,record_type:'event',record_id:row.id,expected_updated_at:row.updated_at,review_state:'APPROVED',patch,expected_values:Object.fromEntries(Object.keys(patch).map(k=>[k,row[k]??null])),evidence,...extra});
  const apply=async(batch,change,dry=true)=>(await q('select public.gt_apply_reviewed_listing_changes_v1($1,$2,$3::jsonb,$4) as r',[batch,'DOT',JSON.stringify(Array.isArray(change)?change:[change]),dry]))[0].r;
  const stored=async(id)=>(await q('select to_jsonb(s) as row from gt_shows s where id=$1',[id]))[0].row;
  const count=async()=>Number((await q('select count(*) as n from gt_private.gt_backend_change_receipts_v1'))[0].n);
  let event=await makeShow();
  await check('review dry-run previews a link without changing data, timestamps or receipts',async()=>{
    const result=await apply('review-dry',payload(event,{venue_id:venue.id}));
    assert.equal(result.rows[0].outcome,'linked');assert.equal(result.rows[0].receipt_id,null);
    assert.equal(result.rows[0].after_values.venue_id,venue.id);assert.equal(result.rows[0].after_values.updated_at,event.updated_at);
    assert.deepEqual(await stored(event.id),event);assert.equal(await count(),0);
  });
  const first=payload(event,{venue_id:venue.id});let receipt;
  await check('approved link applies once with canonical ID and exact unchanged freshness timestamp',async()=>{
    const result=await apply('review-link',first,false);receipt=result.rows[0].receipt_id;
    assert(receipt);assert.equal(result.rows[0].outcome,'linked');assert.equal(result.publication_verified,false);
    const actual=await stored(event.id);assert.equal(actual.id,event.id);assert.equal(actual.venue_id,venue.id);assert.equal(actual.updated_at,event.updated_at);
    assert.equal(actual.is_curated,true);assert.equal(actual.display_priority,7);assert.equal(await count(),1);
  });
  await check('replay returns the identical receipt; changed input under same key is rejected',async()=>{
    const again=await apply('review-link',first,false);assert.equal(again.rows[0].receipt_id,receipt);assert.equal(again.rows[0].replayed,true);assert.equal(await count(),1);
    await assert.rejects(apply('review-link',{...first,evidence:{...evidence,reason:'Different approved input under the same idempotency key'}},false),e=>e.code==='23505');
  });
  await check('expected_values detects intervening link-only changes despite preserved updated_at',async()=>{
    await assert.rejects(apply('review-stale-link',first,false),e=>e.code==='40001');assert.equal(await count(),1);
  });
  await check('v1 blocks replacing or clearing a current canonical venue link',async()=>{
    const row=await stored(event.id);
    await assert.rejects(apply('review-clear',payload(row,{venue_id:null}),false),/canonical_link_replacement_requires_review/);
    assert.equal((await stored(event.id)).venue_id,venue.id);assert.equal(await count(),1);
  });
  await check('approval, whitelist, field baselines, enums, types and current evidence are mandatory',async()=>{
    const row=await stored(event.id);
    for(const [key,c] of [
      ['approval',payload(row,{description:'New description'},{review_state:'Ready for engineering'})],
      ['curation',payload(row,{is_curated:false})],
      ['baseline',payload(row,{description:'New description'},{expected_values:{}})],
      ['free',payload(row,{free_status:'free'})],
      ['price',payload(row,{ticket_price_min:'20'})],
      ['time',payload(row,{description:'New description'},{evidence:{...evidence,verified_at:'2099-01-01T00:00:00Z'}})],
      ['url',payload(row,{ticket_url:'javascript:alert(1)'})],
      ['age',payload(row,{age_requirement:'18+'})],
      ['date',payload(row,{show_date:'infinity'})],
    ])await assert.rejects(apply('reject-'+key,c,false));
    assert.deepEqual(await stored(row.id),row);assert.equal(await count(),1);
  });
  await check('a stale row aborts the whole multi-row batch including earlier writes and receipts',async()=>{
    const one=await makeShow('Atomic one'),two=await makeShow('Atomic two');
    const [firstRow,lastRow]=[one,two].sort((a,b)=>a.id.localeCompare(b.id));
    const good=payload(firstRow,{description:'Must rollback'}),bad=payload(lastRow,{description:'Stale'},{expected_updated_at:'2000-01-01T00:00:00Z'});
    await assert.rejects(apply('atomic-stale',[good,bad],false),e=>e.code==='40001');
    assert.deepEqual(await stored(firstRow.id),firstRow);assert.equal(await count(),1);
  });
  await check('reviewed facts survive scoring triggers while manual rankings and explicit taxonomy remain exact',async()=>{
    await db.exec("create function public.test_overwrite_editorial() returns trigger language plpgsql as $$ begin new.is_curated:=false; new.is_featured:=false; new.display_priority:=99; new.good_times_score:=1; new.quality_score:=2; new.category_key_v2:='unintended'; return new;end;$$; create trigger score_shows before update of ticket_url on gt_shows for each row execute function public.test_overwrite_editorial();");
    const row=await stored(event.id),result=await apply('review-ticket',payload(row,{ticket_url:'https://example.org/revised-tickets'}),false),actual=await stored(row.id);
    for(const key of ['is_curated','is_featured','display_priority','good_times_score','quality_score','category_key_v2','updated_at'])assert.equal(actual[key],row[key],key);
    assert.equal(actual.ticket_url,'https://example.org/revised-tickets');assert.deepEqual(result.rows[0].after_values,actual);
    const marker=(await q("select current_setting('good_times.preserve_editorial_id',true) as id"))[0].id;assert.equal(marker,'');
  });
  await check('anonymous and authenticated roles cannot invoke the reviewed mutation',async()=>{
    const [r]=await q("select has_function_privilege('anon','public.gt_apply_reviewed_listing_changes_v1(text,text,jsonb,boolean)','execute') as anon,has_function_privilege('authenticated','public.gt_apply_reviewed_listing_changes_v1(text,text,jsonb,boolean)','execute') as authenticated");
    assert.equal(r.anon,false);assert.equal(r.authenticated,false);
  });
}
