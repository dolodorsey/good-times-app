import React,{useEffect,useMemo,useRef,useState} from 'react'
import {KHG_SUPABASE_URL,KHG_SUPABASE_ANON_KEY} from '../../../lib/supabase.js'
import {publicApiHeaders} from '../../../lib/public-api-headers.js'
import {CollectionGrid} from './Collections.jsx'
import {State,Skeleton} from './Cards.jsx'

const QUICK=[
 ['date_night','Date Night','occasion_tags'],
 ['brunch','Brunch','meal_tags'],
 ['fine_dining','Fine Dining','service_level'],
 ['black_owned','Black-Owned','ownership_tags'],
 ['rooftop','Rooftops','restaurant_vibe_tags'],
 ['late_night','Late Night','meal_tags'],
 ['seafood','Seafood','cuisine_tags'],
 ['steakhouse','Steakhouse','cuisine_tags'],
 ['sushi','Sushi','cuisine_tags'],
]
const GROUPS=[
 ['Level','service_level',[['quick_service','Quick Service'],['fast_casual','Fast Casual'],['casual','Casual'],['upscale_casual','Upscale Casual'],['upscale','Upscale'],['fine_dining','Fine Dining'],['luxury_dining','Luxury']]],
 ['Meal','meal_tags',[['breakfast','Breakfast'],['brunch','Brunch'],['lunch','Lunch'],['happy_hour','Happy Hour'],['dinner','Dinner'],['late_night','Late Night'],['dessert','Dessert']]],
 ['Occasion','occasion_tags',[['date_night','Date Night'],['birthday','Birthday'],['business_dinner','Business Dinner'],['girls_night','Girls Night'],['group_dining','Group Dining'],['family_dining','Family']]],
 ['Vibe','restaurant_vibe_tags',[['rooftop','Rooftop'],['romantic','Romantic'],['high_energy','High Energy'],['intimate','Intimate'],['luxury','Luxury']]],
 ['Features','feature_tags',[['hookah','Hookah'],['live_music','Live Music'],['outdoor_seating','Outdoor Seating'],['private_dining','Private Dining'],['full_bar','Full Bar']]],
 ['Dietary','dietary_tags',[['vegan','Vegan'],['vegetarian','Vegetarian'],['gluten_free','Gluten-Free'],['halal','Halal'],['kosher','Kosher']]],
]
const list=x=>Array.isArray(x)?x:[]
const pretty=x=>String(x||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const asVenue=row=>({...row,category_key:'restaurant',subcategory:row.service_level?pretty(row.service_level):(row.cuisine_tags?.[0]?pretty(row.cuisine_tags[0]):'Restaurant'),venue_subcategory:row.service_level?pretty(row.service_level):'Restaurant',vibe_tags:[...list(row.occasion_tags),...list(row.restaurant_vibe_tags),...list(row.meal_tags)],search_tags:[...list(row.cuisine_tags),...list(row.feature_tags),...list(row.ownership_tags),...list(row.dietary_tags)]})

function buildParams({query,field,value,limit=48}){
 const p=new URLSearchParams({select:'id,city_key,name,slug,neighborhood,side_of_town,address,latitude,longitude,phone,website,instagram_handle,short_desc,long_desc,hero_image,photos,price_range,hours_summary,booking_link,booking_platform,google_rating,google_reviews,quality_score,is_verified,verification_status,verified_at,freshness_expires_at,is_black_owned,is_culture_pick,culture_tier,service_level,cuisine_tags,occasion_tags,meal_tags,restaurant_vibe_tags,feature_tags,dietary_tags,ownership_tags,profile_confidence,needs_review',city_key:'eq.atlanta',order:'quality_score.desc.nullslast,name.asc',limit:String(limit)})
 if(query){const clean=query.replace(/[(),]/g,' ').trim().slice(0,80);if(clean)p.set('or',`(name.ilike.*${clean}*,neighborhood.ilike.*${clean}*,short_desc.ilike.*${clean}*)`)}
 if(field&&value){
  if(field==='service_level')p.set(field,'eq.'+value)
  else p.set(field,'cs.{'+value+'}')
 }
 return p
}

export default function RestaurantExplorer({savedKeys,onVenue,onSave,onBack,initialQuery=''}) {
 const [query,setQuery]=useState(initialQuery),[filter,setFilter]=useState(null),[rows,setRows]=useState([]),[status,setStatus]=useState('loading'),[error,setError]=useState(''),[advanced,setAdvanced]=useState(false),seq=useRef(0)
 useEffect(()=>{const id=++seq.current,c=new AbortController(),timer=setTimeout(async()=>{setStatus('loading');setError('');try{const p=buildParams({query,field:filter?.field,value:filter?.value});const r=await fetch(`${KHG_SUPABASE_URL}/rest/v1/v_gt_restaurant_entities?${p}`,{headers:publicApiHeaders(KHG_SUPABASE_ANON_KEY),signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error('Restaurants could not refresh.');const body=await r.json();if(!Array.isArray(body))throw new Error('Restaurant response was invalid.');if(id===seq.current){setRows(body.map(asVenue));setStatus('success')}}catch(e){if(!c.signal.aborted&&id===seq.current){setRows([]);setStatus('error');setError(e.message)}}},220);return()=>{clearTimeout(timer);c.abort()}},[query,filter?.field,filter?.value])
 const saved=new Set([...savedKeys].filter(k=>k.startsWith('venue:')))
 return <section className="gtc-restaurants">
  <header className="gtc-page-heading"><button onClick={onBack} aria-label="Back to Places">←</button><div><h1>Restaurants</h1><small>Everyday to fine dining—browse by what actually fits the occasion.</small></div></header>
  <div className="gtc-search"><input aria-label="Search restaurants" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cuisine, restaurant, neighborhood…"/>{query&&<button aria-label="Clear restaurant search" onClick={()=>setQuery('')}>×</button>}</div>
  <div className="gtc-restaurant-quick" aria-label="Restaurant interests">{QUICK.map(([value,label,field])=><button key={value} aria-pressed={filter?.value===value} className={filter?.value===value?'active':''} onClick={()=>setFilter(filter?.value===value?null:{field,value,label})}>{label}</button>)}</div>
  <div className="gtc-restaurant-tools"><span>{status==='success'?<><strong>{rows.length}</strong> loaded{filter?<> · {filter.label}</>:null}</>:'Finding the right places…'}</span><button onClick={()=>setAdvanced(x=>!x)} aria-expanded={advanced}>Filters {advanced?'−':'＋'}</button></div>
  {advanced&&<div className="gtc-restaurant-filter-groups">{GROUPS.map(([label,field,items])=><section key={label}><strong>{label}</strong><div>{items.map(([value,name])=><button key={value} className={filter?.value===value?'active':''} aria-pressed={filter?.value===value} onClick={()=>setFilter(filter?.value===value?null:{field,value,label:name})}>{name}</button>)}</div></section>)}</div>}
  {status==='loading'&&<Skeleton count={4}/>}
  {status==='error'&&<State error title="Restaurants could not refresh" body={error} action={<button onClick={()=>setFilter(x=>x?{...x}:null)}>Retry</button>}/>}
  {status==='success'&&!rows.length&&<State title="Nothing verified for that exact interest yet" body="Clear the filter or search another cuisine, neighborhood or occasion. GOOD TIMES will not fill this with unrelated restaurants." action={<button onClick={()=>{setFilter(null);setQuery('')}}>Clear filters</button>}/>}
  {rows.length>0&&<CollectionGrid items={rows} savedKeys={saved} onVenue={onVenue} onSave={onSave}/>}
  <p className="gtc-note">Restaurant facets are evidence-driven. Listings missing a facet remain eligible for general browsing while enrichment continues.</p>
 </section>
}
