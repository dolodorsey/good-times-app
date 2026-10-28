/** Deterministic cuisine lanes for Restaurants.
 * Sources, in order: reviewed restaurant profile cuisine_tags, then the venue's own sourced subcategory label
 * (e.g. "afro_caribbean", "thai_restaurant", "Coffee Shops"). Names and descriptions are never used to guess.
 */
export const CUISINE_LABELS = Object.freeze({
  caribbean: 'Caribbean & Afro-Caribbean', soul_southern: 'Soul Food & Southern', american: 'American', seafood: 'Seafood',
  steakhouse: 'Steakhouse', sushi: 'Sushi', japanese: 'Japanese', ramen: 'Ramen', italian: 'Italian', pizza: 'Pizza',
  mexican: 'Mexican & Latin', thai: 'Thai', chinese: 'Chinese', indian: 'Indian', asian: 'Asian', mediterranean: 'Mediterranean & Middle Eastern',
  african: 'African', french: 'French', korean: 'Korean', vietnamese: 'Vietnamese', burgers: 'Burgers', wings_chicken: 'Wings & Chicken',
  sandwiches: 'Sandwiches & Delis', bbq: 'BBQ', vegan: 'Vegan & Plant-Based', halal: 'Halal', brunch: 'Brunch & Breakfast',
  coffee_cafe: 'Coffee, Tea & Cafés', bakery_dessert: 'Bakeries & Desserts', food_hall: 'Food Halls', food_truck: 'Food Trucks',
  late_night: 'Late-Night Eats', fine_dining: 'Fine Dining', tapas_wine: 'Wine Bars & Small Plates', rooftop: 'Rooftop Dining',
})

const RULES = [
  [/afro[ _-]?caribbean|caribbean|jamaican|haitian|trinidad/, 'caribbean'],
  [/soul[ _-]?food|southern|cajun|creole|low[ _-]?country/, 'soul_southern'],
  [/american|brasserie|gastropub|new american|diner/, 'american'],
  [/seafood|oyster|crab|fish/, 'seafood'],
  [/steak/, 'steakhouse'],
  [/sushi|omakase/, 'sushi'],
  [/japanese|izakaya/, 'japanese'],
  [/ramen/, 'ramen'],
  [/italian|trattoria|pasta/, 'italian'],
  [/pizza/, 'pizza'],
  [/mexican|taco|latin|tex[ _-]?mex|peruvian|cuban|colombian/, 'mexican'],
  [/(?:^|[ _-])thai(?:$|[ _-])/, 'thai'],
  [/chinese|dim[ _-]?sum|szechuan|sichuan|cantonese/, 'chinese'],
  [/indian|pakistani|nepal/, 'indian'],
  [/asian|boba/, 'asian'],
  [/mediterranean|greek|lebanese|middle[ _-]?eastern|turkish|persian/, 'mediterranean'],
  [/african|nigerian|ethiopian|ghanaian|senegalese/, 'african'],
  [/french|bistro/, 'french'],
  [/korean/, 'korean'],
  [/vietnam|pho\b/, 'vietnamese'],
  [/burger/, 'burgers'],
  [/(?:^|[ _-])wings?(?:$|[ _-])|chicken/, 'wings_chicken'],
  [/sandwich|\bdeli\b|deli_/, 'sandwiches'],
  [/bbq|barbecue|smokehouse/, 'bbq'],
  [/vegan|plant[ _-]?based/, 'vegan'],
  [/halal/, 'halal'],
  [/brunch|breakfast/, 'brunch'],
  [/coffee|cafe|café|tea\b|tea_|espresso/, 'coffee_cafe'],
  [/bakery|pastr|dessert|ice[ _-]?cream|sweets/, 'bakery_dessert'],
  [/food[ _-]?hall/, 'food_hall'],
  [/food[ _-]?truck/, 'food_truck'],
  [/late[ _-]?night|24[ _-]?hour/, 'late_night'],
  [/fine[ _-]?dining/, 'fine_dining'],
  [/wine|tapas|small[ _-]?plates/, 'tapas_wine'],
  [/rooftop/, 'rooftop'],
]

export function cuisinesFromText(value) {
  const text = String(value || '').toLowerCase()
  if (!text) return []
  return RULES.filter(([pattern]) => pattern.test(text)).map(([, key]) => key)
}

export function restaurantCuisines(row) {
  const fromTags = (Array.isArray(row?.cuisine_tags) ? row.cuisine_tags : []).flatMap(tag => {
    const key = String(tag || '').toLowerCase().trim()
    return CUISINE_LABELS[key] ? [key] : cuisinesFromText(key)
  })
  const fromSource = cuisinesFromText(row?.source_subcategory)
  return [...new Set([...fromTags, ...fromSource])].slice(0, 4)
}
