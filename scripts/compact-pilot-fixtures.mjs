/** Loopback-only fixture helper. Never use these rows or identities as production data. */
export const categories=[['nightlife','Nightlife'],['concerts_live_music','Concerts & Live Music'],['festivals_major_activations','Festivals & Major Activations'],['comedy_performing_arts','Comedy & Performing Arts'],['arts_museums_culture','Arts, Museums & Culture'],['entertainment','Entertainment'],['dining_culinary','Food & Drink'],['sports_watch','Sports & Watch Experiences'],['day_parties_brunch','Day Parties & Brunch'],['family_kids','Family & Kids'],['community_civic','Community & Civic'],['fashion_beauty_shopping','Fashion, Beauty & Shopping'],['wellness_fitness','Wellness & Fitness'],['college_alumni','College & Alumni'],['faith_inspirational','Faith & Inspirational'],['dating_social','Date Night & Social'],['free_things_to_do','Free Things To Do'],['vip_exclusive','VIP & Exclusive'],['attractions_experiences','Attractions & Experiences'],['business_professional','Business, Tech & Professional'],['classes_workshops','Classes, Workshops & Learning'],['creative_creator','Creative, Film & Creator'],['games_interactive','Games, Trivia & Interactive'],['travel_staycations','Travel, Hotels & Staycations'],['black_culture_diaspora','Black Culture & Diaspora'],['seasonal_holiday','Seasonal & Holiday']].map(([category_key,category_name],sort_order)=>({category_key,category_name,sort_order,is_active:true}))
export const nightlife=[['nightclubs','Clubs'],['lounges','Lounges'],['weekly_parties','Weekly Parties'],['after_parties','After-Parties'],['hookah_nights','Hookah Nights'],['rooftop_nights','Rooftops'],['late_night','Late Night']]
const subs=categories.flatMap((cat,i)=>(i===0?nightlife:[[`${cat.category_key}_sample`,'Sample choices'],[`${cat.category_key}_empty`,'Empty test lane']]).map(([subcategory_key,subcategory_name],sort_order)=>({category_key:cat.category_key,subcategory_key,subcategory_name,sort_order,is_active:true})))
const identities=[['3c84cc79-af41-47d5-9b22-75c8729c60cb','Opium','West Midtown','/venues/opium.jpg','https://opiumatl.com/',null,null],['96d720d3-0511-4615-bffa-7030aae16309','Seven Midtown','Midtown','/qa-seven.jpg','https://sevenmidtown.com/',null,null],['6867cd40-941f-4628-bda9-83b626382a9c','Revel Atlanta','Atlanta','/venues/revel.webp','https://clubrevelatlanta.com/',33.8035,-84.4274],['c98d8d06-cf53-4b3a-ab81-8f4d08ac7926','Believe Music Hall',null,null,'https://believeatl.com/',33.7370465,-84.3937309],['d17d2e8a-3d9b-408e-a252-eed8028fbdbc','District Atlanta',null,null,'https://districtatlanta.com/',33.81211,-84.3786098],['d898df8c-b9b1-45e5-a757-720ae1dd5dcd','MJQ Concourse','Downtown',null,'https://www.mjqofficial.com/',33.7518911,-84.3892495]]
const listingRows=identities.map(([id,name,neighborhood,hero_image,website,latitude,longitude],i)=>({id,name,neighborhood,hero_image,website,latitude,longitude,city_key:'atlanta',category_key:'nightlife',subcategory_key:'nightclubs',subcategory:'Clubs',venue_subcategory:'Nightclub',venue_category_key:'nightclub',status:'active',quality_score:100-i,short_desc:'Read-only listing sample for interface testing. Timing, availability and booking state are not asserted.'}))
const otherRows=categories.slice(1).map((cat,i)=>({id:`catalog-${i}`,name:`Test place ${i+1}`,city_key:'atlanta',category_key:cat.category_key,subcategory_key:`${cat.category_key}_sample`,subcategory:'Test fixture',venue_subcategory:'Test fixture',quality_score:50,status:'active',hero_image:null}))
const extras=Array.from({length:28},(_,i)=>({id:`paging-${String(i).padStart(3,'0')}`,name:i===27?'Beyond first download':'Paging test '+String(i).padStart(2,'0'),city_key:'atlanta',category_key:'nightlife',subcategory_key:'nightclubs',venue_subcategory:'Test fixture',quality_score:50-i,status:'active',hero_image:null}))
const events=[{event_key:'qa:event',title:'UI test event',city_key:'atlanta',category_key:'nightlife',event_date:'2026-09-27',event_time:'21:00',venue_name:'Test event fixture',image_url:'/venues/opium.jpg',quality_score:90,is_verified:true}]
let sevenImage=null
try{const r=await fetch('https://sevenmidtown.com/wp-content/uploads/2025/02/20250124_Seven_067-1.jpg',{signal:AbortSignal.timeout(7000)});if(r.ok&&r.headers.get('content-type')?.startsWith('image/'))sevenImage=Buffer.from(await r.arrayBuffer())}catch{}
export const sampleMedia={sevenMidtown:sevenImage?'Official image retrieved for fixture display':'Unavailable; honest fallback rendered'}
const json=body=>({status:200,contentType:'application/json',body:JSON.stringify(body)})
export const sleep=ms=>new Promise(r=>setTimeout(r,ms))
export function state(){return{requests:[],saved:[],posts:0,deletes:0,bulk:false,failSave:false,failUnsave:false,failDirectory:false}}
export async function fixture(context,state){
 await context.addInitScript(()=>{if(!['localhost','127.0.0.1'].includes(location.hostname))return;const epoch=Date.parse('2026-09-27T23:00:00Z'),NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[epoch]))}static now(){return epoch}};localStorage.setItem('gt_session',JSON.stringify({access_token:'isolated-compact-test',user:{id:'isolated-compact-user'},expires_at:4102444800}));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')})
 await context.route('**/auth/v1/**',r=>r.fulfill(json({external:{google:true}})))
 await context.route('**/functions/v1/**',r=>r.fulfill(json({ok:true,events:[],venues:[]})))
 await context.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill(json(p==='/api/health'?{ok:true,service:'good-times',customer_ready:true,content_ready:true}:p.startsWith('/api/data')?{ok:true,connected:true,degraded:false,city:'atlanta',events,venues:listingRows.slice(0,1),counts:{events:1,venues:1}}:{ok:true}))})
 await context.route('**/qa-seven.jpg',r=>sevenImage?r.fulfill({status:200,contentType:'image/jpeg',body:sevenImage}):r.fulfill({status:404,body:''}))
 await context.route('**/rest/v1/**',async route=>{
  const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').at(-1);state.requests.push({table,method:req.method(),params:u.search})
  if(table==='gt_taxonomy_categories')return route.fulfill(json(categories))
  if(table==='gt_taxonomy_subcategories')return route.fulfill(json(subs))
  if(table==='gt_user_profiles')return route.fulfill(json([{id:'isolated-compact-profile',auth_id:'isolated-compact-user',last_city:'atlanta',home_city:'atlanta',vibe_preferences:[]}]))
  if(table==='gt_saved_items'){
   if(req.method()==='POST'){state.posts++;await sleep(100);if(state.failSave)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Test save failure'})});const v=JSON.parse(req.postData());state.saved=[{id:'test-save',...v}];return route.fulfill(json(state.saved))}
   if(req.method()==='DELETE'){state.deletes++;if(state.failUnsave)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Test unsave failure'})});state.saved=[];return route.fulfill({status:204,body:''})}
   return route.fulfill(json(state.saved))
  }
  const data=[...listingRows,...otherRows,...(state.bulk?extras:[])]
  if(table==='v_gt_venue_taxonomy_counts')return route.fulfill(json(categories.map(c=>({category_key:c.category_key,subcategory_key:null,place_count:data.filter(v=>v.category_key===c.category_key).length})).concat(subs.map(s=>({category_key:s.category_key,subcategory_key:s.subcategory_key,place_count:data.filter(v=>v.subcategory_key===s.subcategory_key).length})))))
  if(table==='v_gt_venue_taxonomy_directory'){
   if(state.failDirectory)return route.fulfill({status:503,contentType:'application/json',body:'{"message":"Test directory failure"}'})
   const category=(u.searchParams.get('category_key')||'').replace(/^eq\./,''),sub=(u.searchParams.get('subcategory_key')||'').replace(/^eq\./,'')
   let rows=data.filter(v=>(!category||v.category_key===category)&&(!sub||v.subcategory_key===sub))
   const logic=u.searchParams.get('and')||'',match=logic.match(/name\.ilike\."((?:\\.|[^"])*)"/)
   if(match){const q=match[1].replace(/^\*|\*$/g,'').replace(/\\(.)/g,'$1').toLowerCase();if(q==='old slow'){await sleep(800);rows=[{...listingRows[0],name:'Old slow result'}]}else rows=rows.filter(v=>[v.name,v.neighborhood,v.subcategory,v.short_desc].filter(Boolean).join(' ').toLowerCase().includes(q))}
   const byName=(a,b)=>a.name.localeCompare(b.name)||String(a.id).localeCompare(String(b.id));rows.sort(u.searchParams.get('order')?.startsWith('name')?byName:(a,b)=>Number(b.quality_score||-1)-Number(a.quality_score||-1)||byName(a,b))
   const cursor=logic.match(/id\.gt\."([^"]+)"/);if(cursor){const idx=rows.findIndex(v=>v.id===cursor[1]);if(idx>=0)rows=rows.slice(idx+1)}
   return route.fulfill(json(rows.slice(0,Number(u.searchParams.get('limit')||2500))))
  }
  return route.fulfill(json([]))
 })
 await context.route('https://www.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><body style="background:#171c20;color:#dfd8c9;font:14px system-ui;padding:20px"><strong>Map provider mocked for interaction test</strong><p>Coordinates and result scope are tested separately. This is not a live map screenshot.</p></body>'}))
 await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}))
 await context.route('https://fonts.gstatic.com/**',r=>r.abort())
}
