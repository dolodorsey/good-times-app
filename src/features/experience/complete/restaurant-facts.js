/** Public display attributes only. Internal evidence, scores and worker state never cross this boundary. */
export const RESTAURANT_PROFILE_FIELDS='entity_id,service_level,cuisine_tags,occasion_tags,meal_tags,vibe_tags,feature_tags,dietary_tags,ownership_tags,needs_review'
const GROUPS=['cuisine_tags','occasion_tags','meal_tags','vibe_tags','feature_tags','dietary_tags','ownership_tags']
const text=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9 _&+./'’-]{0,59}$/i.test(value.trim())?value.trim():null
function tags(value){return Array.isArray(value)?[...new Set(value.map(text).filter(Boolean).map(x=>x.toLowerCase()))].slice(0,12):[]}
const LABELS={fast_casual:'Fast casual',fine_dining:'Fine dining',quick_service:'Quick service',date_night:'Date night',group_dining:'Group dining',late_night:'Late night',black_owned:'Black-owned',woman_owned:'Woman-owned',women_owned:'Women-owned',lgbtq_owned:'LGBTQ-owned',bbq:'BBQ',vr:'VR'}
export function restaurantLabel(value){const v=text(value);if(!v)return '';return LABELS[v.toLowerCase()]||v.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
export function normalizeRestaurantProfile(row,entityId){
 if(!row||typeof row!=='object'||Array.isArray(row)||typeof entityId!=='string'||typeof row.entity_id!=='string'||row.entity_id.toLowerCase()!==entityId.toLowerCase())return null
 const profile={service_level:text(row.service_level),...Object.fromEntries(GROUPS.map(key=>[key,tags(row[key])])),partial:row.needs_review!==false}
 return profile.service_level||GROUPS.some(key=>profile[key].length)?profile:null
}
/** Compact rows reuse the existing detail fact grid; unknown fields collapse rather than becoming claims. */
export function restaurantFactRows(profile){
 if(!profile||typeof profile!=='object'||Array.isArray(profile))return []
 return [
  ['Service',restaurantLabel(profile.service_level)],
  ['Cuisine',tags(profile.cuisine_tags).map(restaurantLabel).join(' · ')],
  ['Meals',tags(profile.meal_tags).map(restaurantLabel).join(' · ')],
  ['Good for',tags(profile.occasion_tags).map(restaurantLabel).join(' · ')],
  ['Atmosphere',tags(profile.vibe_tags).map(restaurantLabel).join(' · ')],
  ['Features',tags(profile.feature_tags).map(restaurantLabel).join(' · ')],
  ['Dietary options',tags(profile.dietary_tags).map(restaurantLabel).join(' · ')],
  ['Ownership',tags(profile.ownership_tags).map(restaurantLabel).join(' · ')]
 ].filter(([,value])=>value)
}
