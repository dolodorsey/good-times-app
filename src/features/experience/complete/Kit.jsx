import React,{useEffect,useState} from 'react'
import {safeImage} from './model.js'
import './good-times-cinematic.css'

/** GOOD TIMES cinematic kit (2026-10-29 owner standard).
 * Editorial art is decoration only; named places/events always use their own verified media or the no-photo treatment.
 */
const MEDIA='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/good-times-backgrounds'
export const SCENES=Object.freeze({
  home:`${MEDIA}/gt-homescreen-atlanta.webp`, skyline:`${MEDIA}/gt-bg-panoramic-skyline.webp`, places:`${MEDIA}/gt-bg-courtyard-evening.webp`,
  dining:`${MEDIA}/gt-cat-dining.webp`, diningWarm:`${MEDIA}/gt-cat-adventure.webp`, nightlife:`${MEDIA}/explore-cat-nightlife.jpg`, district:`${MEDIA}/gt-bg-nightlife-district.webp`,
  interactive:`${MEDIA}/gt-bg-neon-skyline.webp`, future:`${MEDIA}/gt-bg-future-city.webp`, sports:`${MEDIA}/explore-cat-sports.jpg`, stadium:`${MEDIA}/gt-cat-sports.webp`,
  music:`${MEDIA}/gt-cat-music.webp`, concert:`${MEDIA}/explore-cat-music.jpg`, entertainment:`${MEDIA}/gt-bg-social-scene.webp`, hotels:`${MEDIA}/gt-bg-waterfront-venue.webp`,
  penthouse:`${MEDIA}/gt-bg-penthouse-view.webp`, rooftop:`${MEDIA}/gt-bg-rooftop-lounge.webp`, lounge:`${MEDIA}/gt-bg-cocktail-lounge.webp`, drinks:`${MEDIA}/explore-cat-drinks.jpg`,
  culture:`${MEDIA}/gt-cat-culture.webp`, wellness:`${MEDIA}/gt-cat-wellness.webp`, shopping:`${MEDIA}/gt-cat-shopping.webp`, family:`${MEDIA}/gt-cat-family.webp`,
  date:`${MEDIA}/gt-cat-mood-date.webp`, chill:`${MEDIA}/gt-cat-mood-chill.webp`, bougie:`${MEDIA}/gt-cat-mood-bougie.webp`, turnt:`${MEDIA}/gt-cat-mood-turnt.webp`,
  hookah:`${MEDIA}/gt-cat-hookah.webp`, exclusive:`${MEDIA}/gt-cat-exclusive.webp`, vip:`${MEDIA}/gt-bg-vip-arrival.webp`, terrace:`${MEDIA}/gt-bg-skyline-terrace.webp`,
})
export const THEMES=Object.freeze({gold:'gold',emerald:'emerald',magenta:'magenta',cyan:'cyan',ember:'ember',violet:'violet',rose:'rose',teal:'teal'})
export const PROVIDER_URL='https://forms.thekollectivehospitality.com/f/good-times/provider-onboarding'

const P={
  search:'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15m5.5-2 5 5', sliders:'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  plus:'M12 5v14M5 12h14', arrow:'M5 12h14m-6-6 6 6-6 6', chevron:'m9 6 6 6-6 6', back:'M15 6l-6 6 6 6', heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  check:'m4 12 5 5L20 6', pin:'M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14Zm0-11a3 3 0 1 0 0-6 3 3 0 0 0 0 6', clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m0-16v6l4 2',
  star:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z', calendar:'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4', ticket:'M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3v2Zm9-2v12',
  food:'M5 3v7a2 2 0 0 0 4 0V3M7 10v11M17 3c-2.5 2-3 5-3 8h3v10', cocktail:'M4 4h16l-8 9-8-9Zm8 9v8m-4 0h8M15 7l3-3', music:'M9 18V5l12-3v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  game:'M6 9h4M8 7v4M15 9h.01M18 11h.01M7 5h10a4 4 0 0 1 4 4l1 7a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2l1-7a4 4 0 0 1 4-4Z', ball:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20',
  lotus:'M12 20c-4 0-8-3-9-7 3 0 6 1 9 4 3-3 6-4 9-4-1 4-5 7-9 7Zm0-3c-2-3-2-8 0-12 2 4 2 9 0 12Z', bed:'M3 20V6m0 10h18v4M3 12h18v4M7 9h4v3H7z', heartbeat:'M3 12h4l2-5 4 10 2-5h6',
  flame:'M12 22c4 0 7-3 7-7 0-5-5-8-6-12-1 3-3 4-4 6-1-1-2-2-2-3-2 2-2 5-2 7 0 5 3 9 7 9Z', building:'M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 8h2m4 0h2M8 12h2m4 0h2', sun:'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2m0 18v2M4 4l1.5 1.5M18.5 18.5 20 20M1 12h2m18 0h2M4 20l1.5-1.5M18.5 5.5 20 4',
  moon:'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z', smoke:'M8 21h8M12 21v-6M9 15h6l-1-5h-4l-1 5M10 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4', diamond:'M6 3h12l4 6-10 12L2 9l4-6Zm-4 6h20M12 21 8 9l4-6 4 6-4 12',
  people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-1a7 7 0 0 1 14 0v1m1-10a3 3 0 1 0 0-6m3 16v-1a5 5 0 0 0-3-5', globe:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  mic:'M12 15a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v7a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0m7 7v3', masks:'M3 4h9v6a4.5 4.5 0 0 1-9 0V4Zm9 4h9v6a4.5 4.5 0 0 1-9 0M6 8h.01M9 8h.01M15 12h.01M18 12h.01M6 12c1 1 2 1 3 0', palette:'M12 22a10 10 0 1 1 10-10c0 3-3 3-5 3h-2a2 2 0 0 0-1 4c1 1 0 3-2 3ZM7 11h.01M9 7h.01M14 6h.01M17 10h.01',
  landmark:'M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M2 10l10-7 10 7H2Z', bag:'M5 8h14l-1 13H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2', tent:'M3 21 12 4l9 17H3Zm9-17v17M8 21l4-7 4 7', trophy:'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H3a4 4 0 0 0 4 4m10-4h4a4 4 0 0 1-4 4',
  family:'M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4M16 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4M5 21v-8l-1-3h8l-1 3v8M14 21v-6h4v6', shuffle:'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5', chat:'M21 12a8 8 0 0 1-12 7l-6 2 2-6A8 8 0 1 1 21 12Z',
  share:'M12 3v13M7 8l5-5 5 5M5 14v6h14v-6', phone:'M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z', nav:'m3 11 18-8-8 18-2-8-8-2Z', menu:'M5 4h14v17H5zM9 8h6M9 12h6M9 16h4',
  map:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15', grid:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4', user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 9v-2a8 6 0 0 1 16 0v2',
  sparkle:'m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2Z', saved:'M6 3h12v18l-6-4-6 4V3Z', crown:'m3 8 4 4 5-7 5 7 4-4-2 11H5L3 8Z', leaf:'M5 21c0-9 5-15 15-16-1 10-7 15-16 15M5 21l8-8',
}
export function Icon({name,size=22,stroke=1.7,className=''}) {const d=P[name]||P.sparkle;return <svg className={`gtk-icon ${className}`} data-gtk-icon={name} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={d}/></svg>}

export function Themed({theme='gold',className='',children,as:Tag='section',...rest}) {return <Tag className={`gtk-themed gtk-theme-${theme} ${className}`} {...rest}>{children}</Tag>}

/** Compact cinematic hero: eyebrow, editorial serif title with one accent word, tagline, script signature. */
export function ScreenHero({eyebrow='ATLANTA',title,accent,tagline,image,script='Good People\nBetter Nights.',children,size='md',align='left',onBack=null,backLabel='Back'}) {
  const long=String(title||'').length+String(accent||'').length>11
  return <header className={`gtk-hero gtk-hero-${size} gtk-hero-${align} ${long?'is-long':''}`} style={{'--gtk-hero-image':`url("${image||SCENES.home}")`}}>
    <div className="gtk-hero-art" aria-hidden="true"/><div className="gtk-hero-shade" aria-hidden="true"/>
    {onBack&&<button type="button" className="gtk-hero-back" onClick={onBack} aria-label={backLabel}><Icon name="back" size={20}/></button>}
    <div className="gtk-hero-copy">{eyebrow&&<span className="gtk-eyebrow">{eyebrow}</span>}<h1>{title}{accent&&<> <em>{accent}</em></>}</h1>{tagline&&<p className="gtk-tagline">{tagline}</p>}</div>
    {script&&<div className="gtk-script" aria-hidden="true">{script.split('\n').map(l=><span key={l}>{l}</span>)}</div>}
    {children&&<div className="gtk-hero-tools">{children}</div>}
  </header>
}

export function SearchBar({placeholder='Search…',value,onChange,onSubmit,onFilters,label='Search',addSpace=true,inputLabel,autoFocus=false}) {
  return <div className="gtk-searchbar"><label className="gtk-search"><Icon name="search" size={19}/><span className="gtk-sr">{inputLabel||label}</span><input aria-label={inputLabel||label} autoFocus={autoFocus} value={value} placeholder={placeholder} onChange={e=>onChange?.(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSubmit?.(e.currentTarget.value)}}/>{value&&<button type="button" className="gtk-clear" aria-label="Clear search" onClick={()=>onChange?.('')}>×</button>}</label>{onFilters&&<button type="button" className="gtk-icon-btn" aria-label="Filters" onClick={onFilters}><Icon name="sliders" size={19}/></button>}{addSpace&&<AddSpace compact/>}</div>
}
export function AddSpace({compact=false,label='Add Space',sub='List your event or venue'}) {return <a className={`gtk-add-space ${compact?'is-compact':''}`} href={PROVIDER_URL} target="_blank" rel="noopener noreferrer"><Icon name="plus" size={18}/><span><strong>{label}</strong>{!compact&&<small>{sub}</small>}</span>{!compact&&<Icon name="chevron" size={18}/>}</a>}

/** Square icon tiles (or circles) — the "What kind of time?" rail. */
export function IconRail({items=[],active=null,onSelect,variant='tile',label='Categories',wrap=false}) {
  return <nav className={`gtk-rail gtk-rail-${variant} ${wrap?'is-wrap':''}`} aria-label={label}>{items.map(it=><button type="button" key={it.id} data-gtk-tile={it.id} className={[active===it.id?'active':'',it.tone?`gtk-tone-${it.tone}`:''].join(' ').trim()} aria-pressed={active===it.id} onClick={()=>onSelect?.(it.id,it)}><span className="gtk-tile-icon"><Icon name={it.icon} size={variant==='circle'?24:26}/></span><strong>{it.label}</strong>{it.sub&&<small>{it.sub}</small>}</button>)}</nav>
}
export function PillRow({items=[],active=null,onSelect,label='Filters',scroll=true}) {
  return <div className={`gtk-pills ${scroll?'is-scroll':''}`} role="group" aria-label={label}>{items.map(it=><button type="button" key={it.id} className={active===it.id?'active':''} aria-pressed={active===it.id} disabled={it.count===0} onClick={()=>onSelect?.(active===it.id?null:it.id,it)}>{it.icon&&<Icon name={it.icon} size={15}/>}{it.label}{it.count>0&&<em>{it.count}</em>}</button>)}</div>
}
/** Section header + horizontally scrolling rail. */
export function Rail({title,accent,kicker,subtitle,onSeeAll,seeAllLabel='See All',children,className='',grid=false}) {
  return <section className={`gtk-section ${className}`}><header className="gtk-section-head"><div><h2>{title}{accent&&<> <em>{accent}</em></>}{kicker&&<span className="gtk-kicker">{kicker}</span>}</h2>{subtitle&&<p>{subtitle}</p>}</div>{onSeeAll&&<button type="button" className="gtk-see-all" onClick={onSeeAll}>{seeAllLabel}<Icon name="arrow" size={16}/></button>}</header><div className={grid?'gtk-grid':'gtk-scroller'}>{children}</div></section>
}
function PosterImage({src,alt='',icon='sparkle'}) {const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);const image=!failed&&safeImage(src);return image?<img src={image} alt={alt} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<div className="gtk-no-photo" aria-hidden="true"><Icon name={icon} size={34} stroke={1.3}/><span>GOOD TIMES</span><small>Verified photo coming soon</small></div>}
/** Image-first card: title over photo, meta lines, one real action. */
export function PosterCard({id,image,badge,kicker,title,lines=[],tags=[],action,onOpen,saved=false,onSave,size='md',live=false,icon='sparkle'}) {
  const [busy,setBusy]=useState(false)
  return <article className={`gtk-poster gtk-poster-${size} gtc-card`} data-item-id={id||undefined}>
    <button type="button" className="gtk-poster-open gtc-card-open" onClick={onOpen} aria-label={`View ${title}`}>
      <div className="gtk-poster-media"><PosterImage src={image} icon={icon}/><div className="gtk-poster-shade"/>{badge&&<span className={`gtk-badge ${live?'is-live':''}`}>{live&&<i/>}{badge}</span>}</div>
      <div className="gtk-poster-copy">{kicker&&<small className="gtk-poster-kicker">{kicker}</small>}<h3>{title}</h3>{lines.filter(Boolean).map((l,i)=><p key={i} className={i===0?'is-primary':''}>{l}</p>)}{tags.length>0&&<div className="gtk-tags">{tags.filter(Boolean).slice(0,3).map(t=><span key={t}>{t}</span>)}</div>}</div>
    </button>
    {action&&(action.href?<a className="gtk-poster-action" href={action.href} target="_blank" rel="noopener noreferrer"><Icon name={action.icon||'arrow'} size={16}/>{action.label}</a>:<button type="button" className="gtk-poster-action" onClick={action.onClick}><Icon name={action.icon||'arrow'} size={16}/>{action.label}</button>)}
    {onSave&&<button type="button" className={`gtk-save ${saved?'active':''}`} disabled={busy} aria-pressed={saved} aria-label={`${saved?'Unsave':'Save'} ${title}`} onClick={async e=>{e.stopPropagation();if(busy)return;setBusy(true);try{await onSave()}finally{setBusy(false)}}}><Icon name={saved?'check':'heart'} size={18}/></button>}
  </article>
}
/** Small photo tile with a label — cuisines, neighborhoods, vibes, weekend categories. */
export function PhotoTile({image,label,sub,onClick,icon}) {return <button type="button" className="gtk-photo-tile" onClick={onClick} style={image?{'--gtk-tile-image':`url("${image}")`}:undefined}><span className="gtk-photo-tile-art" aria-hidden="true"/>{icon&&<span className="gtk-photo-tile-icon"><Icon name={icon} size={22}/></span>}<strong>{label}</strong>{sub&&<small>{sub}</small>}</button>}
export function BuildTrio({onBuild,onShake,onAsk,title='Build Your Night',kicker='DIFFERENT WAYS. SAME GOOD TIMES.'}) {
  return <section className="gtk-section gtk-build"><header className="gtk-section-head"><div><h2>{title.split(' ').slice(0,-1).join(' ')} <em>{title.split(' ').at(-1)}</em><span className="gtk-kicker">{kicker}</span></h2></div></header><div className="gtk-build-grid">
    <button type="button" className="gtk-build-card is-build" onClick={onBuild}><Icon name="sparkle" size={26}/><span><strong>Build It</strong><small>Pick the places. Make it yours.</small></span><Icon name="chevron" size={18}/></button>
    <button type="button" className="gtk-build-card is-shake" onClick={onShake}><Icon name="shuffle" size={26}/><span><strong>Shake It</strong><small>Surprise me with a vibe.</small></span><Icon name="chevron" size={18}/></button>
    <button type="button" className="gtk-build-card is-ask" onClick={onAsk}><Icon name="chat" size={26}/><span><strong>Ask GOOD TIMES</strong><small>Tell us what you want.</small></span><Icon name="chevron" size={18}/></button>
  </div></section>
}
export function ConciergeBand({onClick,title='Your Concierge Is Here.',kicker='GOOD PEOPLE. PERSONAL SUPPORT.',items=['Reservations','VIP Access','Custom Plans'],image=SCENES.lounge}) {
  return <aside className="gtk-concierge" style={{'--gtk-band-image':`url("${image}")`}}><div className="gtk-concierge-art" aria-hidden="true"/><div className="gtk-concierge-copy"><small>{kicker}</small><h2>{title}</h2><p>{items.join(' · ')}</p></div><button type="button" onClick={onClick}><Icon name="chat" size={18}/>Talk to Concierge<Icon name="chevron" size={16}/></button></aside>
}
export function BrandBand({line1='GOOD',line2='PEOPLE',line3='BETTER',line4='NIGHTS™',kicker='DISCOVER. DINE. DRINK. REPEAT.',cta,onCta,image=SCENES.skyline}) {
  return <aside className="gtk-brand-band" style={{'--gtk-band-image':`url("${image}")`}}><div className="gtk-brand-stack" aria-hidden="true"><span>{line1}</span><span>{line2}</span><span>{line3}</span><span>{line4}</span></div><small>{kicker}</small>{cta&&<button type="button" onClick={onCta}>{cta}<Icon name="chevron" size={16}/></button>}</aside>
}
export function Empty({title,body,action}) {return <div className="gtk-empty" role="status"><span>GT</span><h3>{title}</h3>{body&&<p>{body}</p>}{action}</div>}
export function Skeletons({count=3}) {return <div className="gtk-scroller" aria-busy="true" aria-label="Loading">{Array.from({length:count},(_,i)=><div className="gtk-poster gtk-poster-md gtk-skeleton" key={i}/>)}</div>}

export const LANE_HEROES=Object.freeze({
 concerts_live_music:{theme:'gold',eyebrow:'LIVE MUSIC',title:'Music',accent:'Lives Here.',tagline:'Concerts · Artists · Culture',image:SCENES.concert,script:'Good\nPeople\nBetter\nMusic.'},
 nightlife:{theme:'magenta',eyebrow:'NIGHTLIFE',title:'Good People',accent:'Better Nights.',tagline:'Parties · Music · Culture · All night long',image:SCENES.nightlife},
 day_parties_brunch:{theme:'ember',eyebrow:'DAY PARTIES',title:'Brunch',accent:'& Beats.',tagline:'Day parties · Brunch · Pool parties',image:SCENES.terrace},
 comedy_performing_arts:{theme:'violet',eyebrow:'COMEDY & LIVE',title:'Laugh',accent:'Louder.',tagline:'Stand-up · Theater · Performing arts',image:SCENES.culture},
 festivals_major_activations:{theme:'ember',eyebrow:'FESTIVALS',title:'Big City',accent:'Moments.',tagline:'Festivals · Activations · Major weekends',image:SCENES.district},
 arts_museums_culture:{theme:'rose',eyebrow:'CULTURE',title:'Arts',accent:'& Culture.',tagline:'Museums · Galleries · Film · Talks',image:SCENES.culture},
 family_kids:{theme:'gold',eyebrow:'FAMILY',title:'Family',accent:'Time.',tagline:'Kids · Family events · Discovery',image:SCENES.family},
 attractions_experiences:{theme:'cyan',eyebrow:'ATTRACTIONS',title:'Only in',accent:'Atlanta.',tagline:'Museums · Exhibits · Attractions',image:SCENES.terrace},
 games_interactive:{theme:'cyan',eyebrow:'ATLANTA',title:'Interactive',accent:'Experiences.',tagline:'Play. Compete. Connect.',image:SCENES.interactive,script:'Play\nPeople\nBelong\nHere'},
 sports_watch:{theme:'ember',eyebrow:'ATLANTA',title:'Game',accent:'Time.',tagline:'Atlanta teams. Epic games.',image:SCENES.sports,script:'More\nThan\nA Game.'},
 venues:{theme:'magenta',eyebrow:'ATLANTA',title:'Nightlife',accent:'',tagline:'Clubs. Lounges. Rooftops. Unforgettable nights.',image:SCENES.district},
 all:{theme:'violet',eyebrow:'ENTERTAINMENT',title:'Upcoming',accent:'in Atlanta.',tagline:'Shows · Parties · Culture · Good times',image:SCENES.entertainment},
})
export function LaneHero({lane}) {const h=LANE_HEROES[lane]||LANE_HEROES.all;return <ScreenHero size="sm" eyebrow={h.eyebrow} title={h.title} accent={h.accent||null} tagline={h.tagline} image={h.image} script={h.script||'Good\nPeople\nBetter\nNights.'}/>}
