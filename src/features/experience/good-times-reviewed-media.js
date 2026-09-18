// Public media from each venue's own website, visually reviewed September 18, 2026.
// Exact canonical IDs + city only. Existing curated media always wins.
export const REVIEWED_VENUE_MEDIA={
 '5de14bcd-991d-4063-87d7-2b79ca93e33a':{city:'atlanta',source:'https://www.heritagesupperclub.com/',image:'https://images.squarespace-cdn.com/content/v1/6980e01eda3afd56a01a10e9/229008c1-696a-45ef-9d86-ee33d207442d/DSC09328.jpeg',kind:'photo'},
 '4d7ac719-3aa7-4d5a-baef-2c4aa39f5024':{city:'atlanta',source:'https://www.sargent-atlanta.com/',image:'https://images.squarespace-cdn.com/content/v1/69bd831155692c11f4af1189/99e63603-95ff-4f41-a358-6142e9babe5a/Flower_Artwork.png',kind:'brand artwork'},
 '0d933960-487b-4677-87d6-845c65382445':{city:'atlanta',source:'https://pataakaatl.com/',image:'https://framerusercontent.com/images/F9vfu5KlnHD9NVd2f062eIrEae8.png',kind:'photo'},
 'c53d8e6e-9b47-4dab-b398-aacbbd3b4753':{city:'atlanta',source:'https://sozouatl.com/',image:'https://sozouatl.com/media/og-outside-chefs.jpg',kind:'photo'},
}
export function withReviewedVenueMedia(venues){return venues.map(venue=>{const media=REVIEWED_VENUE_MEDIA[venue.id];return (!venue.hero_image||/images\.unsplash\.com|\/good-times-backgrounds\/(?:gt-cat-|event-)/i.test(venue.hero_image))&&media&&venue.city_key===media.city?{...venue,hero_image:media.image,hero_image_source:media.source,hero_image_kind:media.kind}:venue})}
// Category variety changes presentation, never the quality ranking within a category.
export function homeHighlights(events,venues){
 const selected=['concerts_live_music','sports_watch','festivals_major_activations'].map(category=>events.filter(event=>event.category_key===category).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date)))[0]).filter(Boolean).map(item=>({type:'event',item}))
 const restaurant=venues.find(venue=>/restaurant|dining|cafe|coffee|bakery|food/.test(venue.category_key||''))
 if(restaurant)selected.push({type:'venue',item:restaurant})
 for(const event of events){if(selected.length>=4)break;if(!selected.some(p=>p.type==='event'&&p.item.event_key===event.event_key))selected.push({type:'event',item:event})}
 return selected
}
