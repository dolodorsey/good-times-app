/** Label only; never rewrites destinations or promises actual availability. */
export function restaurantActionLabel(record) {
 const booking=typeof record?.booking_link==='string'?record.booking_link.trim():''
 if(!booking)return 'Official website'
 let url
 try{url=new URL(booking)}catch{return 'Check availability'}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return 'Check availability'
 const host=url.hostname.toLowerCase().replace(/^www\./,''),pathname=url.pathname
 if((host==='resy.com'&&/^\/cities\/[^/]+\/venues\/[^/]+\/?$/.test(pathname))||(host==='opentable.com'&&/^\/r\/[^/]+\/?$/.test(pathname)))return 'Reserve a table'
 if((host==='order.toasttab.com'&&/^\/online\/[^/]+/.test(pathname))||(host==='order.online'&&/^\/store\/[^/]+/.test(pathname))||(host==='toastique.orderexperience.net'&&/^\/[a-f0-9]{24}\/menu\/?$/.test(pathname)))return 'Order online'
 // A venue-hosted menu is an order action only when recorded profile evidence says so.
 const features=record?.restaurant_profile?.feature_tags
 if(Array.isArray(features)&&features.includes('online_ordering')&&/^\/(menu|order|order-online)\/?$/.test(pathname)) {
  try{const site=new URL(record.website);if(['https:','http:'].includes(site.protocol)&&site.hostname.toLowerCase().replace(/^www\./,'')===host&&!site.username&&!site.password)return 'Order online'}catch{}
 }
 return 'Check availability'
}
