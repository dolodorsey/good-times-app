import fs from 'node:fs/promises'
import path from 'node:path'

const ORIGIN = 'https://thegoodtimesworldwide.com'
const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'

const CITIES = [
  ['atlanta','atlanta','Atlanta'],['houston','houston','Houston'],['los_angeles','los-angeles','Los Angeles'],
  ['washington_dc','washington-dc','Washington, DC'],['miami','miami','Miami'],['dallas','dallas','Dallas'],
  ['charlotte','charlotte','Charlotte'],['new_york','new-york','New York'],['phoenix','phoenix','Phoenix'],
  ['scottsdale','scottsdale','Scottsdale'],['las_vegas','las-vegas','Las Vegas'],
]

const INTENTS = [
  ['nightlife','Nightlife','nightclubs, lounges, rooftops and late-night moves'],
  ['this-weekend','Things To Do This Weekend','events, experiences and places worth leaving home for'],
  ['restaurants','Restaurants & Dining','restaurants, brunch, cocktails and food experiences'],
  ['date-night','Date Night','dinner, drinks, culture and polished date-night moves'],
  ['black-owned','Black-Owned','Black-owned venues, culture anchors and community favorites'],
  ['live-music','Live Music','concerts, R&B, hip-hop, jazz and live performances'],
  ['rooftops','Rooftops','rooftop bars, skyline views and elevated social spots'],
  ['free-things-to-do','Free Things To Do','free events, community programs and low-cost experiences'],
]

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
const json = value => JSON.stringify(value).replace(/</g,'\\u003c')
const key = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g,'_')

async function topVenues(city) {
  const params = new URLSearchParams({
    select:'name,neighborhood,short_desc,quality_score,google_rating,website,category_key,subcategory,is_black_owned,vibe_tags',
    city_key:`eq.${city}`,status:'eq.active',is_verified:'eq.true',hero_image:'not.is.null',
    order:'quality_score.desc.nullslast,google_rating.desc.nullslast',limit:'100',
  })
  try {
    const response = await fetch(`${CONTENT_URL}/rest/v1/gt_venues?${params}`, { headers:{apikey:CONTENT_KEY,Authorization:`Bearer ${CONTENT_KEY}`,Accept:'application/json'} })
    if (!response.ok) return []
    const rows = await response.json()
    return Array.isArray(rows) ? rows : []
  } catch { return [] }
}

function filterVenues(rows, intent) {
  const text = item => `${item.subcategory || ''} ${item.short_desc || ''} ${(item.vibe_tags || []).join(' ')}`.toLowerCase()
  const category = item => key(item.category_key)
  const inCategory = (item, allowed) => allowed.includes(category(item))
  const matchers = {
    nightlife: item => inCategory(item,['nightclub','lounge','bar','rooftop','hookah','nightlife']) || /\b(nightclub|nightclubs|lounge|lounges|rooftop|hookah|speakeasy|supper club|bottle service)\b/i.test(text(item)),
    restaurants: item => inCategory(item,['restaurant','brunch','coffee','food_and_dining','food_hall']) || /\b(restaurant|dining|brunch|culinary|chef|food hall|wine bar|cocktail bar)\b/i.test(text(item)),
    'date-night': item => inCategory(item,['restaurant','brunch','bar','rooftop','lounge','museum','gallery']) || /\b(date night|romantic|speakeasy|wine bar|jazz|rooftop|fine dining|intimate)\b/i.test(text(item)),
    'black-owned': item => Boolean(item.is_black_owned),
    'live-music': item => /\b(live music|concert|jazz|r&b|rnb|hip-hop|hip hop|music hall|live performance|dj sets?)\b/i.test(text(item)),
    rooftops: item => inCategory(item,['rooftop']) || /\b(rooftop|roof top|skyline view|skyline views)\b/i.test(text(item)),
    'free-things-to-do': item => /\b(free admission|free entry|public art|community market|park|museum|gallery)\b/i.test(text(item)),
    'this-weekend': () => true,
  }
  const predicate = matchers[intent] || (() => true)
  return rows.filter(predicate)
}

function pageHtml({cityKey,citySlug,cityLabel,intentSlug,intentLabel,intentDesc,venues}) {
  const canonical = `${ORIGIN}/guides/${citySlug}-${intentSlug}.html`
  const title = `${intentLabel} in ${cityLabel} | GOOD TIMES`
  const description = `GOOD TIMES guide to ${intentLabel.toLowerCase()} in ${cityLabel}: ${intentDesc}. Curated from current city inventory and verified venue data.`
  const picks = venues.slice(0,6)
  const faq = [
    {q:`What is GOOD TIMES in ${cityLabel}?`,a:`GOOD TIMES is a city intelligence and concierge app for discovering current nightlife, dining, events, culture and experiences in ${cityLabel}.`},
    {q:`How do I find ${intentLabel.toLowerCase()} in ${cityLabel}?`,a:`Use the GOOD TIMES app to browse live city inventory, filter by vibe and date, save places, and build a complete plan.`},
    {q:'Is GOOD TIMES free?',a:'Yes. GOOD TIMES is free to access and use.'},
  ]
  const structured = {
    '@context':'https://schema.org','@graph':[
      {'@type':'CollectionPage',name:title,url:canonical,description,isPartOf:{'@type':'WebSite',name:'GOOD TIMES',url:ORIGIN},about:{'@type':'City',name:cityLabel}},
      {'@type':'FAQPage',mainEntity:faq.map(item=>({'@type':'Question',name:item.q,acceptedAnswer:{'@type':'Answer',text:item.a}}))},
      {'@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'GOOD TIMES',item:ORIGIN},
        {'@type':'ListItem',position:2,name:'City Guides',item:`${ORIGIN}/guides/`},
        {'@type':'ListItem',position:3,name:`${cityLabel} ${intentLabel}`,item:canonical},
      ]},
    ],
  }
  const venueCards = picks.length ? picks.map(item=>`<article><h3>${esc(item.name)}</h3><p>${esc(item.neighborhood || cityLabel)}</p><small>${esc(item.short_desc || item.subcategory || 'Verified GOOD TIMES venue')}</small>${item.google_rating?`<b>★ ${Number(item.google_rating).toFixed(1)}</b>`:''}</article>`).join('') : '<article><h3>Open GOOD TIMES</h3><p>Current picks load inside the live app.</p><small>Inventory depth varies by city and updates continuously.</small></article>'
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="GOOD TIMES"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${ORIGIN}/good-times-logo.png"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${json(structured)}</script><style>*{box-sizing:border-box}body{margin:0;background:#06060c;color:#f5f0e8;font-family:Arial,sans-serif}main{max-width:1040px;margin:auto;padding:56px 22px 90px}.brand{width:150px}.eyebrow{margin-top:46px;color:#d4a853;font-size:12px;font-weight:800;letter-spacing:.2em}h1{font-family:Georgia,serif;font-size:clamp(48px,8vw,86px);line-height:.95;margin:12px 0 20px;font-weight:500}.lead{max-width:740px;color:#beb8ad;font-size:19px;line-height:1.65}.cta{display:flex;gap:12px;flex-wrap:wrap;margin:30px 0 50px}.cta a,.share{padding:14px 20px;border-radius:999px;text-decoration:none;font-weight:800;border:1px solid #d4a853;background:#d4a853;color:#08080d}.cta a.secondary,.share{background:transparent;color:#f5f0e8;border-color:#34323a}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}article{border:1px solid #282630;border-radius:18px;padding:20px;background:#101017}article h3{margin:0 0 7px;font-size:20px}article p{margin:0 0 10px;color:#d4a853}article small{display:block;color:#aaa3a0;line-height:1.5}article b{display:block;margin-top:14px}section{margin-top:52px}h2{font-family:Georgia,serif;font-size:36px}.faq{border-top:1px solid #26242d;padding:18px 0}.faq p{color:#aaa3a0;line-height:1.6}footer{margin-top:65px;color:#777;font-size:13px}</style></head><body><main><a href="/"><img class="brand" src="/good-times-logo.png" alt="GOOD TIMES"></a><div class="eyebrow">${esc(cityLabel.toUpperCase())} CITY INTELLIGENCE</div><h1>${esc(intentLabel)}<br>in ${esc(cityLabel)}</h1><p class="lead">${esc(description)}</p><div class="cta"><a data-track="app_open" href="/?city=${encodeURIComponent(cityKey)}&utm_source=seo&utm_medium=guide&utm_campaign=${encodeURIComponent(intentSlug)}">Open GOOD TIMES</a><a class="secondary" data-track="signup_cta" href="/join?city=${encodeURIComponent(cityKey)}&utm_source=seo&utm_campaign=${encodeURIComponent(intentSlug)}">Join Good Times</a><button class="share" id="share">Share this guide</button></div><section><div class="eyebrow">CURRENT CITY LAYER</div><h2>Places to start</h2><div class="grid">${venueCards}</div></section><section><div class="eyebrow">ASK GOOD TIMES</div><h2>What people want to know</h2>${faq.map(item=>`<div class="faq"><h3>${esc(item.q)}</h3><p>${esc(item.a)}</p></div>`).join('')}</section><footer>GOOD TIMES · ${esc(cityLabel)} · Live city inventory changes continuously. Verify event times, availability and venue policies before going.</footer></main><script>const base={city_key:${json(cityKey)},source:'seo-guide',path:location.pathname,campaign:${json(intentSlug)}};function track(event_name,metadata={}){fetch('/api/growth-track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...base,event_name,metadata}),keepalive:true}).catch(()=>{})}track('landing_view',{referrer:document.referrer||null});document.querySelectorAll('[data-track]').forEach(el=>el.addEventListener('click',()=>track(el.dataset.track)));document.getElementById('share').addEventListener('click',async()=>{track('share_click');if(navigator.share)try{await navigator.share({title:document.title,url:location.href})}catch{}else{await navigator.clipboard?.writeText(location.href);document.getElementById('share').textContent='Link copied'}})</script></body></html>`
}

await fs.mkdir('public/guides',{recursive:true})
const cityInventory = new Map()
for (const [cityKey] of CITIES) cityInventory.set(cityKey, await topVenues(cityKey))

const guideUrls = []
for (const [cityKey,citySlug,cityLabel] of CITIES) {
  for (const [intentSlug,intentLabel,intentDesc] of INTENTS) {
    const filename = `${citySlug}-${intentSlug}.html`
    guideUrls.push(`${ORIGIN}/guides/${filename}`)
    const intentVenues = filterVenues(cityInventory.get(cityKey)||[], intentSlug)
    await fs.writeFile(path.join('public/guides',filename),pageHtml({cityKey,citySlug,cityLabel,intentSlug,intentLabel,intentDesc,venues:intentVenues}))
  }
}

const indexLinks = CITIES.map(([,citySlug,cityLabel])=>`<section><h2>${cityLabel}</h2>${INTENTS.map(([intentSlug,intentLabel])=>`<a href="/guides/${citySlug}-${intentSlug}.html">${intentLabel}</a>`).join(' · ')}</section>`).join('')
await fs.writeFile('public/guides/index.html',`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GOOD TIMES City Guides</title><meta name="description" content="GOOD TIMES city guides for nightlife, dining, events, date nights, live music, rooftops and culture across 11 cities."><link rel="canonical" href="${ORIGIN}/guides/"><style>body{max-width:900px;margin:auto;padding:50px 20px;background:#06060c;color:#f5f0e8;font:16px Arial}a{color:#d4a853;line-height:2}h1{font:56px Georgia}section{padding:20px 0;border-top:1px solid #282630}</style></head><body><h1>GOOD TIMES City Guides</h1><p>Curated discovery surfaces across 11 cities.</p>${indexLinks}</body></html>`)

const core = ['/', '/join', '/concierge-request', '/trip', '/group', '/guides/']
const legacyCity = CITIES.map(([,slug])=>`/${slug}`)
const urls = [...core,...legacyCity,...guideUrls.map(url=>url.replace(ORIGIN,''))]
const today = new Date().toISOString().slice(0,10)
await fs.writeFile('public/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url,index)=>`  <url><loc>${ORIGIN}${url}</loc><lastmod>${today}</lastmod><changefreq>${index===0?'daily':'weekly'}</changefreq><priority>${index===0?'1.0':'0.8'}</priority></url>`).join('\n')}\n</urlset>\n`)

await fs.writeFile('public/llms.txt',`# GOOD TIMES\n\nGOOD TIMES is a supervised city intelligence and personal concierge for nightlife, dining, events, culture, attractions and plans.\nCanonical site: ${ORIGIN}\nGuide index: ${ORIGIN}/guides/\nCities: ${CITIES.map(item=>item[2]).join(', ')}.\nCore actions: discover current venues and events; save places and events; build a night; create trip/group/concierge requests.\nGOOD TIMES does not guarantee availability. Users should verify times, tickets, reservations and venue policies.\n\n## Guide families\n${INTENTS.map(item=>`- ${item[1]}: /guides/<city>-${item[0]}.html`).join('\n')}\n`)

console.log(`GOOD TIMES growth surfaces generated: ${guideUrls.length} guides across ${CITIES.length} cities`)
