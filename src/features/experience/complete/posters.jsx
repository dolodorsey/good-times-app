import React from 'react'
import {PosterCard} from './Kit.jsx'
import {humanize,labelFor,displayDate,displayTime,safeLink,cleanTitle,unique} from './model.js'
import {selectedCityClock} from '../good-times-event-clock.js'
import {restaurantCuisines,CUISINE_LABELS} from './restaurant-cuisine.js'

const key=i=>`${i.event_key?'event':'venue'}:${i.event_key||i.id}`
const rating=v=>{const r=Number(v?.google_rating);if(!Number.isFinite(r)||r<=0)return null;const n=Number(v?.google_reviews);return `★ ${r.toFixed(1)}${Number.isFinite(n)&&n>0?` (${n>=1000?(n/1000).toFixed(1)+'K':n})`:''}`}
export function venueKind(v){const c=restaurantCuisines({cuisine_tags:v?.cuisine_tags,source_subcategory:v?.venue_subcategory||v?.subcategory});return c[0]?CUISINE_LABELS[c[0]]:humanize(v?.cuisine_label||v?.venue_subcategory||v?.subcategory)||labelFor(v?.venue_category_key||v?.category_key)}
/** Action only when a real link exists: reservation/booking first, then the official website. */
export function venueAction(v,onPlan){const book=safeLink(v?.booking_link);if(book)return {label:'Reserve',icon:'calendar',href:book};if(onPlan)return {label:'Add to Plan',icon:'plus',onClick:()=>onPlan(v)};const site=safeLink(v?.website);return site?{label:'Visit',icon:'arrow',href:site}:null}
export function eventWhen(e,now=Date.now()){const c=selectedCityClock('atlanta',now);const t=displayTime(e?.event_time);const time=t==='Time to confirm'?null:t;if(e?.event_date===c.serviceDate)return `TONIGHT${time?` · ${time}`:''}`;if(e?.event_date&&e.event_date<c.date)return null;return `${displayDate(e?.event_date,{weekday:'short',month:'short',day:'numeric'}).toUpperCase()}${time?` · ${time}`:''}`}
export function eventPrice(e){if(e?.is_free===true)return 'Free';const min=Number(e?.ticket_price_min);if(Number.isFinite(min)&&min>0)return `From $${Math.round(min)}`;return null}

const venueIcon=v=>{const t=`${v?.category_key} ${v?.venue_category_key||''} ${v?.venue_subcategory||''}`;return /night|club|lounge|bar|hookah|wine/.test(t)?'cocktail':/hotel|housing|stay|resort/.test(t)?'bed':/game|arcade|vr|escape|bowling|golf/.test(t)?'game':/museum|culture|art|attraction|park/.test(t)?'landmark':/spa|wellness|fitness|gym/.test(t)?'lotus':/shop|boutique|market/.test(t)?'bag':'food'}
const eventIcon=e=>({concerts_live_music:'music',nightlife:'cocktail',sports_watch:'ball',comedy_performing_arts:'masks',festivals_major_activations:'tent',arts_museums_culture:'landmark',family_kids:'family'})[e?.category_key]||'ticket'
export function VenuePoster({venue,savedKeys,onVenue,onSave,onPlan,size='md',showAction=true}){
 return <PosterCard icon={venueIcon(venue)} id={venue.id} size={size} image={venue.hero_image} kicker={venueKind(venue)} title={cleanTitle(venue.name)}
  lines={[[venue.neighborhood,venue.price_range].filter(Boolean).join(' · ')||'Atlanta',rating(venue)]} saved={savedKeys?.has?.(key(venue))}
  onOpen={()=>onVenue(venue)} onSave={onSave?()=>onSave('venue',venue.id):null} action={showAction?venueAction(venue,onPlan):null}/>
}
export function EventPoster({event,savedKeys,onEvent,onSave,now,size='md',showAction=true}){
 const when=eventWhen(event,now),ticket=safeLink(event.ticket_url)
 return <PosterCard icon={eventIcon(event)} id={event.event_key} size={size} image={event.image_url} badge={when} live={Boolean(when&&when.startsWith('TONIGHT'))} kicker={labelFor(event.category_key)} title={cleanTitle(event.title)}
  lines={[event.venue_name||'Location to confirm',eventPrice(event)]} saved={savedKeys?.has?.(key(event))}
  onOpen={()=>onEvent(event)} onSave={onSave?()=>onSave('event',event.event_key):null} action={showAction&&ticket?{label:'Get Tickets',icon:'ticket',href:ticket}:null}/>
}
export function Poster({item,...props}){return item.event_key?<EventPoster event={item} {...props}/>:<VenuePoster venue={item} {...props}/>}
export function posterRows(items,limit=12){return unique(items).slice(0,limit)}
