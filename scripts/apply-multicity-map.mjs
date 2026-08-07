import fs from 'node:fs'

const appUrl=new URL('../src/features/experience/GoodTimesLiveApp.jsx',import.meta.url)
let source=fs.readFileSync(appUrl,'utf8')

const mapHelper=`const CITY_MAP_BBOX={
  atlanta:'-84.62,33.60,-84.15,34.02',
  houston:'-95.80,29.50,-95.05,30.10',
  los_angeles:'-118.70,33.65,-117.90,34.35',
  miami:'-80.45,25.55,-80.05,26.05',
  charlotte:'-81.10,35.05,-80.60,35.40',
  washington_dc:'-77.20,38.75,-76.85,39.05',
  new_york:'-74.25,40.48,-73.68,40.95',
  dallas:'-97.05,32.60,-96.45,33.10',
  phoenix:'-112.35,33.20,-111.75,33.75',
  scottsdale:'-112.10,33.35,-111.70,33.80',
  las_vegas:'-115.45,35.95,-114.90,36.40',
}
function mapEmbedUrl(city){
  const bbox=CITY_MAP_BBOX[city]||CITY_MAP_BBOX.atlanta
  return \`https://www.openstreetmap.org/export/embed.html?bbox=\${encodeURIComponent(bbox)}&layer=mapnik\`
}
`

if(!source.includes('const CITY_MAP_BBOX=')){
  const marker='function buildDateRange(when) {'
  if(!source.includes(marker))throw new Error('GOOD TIMES multi-city map patch could not locate buildDateRange')
  source=source.replace(marker,`${mapHelper}\n${marker}`)
}

const fixedMap='src={mapEmbedUrl(city)}'
if(!source.includes(fixedMap)){
  const atlantaOnly='src="https://www.openstreetmap.org/export/embed.html?bbox=-84.62%2C33.60%2C-84.15%2C34.02&layer=mapnik"'
  if(!source.includes(atlantaOnly))throw new Error('GOOD TIMES multi-city map patch could not locate the Atlanta-only map iframe')
  source=source.replace(atlantaOnly,fixedMap)
}

if(!source.includes('const CITY_MAP_BBOX=')||!source.includes(fixedMap))throw new Error('GOOD TIMES multi-city map patch did not apply')
fs.writeFileSync(appUrl,source)
console.log('GOOD TIMES multi-city map routing applied.')
