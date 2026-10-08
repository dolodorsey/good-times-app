import React,{useState} from 'react'
import ExploreTaxonomyBrowser from '../ExploreTaxonomyBrowser.jsx'
import RestaurantExplorer from './RestaurantExplorer.jsx'
import PlacesMap from './PlacesMap.jsx'
import {ExperienceCard} from './Cards.jsx'
export default function PlacesPages({taxonomy,venues,savedKeys,onVenue,onSave,onAddPlan,category,setCategory,sub,setSub,query,setQuery,directoryOpen,setDirectoryOpen,mapMode,setMapMode}){
 const [restaurant,setRestaurant]=useState(category==='dining_culinary')
 const choose=id=>{setCategory(id);setSub(null);setDirectoryOpen(false);setRestaurant(id==='dining_culinary')}
 const title=restaurant?'Restaurants':category==='nightlife'?'Nightlife':category==='entertainment'?'Interactive Experiences':'Discover Places'
 const renderVenue=v=><div key={v.id}><ExperienceCard kind="venue" item={v} saved={savedKeys.has(`venue:${v.id}`)} onOpen={()=>onVenue(v)} onSave={()=>onSave('venue',v.id)}/><button className="gt30-add" onClick={()=>onAddPlan(v)}>＋ Plan</button></div>
 return <section className="gt30-page gtc-places" data-family={restaurant?'restaurants':category==='nightlife'?'parties':'places'} data-page={restaurant?'07':category==='nightlife'?'08':category==='entertainment'?'09':'06'}>
 <header className="gt30-heading"><div><small>ATLANTA · PLACES</small><h1>{title}</h1></div><a href="/provider-onboarding">＋ Space</a></header>
 <nav className="gt30-chips" aria-label="Place shortcuts">{[['','All Places'],['dining_culinary','Restaurants'],['nightlife','Nightlife'],['entertainment','Interactive']].map(([id,label])=><button key={id} className={(category||'')===id?'active':''} onClick={()=>choose(id||null)}>{label}</button>)}</nav>
 {restaurant?<><button onClick={()=>setRestaurant(false)}>Browse all restaurant types & subcategories</button><RestaurantExplorer initialQuery={query} {...{savedKeys,onVenue,onSave,onAddPlan}} onBack={()=>choose(null)}/></>:<><div className="gtc-search"><input aria-label="Search Atlanta places" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Place, activity or neighborhood…"/><button onClick={()=>setMapMode(!mapMode)}>{mapMode?'List':'Map'}</button></div>
 {!category&&mapMode?<PlacesMap venues={venues.filter(v=>!query||[v.name,v.neighborhood].join(' ').toLowerCase().includes(query.toLowerCase()))} renderVenue={renderVenue}/>:<ExploreTaxonomyBrowser compact externalSearch taxonomy={taxonomy} directory={venues} cityName="Atlanta" query={query} onQuery={setQuery} selectedCategory={category} selectedSubcategory={sub} onCategory={choose} onSubcategory={setSub} directoryOpen={directoryOpen} onDirectoryOpen={setDirectoryOpen} mapMode={mapMode} onMapMode={setMapMode} eventsFirst={false} renderVenue={renderVenue}/>}</>}
 </section>
}
