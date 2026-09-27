import React,{useEffect,useState}from'react'
import GoodTimesIcon from'./GoodTimesIcon.jsx'
import{specificMedia,timeLabel,dateLabel,categoryLabel,eventBadge}from'./compact-display.js'
export default function CompactEventCard({event,saved,onOpen,onSave,now,taxonomy}){
 const[failed,setFailed]=useState(false),[pending,setPending]=useState(false)
 useEffect(()=>setFailed(false),[event.image_url]);const image=!failed&&specificMedia(event.image_url)
 return <article className="gt5-card gt5-event gt-compact-card gt-compact-event" data-event-id={event.event_key} data-category={event.category_key}>
  <button type="button" className="gt-compact-card-open" onClick={onOpen} aria-label={`View ${event.title}`}>
   <div className="gt-compact-card-media">{image?<img src={image} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<div className="gt-compact-placeholder"><GoodTimesIcon name="star"/><small>Event image unavailable</small></div>}<span className="gt-compact-date-badge">{eventBadge(event,now)}</span></div>
   <div className="gt-compact-card-copy"><small>{categoryLabel(event.category_key,taxonomy)}</small><h3>{event.title}</h3><p><GoodTimesIcon name="clock" size={12}/> {timeLabel(event.event_time)}</p><p className="gt-compact-location">{event.venue_name||'Location TBA'}</p><span className="gt-compact-card-link">View event <span aria-hidden="true">↗</span></span></div>
  </button>
  <button type="button" className={`gt5-save ${saved?'active':''}`} aria-label={`${saved?'Unsave':'Save'} ${event.title}`} aria-pressed={Boolean(saved)} disabled={pending} onClick={async e=>{e.stopPropagation();if(pending)return;setPending(true);try{await onSave()}finally{setPending(false)}}}><GoodTimesIcon name={saved?'check':'heart'}/></button>
 </article>
}
