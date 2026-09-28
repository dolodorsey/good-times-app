import React,{useEffect,useState} from 'react'
import GoodTimesIcon from '../GoodTimesIcon.jsx'
import {safeImage,safeLink,displayDate,displayTime,cleanTitle,labelFor,list} from './model.js'
export function Picture({src,alt='',kind='Experience',poster=false,illustration=false}) {const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);const image=!failed&&(illustration?(String(src||'').startsWith('/')&&!String(src).startsWith('//')?src:safeLink(src)):safeImage(src));return <div className={`gtc-picture ${poster?'gtc-poster':''}`}>{image?<img src={image} alt={alt} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<div className="gtc-no-picture"><GoodTimesIcon name="sparkle" size={26}/><span>{kind}</span><small>{illustration?'Choose your vibe':'Photo unavailable'}</small></div>}</div>}
export function ExperienceCard({item,kind='event',saved=false,onOpen,onSave,busy=false}) {
 const [saving,setSaving]=useState(false);const event=kind==='event',title=cleanTitle(item.title||item.name),category=event?labelFor(item.category_key):(item.venue_subcategory||item.subcategory||labelFor(item.venue_category_key||item.category_key));
 const place=event?item.venue_name:(item.neighborhood||'Atlanta');
 const image=event?item.image_url:item.hero_image;
 const price=event?(item.is_free===true?'Free':item.ticket_price_min!=null&&item.currency?`${item.currency} ${item.ticket_price_min}+`:null):item.price_range;
 return <article className={`gtc-card gt-compact-card ${event?'gtc-event':'gtc-venue'}`} data-item-id={item.event_key||item.id} data-category={item.category_key}>
  <button className="gtc-card-open gt-compact-card-open" onClick={onOpen} aria-label={`View ${title}`}><Picture src={image} kind={event?'Event':'Place'}/><div className="gtc-card-copy"><small className="gtc-category">{category}</small><h3>{title}</h3>{event&&<p className="gtc-time"><GoodTimesIcon name="clock" size={13}/><span>{displayDate(item.event_date,{month:'short',day:'numeric'})} · {displayTime(item.event_time)}</span></p>}<p className="gtc-place"><GoodTimesIcon name="pin" size={13}/><span>{place||'Location to confirm'}</span></p><span className="gtc-card-foot">{price?<span>{price}</span>:<span>{event?'View event':'Explore place'}</span>}<span aria-hidden="true">↗</span></span></div></button>
  {onSave&&<button type="button" className={`gt5-save gtc-save ${saved?'active':''}`} disabled={busy||saving} onClick={async e=>{e.stopPropagation();if(saving)return;setSaving(true);try{await onSave()}finally{setSaving(false)}}} aria-label={`${saved?'Unsave':'Save'} ${title}`} aria-pressed={saved}><GoodTimesIcon name={saved?'check':'heart'} size={21}/></button>}
 </article>
}
export function Section({title,subtext,action,children,className=''}) {return <section className={`gtc-section ${className}`}><header><div><h2>{title}</h2>{subtext&&<p>{subtext}</p>}</div>{action}</header>{children}</section>}
export function State({title,body,action,error=false}) {return <div className="gtc-state" role={error?'alert':'status'}><h3>{title}</h3>{body&&<p>{body}</p>}{action}</div>}
export function Skeleton({count=4}) {return <div className="gtc-grid gtc-loading" aria-label="Loading experiences" aria-busy="true">{Array.from({length:count},(_,i)=><div key={i}><i/><span/><span/></div>)}</div>}
export function ActionLink({href,children,className=''}) {const url=safeLink(href);return url?<a href={url} target="_blank" rel="noopener noreferrer" className={className}>{children} ↗</a>:null}
