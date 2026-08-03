export const CITY_OPTIONS = [
  ['atlanta', 'Atlanta', '🍑'], ['houston', 'Houston', '🤠'],
  ['los_angeles', 'Los Angeles', '🌴'], ['miami', 'Miami', '🌊'],
  ['charlotte', 'Charlotte', '👑'], ['washington_dc', 'Washington DC', '🏛️'],
  ['new_york', 'New York', '🗽'], ['dallas', 'Dallas', '⭐'],
  ['phoenix', 'Phoenix', '🌵'], ['scottsdale', 'Scottsdale', '🏜️'],
  ['las_vegas', 'Las Vegas', '🎰'],
].map(([id, name, emoji]) => ({ id, name, emoji }))

export const VIBE_OPTIONS = [
  ['nightlife', 'Nightlife', '🌙', '#B86BFF'], ['hookah', 'Hookah', '💨', '#D4A853'],
  ['dining', 'Dining', '🍽️', '#FFB86B'], ['drinks', 'Drinks & Bars', '🍸', '#C39BD3'],
  ['music', 'Live Music', '🎵', '#FF6B6B'], ['sports', 'Sports', '🏟️', '#6BFFB8'],
  ['culture', 'Arts & Culture', '🎨', '#C8A96E'], ['dating', 'Date Night', '💫', '#FF69B4'],
  ['wellness', 'Wellness & Spa', '🧘', '#90EE90'], ['adventure', 'Adventure', '🌊', '#00CED1'],
  ['shopping', 'Shopping', '🛍️', '#FFD700'], ['exclusive', 'Exclusive / VIP', '✦', '#D4A853'],
].map(([id, label, icon, color]) => ({ id, label, icon, color }))

export const AGE_OPTIONS = ['18-24', '25-34', '35-44', '45+']
