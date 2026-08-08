import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, 'src', 'features', 'experience', 'GoodTimesLiveApp.jsx')
let source = fs.readFileSync(target, 'utf8')

const imageBefore = `function eventImage(event) { return mediaUrl(event?.image_url || BG_FALLBACK) }
function venueImage(venue) { return mediaUrl(venue?.hero_image || BG_FALLBACK) }`
const imageAfter = `function eventImage(event) { return mediaUrl(event?.image_url || BG_FALLBACK) }
const GENERIC_VENUE_IMAGE_MARKERS = [
  'photo-1514320291840-2e0a9bf2a9ae',
  'photo-1517991104123-1d56a6411e31',
  'photo-1514432324607-2e467f4af445',
  'photo-1493857671505-72967e2e2760',
  'photo-1509042239860-f550ce710b93',
  'photo-1555529669-e69e7f0acf47',
  'photo-1578966997682-e86cccef1e04',
  'photo-1510784722466-f2aa9c52fff6',
  'photo-1519167758993-c4e29a91b0d0',
  'photo-1469022563149-aa64dbd37daa',
]
const VENUE_SCENES = [...new Set(Object.values(CATEGORY_META).map(item=>item.scene).filter(Boolean))]
function stableVenueScene(venue) {
  const seed=String(venue?.id||venue?.name||venue?.category_key||'good-times')
  let hash=0
  for(let i=0;i<seed.length;i++)hash=((hash<<5)-hash+seed.charCodeAt(i))|0
  const scene=VENUE_SCENES[Math.abs(hash)%VENUE_SCENES.length]
  return \`${'${GT_SCENE_BASE}'}\/${'${scene}'}\`
}
function venueImage(venue) {
  const value=String(venue?.hero_image||'')
  if(!value||GENERIC_VENUE_IMAGE_MARKERS.some(marker=>value.includes(marker)))return stableVenueScene(venue)
  return mediaUrl(value)
}`

if (!source.includes('GENERIC_VENUE_IMAGE_MARKERS')) {
  if (!source.includes(imageBefore)) throw new Error('GOOD TIMES venue-image patch anchor moved')
  source = source.replace(imageBefore, imageAfter)
}

const rawHeroBefore = `const hero=useMemo(()=>events.find(item=>item.is_featured&&item.image_url)||events.find(item=>item.image_url)||null,[events])`
const rawHeroAfter = `const hero=useMemo(()=>{
    const today=todayISO()
    const todayPool=events.filter(item=>item.event_date===today&&item.image_url)
    const weekPool=events.filter(item=>{const away=daysAway(item.event_date);return away>=0&&away<=7&&item.image_url})
    return todayPool.find(item=>item.is_featured)||todayPool[0]||weekPool.find(item=>item.is_featured)||weekPool[0]||events.find(item=>item.is_featured&&item.image_url)||events.find(item=>item.image_url)||null
  },[events])`
const personalizedHeroBefore = `const hero=useMemo(()=>personalizedEvents.find(item=>item.is_featured&&item.image_url)||personalizedEvents.find(item=>item.image_url)||null,[personalizedEvents])`
const personalizedHeroAfter = `const hero=useMemo(()=>{
    const today=todayISO()
    const todayPool=personalizedEvents.filter(item=>item.event_date===today&&item.image_url)
    const weekPool=personalizedEvents.filter(item=>{const away=daysAway(item.event_date);return away>=0&&away<=7&&item.image_url})
    return todayPool.find(item=>item.is_featured)||todayPool[0]||weekPool.find(item=>item.is_featured)||weekPool[0]||personalizedEvents.find(item=>item.is_featured&&item.image_url)||personalizedEvents.find(item=>item.image_url)||null
  },[personalizedEvents])`

if (!source.includes('const todayPool=personalizedEvents.filter') && !source.includes('const todayPool=events.filter')) {
  if (source.includes(personalizedHeroBefore)) source = source.replace(personalizedHeroBefore, personalizedHeroAfter)
  else if (source.includes(rawHeroBefore)) source = source.replace(rawHeroBefore, rawHeroAfter)
  else throw new Error('GOOD TIMES hero-priority patch anchor moved')
}

fs.writeFileSync(target, source)
console.log('Applied GOOD TIMES Now/venue-art polish')
