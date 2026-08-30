const GENERIC_MEDIA=/images\.unsplash\.com|\/good-times-backgrounds\/(?:gt-cat-|event-)/i

function unwrapMediaUrl(value){
  const raw=String(value||'').trim()
  if(!raw)return''
  try{
    const url=new URL(raw,'https://thegoodtimesworldwide.com')
    if(url.pathname==='/api/media'&&url.searchParams.get('url'))return decodeURIComponent(url.searchParams.get('url'))
    return raw
  }catch{return raw}
}

export function mediaFingerprint(value){
  const raw=unwrapMediaUrl(value)
  if(!raw)return''
  try{
    const url=new URL(raw,'https://thegoodtimesworldwide.com')
    url.hash=''
    url.search=''
    return `${url.hostname}${url.pathname}`.replace(/\/+$/,'').toLowerCase()
  }catch{return raw.split('?')[0].split('#')[0].toLowerCase()}
}

function identityText(value){return String(value||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}

function uniqueRows(rows,keyFn){
  const seen=new Set()
  return (rows||[]).filter(row=>{
    const key=keyFn(row)
    if(!key)return true
    if(seen.has(key))return false
    seen.add(key);return true
  })
}

function stripRepeatedMedia(rows,field,seenMedia){
  return (rows||[]).map(row=>{
    const value=row?.[field]
    if(!value)return row
    const fp=mediaFingerprint(value)
    if(!fp)return row
    if(GENERIC_MEDIA.test(unwrapMediaUrl(value))||seenMedia.has(fp)){
      return {...row,[field]:null,image_uniqueness:'fallback_required'}
    }
    seenMedia.add(fp)
    return row
  })
}

export function hardenDisplayInventory(events=[],venues=[]){
  const uniqueEvents=uniqueRows(events,row=>row?.event_key||identityText(`${row?.title}|${row?.event_date}|${row?.venue_name}|${row?.event_time}`))
  const uniqueVenues=uniqueRows(venues,row=>identityText(`${row?.city_key}|${row?.name}`)||row?.id)
  const seenMedia=new Set()
  const hardenedEvents=stripRepeatedMedia(uniqueEvents,'image_url',seenMedia)
  const hardenedVenues=stripRepeatedMedia(uniqueVenues,'hero_image',seenMedia)
  return{events:hardenedEvents,venues:hardenedVenues}
}

export function hardenRecommendationResult(result){
  if(!result)return result
  const hardened=hardenDisplayInventory(result.events||[],result.venues||[])
  return{...result,events:hardened.events,venues:hardened.venues}
}
