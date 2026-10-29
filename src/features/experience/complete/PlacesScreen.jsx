import React,{useMemo} from 'react'
import {Themed,ScreenHero,SearchBar,PillRow,Rail,PhotoTile,PosterCard,BrandBand,Empty,Icon,SCENES} from './Kit.jsx'
import {VenuePoster,venueKind,venueAction} from './posters.jsx'
import {restaurantCuisines,CUISINE_LABELS} from './restaurant-cuisine.js'
import {unique,safeImage,cleanTitle} from './model.js'

export const PLACE_CATEGORY_RAIL=[
 {id:'dining_culinary',label:'Food',icon:'food'},
 {id:'nightlife',label:'Drinks',icon:'cocktail'},
 {id:'travel_staycations',label:'Hotels',icon:'bed'},
 {id:'attractions_experiences',label:'Attractions',icon:'landmark'},
 {id:'interactive',label:'Interactive',icon:'game'},
 {id:'wellness_fitness',label:'Wellness',icon:'lotus'},
 {id:'fashion_beauty_shopping',label:'Shopping',icon:'bag'},
 {id:'family_kids',label:'Family',icon:'family'},
]
export const CATEGORY_HEROES=Object.freeze({
 dining_culinary:{theme:'emerald',title:'Dining',tagline:'Extraordinary food. Unforgettable nights.',image:SCENES.dining},
 travel_staycations:{theme:'teal',title:'Stays',tagline:'Hotels, staycations and places to reset.',image:SCENES.hotels},
 attractions_experiences:{theme:'cyan',title:'Attractions',tagline:'Museums. Views. Only-in-Atlanta moments.',image:SCENES.terrace},
 wellness_fitness:{theme:'teal',title:'Wellness',tagline:'Move. Restore. Reset.',image:SCENES.wellness},
 fashion_beauty_shopping:{theme:'violet',title:'Shopping',tagline:'Markets, boutiques and beauty.',image:SCENES.shopping},
 family_kids:{theme:'gold',title:'Family',tagline:'Good times for every age.',image:SCENES.family},
 nightlife:{theme:'magenta',title:'Nightlife',tagline:'Clubs. Lounges. Rooftops. Unforgettable nights.',image:SCENES.nightlife},
 entertainment:{theme:'cyan',title:'Entertainment',tagline:'Play. Compete. Connect.',image:SCENES.interactive},
})
const CUISINE_ORDER=['american','steakhouse','seafood','italian','mexican','caribbean','soul_southern','sushi','japanese','asian','brunch','bbq','mediterranean']

export function CategoryHero({category,onBack,backLabel='Back to Places',children}){
 const h=CATEGORY_HEROES[category]||{theme:'violet',title:'Places',tagline:'Great spots. Better nights.',image:SCENES.places}
 return <ScreenHero size="sm" title={h.title} tagline={h.tagline} image={h.image} onBack={onBack} backLabel={backLabel}>{children}</ScreenHero>
}

export default function PlacesScreen({venues=[],laneArt={},laneCounts={},lanes=[],savedKeys,onVenue,onSave,onPlan,query,onQuery,onCategory,onCuisine,onNavigate,laneBackground}){
 const restaurants=useMemo(()=>unique(venues).filter(v=>/restaurant|dining|food|brunch|coffee|cafe|bakery|wine_bar/.test(`${v.category_key} ${v.venue_category_key||''}`)),[venues])
 const featured=useMemo(()=>restaurants.find(v=>safeImage(v.hero_image)&&v.google_rating)||restaurants.find(v=>safeImage(v.hero_image)),[restaurants])
 const trending=useMemo(()=>restaurants.filter(v=>v!==featured).slice(0,10),[restaurants,featured])
 const cuisines=useMemo(()=>{const map=new Map(),used=new Set();for(const v of restaurants)for(const c of restaurantCuisines({cuisine_tags:v.cuisine_tags,source_subcategory:v.venue_subcategory||v.subcategory})){if(!map.has(c))map.set(c,{id:c,label:CUISINE_LABELS[c],count:0,imgs:[]});const f=map.get(c);f.count++;if(safeImage(v.hero_image))f.imgs.push(v.hero_image)}return [...map.values()].sort((a,b)=>(CUISINE_ORDER.indexOf(a.id)+1||99)-(CUISINE_ORDER.indexOf(b.id)+1||99)||b.count-a.count).map(f=>{const image=f.imgs.find(i=>!used.has(i))||null;if(image)used.add(image);return {...f,image}})},[restaurants])
 const hoods=useMemo(()=>{const map=new Map(),used=new Set();for(const v of unique(venues)){const n=String(v.neighborhood||'').trim();if(!n||/^atlanta$/i.test(n))continue;if(!map.has(n))map.set(n,{id:n,label:n,count:0,imgs:[]});const f=map.get(n);f.count++;if(safeImage(v.hero_image))f.imgs.push(v.hero_image)}return [...map.values()].filter(f=>f.count>=2).sort((a,b)=>b.count-a.count).slice(0,10).map(f=>{const image=f.imgs.find(i=>!used.has(i))||null;if(image)used.add(image);return {...f,image}})},[venues])
 const worth=useMemo(()=>unique(venues).filter(v=>!restaurants.includes(v)).slice(0,8),[venues,restaurants])
 return <Themed theme="violet" className="gt5-discover gtc-discover gtc-places gtk-places">
  <ScreenHero size="md" eyebrow="ATLANTA" title="Places" tagline="Great spots. Better nights." image={SCENES.places} script={'Dine\nDrink\nExplore\nRepeat.'}>
   <SearchBar inputLabel="Search Atlanta places" placeholder="Restaurants, hotels, attractions…" value={query} onChange={onQuery}/>
  </ScreenHero>
  <div className="gtc-place-lanes gtk-lanes gtk-lanes-top">{lanes.map(([key,label,desc])=>{const icon=(PLACE_CATEGORY_RAIL.find(c=>c.id===key)||{}).icon||'sparkle';return <button key={key} data-gt-lane={key} style={{backgroundImage:`linear-gradient(180deg,rgba(5,6,7,.12),rgba(5,6,7,.92)),url("${laneBackground(key)}")`}} onClick={()=>onCategory?.(key)}><i className="gtk-lane-icon"><Icon name={icon} size={20}/></i><span><strong>{label}</strong><small>{desc}</small>{laneCounts[key]>0&&<em className="gtc-lane-count">{laneCounts[key]} {laneCounts[key]===1?'place':'places'}</em>}</span><b aria-hidden="true">↗</b></button>})}</div>
  <PillRow label="More ways to go out" items={[{id:'nightlife-venues',label:'Drinks & Lounges',icon:'cocktail'},{id:'interactive',label:'Interactive',icon:'game'},{id:'date-night',label:'Date Night',icon:'heart'}]} onSelect={id=>id&&onNavigate?.(id)}/>

  {cuisines.length>0&&<PillRow label="Cuisines" items={[{id:'all',label:'All Restaurants'},...cuisines.slice(0,10).map(c=>({id:c.id,label:c.label.replace(/ & .*/,''),count:c.count}))]} onSelect={id=>id&&id!=='all'?onCuisine?.(id,CUISINE_LABELS[id]):onCategory?.('dining_culinary')}/>}
  {featured&&<section className="gtk-section gtk-featured"><PosterCard id={featured.id} size="lg" image={featured.hero_image} badge="FEATURED" kicker={[venueKind(featured),featured.neighborhood].filter(Boolean).join(' · ')} title={cleanTitle(featured.name)} lines={[featured.short_desc&&!/^auto/i.test(featured.short_desc)?featured.short_desc:null]} onOpen={()=>onVenue(featured)} saved={savedKeys?.has?.(`venue:${featured.id}`)} onSave={()=>onSave('venue',featured.id)} action={venueAction(featured,onPlan)}/></section>}
  {trending.length>0&&<Rail title="Trending" accent="Restaurants" onSeeAll={()=>onCategory?.('dining_culinary')}>{trending.map(v=><VenuePoster key={v.id} venue={v} savedKeys={savedKeys} onVenue={onVenue} onSave={onSave} onPlan={onPlan}/>)}</Rail>}
  {cuisines.length>0&&<Rail title="Popular" accent="Cuisines" onSeeAll={()=>onCategory?.('dining_culinary')}>{cuisines.map(c=><PhotoTile key={c.id} image={c.image} label={c.label} sub={`${c.count} ${c.count===1?'place':'places'}`} onClick={()=>onCuisine?.(c.id,c.label)}/>)}</Rail>}
  {hoods.length>0&&<Rail title="Neighbor" accent="hoods" subtitle="Where Atlanta goes out">{hoods.map(h=><PhotoTile key={h.id} image={h.image} label={h.label} sub={`${h.count} places`} onClick={()=>onQuery?.(h.label)}/>)}</Rail>}
  {worth.length>0&&<Rail className="gtc-place-preview" title="Places" accent="Worth Knowing" subtitle="Attractions · stays · wellness · culture" grid>{worth.map(v=><VenuePoster key={v.id} venue={v} savedKeys={savedKeys} onVenue={onVenue} onSave={onSave} onPlan={onPlan}/>)}</Rail>}
  {!venues.length&&<Empty title="Places are loading" body="Verified Atlanta places will appear here."/>}
  <BrandBand kicker="DISCOVER. DINE. DRINK. REPEAT." cta="Explore the City" onCta={()=>onCategory?.('attractions_experiences')}/>
 </Themed>
}
