import fs from 'node:fs'

const dataPath='api/data.js'
let data=fs.readFileSync(dataPath,'utf8')
if(!data.includes('function safePublicImage'))throw new Error('safePublicImage was not installed in api/data.js')
data=data.replace('image_url:item.image_url,','image_url:safePublicImage(item.image_url),')
data=data.replace('const events=mapShows(rawEvents);if(request.method===\'HEAD\')',"const events=mapShows(rawEvents).map(item=>({...item,image_url:safePublicImage(item.image_url)}));const safeVenues=venues.map(item=>({...item,hero_image:safePublicImage(item.hero_image)}));if(request.method==='HEAD')")
data=data.replace("response.setHeader('X-Good-Times-Venues',String(venues.length))","response.setHeader('X-Good-Times-Venues',String(safeVenues.length))")
data=data.replace('counts:{events:events.length,venues:venues.length},events,venues','counts:{events:events.length,venues:safeVenues.length},events,venues:safeVenues')
if(!data.includes('venues:safeVenues'))throw new Error('api/data.js safe venue transform failed')
fs.writeFileSync(dataPath,data)

const catalogPath='api/catalog.js'
let catalog=fs.readFileSync(catalogPath,'utf8')
if(!catalog.includes('function safePublicImage'))throw new Error('safePublicImage was not installed in api/catalog.js')
if(!catalog.includes('hero_image:safePublicImage(row.hero_image)'))throw new Error('api/catalog.js directory image transform failed')
fs.writeFileSync(catalogPath,catalog)

console.log('Good Times API image safety finalized')
