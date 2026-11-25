const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9+$ ]+/g,' ').replace(/\s+/g,' ').trim()
const contains=(text,terms)=>terms.some(term=>text.includes(term))
const ENTERTAINMENT=[
 'tonight','this weekend','weekend','concert','festival','event','party','parties','nightclub','club ','clubs',
 'bar ','bars','lounge','hookah','comedy','show ','shows','live music','dj ','game ','games','falcons','hawks','braves',
 'atlanta united','dream game','watch party','tailgate','bowling','escape room','vr ','virtual reality','mini golf',
 'theater','theatre','karaoke','open mic','after hours','day party','family event'
]
const PLACES=[
 'restaurant','steakhouse','seafood','sushi','italian','mexican','caribbean','soul food','coffee','cafe','bakery',
 'dessert','hotel','staycation','spa','wellness','shopping','boutique','store ','food ','brunch','lunch','dinner',
 'date night restaurant','rooftop restaurant','late night food','fine dining','black owned restaurant'
]
const BOTH=[' then ',' before ',' after ',' dinner and ',' eat before','eat after','dinner +','food and something','restaurant and ']
export function routeSearchIntent(value){
 const text=' '+normalize(value)+' '
 const both=contains(text,BOTH)
 const entertainment=contains(text,ENTERTAINMENT)
 const places=contains(text,PLACES)
 let mode=both||places&&entertainment?'both':entertainment?'entertainment':places?'places':'both'
 let category=null
 if(/concert|live music|artist|tour/.test(text))category='concerts_live_music'
 else if(/festival|fest\b/.test(text))category='festivals_major_activations'
 else if(/sport|falcons|hawks|braves|united|dream|watch party|game\b/.test(text))category='sports_watch'
 else if(/comedy|stand up|theater|theatre/.test(text))category='comedy_performing_arts'
 else if(/club|nightlife|party|lounge|bar|hookah|after hours/.test(text))category='nightlife'
 else if(/family|kids|children/.test(text))category='family_kids'
 return {mode,category,normalized:normalize(value),time:/tonight/.test(text)?'tonight':/weekend/.test(text)?'weekend':null}
}
