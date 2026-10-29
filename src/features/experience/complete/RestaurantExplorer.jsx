import React,{useEffect,useMemo,useState} from 'react'
import {KHG_SUPABASE_URL,KHG_SUPABASE_ANON_KEY} from '../../../lib/supabase.js'
import {publicApiHeaders} from '../../../lib/public-api-headers.js'
import {State,Skeleton} from './Cards.jsx'
import {Themed,ScreenHero,SearchBar,PhotoTile,Rail,BrandBand,SCENES} from './Kit.jsx'
import {VenuePoster} from './posters.jsx'
import {safeImage} from './model.js'
import {restaurantCuisines,CUISINE_LABELS} from './restaurant-cuisine.js'

const QUICK=[
 ['date_night','Date Night','occasion_tags'],
 ['brunch','Brunch','meal_tags'],
 ['fine_dining','Fine Dining','service_level'],
 ['black_owned','Black-Owned','ownership_tags'],
 ['rooftop','Rooftops','restaurant_vibe_tags'],
 ['late_night','Late Night','meal_tags'],
 ['seafood','Seafood','cuisines'],
 ['steakhouse','Steakhouse','cuisines'],
 ['sushi','Sushi','cuisines'],
]
const GROUPS=[
 ['Level','service_level',[['quick_service','Quick Service'],['fast_casual','Fast Casual'],['casual','Casual'],['upscale_casual','Upscale Casual'],['upscale','Upscale'],['fine_dining','Fine Dining'],['luxury_dining','Luxury']]],
 ['Meal','meal_tags',[['breakfast','Breakfast'],['brunch','Brunch'],['lunch','Lunch'],['happy_hour','Happy Hour'],['dinner','Dinner'],['late_night','Late Night'],['dessert','Dessert']]],
 ['Occasion','occasion_tags',[['date_night','Date Night'],['birthday','Birthday'],['business_dinner','Business Dinner'],['girls_night','Girls Night'],['group_dining','Group Dining'],['family_dining','Family']]],
 ['Vibe','restaurant_vibe_tags',[['rooftop','Rooftop'],['romantic','Romantic'],['high_energy','High Energy'],['intimate','Intimate'],['luxury','Luxury']]],
 ['Features','feature_tags',[['hookah','Hookah'],['live_music','Live Music'],['outdoor_seating','Outdoor Seating'],['private_dining','Private Dining'],['full_bar','Full Bar']]],
 ['Dietary','dietary_tags',[['vegan','Vegan'],['vegetarian','Vegetarian'],['gluten_free','Gluten-Free'],['halal','Halal'],['kosher','Kosher']]],
 ['Ownership','ownership_tags',[['black_owned','Black-Owned'],['woman_owned','Woman-Owned'],['celebrity_owned','Celebrity-Owned']]],
]
const SELECT='id,city_key,name,slug,neighborhood,side_of_town,address,latitude,longitude,phone,website,instagram_handle,short_desc,long_desc,hero_image,photos,price_range,hours_summary,booking_link,booking_platform,google_rating,google_reviews,quality_score,is_verified,verification_status,verified_at,freshness_expires_at,is_black_owned,is_culture_pick,culture_tier,service_level,cuisine_tags,occasion_tags,meal_tags,restaurant_vibe_tags,feature_tags,dietary_tags,ownership_tags,profile_confidence,needs_review,source_subcategory'
const list=x=>Array.isArray(x)?x:[]
const fold=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase()

export function asRestaurant(row){
 const cuisines=restaurantCuisines(row)
 const ownership=[...new Set([...list(row.ownership_tags),...(row.is_black_owned?['black_owned']:[])])]
 return {...row,ownership_tags:ownership,cuisines,category_key:'restaurant',cuisine_label:cuisines[0]?CUISINE_LABELS[cuisines[0]]:'Restaurant',vibe_tags:[...list(row.occasion_tags),...list(row.restaurant_vibe_tags),...list(row.meal_tags)],search_tags:[...cuisines,...list(row.feature_tags),...ownership,...list(row.dietary_tags)]}
}
export function restaurantMatches(row,filter){
 if(!filter)return true
 if(filter.field==='service_level')return row.service_level===filter.value
 return list(row[filter.field]).includes(filter.value)
}
export function cuisineFacets(rows){
 const map=new Map()
 for(const row of rows)for(const c of list(row.cuisines)){if(!map.has(c))map.set(c,{value:c,label:CUISINE_LABELS[c]||c,count:0,image:null,candidates:[]});const f=map.get(c);f.count+=1;const img=safeImage(row.hero_image);if(img)f.candidates.push(img)}
 const facets=[...map.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)),used=new Set()
 // Each cuisine tile gets its own restaurant photo when one is available.
 for(const f of facets){f.image=f.candidates.find(img=>!used.has(img))||null;if(f.image)used.add(f.image);delete f.candidates}
 return facets
}

async function loadRestaurants(signal){
 const p=new URLSearchParams({select:SELECT,city_key:'eq.atlanta',order:'quality_score.desc.nullslast,name.asc',limit:'300'})
 let last
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(`${KHG_SUPABASE_URL}/rest/v1/v_gt_restaurant_entities?${p}`,{headers:publicApiHeaders(KHG_SUPABASE_ANON_KEY),signal,cache:'no-store'})
   if(!r.ok)throw new Error('Restaurants could not refresh.')
   const body=await r.json();if(!Array.isArray(body))throw new Error('Restaurant response was invalid.')
   return body.map(asRestaurant)
  }catch(e){if(signal.aborted)throw e;last=e;await new Promise(res=>setTimeout(res,400*(attempt+1)))}
 }
 throw last
}

export default function RestaurantExplorer({savedKeys,onVenue,onSave,onBack,onPlan,initialQuery='',initialFilter=null}) {
 const [query,setQuery]=useState(initialQuery),[filter,setFilter]=useState(initialFilter),[all,setAll]=useState([]),[status,setStatus]=useState('loading'),[error,setError]=useState(''),[advanced,setAdvanced]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{const c=new AbortController();setStatus('loading');setError('');loadRestaurants(c.signal).then(rows=>{setAll(rows);setStatus('success')}).catch(e=>{if(!c.signal.aborted){setStatus('error');setError(e.message)}});return()=>c.abort()},[retry])
 const searched=useMemo(()=>{const n=fold(query).trim();if(!n)return all;return all.filter(r=>fold([r.name,r.neighborhood,r.short_desc,...r.cuisines.map(c=>CUISINE_LABELS[c]),r.source_subcategory].join(' ')).includes(n))},[all,query])
 const rows=useMemo(()=>searched.filter(r=>restaurantMatches(r,filter)),[searched,filter])
 const cuisines=useMemo(()=>cuisineFacets(searched),[searched])
 const countFor=(field,value)=>searched.filter(r=>restaurantMatches(r,{field,value})).length
 const toggle=(field,value,label)=>{setFilter(filter?.value===value&&filter?.field===field?null:{field,value,label});requestAnimationFrame(()=>document.querySelector('.gtc-restaurant-tools')?.scrollIntoView?.({block:'start',behavior:'smooth'}))}
 const saved=new Set([...savedKeys].filter(k=>k.startsWith('venue:')))
 const featured=rows.find(r=>safeImage(r.hero_image))
 return <Themed theme="emerald" className="gtc-restaurants">
  <ScreenHero size="md" eyebrow="ATLANTA" title="Dining" tagline="Extraordinary food. Unforgettable nights." image={SCENES.dining} onBack={onBack} backLabel="Back to Places" script={'Good\nPeople\nBetter\nNights.'}>
   <SearchBar inputLabel="Search restaurants" placeholder="Search restaurants, cuisine, or neighborhood…" value={query} onChange={setQuery} onFilters={()=>setAdvanced(x=>!x)}/>
  </ScreenHero>
  <div className="gtc-restaurant-quick gtk-pills is-scroll" aria-label="Restaurant interests" role="group">{QUICK.map(([value,label,field])=>{const n=status==='success'?countFor(field,value):null;return <button key={value} aria-pressed={filter?.value===value} className={`${filter?.value===value?'active':''} ${n===0?'is-empty':''}`.trim()} onClick={()=>toggle(field,value,label)}>{label}{n?<em>{n}</em>:null}</button>})}</div>
  {status==='success'&&!filter&&cuisines.length>0&&<Rail className="gtc-cuisine-browse" title="Popular" accent="Cuisines" kicker={`${cuisines.length} CUISINES · ${searched.length} RESTAURANTS`}><div className="gtk-scroller-inner" data-gt-subcategories="restaurant_cuisines" style={{display:'contents'}}>{cuisines.map(c=><PhotoTile key={c.value} image={c.image} label={c.label} sub={`${c.count} ${c.count===1?'place':'places'}`} onClick={()=>toggle('cuisines',c.value,c.label)}/>)}</div></Rail>}
  <div className="gtc-restaurant-tools"><span>{status==='success'?<><strong>{rows.length}</strong> {rows.length===1?'restaurant':'restaurants'}{filter?<> · {filter.label} <button className="gtc-clear-filter" onClick={()=>setFilter(null)} aria-label={`Clear ${filter.label} filter`}>×</button></>:null}</>:'Finding the right places…'}</span><button onClick={()=>setAdvanced(x=>!x)} aria-expanded={advanced}>Filters {advanced?'−':'＋'}</button></div>
  {advanced&&<div className="gtc-restaurant-filter-groups">{[['Cuisine','cuisines',cuisines.map(c=>[c.value,c.label])],...GROUPS].map(([label,field,items])=>{const shown=items.map(([value,name])=>[value,name,countFor(field,value)]).filter(([,,n])=>n>0);return shown.length?<section key={label}><strong>{label}</strong><div>{shown.map(([value,name,n])=><button key={value} className={filter?.value===value?'active':''} aria-pressed={filter?.value===value} onClick={()=>toggle(field,value,name)}>{name}<em>{n}</em></button>)}</div></section>:null})}</div>}
  {status==='loading'&&<Skeleton count={4}/>}
  {status==='error'&&<State error title="Restaurants could not refresh" body={error} action={<button onClick={()=>setRetry(x=>x+1)}>Retry</button>}/>}
  {status==='success'&&!rows.length&&<State title="Nothing verified for that exact interest yet" body="Clear the filter or search another cuisine, neighborhood or occasion. GOOD TIMES will not fill this with unrelated restaurants." action={<button onClick={()=>{setFilter(null);setQuery('')}}>Clear filters</button>}/>}
  {rows.length>0&&<section className="gtk-section"><header className="gtk-section-head"><div><h2>{filter?filter.label:'Top Restaurants'} <em>in Atlanta</em></h2></div></header><div className="gtk-grid">{rows.map(r=><VenuePoster key={r.id} venue={r} savedKeys={saved} onVenue={onVenue} onSave={onSave} onPlan={onPlan}/>)}</div></section>}
  {status==='success'&&<BrandBand kicker="DISCOVER. DINE. DRINK. REPEAT." image={featured?.hero_image||SCENES.diningWarm}/>}
 </Themed>
}
