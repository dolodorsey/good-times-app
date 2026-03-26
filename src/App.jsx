import { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   GOOD TIMES CONCIERGE — v2 SURGICAL UPDATE
   Changes:
   1. Today/Tonight/This Week show DIFFERENT filtered events
   2. Prices REMOVED from all entries
   3. Team logos upgraded to ESPN CDN
   4. Toolbar always visible (position:fixed)
   5. Gentleman's Club REMOVED from Vibe browse
   6. UNIQUE background images per browse card
   7. Explore subcategory → top-rated list + star ratings
   8. Deals section in Vault (subscription-gated, enticing)
   ═══════════════════════════════════════════════════════ */

const C = {
  bg:"#06060C",bgCard:"#22223A",bgSheet:"#1E1E32",
  gold:"#D4A853",goldDim:"rgba(212,168,83,0.35)",
  text:"#FFFFFF",textSec:"#E8E8E8",muted:"#C0C0C0",
  a3:"#6BB8FF",a4:"#FFB86B",overlay:"rgba(6,6,12,0.88)"
};
const F={f:"'DM Sans',sans-serif",s:"'Playfair Display',Georgia,serif"};
const V=a=>({background:a?`linear-gradient(135deg,${C.gold},#B8942F)`:"rgba(255,255,255,0.15)",color:a?"#0A0A0F":"#fff",border:a?"none":"1px solid rgba(255,255,255,0.6)",borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F.f,letterSpacing:.3,transition:"all 0.25s ease"});
const K={background:C.bgCard,border:`1px solid rgba(255,255,255,0.4)`,borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.3)"};

// Supabase
const SB="https://czocqfaovfpjweayniuw.supabase.co/rest/v1";
const SK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NxZmFvdmZwandlYXluaXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzEzODAsImV4cCI6MjA4Mzk0NzM4MH0.6-3rmA9tZXHLVg5N6a_82rKA9Kvrj4gRrUUiSczovho";
const sbF=async q=>{try{const r=await fetch(`${SB}/${q}`,{headers:{apikey:SK,Authorization:`Bearer ${SK}`}});return r.ok?await r.json():[]}catch{return[]}};
// KHG Supabase (gt_venues — real venue data for Explore)
const KHG_SB="https://dzlmtvodpyhetvektfuo.supabase.co/rest/v1";
const KHG_SK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bG10dm9kcHloZXR2ZWt0ZnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODQ4NjQsImV4cCI6MjA4NTE2MDg2NH0.qmnWB4aWdb7U8Iod9Hv8PQAOJO3AG0vYEGnPS--kfAo";
const khgF=async q=>{try{const r=await fetch(`${KHG_SB}/${q}`,{headers:{apikey:KHG_SK,Authorization:`Bearer ${KHG_SK}`}});return r.ok?await r.json():[]}catch{return[]}};
// Map explore categories → gt_venues category_keys
const CAT_MAP={
  dining:["restaurant","food_and_dining","brunch","food_hall","food_truck"],
  nightlife:["nightclub","lounge","hookah","day_party","pool_party"],
  music:["jazz","entertainment"],
  sports:["sports_bar"],
  culture:["culture","special_events"],
  wellness:["spa","wellness","fitness","gym"],
  adventure:["outdoor_adventures","experiences"],
  shopping:["shopping"],
  movies:["comedy","entertainment"],
  gaming:["entertainment"],
  drinks:["bar","wine_bar","speakeasy","coffee","rooftop"],
  exclusive:["event_venue","event_creative","special_events"],
  family:["experiences","outdoor_adventures"],
  dating:["rooftop","lounge","restaurant","speakeasy"],
  cosmetic:["beauty","services"],
  networking:["event_venue","event_creative"]
};

// Images — NO DUPLICATES across sections. Each pool is unique.
const Ne={
  hero:"https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=900",
  // Trending carousel images (nightlife/party vibes)
  v:["https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600","https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600","https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600","https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600","https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600","https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600","https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600","https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900"],
  // Explore category images — UNIQUE from trending & browse
  ex:{nightlife:"https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=400",sports:"https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",wellness:"https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400",dining:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",music:"https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",culture:"https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400",adventure:"https://images.unsplash.com/photo-1551632811-561732d1e306?w=400",shopping:"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400",movies:"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400",gaming:"https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400",drinks:"https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400",exclusive:"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",family:"https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=400",dating:"https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400",cosmetic:"https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",networking:"https://images.unsplash.com/photo-1515169067868-5387ec356754?w=400"},
  // Browse images — DIFFERENT from explore
  br:{jki:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400",nl:"https://images.unsplash.com/photo-1545128485-c400e7702796?w=400",lm:"https://images.unsplash.com/photo-1501612780327-45045538702b?w=400",sp:"https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",ms:"https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400",gm:"https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400"},
  city:{
    Atlanta:{day:"/city-atlanta.png",night:"/city-atlanta.png"},
    Houston:{day:"https://images.unsplash.com/photo-1530089711124-9ca31fb9e863?w=900",night:"https://images.unsplash.com/photo-1548260465-1adda34ebbe7?w=900"},
    "Los Angeles":{day:"https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=900",night:"https://images.unsplash.com/photo-1515896769750-31548aa180ed?w=900"},
    Charlotte:{day:"https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=900",night:"https://images.unsplash.com/photo-1605885996758-49b3e33c612d?w=900"},
    Washington:{day:"https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=900",night:"https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=900"},
    Miami:{day:"https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=900",night:"https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=900"},
    "Las Vegas":{day:"https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=900",night:"https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=900"}
  }
};

const gt={REMIX:{c:"#FF6B6B"},"TASTE OF ART":{c:"#E8A0BF"},NOIR:{c:"#D4A853"},"WRST BHVR":{c:"#FFD700"},PAPARAZZI:{c:"#FF69B4"},"GANGSTA GOSPEL":{c:"#9B59B6"},"SUNDAY'S BEST":{c:"#87CEEB"},PAWCHELLA:{c:"#90EE90"},"BEAUTY & THE BEAST":{c:"#FFD700"},"BLACK BALL":{c:"#888"},"SNOW BALL":{c:"#A8D8FF"},"NO SECTIONS PARTY":{c:"#FF6B6B"},"MONSTER'S BALL":{c:"#8B0000"},"NAPKIN WARS":{c:"#FFB86B"},"FOREVER FUTBOL":{c:"#00A651"},"THE KULTURE":{c:"#B86BFF"},"UNDERGROUND KING":{c:"#D4A853"},STELLA:{c:"#E8A0BF"},CRVNGS:{c:"#FFB86B"},"PARKING LOT PIMPIN":{c:"#FF6B6B"},"WINTER WONDERLAND":{c:"#A8D8FF"},"SHUT UP & DANCE":{c:"#FF69B4"},"SECRET SOCIETY":{c:"#D4A853"},"SOUL SESSIONS":{c:"#9B59B6"},"BLOCK PARTY":{c:"#6BFFB8"},HUGLIFE:{c:"#FF6B6B"},"FOOD TRUCK FESTIVAL":{c:"#FFB86B"}};

const wn=e=>{
  // Priority: 1) DB image_url  2) Legacy image_url  3) City-appropriate Gemini image
  if(e?.image_url) return e.image_url;
  // For events without images, use the city Gemini images (these are real ATL scenes, not random stock)
  const cityFallbacks=["/city-atlanta.png","/city-atlanta-night.png"];
  // Use a hash of the event id/title to pick consistently but differently per event
  const hash=(e?.title||e?.id||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  return cityFallbacks[hash%cityFallbacks.length]||Ne.hero;
};

// Cities/Teams — REAL LOGOS via ESPN CDN
const Ri=[
  {id:"atlanta",name:"Atlanta",lat:33.749,lng:-84.388,teams:[{n:"Hawks",s:"NBA",logo:"https://a.espncdn.com/i/teamlogos/nba/500/atl.png",url:"https://www.nba.com/hawks/schedule"},{n:"Falcons",s:"NFL",logo:"https://a.espncdn.com/i/teamlogos/nfl/500/atl.png",url:"https://www.atlantafalcons.com/schedule/"},{n:"Braves",s:"MLB",logo:"https://a.espncdn.com/i/teamlogos/mlb/500/atl.png",url:"https://www.mlb.com/braves/schedule"},{n:"United",s:"MLS",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/18512.png",url:"https://www.atlutd.com/schedule"}]},
  {id:"houston",name:"Houston",lat:29.76,lng:-95.37,teams:[{n:"Rockets",s:"NBA",logo:"https://a.espncdn.com/i/teamlogos/nba/500/hou.png",url:"https://www.nba.com/rockets/schedule"},{n:"Texans",s:"NFL",logo:"https://a.espncdn.com/i/teamlogos/nfl/500/hou.png",url:"https://www.houstontexans.com/schedule/"},{n:"Astros",s:"MLB",logo:"https://a.espncdn.com/i/teamlogos/mlb/500/hou.png",url:"https://www.mlb.com/astros/schedule"},{n:"Dynamo",s:"MLS",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/18516.png",url:"https://www.houstondynamo.com/schedule"}]},
  {id:"los-angeles",name:"Los Angeles",lat:34.052,lng:-118.243,teams:[{n:"Lakers",s:"NBA",logo:"https://a.espncdn.com/i/teamlogos/nba/500/lal.png",url:"https://www.nba.com/lakers/schedule"},{n:"Rams",s:"NFL",logo:"https://a.espncdn.com/i/teamlogos/nfl/500/lar.png",url:"https://www.therams.com/schedule/"},{n:"Dodgers",s:"MLB",logo:"https://a.espncdn.com/i/teamlogos/mlb/500/lad.png",url:"https://www.mlb.com/dodgers/schedule"},{n:"LAFC",s:"MLS",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/18524.png",url:"https://www.lafc.com/schedule"}]},
  {id:"charlotte",name:"Charlotte",lat:35.227,lng:-80.843,teams:[{n:"Hornets",s:"NBA",logo:"https://a.espncdn.com/i/teamlogos/nba/500/cha.png",url:"https://www.nba.com/hornets/schedule"},{n:"Panthers",s:"NFL",logo:"https://a.espncdn.com/i/teamlogos/nfl/500/car.png",url:"https://www.panthers.com/schedule/"}]},
  {id:"washington",name:"Washington",lat:38.907,lng:-77.037,teams:[{n:"Wizards",s:"NBA",logo:"https://a.espncdn.com/i/teamlogos/nba/500/wsh.png",url:"https://www.nba.com/wizards/schedule"},{n:"Commanders",s:"NFL",logo:"https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png",url:"https://www.commanders.com/schedule/"},{n:"Nationals",s:"MLB",logo:"https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png",url:"https://www.mlb.com/nationals/schedule"}]},
  {id:"miami",name:"Miami",lat:25.761,lng:-80.192,teams:[{n:"Heat",s:"NBA",logo:"https://a.espncdn.com/i/teamlogos/nba/500/mia.png",url:"https://www.nba.com/heat/schedule"},{n:"Dolphins",s:"NFL",logo:"https://a.espncdn.com/i/teamlogos/nfl/500/mia.png",url:"https://www.miamidolphins.com/schedule/"},{n:"Inter Miami",s:"MLS",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/19044.png",url:"https://www.intermiamicf.com/schedule"}]},
  {id:"las-vegas",name:"Las Vegas",lat:36.17,lng:-115.14,teams:[{n:"Aces",s:"WNBA",logo:"https://a.espncdn.com/i/teamlogos/wnba/500/lva.png",url:"https://aces.wnba.com/schedule/"},{n:"Raiders",s:"NFL",logo:"https://a.espncdn.com/i/teamlogos/nfl/500/lv.png",url:"https://www.raiders.com/schedule/"},{n:"Golden Knights",s:"NHL",logo:"https://a.espncdn.com/i/teamlogos/nhl/500/vgk.png",url:"https://www.nhl.com/goldenknights/schedule"}]}
];

// Sponsors
const $u=[
  {brand:"GOODFELLAS PIZZA",line:"Pizza with a side of loyalty.",color:"#FF6B6B",sub:"CASPER GROUP",cta:"Order",img:"/brands/goodfellas-alt.png",logo:"/brands/goodfellas.png"},
  {brand:"MIND STUDIO",line:"Mental health. Reimagined.",color:"#9B59B6",sub:"KHG",cta:"Book",img:"/brands/mind-studio.png",logo:"/brands/mind-studio-alt.png"},
  {brand:"ON CALL",line:"24/7 Emergency Services.",color:"#FFB86B",sub:"KHG APPS",cta:"Download",img:"/brands/on-call.png"},
  {brand:"UMBRELLA GROUP",line:"Full-service creative agency.",color:"#D4A853",sub:"KHG",cta:"Learn More",img:"/brands/umbrella-group.png"},
  {brand:"HURT 1800 911",line:"Injured? We fight for you.",color:"#C0392B",sub:"UMBRELLA GROUP",cta:"Call Now",img:"/brands/hurt-1800.png"},
  {brand:"S.O.S",line:"Safety. On. Speed-dial.",color:"#E74C3C",sub:"KHG APPS",cta:"Download",img:"/brands/sos.png"},
  {brand:"CASPER GROUP",line:"Hospitality. Reimagined.",color:"#D4A853",sub:"KHG",cta:"Explore",img:"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600"},
  {brand:"FOREVER FUTBOL",line:"The beautiful game. Elevated.",color:"#00A651",sub:"KHG MUSEUMS",cta:"Experience",img:"https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600"},
  {brand:"ANGEL WINGS",line:"Wings so good, they're sinful.",color:"#FF6B6B",sub:"CASPER GROUP",cta:"Order Now",img:"https://images.unsplash.com/photo-1608039829572-25e8658a7289?w=600"},
  {brand:"PASTA BISH",line:"Pasta with attitude.",color:"#FFB86B",sub:"CASPER GROUP",cta:"View Menu",img:"https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600"},
  {brand:"INFINITY WATER",line:"Hydrate different.",color:"#4FC3F7",sub:"BODEGEA",cta:"Shop Now",img:"https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600"},
  {brand:"PRONTO ENERGY",line:"Energy. Instantly.",color:"#C0392B",sub:"BODEGEA",cta:"Try It",img:"https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600"},
  {brand:"ESPRESSO CO",line:"Your morning ritual.",color:"#795548",sub:"CASPER GROUP",cta:"Brew",img:"https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600"},
  {brand:"NOIR",line:"Espresso Liqueur. After dark.",color:"#D4A853",sub:"BODEGEA",cta:"Sip Now",img:"https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600"},
  {brand:"THE BRAND STUDIO",line:"Your brand. Elevated.",color:"#B0BEC5",sub:"UMBRELLA GROUP",cta:"Book",img:"https://images.unsplash.com/photo-1497366216548-37526070297c?w=600"}
];
let adI=0;
const nextAd=()=>{const a=$u[adI%$u.length];adI++;return a};

// Explore categories
const Vu=[
  {id:"dining",name:"Dining",icon:"\u{1F37D}\uFE0F",color:"#FFB86B",subs:["Fine Dining","Brunch","Late Night Eats","Seafood","Soul Food","Steakhouses","Food Halls","Sushi","BBQ","Pizza","Vegan","Taco Spots"]},
  {id:"nightlife",name:"Nightlife",icon:"\u{1F319}",color:"#B86BFF",subs:["Clubs","Lounges","Rooftops","Hookah","Day Parties","Pool Parties","Afterhours","Speakeasies","Dive Bars","Wine Bars"]},
  {id:"music",name:"Live Music",icon:"\u{1F3B5}",color:"#FF6B6B",subs:["Concerts","Jazz","R&B/Soul","Hip Hop","Afrobeats","Gospel","Open Mic","DJ Sets","Festivals","Karaoke"]},
  {id:"sports",name:"Sports",icon:"\u{1F3DF}\uFE0F",color:"#6BFFB8",subs:["Game Day Watch","Basketball","Football","Soccer","Baseball","Boxing/MMA","Golf","Sports Bars","Fan Zones"]},
  {id:"culture",name:"Culture",icon:"\u{1F3A8}",color:"#E8A0BF",subs:["Art Galleries","Museums","Pop-Ups","Film Screenings","Poetry","Comedy Shows","Theater","Fashion Shows"]},
  {id:"wellness",name:"Wellness",icon:"\u{1F9D8}",color:"#90EE90",subs:["Spas","Yoga","Sound Baths","Meditation","Fitness","Recovery","Saunas"]},
  {id:"adventure",name:"Adventure",icon:"\u{1F30A}",color:"#6BB8FF",subs:["Outdoor Activities","Hiking","Beach Days","Water Sports","Escape Rooms","Go Karts","Axe Throwing"]},
  {id:"shopping",name:"Shopping",icon:"\u{1F6CD}\uFE0F",color:"#FFD700",subs:["Boutiques","Vintage","Sneaker Shops","Markets","Luxury","Streetwear","Thrift"]},
  {id:"movies",name:"Movies & Shows",icon:"\u{1F3AC}",color:"#FF69B4",subs:["Movie Theaters","Drive-Ins","Film Festivals","Stand-Up","Improv","Drag Shows"]},
  {id:"gaming",name:"Gaming",icon:"\u{1F3AE}",color:"#00CED1",subs:["Arcades","VR","Board Game Cafes","Bowling","Mini Golf","Laser Tag","Trivia"]},
  {id:"drinks",name:"Drinks",icon:"\u{1F378}",color:"#C39BD3",subs:["Cocktail Bars","Breweries","Wine Tastings","Coffee Shops","Juice Bars","Happy Hours"]},
  {id:"exclusive",name:"Exclusive",icon:"\u2726",color:"#D4A853",subs:["Members Only","Private Events","Galas","Invite-Only","VIP","Yacht Parties"]},
  {id:"family",name:"Family",icon:"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}",color:"#87CEEB",subs:["Kid-Friendly","Amusement Parks","Zoos","Aquariums","Science Centers"]},
  {id:"dating",name:"Date Night",icon:"\u{1F4AB}",color:"#FF6B6B",subs:["Romantic Dinner","Sunset Spots","Couples Activities","Wine & Paint","Dancing","Scenic Views"]},
  {id:"cosmetic",name:"Cosmetic",icon:"\u{1F484}",color:"#FF69B4",subs:["Med Spas","Lash Studios","Hair Salons","Nail Bars","Skincare","Barbershops","Tattoo Studios"]},
  {id:"networking",name:"Networking",icon:"\u{1F91D}",color:"#6BFFB8",subs:["Mixers","Industry Events","Co-Working","Pitch Nights","Conferences","Workshops"]}
];

// CHANGE #5: Vibe browse — Gentleman's Club REMOVED
const Gu=[
  {id:"jki",name:"Just Kick It",icon:"\u{1F525}",color:"#FF6B6B",d:"Catch a vibe",subs:["Lounges","Rooftops","Hookah","Sports Bars","Patios","Day Parties","Pool Parties"]},
  {id:"nl",name:"Nightlife",icon:"\u{1F319}",color:"#B86BFF",d:"After dark",subs:["Clubs","Speakeasies","Afterhours","VIP Sections","Bottle Service","Late Night"]},
  {id:"lm",name:"Live Music",icon:"\u{1F3A4}",color:"#FFB86B",d:"Feel the sound",subs:["Concerts","Jazz Clubs","Open Mic","DJ Sets","Festivals","Karaoke"]},
  {id:"sp",name:"Sports",icon:"\u{1F3C0}",color:"#6BFFB8",d:"Game on",subs:["Watch Parties","Game Day","Fan Zones","Sports Bars","Tailgates"]},
  {id:"ms",name:"Movies & Shows",icon:"\u{1F3AC}",color:"#FF69B4",d:"Screen time",subs:["Theaters","Drive-Ins","Comedy","Improv","Film Screenings"]},
  {id:"gm",name:"Gaming",icon:"\u{1F3AE}",color:"#00CED1",d:"Level up",subs:["Arcades","VR","Board Games","Bowling","Mini Golf","Trivia"]}
];

// Plan For Me questions
const kn=[
  {id:"mood",q:"What's the mood?",sub:"Set the tone for tonight",multi:false,opts:[{id:"chill",l:"Chill",i:"\u{1F33F}",c:"#90EE90",d:"Low-key vibes",bg:"https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400"},{id:"turnt",l:"Turn Up",i:"\u{1F525}",c:"#FF6B6B",d:"Maximum energy",bg:"https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400"},{id:"date",l:"Date Night",i:"\u{1F320}",c:"#E8A0BF",d:"Intimate & beautiful",bg:"https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400"},{id:"bougie",l:"Bougie",i:"\u{1F48E}",c:"#D4A853",d:"Luxury everything",bg:"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400"},{id:"family",l:"Family",i:"\u{1F46A}",c:"#87CEEB",d:"Fun for everyone",bg:"https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=400"},{id:"explore",l:"Explore",i:"\u{2728}",c:"#6BB8FF",d:"New experiences",bg:"https://i.pinimg.com/736x/4f/9c/be/4f9cbe094650bc8e3d2347914e751961.jpg"}]},
  {id:"group",q:"Who's coming?",sub:"How many in your crew",multi:false,opts:[{id:"solo",l:"Just Me",i:"\u{1F9D1}",c:"#6BB8FF"},{id:"duo",l:"Me + 1",i:"\u{1F46B}",c:"#E8A0BF"},{id:"crew",l:"The Crew",i:"\u{1F46F}",c:"#FFB86B",d:"3-8 people"},{id:"mob",l:"Big Group",i:"\u{1F389}",c:"#FF6B6B",d:"8+ deep"}]},
  {id:"budget",q:"Budget vibe?",sub:"Per person for the night",multi:false,opts:[{id:"low",l:"Under $50",i:"\u{1F4B5}",c:"#6BFFB8"},{id:"mid",l:"$50\u2013150",i:"\u{1F4B3}",c:"#FFB86B"},{id:"high",l:"$150\u2013300",i:"\u{1F48E}",c:"#D4A853"},{id:"unlimited",l:"No Limit",i:"\u{1F451}",c:"#FF6B6B"}]},
  {id:"time",q:"What time?",sub:"When does it start",multi:false,opts:[{id:"afternoon",l:"Afternoon",i:"\u2600\uFE0F",c:"#FFB86B",d:"12-5pm"},{id:"evening",l:"Evening",i:"\u{1F305}",c:"#E8A0BF",d:"5-9pm"},{id:"night",l:"Night",i:"\u{1F319}",c:"#B86BFF",d:"9pm-12am"},{id:"latenight",l:"Late Night",i:"\u{1F30C}",c:"#6BB8FF",d:"After midnight"}]},
  {id:"vibes",q:"Pick your vibes",sub:"Select all that apply",multi:true,opts:[{id:"music",l:"Live Music",i:"\u{1F3B5}",c:"#FF6B6B"},{id:"food",l:"Great Food",i:"\u{1F37D}\uFE0F",c:"#FFB86B"},{id:"drinks",l:"Cocktails",i:"\u{1F378}",c:"#C39BD3"},{id:"dancing",l:"Dancing",i:"\u{1F57A}",c:"#FF69B4"}]}
];

// CHANGE #8: Deals data for Vault
const dealsData=[
  {id:"d1",title:"2-for-1 Bottle Service",venue:"Opium Nightclub",desc:"Every Thursday before midnight",savings:"Save $200+",cat:"Nightlife",img:"/venues/opium.jpg"},
  {id:"d2",title:"50% Off Tasting Menu",venue:"STK Atlanta",desc:"Mon-Wed 5-course chef selection",savings:"Save $85",cat:"Dining",img:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400"},
  {id:"d3",title:"Free Entry Before 11pm",venue:"Revel ATL",desc:"RSVP on Good Times for free entry",savings:"Save $45",cat:"Nightlife",img:"/venues/revel.webp"},
  {id:"d4",title:"VIP Table Upgrade",venue:"Opium Nightclub",desc:"Book GA get VIP section free",savings:"Save $500+",cat:"Events",img:"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400"},
  {id:"d5",title:"Day Pass + Mimosas",venue:"Spa at Mandarin Oriental",desc:"Full spa day with unlimited mimosas",savings:"Save $120",cat:"Wellness",img:"https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400"},
  {id:"d6",title:"Brunch for 2 Special",venue:"South City Kitchen",desc:"Brunch entrees + bottomless cocktails",savings:"Save $60",cat:"Dining",img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400"},
  {id:"d7",title:"Hawks Game Day Bundle",venue:"State Farm Arena",desc:"Tickets + parking + concession credits",savings:"Best value",cat:"Sports",img:"https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400"},
  {id:"d8",title:"Late Night Happy Hour",venue:"Whiskey Blue at W Hotel",desc:"Half-price cocktails 10pm-12am",savings:"Save $40+",cat:"Drinks",img:"https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400"}
];

// ═══ COMPONENTS ═══

const SectionHead=({t,icon,color,action})=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:14}}>{icon}</span>
      <span style={{fontSize:11,letterSpacing:2.5,color:color||C.gold,fontWeight:700}}>{t}</span>
    </div>
    {action&&<button onClick={action.fn} style={{...V(false),padding:"5px 12px",fontSize:11}}>{action.l}</button>}
  </div>
);

// Sponsor Banner
const SponsorBanner=({style:st})=>{
  const ad=nextAd();
  return(
    <div style={{borderRadius:22,overflow:"hidden",position:"relative",height:160,...st}}>
      <img src={ad.img} alt="" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(1.0)"}} loading="lazy"/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,0.02) 0%,rgba(0,0,0,0.45) 100%)"}}/>
      <div style={{position:"absolute",inset:0,padding:"18px 20px",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
        <div style={{fontSize:9,letterSpacing:3,color:"#FFFFFF",fontWeight:600,marginBottom:4}}>{ad.sub}</div>
        <div style={{fontSize:22,fontWeight:700,color:C.text,fontFamily:F.s,marginBottom:3}}>{ad.brand}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
          <div style={{fontSize:14,color:"#FFFFFF",fontStyle:"italic"}}>{ad.line}</div>
          <button style={{padding:"8px 18px",borderRadius:99,background:ad.color,color:"#0A0A0F",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:F.f}}>{ad.cta}</button>
        </div>
      </div>
    </div>
  );
};

// Event grid card — compact square tile with prominent image
const EventTile=({e:S,onClick:A,wide})=>{
  const g=gt[S.brand]?.c||C.gold;
  const dt=S.date?new Date(S.date+"T12:00:00"):null;
  return(
    <button onClick={A} style={{...K,width:"100%",padding:0,cursor:"pointer",textAlign:"left",fontFamily:F.f,overflow:"hidden",borderRadius:12,position:"relative",gridColumn:wide?"1 / -1":undefined,border:`1px solid ${g}25`,boxShadow:`0 2px 12px rgba(0,0,0,0.3), inset 0 0 0 1px ${g}30`}}>
      <div style={{height:wide?130:90,position:"relative",overflow:"hidden"}}>
        <img src={wn(S)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",}} loading="lazy"/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(6,6,12,0) 65%,rgba(6,6,12,0.5) 100%)"}}/>
        <div style={{position:"absolute",top:6,left:6,display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:5,height:5,borderRadius:99,background:g,boxShadow:`0 0 6px ${g}`}}/>
          <span style={{fontSize:9,color:g,fontWeight:700,textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>{S.brand}</span>
        </div>
        <div style={{position:"absolute",bottom:6,left:8,right:8,textShadow:"0 1px 4px rgba(0,0,0,0.8),0 0 12px rgba(0,0,0,0.5)"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textShadow:"0 1px 4px rgba(0,0,0,0.7)"}}>{S.title}</div>
          {dt&&<div style={{fontSize:9,color:"#FFFFFF",marginTop:2}}>{dt.toLocaleDateString("en-US",{month:"short",day:"numeric"})}{" \u00B7 "}{S.time||"TBA"}</div>}
        </div>
      </div>
    </button>
  );
};

// Balanced grid wrapper — ensures even rows, last odd item goes full-width
const EventGrid=({items,onSelect,max})=>{
  const list=items.slice(0,max||items.length);
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {list.map((e,i)=>(
        <EventTile key={e.id} e={e} onClick={()=>onSelect(e)} wide={list.length%2!==0&&i===list.length-1}/>
      ))}
    </div>
  );
};

// Horizontal scroll card (for featured/upcoming carousels)
const EventRow=({e:S,onClick:A})=>{
  const g=gt[S.brand]?.c||C.gold;
  const dt=S.date?new Date(S.date+"T12:00:00"):null;
  return(
    <button onClick={A} style={{...K,width:"100%",padding:0,cursor:"pointer",textAlign:"left",fontFamily:F.f,display:"flex",gap:10,alignItems:"stretch",overflow:"hidden",borderRadius:10,marginBottom:6,height:68}}>
      <div style={{width:68,height:68,flexShrink:0,position:"relative",overflow:"hidden"}}>
        <img src={wn(S)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",}} loading="lazy"/>
      </div>
      <div style={{flex:1,padding:"8px 0",minWidth:0,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{S.title}</div>
        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
          <div style={{width:5,height:5,borderRadius:99,background:g}}/>
          <span style={{fontSize:11,color:g,fontWeight:600}}>{S.brand}</span>
          {dt&&<span style={{fontSize:11,color:C.textSec}}>{"\u00B7 "}{dt.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
        </div>
        <div style={{fontSize:11,color:C.textSec,marginTop:1}}>{S.time||"TBA"}{" \u00B7 "}{S.venue||S.city}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",padding:"0 12px",flexShrink:0}}>
        <div style={{fontSize:16,color:C.muted}}>{"\u203A"}</div>
      </div>
    </button>
  );
};

// CHANGE #2: Featured card — NO PRICE badge
const EventCard=({e:S,compact:cmp,onClick:g})=>{
  const clr=gt[S.brand]?.c||C.gold;
  const dt=S.date?new Date(S.date+"T12:00:00"):null;
  return(
    <button onClick={g} style={{...K,width:cmp?180:"100%",flexShrink:0,cursor:"pointer",overflow:"hidden",padding:0,textAlign:"left",fontFamily:F.f,transition:"transform 0.2s",borderRadius:10}}>
      <div style={{height:cmp?90:120,position:"relative",overflow:"hidden"}}>
        <img src={wn(S)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",}} loading="lazy"/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(6,6,12,0) 65%,rgba(6,6,12,0.5) 100%)"}}/>
        {/* CHANGE #2: Price badge REMOVED */}
        <div style={{position:"absolute",top:8,left:8,width:6,height:6,borderRadius:99,background:clr,boxShadow:`0 0 8px ${clr}`}}/>
      </div>
      <div style={{padding:cmp?"8px 10px":"10px 14px"}}>
        <div style={{fontSize:cmp?12:14,fontWeight:700,color:C.text,marginBottom:3,lineHeight:1.25}}>{S.title}</div>
        <div style={{fontSize:11,color:clr,fontWeight:600,marginBottom:2}}>{S.brand}</div>
        {dt&&<div style={{fontSize:11,color:C.textSec}}>{dt.toLocaleDateString("en-US",{month:"short",day:"numeric"})}{" \u00B7 "}{S.city}</div>}
      </div>
    </button>
  );
};

// Star rating component (for CHANGE #7)
const StarRating=({rating,onRate,size=16})=>{
  return(
    <div style={{display:"flex",gap:2}}>
      {[1,2,3,4,5].map(i=>(
        <button key={i} onClick={()=>onRate?.(i)} style={{background:"none",border:"none",cursor:onRate?"pointer":"default",padding:0,fontSize:size,color:i<=rating?C.gold:C.muted,transition:"color 0.2s"}}>{i<=rating?"\u2605":"\u2606"}</button>
      ))}
    </div>
  );
};

// Scroll container
const ScrollWrap=({children})=>(
  <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.f,position:"relative",overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:90,color:C.text}}>
    <div style={{position:"relative",zIndex:10}}>{children}</div>
  </div>
);

// ═══ MAIN APP ═══
export default function GoodTimesApp(){
  const[screen,setScreen]=useState("now");
  const[prevScreen,setPrev]=useState("now");
  const[navScreen,setNav]=useState("now");
  const[city,setCity]=useState(Ri[0]);
  const[events,setEvents]=useState([]);
  const[loading,setLoading]=useState(true);
  const[detail,setDetail]=useState(null);
  const[realm,setRealm]=useState("tonight");
  const[nowCat,setNowCat]=useState("all");
  const[teamSheet,setTeamSheet]=useState(null);
  const[toast,setToast]=useState(null);
  const[saved,setSaved]=useState([]);
  const[search,setSearch]=useState("");
  const[searchOpen,setSearchOpen]=useState(false);
  const[vaultTab,setVaultTab]=useState("saved");
  const[exploreSheet,setExploreSheet]=useState(null);
  const[vibeSheet,setVibeSheet]=useState(null);
  // CHANGE #7: subcategory drilldown state
  const[subCatView,setSubCatView]=useState(null);
  const[subRatings,setSubRatings]=useState({});
  const[venueLoading,setVenueLoading]=useState(false);
  const[venueResults,setVenueResults]=useState([]);
  // CHANGE #8: subscription state
  const[isSubscribed,setIsSubscribed]=useState(false);
  // Plan states
  const[planStops,setPlanStops]=useState([null,null,null]);
  const[planPickSlot,setPlanPickSlot]=useState(null);
  const[inviteOpen,setInviteOpen]=useState(false);
  // Plan For Me states
  const[planStep,setPlanStep]=useState(0);
  const[planChoices,setPlanChoices]=useState({});
  const[planVibes,setPlanVibes]=useState([]);
  const[planLoading,setPlanLoading]=useState(false);
  const[planResult,setPlanResult]=useState(null);
  // Calendar
  const now=new Date();
  const[calMonth,setCalMonth]=useState(now.getMonth());
  const[calYear,setCalYear]=useState(now.getFullYear());
  const[calMode,setCalMode]=useState("month");
  const[calCityFilter,setCalCityFilter]=useState("all");
  const[calCatFilter,setCalCatFilter]=useState("all");
  // Social
  const[connectedSocials,setConnectedSocials]=useState([]);
  // Saved plans
  const[lockedPlans,setLockedPlans]=useState([]);

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2000)};

  // Load events — ALL 3 TIERS of data
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const today=new Date().toISOString().split("T")[0];
      const dayNames=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      const todayDay=dayNames[new Date().getDay()];

      // TIER 1: Our events from eventbrite_events
      const real=await khgF("eventbrite_events?select=id,event_name,brand_key,event_date,city,is_active,eventbrite_url,event_type,event_time,display_priority,image_url&is_active=eq.true&event_date=gte."+today+"&order=display_priority.asc,event_date.asc&limit=100");

      // TIER 2a: In-house entertainment database (concerts, comedy, plays, festivals)
      const shows=await khgF("gt_shows?select=id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,image_url,status,display_priority,is_featured&show_date=gte."+today+"&status=in.(confirmed,tentative)&order=display_priority.asc,show_date.asc&limit=200");

      // TIER 2a-legacy: Old scraped city events (will phase out as gt_shows grows)
      const cityEvts=await khgF("gt_city_events?select=id,event_name,city_key,event_type,venue_name,start_date,start_time,ticket_url,organizer,image_url,is_free&start_date=gte."+today+"&status=in.(active,confirmed)&order=start_date.asc&limit=200");

      // TIER 2d: Blog/influencer sourced daily events (curated city happenings)
      const dailyEvts=await khgF("gt_daily_events?select=id,event_name,city_key,event_date,day_of_week,venue,event_type,time_slot,description,source_handle,is_free,vibe_tags,relevance_score,is_verified&event_date=gte."+today+"&is_verified=eq.true&order=event_date.asc,relevance_score.desc&limit=200");

      // TIER 2b: Weekly venue happenings (tonight's programming) — with venue details
      const happenings=await khgF("gt_venue_happenings?select=id,venue_id,city_key,day_of_week,happening_name,happening_type,time_slot,start_time,description,priority_score&is_active=eq.true&day_of_week=eq."+todayDay+"&order=priority_score.desc&limit=50");
      // Pull venue details (name + hero_image) for happenings
      const venueIds=[...new Set(happenings.map(h=>h.venue_id).filter(Boolean))];
      let venueMap={};
      if(venueIds.length>0){
        const venueData=await khgF("gt_venues?select=id,name,hero_image,neighborhood&id=in.("+venueIds.join(",")+")");
        venueData.forEach(v=>{venueMap[v.id]=v});
      }

      // TIER 2c: Tonight-eligible venues — clubs, rooftops, lounges with real photos (always show regardless of day)
      const tonightVenues=await khgF("gt_venues?select=id,name,hero_image,neighborhood,category_key,google_rating,tonight_label,city_key&tonight_eligible=eq.true&hero_image=not.is.null&order=google_rating.desc.nullslast&limit=30");

      // TIER 1 legacy nightlife (always-on ATL content)
      const legacy=await sbF("events?select=*&order=date.asc&limit=100");

      // === MAP TIER 1: Our events ===
      const BRAND_DISPLAY={remix:"REMIX",taste_of_art:"TASTE OF ART",noir:"NOIR",wrst_bhvr:"WRST BHVR",gangsta_gospel:"GANGSTA GOSPEL",soul_sessions:"SOUL SESSIONS",kulture:"THE KULTURE",underground_king:"UNDERGROUND KING",crvngs:"CRVNGS",block_party:"BLOCK PARTY",cinco_de_mayo:"BLOCK PARTY",parking_lot_pimpin:"PARKING LOT PIMPIN",monsters_ball:"MONSTER'S BALL",black_ball:"BLACK BALL",snow_ball:"SNOW BALL",beauty_beast:"BEAUTY & THE BEAST",secret_society:"SECRET SOCIETY",huglife:"HUGLIFE",forever_futbol:"FOREVER FUTBOL",stella:"STELLA",shut_up_dance:"SHUT UP & DANCE"};
      const mapped=real.map(e=>({
        id:e.id,
        title:e.event_name,
        brand:BRAND_DISPLAY[e.brand_key]||e.brand_key?.toUpperCase()||"HUGLIFE",
        city:e.city||"Atlanta",
        date:e.event_date,
        time:e.event_time||"20:00",
        venue:"TBA",
        category:e.event_type||"exclusive",
        is_featured:(e.display_priority||50)<=5,
        image_url:e.image_url||null,
        eventbrite_url:e.eventbrite_url,
        display_priority:e.display_priority||50,
        source:"huglife",
        status:"upcoming"
      }));

      // === MAP TIER 2a: In-house shows (concerts, comedy, plays) ===
      const CITY_KEY_MAP={atlanta:"Atlanta",houston:"Houston",los_angeles:"Los Angeles",charlotte:"Charlotte",washington_dc:"Washington",miami:"Miami",las_vegas:"Las Vegas",new_york:"New York",dallas:"Dallas",phoenix:"Phoenix",scottsdale:"Scottsdale"};
      const TYPE_LABELS={concert:"CONCERT",comedy:"COMEDY",play:"THEATER",musical:"THEATER",festival:"FESTIVAL",sports:"SPORTS",special_event:"SPECIAL EVENT",activation:"ACTIVATION"};
      const showsMapped=shows.map(e=>({
        id:"show-"+e.id,
        title:e.event_name,
        brand:TYPE_LABELS[e.event_type]||e.genre?.toUpperCase()||"EVENT",
        city:CITY_KEY_MAP[e.city_key]||e.city_key,
        date:e.show_date,
        time:e.show_time||"TBA",
        venue:e.venue_name||"TBA",
        category:e.event_type||"concert",
        is_featured:e.is_featured||(e.display_priority<=5),
        image_url:e.image_url||null,
        ticket_url:e.ticket_url,
        display_priority:e.display_priority||30,
        source:"shows",
        status:"upcoming"
      }));

      // === MAP TIER 2a-legacy: Old city events (dedup against gt_shows by title+date) ===
      const showTitleDates=new Set(showsMapped.map(s=>s.title+"|"+s.date));
      const cityMapped=cityEvts.filter(e=>!showTitleDates.has(e.event_name+"|"+e.start_date)).map(e=>({
        id:"ce-"+e.id,
        title:e.event_name,
        brand:e.organizer||e.event_type||"CITY EVENT",
        city:CITY_KEY_MAP[e.city_key]||e.city_key,
        date:e.start_date,
        time:e.start_time||"TBA",
        venue:e.venue_name||"TBA",
        category:e.event_type||"event",
        is_featured:false,
        image_url:e.image_url||null,
        ticket_url:e.ticket_url,
        display_priority:40,
        source:"city_event",
        status:"upcoming"
      }));

      // === MAP TIER 2d: Blog/influencer sourced daily events ===
      // These ONLY show in the Dates tab, NOT on the home screen
      // Dedup: skip if same event_name+date already in shows or cityMapped
      const existingTitleDates=new Set([
        ...showsMapped.map(s=>s.title+"|"+s.date),
        ...cityMapped.map(s=>s.title+"|"+s.date)
      ]);
      const TIME_SLOT_MAP={afternoon:"14:00",evening:"20:00",late_night:"23:00",all_day:"12:00"};
      const DAILY_TYPE_LABELS={concert:"CONCERT",nightlife:"NIGHTLIFE",food_event:"FOOD & DRINK",art:"ART & CULTURE",day_party:"DAY PARTY",community:"COMMUNITY",popup:"POP-UP"};
      const dailyMapped=dailyEvts.filter(e=>!existingTitleDates.has(e.event_name+"|"+e.event_date)).map(e=>({
        id:"daily-"+e.id,
        title:e.event_name,
        brand:DAILY_TYPE_LABELS[e.event_type]||e.event_type?.replace(/_/g," ").toUpperCase()||"EVENT",
        city:CITY_KEY_MAP[e.city_key]||e.city_key,
        date:e.event_date,
        time:TIME_SLOT_MAP[e.time_slot]||"TBA",
        venue:e.venue||"TBA",
        category:e.event_type||"event",
        is_featured:false,
        image_url:null,
        display_priority:99,
        source:"daily_event",
        status:"dates_only",
        is_free:e.is_free||false,
        vibe_tags:e.vibe_tags||[],
        description:e.description||""
      }));

      // === MAP TIER 2b: Tonight's happenings with real venue photos ===
      const hapMapped=happenings.map(e=>{
        const v=venueMap[e.venue_id]||{};
        return {
          id:"hap-"+e.id,
          title:e.happening_name,
          brand:v.name||"NIGHTLIFE",
          city:CITY_KEY_MAP[e.city_key]||e.city_key,
          date:today,
          time:e.start_time||"22:00",
          venue:v.name||(e.description?.split(".")[0]||""),
          category:"nightlife",
          is_featured:e.priority_score>=9,
          image_url:v.hero_image||null,
          display_priority:e.priority_score>=9?8:35,
          source:"happening",
          status:"tonight"
        };
      });

      // === MAP TIER 2c: Tonight-eligible venues (clubs, rooftops, lounges with real photos) ===
      const tonightMapped=tonightVenues.map(v=>({
        id:"tv-"+v.id,
        title:v.name,
        brand:v.tonight_label||v.category_key?.replace(/_/g," ").toUpperCase()||"NIGHTLIFE",
        city:CITY_KEY_MAP[v.city_key]||v.city_key,
        date:today,
        time:"22:00",
        venue:v.neighborhood||"",
        category:v.category_key||"nightlife",
        is_featured:parseFloat(v.google_rating||0)>=4.5,
        image_url:v.hero_image,
        display_priority:parseFloat(v.google_rating||0)>=4.5?15:30,
        source:"venue",
        status:"tonight"
      }));

      // === MAP TIER 1 legacy ===
      const legacyMapped=legacy.map(e=>({
        ...e,
        date:e.category==="nightlife"||e.category==="experience"?today:e.date,
        display_priority:45,
        source:"legacy"
      }));

      // Merge: OUR events → in-house shows → tonight happenings → tonight venues → daily blog events → city events → legacy
      // KHG events (mapped) always come first due to source:"huglife" and low display_priority
      setEvents([...mapped,...showsMapped,...hapMapped,...tonightMapped,...dailyMapped,...cityMapped,...legacyMapped]);
      setLoading(false);
    })();
  },[]);

  const navigate=useCallback((s,n)=>{
    setPrev(screen);
    setScreen(s);
    if(["now","ent","calendar","plans","planforme","explore","map","vault"].includes(n||s))setNav(n||s);
  },[screen]);

  const goBack=useCallback(()=>{
    if(["now","ent","calendar","plans","planforme","explore","map","vault"].includes(prevScreen)){
      setScreen(prevScreen);setNav(prevScreen);
    }else setScreen(navScreen);
  },[prevScreen,navScreen]);

  // City events
  const cityEvents=useMemo(()=>events.filter(e=>e.city===city.name||e.city==="TBA"),[events,city]);

  // CHANGE #1: Realm-filtered events — TODAY / TONIGHT / THIS WEEK show DIFFERENT results
  const todayStr=new Date().toISOString().split("T")[0];
  // Category filter mapping for Now screen chips
  const CAT_FILTER={
    eat:["dining","restaurant","food_hall","brunch","bbq","seafood","steakhouse","food_event"],
    drink:["bar","cocktail_bar","rooftop","brewery","wine_bar","lounge","hookah"],
    music:["concert","jazz","live_music","karaoke","dj"],
    goout:["nightlife","nightclub","day_party","party","entertainment","comedy"],
    sports:["sports","sports_bar","game_day"]
  };
  const realmEvents=useMemo(()=>{
    let sorted=cityEvents.filter(e=>e.date>=todayStr&&e.source!=="daily_event").sort((a,b)=>a.date.localeCompare(b.date));
    // Apply category filter
    if(nowCat!=="all"){
      const cats=CAT_FILTER[nowCat]||[];
      sorted=sorted.filter(e=>cats.some(c=>e.category?.includes(c)||e.brand?.toLowerCase().includes(c)));
    }
    if(realm==="today"){
      return sorted.filter(e=>e.date===todayStr);
    }
    if(realm==="tonight"){
      return sorted.filter(e=>{
        if(e.date!==todayStr)return false;
        if(!e.time)return true;
        const hr=parseInt(e.time.split(":")[0],10);
        return hr>=17;
      });
    }
    const weekEnd=new Date();
    weekEnd.setDate(weekEnd.getDate()+(7-weekEnd.getDay()));
    const weekEndStr=weekEnd.toISOString().split("T")[0];
    return sorted.filter(e=>e.date>=todayStr&&e.date<=weekEndStr);
  },[cityEvents,realm,todayStr,nowCat]);

  // Upcoming — CONCIERGE: best content from ALL sources interleaved
  // KHG events (source: huglife) ALWAYS shown first, then sorted by image/priority/date
  // daily_event source is EXCLUDED — those only show in the Dates tab
  const upcoming=useMemo(()=>{
    const future=cityEvents.filter(e=>e.date>=todayStr&&e.source!=="daily_event");
    return future.sort((a,b)=>{
      // KHG events ALWAYS come first
      const aKHG=a.source==="huglife"?0:1;
      const bKHG=b.source==="huglife"?0:1;
      if(aKHG!==bKHG)return aKHG-bKHG;
      // Events with real images rank higher
      const aImg=a.image_url?0:1;
      const bImg=b.image_url?0:1;
      if(aImg!==bImg)return aImg-bImg;
      // Then by display priority (lower = better)
      const aPri=a.display_priority||50;
      const bPri=b.display_priority||50;
      if(aPri!==bPri)return aPri-bPri;
      // Then by date (sooner = better)
      return a.date.localeCompare(b.date);
    });
  },[cityEvents,todayStr]);
  const featured=useMemo(()=>upcoming.filter(e=>e.image_url),[upcoming]);
  const allUpcoming=useMemo(()=>events.filter(e=>e.date>=todayStr&&e.source!=="daily_event").sort((a,b)=>(a.display_priority||50)-(b.display_priority||50)||a.date.localeCompare(b.date)),[events,todayStr]);

  const toggleSave=id=>{
    const has=saved.includes(id);
    setSaved(s=>has?s.filter(x=>x!==id):[...s,id]);
    showToast(has?"Removed from Vault":"Saved to Vault \u2726");
  };

  // Plan generator
  const generatePlans=useCallback(()=>{
    setPlanLoading(true);
    setTimeout(()=>{
      const pool=upcoming.length>0?upcoming:allUpcoming;
      setPlanResult([
        {name:"The Classic",desc:"Tried & true \u2014 crowd pleasers all night",stops:pool.slice(0,3).map((e,i)=>({time:["7:00 PM","9:30 PM","11:30 PM"][i],event:e,why:["Perfect opener","Peak energy","The finale"][i]}))},
        {name:"Hidden Gems",desc:"Off the radar, on the vibe",stops:pool.slice(2,5).map((e,i)=>({time:["6:30 PM","9:00 PM","11:00 PM"][i],event:e,why:["Surprise starter","Local favorite","Secret spot"][i]}))},
        {name:"Late Night",desc:"For the night owls",stops:pool.slice(1,4).map((e,i)=>({time:["9:00 PM","11:00 PM","1:00 AM"][i],event:e,why:["Warm up","Main event","After dark"][i]}))}
      ]);
      setPlanLoading(false);
    },2000);
  },[upcoming,allUpcoming]);

  // Loading splash
  if(loading)return(
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 50% 40%,rgba(50,35,15,0.5) 0%,${C.bg} 70%)`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",animation:"fadeIn 0.8s ease"}}>
      <div style={{width:80,height:1,background:`linear-gradient(90deg,transparent,${C.gold},transparent)`,marginBottom:24,animation:"shimmer 2s infinite"}}/>
      <img src="/good-times-logo.png" alt="Good Times" style={{height:48,objectFit:"contain",animation:"fadeIn 1.2s ease"}} />
    </div>
  );

  // ═══ HEADER BAR ═══
  const Header=(
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"10px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{background:"rgba(0,0,0,0.35)",borderRadius:20,padding:"6px 12px",display:"flex",alignItems:"center",gap:5,backdropFilter:"blur(10px)"}}>
        <span style={{fontSize:12}}>{"\u{1F4CD}"}</span>
        <span style={{fontFamily:F.f,fontSize:13,color:"#fff",fontWeight:600}}>{city.name}</span>
        <span style={{color:"#FFFFFF",fontSize:10,marginLeft:2}}>{"\u25BE"}</span>
      </div>
      <span style={{fontFamily:F.f,fontSize:13,fontWeight:700,letterSpacing:3,color:C.gold,textShadow:"0 1px 8px rgba(0,0,0,0.6)"}}><img src="/good-times-logo.png" alt="Good Times" style={{height:28,objectFit:"contain",filter:"drop-shadow(0 1px 6px rgba(0,0,0,0.6))"}} /></span>
      <button onClick={()=>setSearchOpen(!searchOpen)} style={{width:34,height:34,borderRadius:"50%",background:"rgba(0,0,0,0.35)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      </button>
    </div>
  );

  // Search overlay
  const SearchOverlay=searchOpen&&(
    <div style={{position:"fixed",inset:0,zIndex:50,background:C.overlay,display:"flex",alignItems:"flex-start",justifyContent:"center"}} onClick={()=>{setSearchOpen(false);setSearch("")}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,background:C.bgSheet,padding:"20px",marginTop:60,borderRadius:24,maxHeight:"80vh",overflowY:"auto"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events, venues, vibes..." autoFocus style={{width:"100%",padding:"14px 16px",borderRadius:12,background:"rgba(255,255,255,0.12)",border:`1px solid ${C.goldDim}`,color:C.text,fontSize:15,fontFamily:F.f,outline:"none",marginBottom:16}}/>
        {search.trim()&&events.filter(e=>(e.title?.toLowerCase().includes(search.toLowerCase())||e.brand?.toLowerCase().includes(search.toLowerCase())||e.city?.toLowerCase().includes(search.toLowerCase()))).slice(0,10).map(e=>(
          <div key={e.id} style={{marginBottom:8}}><EventRow e={e} onClick={()=>{setDetail(e);setScreen("detail");setSearchOpen(false);setSearch("")}}/></div>
        ))}
      </div>
    </div>
  );

  // City background
  // Day/night detection (6AM-6PM = day)
  const hour=new Date().getHours();
  const isNight=hour<6||hour>=18;
  const cityImg=Ne.city[city.name];
  const skylineUrl=cityImg?(isNight?cityImg.night:cityImg.day):Ne.hero;

  const CityBG=(
    <div style={{position:"relative",zIndex:0,overflow:"hidden"}}>
      <div style={{height:200,position:"relative",overflow:"hidden"}}>
        <img src={skylineUrl} alt={city.name+" skyline"} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 40%",transition:"opacity 0.8s"}}/>
        <div style={{position:"absolute",inset:0,background:isNight
          ?"linear-gradient(180deg,rgba(6,6,12,0.3) 0%,rgba(6,6,12,0.1) 40%,rgba(6,6,12,0.7) 80%,rgba(6,6,12,1) 100%)"
          :"linear-gradient(180deg,rgba(6,6,12,0.4) 0%,rgba(6,6,12,0.05) 40%,rgba(6,6,12,0.6) 80%,rgba(6,6,12,1) 100%)"
        }}/>
        {Header}
        <div style={{position:"absolute",top:12,right:16,display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(8px)"}}>
          <div style={{width:6,height:6,borderRadius:99,background:isNight?"#D4A853":"#FFB86B",boxShadow:isNight?"0 0 8px #D4A853":"0 0 8px #FFB86B"}}/>
          <span style={{fontSize:10,fontWeight:600,color:isNight?"#D4A853":"#FFB86B",letterSpacing:1}}>{isNight?"NIGHT":"DAY"}</span>
        </div>
      </div>
    </div>
  );

  // Team detail sheet
  const TeamModal=teamSheet&&(
    <div style={{position:"fixed",inset:0,zIndex:50,background:C.overlay,display:"flex",alignItems:"flex-end"}} onClick={()=>setTeamSheet(null)}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,margin:"0 auto",background:C.bgSheet,borderRadius:"20px 20px 0 0",padding:"24px 20px 40px"}}>
        <div style={{width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.15)",margin:"0 auto 16px"}}/>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:36,marginBottom:6}}>{teamSheet.logo?<img src={teamSheet.logo} alt={teamSheet.n} style={{width:56,height:56,objectFit:"contain",margin:"0 auto"}}/>:teamSheet.e}</div>
          <div style={{fontSize:22,fontWeight:700,color:C.text,fontFamily:F.s}}>{teamSheet.n}</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>{teamSheet.s}{" \u00B7 "}{city.name}</div>
        </div>
        <a href={teamSheet.url} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none"}}>
          <div style={{...K,padding:16,textAlign:"center",border:`1px solid ${C.gold}30`,cursor:"pointer",marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:C.gold,marginBottom:4}}>View Full Schedule {"\u2192"}</div>
            <div style={{fontSize:12,color:C.textSec}}>Opens {teamSheet.s} official schedule</div>
          </div>
        </a>
        <button onClick={()=>setTeamSheet(null)} style={{...V(false),width:"100%",padding:"14px",textAlign:"center",fontSize:15}}>Close</button>
      </div>
    </div>
  );

  // ═══ RENDER SCREENS ═══

  const renderScreen=()=>{
    // ═══ HOME (NOW) ═══
    if(screen==="now")return(
      <ScrollWrap>
        {CityBG}{SearchOverlay}{TeamModal}
        <div style={{padding:"0 0 20px"}}>
          <div style={{padding:"0 16px",marginBottom:10,textAlign:"center"}}>
            <div style={{fontSize:26,fontFamily:F.s,fontWeight:700,lineHeight:1.15,marginBottom:4,color:"#FFFFFF"}}>What's the move?</div>
            <div style={{fontSize:12,color:"#FFFFFF"}}>
              {realm==="today"?"Today":"Tonight"} in {city.name} {"\u00B7"} {realmEvents.length>0?`${realmEvents.length} experiences`:"Check this week"}
            </div>
          </div>
          {/* CHANGE #1: Realm tabs */}
          <div style={{padding:"0 16px",marginBottom:12}}>
            <div style={{display:"flex",gap:0,background:"rgba(255,255,255,0.25)",borderRadius:10,padding:3}}>
              {[{id:"today",l:"Today"},{id:"tonight",l:"Tonight"},{id:"week",l:"This Week"}].map(r=>(
                <button key={r.id} onClick={()=>setRealm(r.id)} style={{flex:1,padding:"9px 0",borderRadius:8,fontSize:13,fontWeight:realm===r.id?700:500,background:realm===r.id?`linear-gradient(135deg,${C.gold},#B8942F)`:"transparent",color:realm===r.id?"#0A0A0F":"#FFFFFF",border:"none",cursor:"pointer",fontFamily:F.f,letterSpacing:.3,transition:"all 0.25s ease"}}>{r.l}</button>
              ))}
            </div>
          </div>
          {/* Category chips */}
          <div style={{padding:"0 16px",display:"flex",gap:6,overflowX:"auto",marginBottom:12}}>
            {[{id:"all",l:"All",c:C.gold},{id:"eat",l:"\u{1F37D}\uFE0F Eat",c:"#FFB86B"},{id:"drink",l:"\u{1F378} Drink",c:"#C39BD3"},{id:"music",l:"\u{1F3B5} Music",c:"#FF6B6B"},{id:"goout",l:"\u{1F319} Go Out",c:"#B86BFF"},{id:"sports",l:"\u{1F3DF}\uFE0F Sports",c:"#6BFFB8"}].map(ch=>(
              <button key={ch.id} onClick={()=>setNowCat(nowCat===ch.id?"all":ch.id)} style={{...V(nowCat===ch.id),padding:"7px 14px",border:`1px solid ${ch.c}`,color:nowCat===ch.id?"#0A0A0F":ch.c,background:nowCat===ch.id?ch.c:"transparent",fontSize:12,fontWeight:600,whiteSpace:"nowrap",flexShrink:0,borderRadius:8}}>{ch.l}</button>
            ))}
          </div>
          {/* ═══ ALL EVENT SECTIONS — single-pass dedup, NO REPEATS ═══ */}
          {(()=>{
            const shownIds=new Set();
            const shownTitles=new Set();
            // Mark: skip if id OR title already shown (REMIX May 2 and REMIX Jul 11 = same title = only show once)
            const mark=(items,max)=>{
              const r=[];
              for(const e of items){
                if(shownIds.has(e.id))continue;
                // For recurring events (same title, different dates), only show the NEXT occurrence
                const titleKey=e.title?.replace(/\s*[-—]\s*.*/,"").trim()||e.id;
                if(shownTitles.has(titleKey))continue;
                r.push(e);
                shownIds.add(e.id);
                shownTitles.add(titleKey);
                if(r.length>=max)break;
              }
              return r;
            };
            // Section 1: Tonight — ONLY events with real images go in the grid
            const realmPool=realmEvents.length>0?realmEvents:upcoming;
            const realmWithImg=realmPool.filter(e=>e.image_url);
            const realmNoImg=realmPool.filter(e=>!e.image_url);
            const sec1=mark(realmWithImg,4);
            const sec1list=mark(realmNoImg,4);
            // Section 2: Trending — BEST upcoming across ALL sources, events WITH images first
            const trendPool=[...upcoming].sort((a,b)=>{
              // Events with real images rank higher
              const aImg=a.image_url?0:1;
              const bImg=b.image_url?0:1;
              if(aImg!==bImg)return aImg-bImg;
              return(a.display_priority||50)-(b.display_priority||50);
            });
            const sec2=mark(trendPool,6);
            // Section 3: Featured — only events that HAVE real graphics (no fakes)
            const featPool=upcoming.filter(e=>e.image_url);
            const sec3=mark(featPool,2);
            // Section 4: UPCOMING — Next KHG events only (curated, not all 47)
            // Show max 4 nearest KHG events, deduped by title
            const sec4=mark(upcoming.filter(e=>e.source==="huglife"),4);
            return(<>
          {/* Tonight grid */}
          {sec1.length>0&&(
            <div style={{padding:"0 16px",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:7,height:7,borderRadius:99,background:"#FF6B6B",boxShadow:"0 0 10px #FF6B6B",animation:"pulse 1.5s ease-in-out infinite"}}/>
                <span style={{fontSize:11,letterSpacing:2.5,color:"#FF6B6B",fontWeight:700}}>{realm==="week"?"THIS WEEK":realm==="today"?"TODAY":"TONIGHT"}</span>
              </div>
              <EventGrid items={sec1} onSelect={e=>{setDetail(e);navigate("detail")}} max={4}/>
              {sec1list.length>0&&<div style={{marginTop:8}}>{sec1list.map(e=><EventRow key={e.id} e={e} onClick={()=>{setDetail(e);navigate("detail")}}/>)}</div>}
            </div>
          )}
          {/* Teams */}
          <div style={{padding:"0 16px",marginBottom:16}}>
            <div style={{...K,padding:0,overflow:"hidden",position:"relative",border:"1px solid rgba(107,255,184,0.4)"}}>
              <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600" alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.3}} loading="lazy"/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(107,255,184,0.15),rgba(6,6,12,0.85))"}}/>
              <div style={{position:"relative",zIndex:2,padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <span style={{fontSize:14}}>{"\u{1F3C6}"}</span>
                <span style={{fontSize:11,letterSpacing:2.5,color:"#6BFFB8",fontWeight:700}}>YOUR CITY'S TEAMS</span>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(city.teams||[]).map(t=>(
                  <button key={t.n} onClick={()=>setTeamSheet(t)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:12,background:"rgba(107,255,184,0.25)",border:"1px solid rgba(107,255,184,0.3)",cursor:"pointer",fontFamily:F.f,flex:"1 0 calc(50% - 4px)",minWidth:0}}>
                    <img src={t.logo} alt={t.n} style={{width:24,height:24,objectFit:"contain",borderRadius:4}} onError={e=>{e.currentTarget.style.display="none"}}/>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{t.n}</div>
                      <div style={{fontSize:9,color:"#FFFFFF"}}>{t.s}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            </div>
          </div>
          <div style={{padding:"0 16px",marginBottom:16}}><SponsorBanner/></div>
          {/* Trending carousel */}
          {sec2.length>0&&(<>
          <SectionHead t="TRENDING" icon={"\u{1F525}"} color={"#FF6B6B"} action={{l:"See All",fn:()=>navigate("explore")}}/>
          <div style={{display:"flex",gap:12,overflowX:"auto",padding:"0 16px",marginBottom:16,scrollSnapType:"x mandatory"}}>
            {sec2.map(e=>{const g=gt[e.brand]?.c||C.gold;return(
                <button key={e.id} onClick={()=>{setDetail(e);navigate("detail")}} style={{...K,flexShrink:0,width:200,padding:0,cursor:"pointer",textAlign:"left",fontFamily:F.f,overflow:"hidden",borderRadius:14,scrollSnapAlign:"start",border:`1px solid ${g}20`}}>
                  <div style={{height:120,position:"relative",overflow:"hidden"}}>
                    <img src={wn(e)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(6,6,12,0) 65%,rgba(6,6,12,0.5) 100%)"}}/>
                    <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",borderRadius:6,padding:"3px 8px",fontSize:9,color:g,fontWeight:700,border:`1px solid ${g}30`}}>{e.brand}</div>
                    <div style={{position:"absolute",bottom:8,left:10,right:10,textShadow:"0 1px 4px rgba(0,0,0,0.8),0 0 12px rgba(0,0,0,0.5)"}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.2,textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>{e.title}</div>
                      <div style={{fontSize:10,color:"#FFFFFF",marginTop:3}}>{e.date?new Date(e.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}):""}{" \u00B7 "}{e.time||"TBA"}</div>
                    </div>
                  </div>
                </button>
            )})}
          </div>
          </>)}
          {/* Featured Picks */}
          {sec3.length>0&&(<>
          <SectionHead t="FEATURED PICKS" icon={"\u2726"} color={C.gold}/>
          <div style={{padding:"0 16px",marginBottom:16}}>
            {sec3.map(e=>{const g=gt[e.brand]?.c||C.gold;const dt=e.date?new Date(e.date+"T12:00:00"):null;return(
                <button key={e.id} onClick={()=>{setDetail(e);navigate("detail")}} style={{...K,width:"100%",padding:0,cursor:"pointer",textAlign:"left",fontFamily:F.f,overflow:"hidden",borderRadius:16,marginBottom:12,position:"relative",border:`1px solid ${g}20`,boxShadow:`0 4px 20px rgba(0,0,0,0.3)`}}>
                  <div style={{height:160,position:"relative",overflow:"hidden"}}>
                    <img src={wn(e)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(6,6,12,0) 65%,rgba(6,6,12,0.5) 100%)"}}/>
                    <div style={{position:"absolute",top:12,left:14,display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:6,height:6,borderRadius:99,background:g,boxShadow:`0 0 8px ${g}`}}/>
                      <span style={{fontSize:10,color:g,fontWeight:700,letterSpacing:1}}>{e.brand}</span>
                    </div>
                    <div style={{position:"absolute",bottom:14,left:14,right:14,textShadow:"0 1px 4px rgba(0,0,0,0.8),0 0 12px rgba(0,0,0,0.5)"}}>
                      <div style={{fontSize:18,fontWeight:700,color:C.text,lineHeight:1.2,textShadow:"0 2px 6px rgba(0,0,0,0.8)",marginBottom:4}}>{e.title}</div>
                      {dt&&<div style={{fontSize:11,color:"#FFFFFF"}}>{dt.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}{" \u00B7 "}{e.time||"TBA"}{" \u00B7 "}{e.venue||e.city}</div>}
                      <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:8,padding:"6px 14px",borderRadius:8,background:`${g}20`,border:`1px solid ${g}40`}}>
                        <span style={{fontSize:11,fontWeight:700,color:g}}>View Details</span>
                        <span style={{color:g}}>{"\u2192"}</span>
                      </div>
                    </div>
                  </div>
                </button>
            )})}
          </div>
          </>)}
          <div style={{padding:"0 16px",marginBottom:16}}><SponsorBanner/></div>
          {/* Upcoming KHG */}
          {sec4.length>0&&(<>
          <SectionHead t="UPCOMING" icon={"\u{1F51C}"} color={C.a3} action={{l:"See All",fn:()=>navigate("calendar")}}/>
          <div style={{padding:"0 16px",marginBottom:16}}>
            <EventGrid items={sec4} onSelect={e=>{setDetail(e);navigate("detail")}} max={4}/>
          </div>
          </>)}
          {/* Happening in City — curated city events as clean list */}
          {(()=>{
            const weekEnd=new Date();weekEnd.setDate(weekEnd.getDate()+7);
            const weekEndStr=weekEnd.toISOString().split("T")[0];
            const cityDaily=events.filter(e=>e.source==="daily_event"&&e.date>=todayStr&&e.date<=weekEndStr&&(e.city===city.name||e.city==="TBA")).sort((a,b)=>a.date.localeCompare(b.date));
            const seen=new Set();
            const unique=cityDaily.filter(e=>{const k=e.title;if(seen.has(k))return false;seen.add(k);return true}).slice(0,6);
            if(unique.length===0)return null;
            return(<>
              <SectionHead t={`HAPPENING IN ${city.name.toUpperCase()}`} icon={"\u{1F30D}"} color={C.a4} action={{l:"See All",fn:()=>navigate("calendar")}}/>
              <div style={{padding:"0 16px",marginBottom:16}}>
                {unique.map(e=><EventRow key={e.id} e={e} onClick={()=>{setDetail(e);navigate("detail")}}/>)}
              </div>
            </>);
          })()}
          </>);
          })()}
        </div>
      </ScrollWrap>
    );

    // ═══ VIBE ═══
    if(screen==="ent"){
      const todayEvts=cityEvents.filter(e=>e.date===todayStr).slice(0,6);
      const weekStart=new Date();weekStart.setDate(weekStart.getDate()-weekStart.getDay());
      const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
      const weekEvts=cityEvents.filter(e=>{if(!e.date)return false;const d=new Date(e.date+"T12:00:00");return d>=weekStart&&d<=weekEnd}).sort((a,b)=>a.date.localeCompare(b.date));
      return(
        <ScrollWrap>
          {CityBG}{SearchOverlay}{TeamModal}
          <div style={{padding:"0 0 40px"}}>
            <div style={{position:"relative",height:200,overflow:"hidden",margin:"0 20px",borderRadius:22,marginBottom:20}}>
              <img src={Ne.v[1]} alt="" style={{width:"100%",height:"100%",objectFit:"cover",}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 65%,rgba(6,6,12,0.5))"}}/>
              <div style={{position:"absolute",bottom:20,left:20,right:20}}>
                <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>ENTERTAINMENT</div>
                <div style={{fontSize:28,fontFamily:F.s,fontWeight:700,color:"#FFFFFF"}}>What's the move?</div>
                <div style={{fontSize:14,color:C.textSec,marginTop:4}}>{city.name} {"\u00B7 "}{todayEvts.length>0?`${todayEvts.length} hot tonight`:"Check this week"}</div>
              </div>
            </div>
            <div style={{padding:"0 20px",marginBottom:24}}><SponsorBanner/></div>
            {/* CHANGE #5 + #6: Browse cards — NO Gentleman's Club, UNIQUE images */}
            <div style={{padding:"0 20px",marginTop:24}}>
              <SectionHead t="BROWSE" icon={"\u25C7"} color={C.gold}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {Gu.map(cat=>(
                  <button key={cat.id} onClick={()=>setVibeSheet(cat)} style={{...K,padding:0,cursor:"pointer",textAlign:"center",overflow:"hidden",height:100,position:"relative",border:`1px solid ${cat.color}90`}}>
                    {/* CHANGE #6: Each card gets its own unique image from Ne.br */}
                    <img src={Ne.br[cat.id]||Ne.v[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0,filter:"brightness(1.0)"}}/>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.5) 100%)"}}/>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:28,marginBottom:4}}>{cat.icon}</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#fff",textShadow:`0 2px 8px rgba(0,0,0,0.9), 0 0 6px ${cat.color}`}}>{cat.name}</div>
                      <div style={{fontSize:12,color:"#FFFFFF",textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>{cat.d}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {/* Hot tonight / this week events on Vibe */}
            {todayEvts.length>0&&(
              <div style={{padding:"0 20px",marginTop:20}}>
                <SectionHead t="HOT TONIGHT" icon={"\u{1F525}"} color={"#FF6B6B"}/>
                <EventGrid items={todayEvts} onSelect={e=>{setDetail(e);navigate("detail")}} max={4}/>
              </div>
            )}
            {weekEvts.length>0&&(
              <div style={{padding:"0 20px",marginTop:16}}>
                <SectionHead t="THIS WEEK" icon={"\u{1F4C5}"} color={C.a4}/>
                <EventGrid items={weekEvts} onSelect={e=>{setDetail(e);navigate("detail")}} max={6}/>
              </div>
            )}
            {todayEvts.length===0&&weekEvts.length===0&&(
              <div style={{padding:"0 20px",marginTop:16}}>
                <SectionHead t="COMING UP" icon={"\u{1F51C}"} color={C.a3}/>
                <EventGrid items={upcoming} onSelect={e=>{setDetail(e);navigate("detail")}} max={6}/>
              </div>
            )}
          </div>
          {/* Vibe sheet */}
          {vibeSheet&&(
            <div style={{position:"fixed",inset:0,zIndex:50,background:C.overlay,display:"flex",alignItems:"flex-end"}} onClick={()=>setVibeSheet(null)}>
              <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,margin:"0 auto",background:C.bgSheet,borderRadius:"24px 24px 0 0",padding:"28px 20px 40px",maxHeight:"80vh",overflowY:"auto"}}>
                <div style={{width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.15)",margin:"0 auto 20px"}}/>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <div style={{fontSize:40,marginBottom:8}}>{vibeSheet.icon}</div>
                  <div style={{fontSize:22,fontWeight:700,color:vibeSheet.color,fontFamily:F.s}}>{vibeSheet.name}</div>
                  <div style={{fontSize:14,color:C.textSec,marginTop:4}}>{vibeSheet.d}</div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginBottom:20}}>
                  {vibeSheet.subs.map(s=>(
                    <button key={s} style={{...V(false),padding:"12px 20px",border:`1px solid ${vibeSheet.color}25`,color:vibeSheet.color,fontSize:14}}>{s}</button>
                  ))}
                </div>
                <button onClick={()=>setVibeSheet(null)} style={{...V(false),width:"100%",padding:"14px",textAlign:"center",fontSize:15}}>Close</button>
              </div>
            </div>
          )}
        </ScrollWrap>
      );
    }

    // ═══ CALENDAR (DATES) ═══
    if(screen==="calendar"){
      const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
      const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
      const firstDay=new Date(calYear,calMonth,1).getDay();
      const grid=[];for(let i=0;i<firstDay;i++)grid.push(null);for(let i=1;i<=daysInMonth;i++)grid.push(i);
      const dayEvents=d=>{if(!d)return[];const ds=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return events.filter(e=>e.date===ds&&(calCityFilter==="all"||e.city===city.name||e.city==="TBA")&&(calCatFilter==="all"||e.category===calCatFilter))};
      const monthEvents=events.filter(e=>{if(!e.date)return false;const[y,m]=e.date.split("-").map(Number);return y===calYear&&m===calMonth+1&&(calCityFilter==="all"||e.city===city.name||e.city==="TBA")&&(calCatFilter==="all"||e.category===calCatFilter)}).sort((a,b)=>a.date.localeCompare(b.date));
      return(
        <ScrollWrap>
          {CityBG}{SearchOverlay}{TeamModal}
          <div style={{padding:"0 20px"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>CALENDAR</div>
              <div style={{fontSize:28,fontFamily:F.s,fontWeight:700,color:"#FFFFFF"}}>What's happening</div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16,justifyContent:"center"}}>
              <button onClick={()=>setCalMode(calMode==="month"?"week":"month")} style={V(false)}>{calMode==="month"?"\u{1F4C5} Week":"\u{1F4C6} Month"}</button>
              <button onClick={()=>setCalCityFilter(calCityFilter==="all"?city.name:"all")} style={V(calCityFilter!=="all")}>{calCityFilter==="all"?"All Cities":city.name}</button>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:16,justifyContent:"center",flexWrap:"wrap"}}>
              {["all","dining","nightlife","sports","music","exclusive","culture"].map(cat=>(
                <button key={cat} onClick={()=>setCalCatFilter(cat)} style={{...V(calCatFilter===cat),padding:"6px 12px",fontSize:11,borderRadius:20}}>{cat==="all"?"All":cat==="dining"?"\u{1F37D} Food":cat==="nightlife"?"\u{1F30D} Events":cat==="sports"?"\u{1F3DF} Sports":cat==="music"?"\u{1F3B5} Concerts":cat==="exclusive"?"\u{2728} Festivals":"\u{1F3A8} Culture"}</button>
              ))}
            </div>
            {/* Month nav */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,marginBottom:16}}>
              <button onClick={()=>{calMonth===0?(setCalMonth(11),setCalYear(calYear-1)):setCalMonth(calMonth-1)}} style={{...V(false),padding:"6px 14px"}}>{"\u2039"}</button>
              <div style={{fontSize:18,fontWeight:600,minWidth:180,fontFamily:F.s,textAlign:"center"}}>{months[calMonth]} {calYear}</div>
              <button onClick={()=>{calMonth===11?(setCalMonth(0),setCalYear(calYear+1)):setCalMonth(calMonth+1)}} style={{...V(false),padding:"6px 14px"}}>{"\u203A"}</button>
            </div>
            {/* Calendar grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16}}>
              {["S","M","T","W","T","F","S"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,color:C.muted,padding:"6px 0",fontWeight:700}}>{d}</div>)}
              {grid.map((d,i)=>{
                const evts=d?dayEvents(d):[];
                const isToday=d&&calYear===now.getFullYear()&&calMonth===now.getMonth()&&d===now.getDate();
                return(
                  <div key={i} style={{textAlign:"center",padding:"8px 2px",borderRadius:10,minHeight:44,background:isToday?`${C.gold}50`:evts.length>0?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.14)",border:isToday?`1px solid ${C.gold}50`:"1px solid rgba(255,255,255,0.20)"}}>
                    {d&&<>
                      <div style={{fontSize:15,color:isToday?C.gold:C.text,fontWeight:isToday?700:400}}>{d}</div>
                      {evts.length>0&&<div style={{display:"flex",gap:2,justifyContent:"center",marginTop:3}}>{evts.slice(0,3).map((e,j)=><div key={j} style={{width:4,height:4,borderRadius:99,background:gt[e.brand]?.c||C.gold}}/>)}</div>}
                    </>}
                  </div>
                );
              })}
            </div>
            <SectionHead t={`${months[calMonth].toUpperCase()} EVENTS`} icon={"\u{1F4C5}"} color={C.a4}/>
            {monthEvents.length===0?<div style={{...K,padding:"40px 20px",textAlign:"center",color:C.muted,fontSize:13}}>No events this month</div>:<EventGrid items={monthEvents} onSelect={e=>{setDetail(e);navigate("detail")}}/>}
            <div style={{marginTop:20}}><SponsorBanner/></div>
          </div>
        </ScrollWrap>
      );
    }

    // ═══ ITINERARY (PLANS) ═══
    if(screen==="plans")return(
      <ScrollWrap>
        {CityBG}{SearchOverlay}
        <div style={{padding:"0 20px"}}>
          <div style={{height:160,borderRadius:22,overflow:"hidden",position:"relative",marginBottom:16}}>
            <img src={Ne.v[5]} alt="" style={{width:"100%",height:"100%",objectFit:"cover",}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(180,120,40,0.02),rgba(6,6,12,0.4) 95%)"}}/>
            <div style={{position:"absolute",bottom:16,left:16}}>
              <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:6}}>MAKE PLANS</div>
              <div style={{fontSize:24,fontFamily:F.s,fontWeight:700}}>Build your night</div>
            </div>
          </div>
          {planStops.map((stop,i)=>(
            <div key={i} style={{...K,padding:16,marginBottom:12,display:"flex",alignItems:"center",gap:12,border:stop?`1px solid ${C.gold}40`:`1px solid rgba(255,255,255,0.12)`}}>
              <div style={{width:36,height:36,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",background:stop?`${C.gold}25`:"rgba(255,255,255,0.20)",color:stop?C.gold:"rgba(255,255,255,0.85)",fontSize:14,fontWeight:700}}>{i+1}</div>
              {stop?<div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{stop.title}</div><div style={{fontSize:13,color:C.textSec}}>{stop.time} {"\u00B7"} {stop.city}</div></div>:
                <button onClick={()=>setPlanPickSlot(i)} style={{flex:1,textAlign:"left",background:"none",border:"none",cursor:"pointer",color:"#FFFFFF",fontSize:15,fontFamily:F.f}}>+ Browse & add a stop</button>}
              {stop&&<button onClick={()=>setPlanStops(s=>{const n=[...s];n[i]=null;return n})} style={{background:"none",border:"none",color:"#FFFFFF",cursor:"pointer",fontSize:16}}>{"\u00D7"}</button>}
            </div>
          ))}
          <button onClick={()=>setPlanStops(s=>[...s,null])} style={{...V(false),width:"100%",padding:"12px",marginBottom:16,textAlign:"center"}}>+ Add Another Stop</button>
          {planStops.filter(Boolean).length>=2&&<button style={{...V(true),width:"100%",padding:"14px",fontSize:14,fontWeight:700,letterSpacing:1}}>{"\u{1F512}"} Lock Plan {"\u2192"} Vault</button>}
          <div style={{marginTop:20}}><SponsorBanner/></div>
          {planPickSlot!==null&&(
            <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setPlanPickSlot(null)}>
              <div onClick={e=>e.stopPropagation()} style={{background:C.bgSheet,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,maxHeight:"70vh",overflow:"auto",padding:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:F.s}}>Pick a stop</div>
                  <button onClick={()=>setPlanPickSlot(null)} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>{"\u00D7"}</button>
                </div>
                <div style={{fontSize:12,color:C.textSec,marginBottom:12}}>Tap an event to add it to slot {planPickSlot+1}</div>
                {(upcoming.length>0?upcoming:cityEvents).map((ev,j)=>(
                  <button key={j} onClick={()=>{setPlanStops(s=>{const n=[...s];n[planPickSlot]=ev;return n});setPlanPickSlot(null);showToast("Added to plan \u2726")}} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 0",background:"none",border:"none",borderBottom:"1px solid rgba(255,255,255,0.14)",cursor:"pointer",textAlign:"left",fontFamily:F.f}}>
                    <div style={{width:50,height:50,borderRadius:10,overflow:"hidden",flexShrink:0,background:C.bgCard}}>
                      <img src={getBrandImg(ev)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:600,color:C.text}}>{ev.title}</div>
                      <div style={{fontSize:12,color:gt[ev.brand]?.c||C.gold}}>{ev.brand}</div>
                      <div style={{fontSize:11,color:C.muted}}>{ev.date&&new Date(ev.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})} {"\u00B7"} {ev.city}</div>
                    </div>
                    <div style={{color:C.gold,fontSize:12,fontWeight:600}}>Add</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollWrap>
    );

    // ═══ PLAN FOR ME (CONCIERGE) ═══
    if(screen==="planforme")return(
      <ScrollWrap>
        {CityBG}{SearchOverlay}
        <div style={{padding:"0 20px",minHeight:"calc(100vh - 160px)",display:"flex",flexDirection:"column"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>CONCIERGE</div>
            <div style={{fontSize:28,fontFamily:F.s,fontWeight:700,marginBottom:6}}>Build your perfect night</div>
            <div style={{fontSize:14,color:C.textSec}}>Tell us your vibe {"\u00B7"} We handle the rest</div>
          </div>
          {!planResult&&!planLoading&&<>
            <div style={{display:"flex",gap:6,marginBottom:28,justifyContent:"center"}}>
              {kn.map((_,i)=><div key={i} style={{height:4,flex:1,maxWidth:50,borderRadius:99,background:i<planStep?C.gold:i===planStep?`${C.gold}`:"rgba(255,255,255,0.2)",transition:"all 0.4s ease"}}/>)}
            </div>
            {planStep<kn.length&&(()=>{
              const q=kn[planStep];
              return(
                <div style={{flex:1,display:"flex",flexDirection:"column"}}>
                  <div style={{textAlign:"center",marginBottom:6}}>
                    <div style={{fontSize:24,fontFamily:F.s,fontWeight:400,marginBottom:6,color:"#fff"}}>{q.q}</div>
                    <div style={{fontSize:14,color:"#FFFFFF"}}>{q.sub}</div>
                  </div>
                  <div style={{fontSize:13,color:"#FFFFFF",textAlign:"center",marginBottom:20}}>Step {planStep+1} of {kn.length}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,flex:1}}>
                    {q.opts.map(opt=>{
                      const sel=q.multi?planVibes.includes(opt.id):planChoices[q.id]===opt.id;
                      return(
                        <button key={opt.id} onClick={()=>{
                          if(q.multi)setPlanVibes(v=>v.includes(opt.id)?v.filter(x=>x!==opt.id):[...v,opt.id]);
                          else{setPlanChoices(c=>({...c,[q.id]:opt.id}));setTimeout(()=>setPlanStep(s=>s+1),300)}
                        }} style={{borderRadius:16,cursor:"pointer",textAlign:"center",border:sel?`2px solid ${opt.c}`:`1px solid ${opt.c}40`,overflow:"hidden",position:"relative",transition:"all 0.25s ease",minHeight:q.multi?100:140,boxShadow:sel?`0 4px 24px ${opt.c}60`:`0 4px 20px rgba(0,0,0,0.4)`,background:"#181828"}}>
                          {opt.bg&&<img src={opt.bg} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(1.0)"}} loading="lazy"/>}
                          <div style={{position:"absolute",inset:0,background:`linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.55) 100%)`}}/>
                          <div style={{position:"relative",zIndex:2,padding:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%"}}>
                          <div style={{fontSize:36,marginBottom:10}}>{opt.i}</div>
                          <div style={{fontSize:16,fontWeight:700,color:"#fff",textShadow:`0 2px 8px rgba(0,0,0,0.9), 0 0 6px ${opt.c}`,marginBottom:opt.d?4:0}}>{opt.l}</div>
                          {opt.d&&<div style={{fontSize:13,color:"#FFFFFF",textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>{opt.d}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {q.multi&&planVibes.length>0&&<button onClick={()=>setPlanStep(s=>s+1)} style={{...V(true),width:"100%",marginTop:20,padding:"16px",fontSize:16,fontWeight:700}}>Continue {"\u2192"}</button>}
                  {planStep>0&&<button onClick={()=>setPlanStep(s=>s-1)} style={{...V(false),width:"100%",marginTop:12,padding:"14px",textAlign:"center",fontSize:15}}>{"\u2190"} Back</button>}
                </div>
              );
            })()}
            {planStep>=kn.length&&(
              <div style={{textAlign:"center",flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 0"}}>
                <div style={{fontSize:56,marginBottom:16}}>{"\u2728"}</div>
                <div style={{fontSize:28,fontFamily:F.s,fontWeight:700,marginBottom:10}}>Ready to build your night</div>
                <div style={{fontSize:15,color:C.textSec,marginBottom:28}}>Best spots in {city.name} based on your vibes</div>
                <button onClick={generatePlans} style={{...V(true),width:"100%",padding:"18px",fontSize:18,fontWeight:700,letterSpacing:.5}}>{"\u2726"} Build My Night</button>
                <button onClick={()=>{setPlanStep(0);setPlanChoices({});setPlanVibes([])}} style={{...V(false),width:"100%",marginTop:12,padding:"14px",fontSize:15}}>Start Over</button>
              </div>
            )}
          </>}
          {planLoading&&(
            <div style={{textAlign:"center",flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0"}}>
              <div style={{fontSize:56,marginBottom:20,animation:"pulse 1.5s ease-in-out infinite"}}>{"\u2726"}</div>
              <div style={{fontSize:24,fontFamily:F.s,fontWeight:700,marginBottom:10}}>Finding the vibe...</div>
              <div style={{fontSize:15,color:C.textSec}}>Building 3 plans just for you</div>
            </div>
          )}
          {planResult&&(
            <div>
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>YOUR PLANS</div>
                <div style={{fontSize:24,fontFamily:F.s,fontWeight:700}}>Pick one. Lock it. Go.</div>
              </div>
              {planResult.map((plan,pi)=>(
                <div key={pi} style={{...K,padding:20,marginBottom:16,background:`linear-gradient(135deg,${C.gold}20,${C.bgCard})`}}>
                  <div style={{textAlign:"center",marginBottom:4}}>
                    <div style={{fontSize:18,fontWeight:700,color:C.gold,fontFamily:F.s}}>{plan.name}</div>
                    <div style={{fontSize:13,color:C.textSec,fontStyle:"italic"}}>{plan.desc}</div>
                  </div>
                  <div style={{position:"relative",paddingLeft:24,marginTop:16}}>
                    <div style={{position:"absolute",left:5,top:6,bottom:6,width:2,background:`${C.gold}30`,borderRadius:99}}/>
                    {plan.stops.map((stop,si)=>stop.event&&(
                      <div key={si} style={{position:"relative",marginBottom:si<plan.stops.length-1?16:0}}>
                        <div style={{position:"absolute",left:-21,top:6,width:8,height:8,borderRadius:99,background:C.gold}}/>
                        <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                          <div style={{fontSize:14,color:C.gold,fontWeight:700,minWidth:75}}>{stop.time}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:15,fontWeight:600}}>{stop.event.title}</div>
                            <div style={{fontSize:13,color:gt[stop.event.brand]?.c||C.textSec,marginTop:2}}>{stop.event.brand} {"\u00B7"} {stop.event.city}</div>
                            {stop.why&&<div style={{fontSize:13,color:C.textSec,fontStyle:"italic",marginTop:3}}>"{stop.why}"</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>{setLockedPlans(p=>[...p,{name:plan.name,stops:plan.stops.map(s=>s.event).filter(Boolean),date:new Date().toISOString()}]);showToast(`${plan.name} locked!`)}} style={{...V(true),width:"100%",marginTop:16,padding:"14px",fontSize:15,fontWeight:700}}>{"\u{1F512}"} Lock This Plan</button>
                </div>
              ))}
              <button onClick={()=>{setPlanResult(null);setPlanStep(0);setPlanChoices({});setPlanVibes([])}} style={{...V(false),width:"100%",padding:"14px",textAlign:"center",fontSize:15,marginBottom:16}}>Start Over</button>
            </div>
          )}
          <div style={{marginTop:20}}><SponsorBanner/></div>
        </div>
      </ScrollWrap>
    );

    // ═══ EXPLORE ═══
    if(screen==="explore")return(
      <ScrollWrap>
        {CityBG}{SearchOverlay}
        <div style={{padding:"0 20px 40px"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>EXPLORE</div>
            <div style={{fontSize:28,fontFamily:F.s,fontWeight:700,marginBottom:6}}>Discover {city.name}</div>
            <div style={{fontSize:14,color:C.textSec}}>{Vu.length} categories to explore</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
            {Vu.map(cat=>(
              <button key={cat.id} onClick={()=>setExploreSheet(cat)} style={{...K,padding:0,cursor:"pointer",overflow:"hidden",height:130,position:"relative",border:`1px solid ${cat.color}90`}}>
                <img src={Ne.ex[cat.id]||Ne.v[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(1.0)"}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.5) 100%)"}}/>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
                  <div style={{fontSize:30}}>{cat.icon}</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#fff",textShadow:`0 2px 8px rgba(0,0,0,0.9), 0 0 6px ${cat.color}`}}>{cat.name}</div>
                  <div style={{fontSize:12,color:"#FFFFFF",textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>{cat.subs.length} types</div>
                </div>
              </button>
            ))}
          </div>
          <SponsorBanner style={{marginBottom:24}}/>
          <SectionHead t="UPCOMING EXPERIENCES" icon={"\u{1F51C}"} color={C.a3}/>
          <EventGrid items={upcoming} onSelect={e=>{setDetail(e);navigate("detail")}} max={6}/>
        </div>
        {/* CHANGE #7: Explore category sheet with subcategory drilldown */}
        {exploreSheet&&!subCatView&&(
          <div style={{position:"fixed",inset:0,zIndex:50,background:C.overlay,display:"flex",alignItems:"flex-end"}} onClick={()=>setExploreSheet(null)}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,margin:"0 auto",background:C.bgSheet,borderRadius:"24px 24px 0 0",padding:"0 0 40px",maxHeight:"85vh",overflowY:"auto"}}>
              <div style={{height:130,position:"relative",overflow:"hidden",borderRadius:"24px 24px 0 0"}}>
                <img src={Ne.ex[exploreSheet.id]||Ne.v[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover",}}/>
                <div style={{position:"absolute",inset:0,background:`linear-gradient(180deg,transparent,${C.bgSheet})`}}/>
                <div style={{position:"absolute",bottom:12,left:0,right:0,textAlign:"center"}}><div style={{fontSize:44}}>{exploreSheet.icon}</div></div>
              </div>
              <div style={{padding:"0 20px",textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:24,fontWeight:700,color:exploreSheet.color,fontFamily:F.s,marginBottom:4}}>{exploreSheet.name}</div>
                <div style={{fontSize:14,color:C.textSec}}>{exploreSheet.subs.length} categories in {city.name}</div>
              </div>
              {/* CHANGE #7: Clickable subcategories that drill down */}
              <div style={{padding:"0 20px",display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginBottom:24}}>
                {exploreSheet.subs.map(sub=>(
                  <button key={sub} onClick={async()=>{
                    setSubCatView({parent:exploreSheet,sub});
                    setVenueLoading(true);setVenueResults([]);
                    // Map city name to city_key (must match gt_venues city_key values)
                    const cityKeyMap={"Atlanta":"atlanta","Houston":"houston","Los Angeles":"los_angeles","Charlotte":"charlotte","Washington":"washington_dc","Miami":"miami","Las Vegas":"las_vegas","New York":"new_york","Dallas":"dallas","Phoenix":"phoenix","Scottsdale":"scottsdale"};
                    const ck=cityKeyMap[city.name]||city.name.toLowerCase().replace(/\s+/g,'_');
                    // Map explore category to gt_venues category_keys
                    const cats=CAT_MAP[exploreSheet.id]||[exploreSheet.id];
                    const catFilter=cats.map(c=>`category_key.eq.${c}`).join(",");
                    // Try subcategory match first, then fall back to category
                    let q=`gt_venues?select=id,name,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,subcategory,category_key&status=eq.active&city_key=eq.${ck}&or=(${catFilter})&order=google_rating.desc.nullslast,quality_score.desc.nullslast&limit=20`;
                    let results=await khgF(q);
                    // If no results for this city, try all cities
                    if(results.length===0){
                      q=`gt_venues?select=id,name,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,subcategory,category_key,city_key&status=eq.active&or=(${catFilter})&order=google_rating.desc.nullslast&limit=15`;
                      results=await khgF(q);
                    }
                    setVenueResults(results);setVenueLoading(false);
                  }} style={{...V(false),padding:"12px 20px",border:`1px solid ${exploreSheet.color}25`,color:exploreSheet.color,fontSize:14,cursor:"pointer"}}>{sub}</button>
                ))}
              </div>
              <div style={{padding:"0 20px"}}><button onClick={()=>setExploreSheet(null)} style={{...V(false),width:"100%",padding:"14px",textAlign:"center",fontSize:15}}>Close</button></div>
            </div>
          </div>
        )}
        {/* CHANGE #7: Subcategory drilldown — top-rated list with stars */}
        {subCatView&&(
          <div style={{position:"fixed",inset:0,zIndex:51,background:C.overlay,display:"flex",alignItems:"flex-end"}} onClick={()=>setSubCatView(null)}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,margin:"0 auto",background:C.bgSheet,borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",maxHeight:"90vh",overflowY:"auto"}}>
              <div style={{width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.15)",margin:"0 auto 16px"}}/>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:14,color:subCatView.parent.color,fontWeight:600,marginBottom:4}}>{subCatView.parent.name}</div>
                <div style={{fontSize:24,fontWeight:700,color:C.text,fontFamily:F.s}}>{subCatView.sub}</div>
                <div style={{fontSize:13,color:C.textSec,marginTop:4}}>Top rated in {city.name}</div>
              </div>
              {/* Real venue data from gt_venues via KHG Supabase */}
              {venueLoading?(<div style={{textAlign:"center",padding:40,color:C.textSec}}>Loading venues...</div>)
              :venueResults.length===0?(<div style={{textAlign:"center",padding:40,color:C.textSec}}>No venues found yet</div>)
              :venueResults.map((place,i)=>{
                const key=`${subCatView.sub}-${place.id||i}`;
                const userRating=subRatings[key]||0;
                const rating=Number(place.google_rating)||Number(place.quality_score)/20||0;
                const reviews=place.google_reviews||0;
                return(
                  <div key={place.id||i} style={{...K,padding:0,marginBottom:12,border:`1px solid ${subCatView.parent.color}40`,overflow:"hidden"}}>
                    {place.hero_image&&(<div style={{height:100,position:"relative",overflow:"hidden"}}>
                      <img src={place.hero_image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 50%,rgba(6,6,12,0.7) 100%)"}}/>
                      {place.price_range&&<div style={{position:"absolute",top:8,right:8,padding:"3px 8px",borderRadius:6,background:"rgba(0,0,0,0.6)",color:C.gold,fontSize:11,fontWeight:700}}>{place.price_range}</div>}
                    </div>)}
                    <div style={{padding:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:3}}>{place.name}</div>
                          <div style={{fontSize:12,color:C.textSec}}>{"\u{1F4CD}"} {place.neighborhood||place.side_of_town||city.name} {reviews>0?`\u00B7 ${reviews} reviews`:""}</div>
                          {place.short_desc&&<div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.4}}>{place.short_desc.length>80?place.short_desc.slice(0,80)+"...":place.short_desc}</div>}
                        </div>
                        {rating>0&&<div style={{padding:"4px 10px",borderRadius:8,background:`${subCatView.parent.color}20`,color:subCatView.parent.color,fontSize:14,fontWeight:700}}>
                          {rating.toFixed(1)}
                        </div>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {rating>0&&<StarRating rating={Math.round(rating)} size={14}/>}
                          {reviews>0&&<span style={{fontSize:11,color:C.muted}}>({reviews})</span>}
                          {place.vibe_tags&&Array.isArray(place.vibe_tags)&&place.vibe_tags.slice(0,2).map(t=><span key={t} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${subCatView.parent.color}15`,color:subCatView.parent.color}}>{t}</span>)}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:10,color:C.muted}}>Rate:</span>
                          <StarRating rating={userRating} onRate={r=>setSubRatings(prev=>({...prev,[key]:r}))} size={14}/>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={()=>setSubCatView(null)} style={{...V(false),width:"100%",padding:"14px",textAlign:"center",fontSize:15,marginTop:8}}>{"\u2190"} Back to {subCatView.parent.name}</button>
            </div>
          </div>
        )}
      </ScrollWrap>
    );

    // ═══ MAP ═══
    if(screen==="map")return(
      <ScrollWrap>
        {CityBG}{SearchOverlay}
        <div style={{padding:"0 20px"}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:10,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:6}}>MAP</div>
            <div style={{fontSize:24,fontFamily:F.s,fontWeight:700}}>Around {city.name}</div>
          </div>
          <div style={{borderRadius:20,overflow:"hidden",height:400,...K,marginBottom:16}}>
            <iframe title="City Map" width="100%" height="100%" frameBorder="0" style={{border:0,filter:"invert(1) hue-rotate(180deg) contrast(1.1)"}} src={`https://www.openstreetmap.org/export/embed.html?bbox=${city.lng-.08}%2C${city.lat-.05}%2C${city.lng+.08}%2C${city.lat+.05}&layer=mapnik&marker=${city.lat}%2C${city.lng}`}/>
          </div>
          <SectionHead t="NEARBY EXPERIENCES" icon={"\u{1F4CD}"} color={C.a3}/>
          <div style={{display:"flex",gap:12,overflowX:"auto",marginBottom:20}}>
            {upcoming.slice(0,5).map((e,i)=><EventCard key={e.id} e={e} compact onClick={()=>{setDetail(e);navigate("detail")}}/>)}
          </div>
          <SponsorBanner/>
        </div>
      </ScrollWrap>
    );

    // ═══ VAULT — CHANGE #8: Deals section added ═══
    if(screen==="vault")return(
      <ScrollWrap>
        {CityBG}{SearchOverlay}
        <div style={{padding:"0 20px"}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:12,letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:8}}>VAULT</div>
            <div style={{fontSize:28,fontFamily:F.s,fontWeight:700}}>Your Collection</div>
          </div>
          {/* CHANGE #8: Added "deals" tab */}
          <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",justifyContent:"center"}}>
            {["saved","deals","plans","tickets","cities","social"].map(t=>(
              <button key={t} onClick={()=>setVaultTab(t)} style={{...V(vaultTab===t),position:"relative"}}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
                {t==="deals"&&<div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:99,background:"#FF6B6B",boxShadow:"0 0 6px #FF6B6B"}}/>}
              </button>
            ))}
          </div>

          {vaultTab==="saved"&&(saved.length===0?
            <div style={{...K,padding:"50px 20px",textAlign:"center",color:"#FFFFFF",fontSize:14,border:"1px solid rgba(255,255,255,0.2)"}}>
              <div style={{fontSize:36,marginBottom:12}}>{"\u{1F516}"}</div>
              Save experiences to see them here
            </div>:
            <EventGrid items={events.filter(e=>saved.includes(e.id))} onSelect={e=>{setDetail(e);navigate("detail")}}/>
          )}

          {/* CHANGE #8: Deals section — enticing, subscription-gated */}
          {vaultTab==="deals"&&(
            <div>
              {/* Teaser header — always visible */}
              <div style={{...K,padding:20,marginBottom:16,background:`linear-gradient(135deg,${C.gold}25,${C.bgCard})`,border:`1px solid ${C.gold}30`,textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:8}}>{"\u{1F525}"}</div>
                <div style={{fontSize:20,fontWeight:700,color:C.gold,fontFamily:F.s,marginBottom:4}}>Exclusive Deals</div>
                <div style={{fontSize:14,color:C.textSec,marginBottom:4}}>{dealsData.length} active deals {"\u00B7"} Up to $500+ in savings</div>
                {!isSubscribed&&<div style={{fontSize:12,color:"#FF6B6B",fontWeight:600,marginTop:8}}>Members save an average of $200/month</div>}
              </div>

              {/* Show blurred/locked deals for non-subscribers, full for subscribers */}
              {dealsData.map((deal,i)=>(
                <div key={deal.id} style={{...K,marginBottom:12,overflow:"hidden",position:"relative",border:isSubscribed?`1px solid ${C.gold}20`:K.border}}>
                  <div style={{display:"flex",gap:12,padding:14,filter:!isSubscribed&&i>1?"blur(6px)":"none",transition:"filter 0.3s"}}>
                    <img src={deal.img} alt="" style={{width:70,height:70,borderRadius:10,objectFit:"cover",}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{deal.title}</div>
                      <div style={{fontSize:12,color:C.gold,fontWeight:600,marginBottom:2}}>{deal.venue}</div>
                      <div style={{fontSize:12,color:C.textSec}}>{deal.desc}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                        <span style={{padding:"3px 8px",borderRadius:6,background:"rgba(255,107,107,0.15)",color:"#FF6B6B",fontSize:11,fontWeight:700}}>{deal.savings}</span>
                        <span style={{fontSize:10,color:C.muted}}>{deal.cat}</span>
                      </div>
                    </div>
                  </div>
                  {/* Lock overlay for non-subscribers after first 2 */}
                  {!isSubscribed&&i>1&&(
                    <div style={{position:"absolute",inset:0,background:"rgba(6,6,12,0.6)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)"}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:20,marginBottom:4}}>{"\u{1F512}"}</div>
                        <div style={{fontSize:12,color:C.gold,fontWeight:600}}>Members Only</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Subscribe CTA */}
              {!isSubscribed&&(
                <div style={{...K,padding:24,marginTop:8,background:`linear-gradient(135deg,rgba(212,168,83,0.12),${C.bgCard})`,border:`1px solid ${C.gold}40`,textAlign:"center"}}>
                  <div style={{fontSize:11,letterSpacing:3,color:C.gold,fontWeight:700,marginBottom:10}}>GOOD TIMES+</div>
                  <div style={{fontSize:20,fontWeight:700,color:C.text,fontFamily:F.s,marginBottom:6}}>Unlock All Deals</div>
                  <div style={{fontSize:14,color:C.textSec,marginBottom:4}}>Get exclusive access to {dealsData.length}+ deals every month</div>
                  <div style={{fontSize:13,color:C.textSec,marginBottom:16}}>VIP tables {"\u00B7"} Free entry {"\u00B7"} Restaurant specials {"\u00B7"} Early access</div>
                  <button onClick={()=>{setIsSubscribed(true);showToast("Welcome to Good Times+ \u2726")}} style={{...V(true),width:"100%",padding:"16px",fontSize:16,fontWeight:700,letterSpacing:.5}}>
                    Start Free Trial {"\u2192"} $9.99/mo
                  </button>
                  <div style={{fontSize:11,color:C.muted,marginTop:8}}>Cancel anytime {"\u00B7"} 7-day free trial</div>
                </div>
              )}
              {isSubscribed&&(
                <div style={{textAlign:"center",padding:"12px 0",color:C.gold,fontSize:13,fontWeight:600}}>
                  {"\u2726"} Good Times+ Member {"\u2014"} All deals unlocked
                </div>
              )}
            </div>
          )}

          {vaultTab==="plans"&&<div style={{...K,padding:"50px 20px",textAlign:"center",color:C.muted,fontSize:13}}>Locked plans appear here</div>}
          {vaultTab==="tickets"&&<div style={{...K,padding:"50px 20px",textAlign:"center",color:C.muted,fontSize:13}}>Your tickets & RSVPs</div>}
          {vaultTab==="cities"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {Ri.map(c=>(
                <button key={c.id} onClick={()=>{setCity(c);navigate("now")}} style={{...K,padding:0,overflow:"hidden",cursor:"pointer",height:120,position:"relative"}}>
                  <img src={Ne.city[c.name]||Ne.hero} alt="" style={{width:"100%",height:"100%",objectFit:"cover",}}/>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {vaultTab==="social"&&(
            <div>
              <div style={{fontSize:12,color:C.textSec,textAlign:"center",marginBottom:16}}>Connect your socials to share plans & invite friends</div>
              {[{id:"instagram",name:"Instagram",icon:"\u{1F4F8}",color:"#E1306C"},{id:"tiktok",name:"TikTok",icon:"\u{1F3B5}",color:"#FF0050"},{id:"twitter",name:"X (Twitter)",icon:"\u{1D54F}",color:"#1DA1F2"},{id:"snapchat",name:"Snapchat",icon:"\u{1F47B}",color:"#FFFC00"}].map(soc=>{
                const conn=connectedSocials.includes(soc.id);
                return(
                  <button key={soc.id} onClick={()=>setConnectedSocials(s=>conn?s.filter(x=>x!==soc.id):[...s,soc.id])} style={{...K,width:"100%",padding:"14px 16px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:12,border:conn?`1px solid ${soc.color}40`:K.border}}>
                    <span style={{fontSize:20}}>{soc.icon}</span>
                    <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:13,fontWeight:600,color:conn?soc.color:C.text}}>{soc.name}</div></div>
                    <div style={{...V(conn),padding:"6px 14px",fontSize:10}}>{conn?"Connected":"Connect"}</div>
                  </button>
                );
              })}
            </div>
          )}
          <div style={{marginTop:20}}><SponsorBanner/></div>
        </div>
      </ScrollWrap>
    );

    // ═══ DETAIL ═══
    if(screen==="detail"&&detail){
      const clr=gt[detail.brand]?.c||C.gold;
      const isSaved=saved.includes(detail.id);
      const dt=detail.date?new Date(detail.date+"T12:00:00"):null;
      return(
        <ScrollWrap>
          <div style={{height:280,position:"relative",overflow:"hidden"}}>
            <img src={wn(detail)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(6,6,12,0) 65%,rgba(6,6,12,0.5) 100%)"}}/>
            <button onClick={goBack} style={{position:"absolute",top:14,left:14,...V(false),padding:"8px 14px"}}>{"\u2190"} Back</button>
            <button onClick={()=>toggleSave(detail.id)} style={{position:"absolute",top:14,right:14,...V(isSaved),padding:"8px 14px"}}>{isSaved?"\u2605 Saved":"\u2606 Save"}</button>
          </div>
          <div style={{padding:"20px",marginTop:-40,position:"relative",zIndex:2}}>
            <div style={{width:10,height:10,borderRadius:99,background:clr,boxShadow:`0 0 12px ${clr}`,marginBottom:8}}/>
            <div style={{fontSize:11,letterSpacing:3,color:clr,fontWeight:700,marginBottom:8}}>{detail.brand}</div>
            <div style={{fontSize:28,fontFamily:F.s,fontWeight:700,marginBottom:10,lineHeight:1.2}}>{detail.title}</div>
            {dt&&<div style={{fontSize:15,color:C.textSec,marginBottom:6}}>{dt.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>}
            <div style={{fontSize:15,color:C.textSec,marginBottom:6}}>{detail.time} {"\u00B7"} {detail.venue||"TBA"}</div>
            <div style={{fontSize:15,color:C.textSec,marginBottom:18}}>{"\u{1F4CD}"} {detail.city}</div>
            {detail.short_description&&<div style={{fontSize:16,color:C.text,marginBottom:20,lineHeight:1.6}}>{detail.short_description}</div>}
            {/* Price shown ONLY on detail view */}
            {detail.price>0&&(
              <div style={{...K,padding:16,marginBottom:16}}>
                <div style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:600,marginBottom:12}}>TICKETS</div>
                {[{l:"General Admission",m:1},{l:"VIP",m:1.25},{l:"Table Service",m:2}].map(tier=>(
                  <div key={tier.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
                    <div style={{fontSize:15,fontWeight:600}}>{tier.l}</div>
                    <div style={{fontSize:16,fontWeight:700,color:C.gold}}>${Math.ceil(detail.price*tier.m)}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <button style={{...V(true),flex:1,padding:"14px",fontSize:15,fontWeight:700,textAlign:"center"}}>Get Tickets</button>
              <button onClick={()=>{setPlanStops(s=>{const n=[...s];const idx=n.findIndex(x=>!x);if(idx>=0)n[idx]=detail;return n});navigate("plans")}} style={{...V(false),padding:"14px 20px",fontSize:13,border:`1px solid ${C.gold}30`}}>+ Add to Plan</button>
            </div>
            <SponsorBanner/>
          </div>
        </ScrollWrap>
      );
    }

    return <ScrollWrap><div style={{padding:40,textAlign:"center",color:C.muted}}>Loading...</div></ScrollWrap>;
  };

  // ═══ NAV BAR (CHANGE #4: Always visible via position:fixed) ═══
  const navDefs=[
    {id:"now",l:"Now",icon:"M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 16.89 19.32C18.55 17.68 19.13 15.19 18.15 13.06L17.98 12.72C17.9 12.56 17.78 12.39 17.66 12.2L17.66 11.2Z"},
    {id:"ent",l:"Vibe",icon:"M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17S7.79 21 10 21S14 19.21 14 17V7H18V3H12Z"},
    {id:"calendar",l:"Dates",icon:"M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM9 10H7V12H9V10ZM13 10H11V12H13V10ZM17 10H15V12H17V10Z"},
    {id:"plans",l:"Itinerary",icon:"M3 13H5V11H3V13ZM3 17H5V15H3V17ZM3 9H5V7H3V9ZM7 13H21V11H7V13ZM7 17H21V15H7V17ZM7 7V9H21V7H7Z"},
    {id:"planforme",l:"Concierge",icon:"M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"},
    {id:"explore",l:"Explore",icon:"M12 10.9C11.39 10.9 10.9 11.39 10.9 12S11.39 13.1 12 13.1C12.61 13.1 13.1 12.61 13.1 12S12.61 10.9 12 10.9ZM12 2C6.48 2 2 6.48 2 12S6.48 22 12 22S22 17.52 22 12S17.52 2 12 2ZM14.19 14.19L6 18L9.81 9.81L18 6L14.19 14.19Z"},
    {id:"map",l:"Map",icon:"M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z"},
    {id:"vault",l:"Vault",icon:"M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13S14 13.9 14 15S13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9S15.1 4.29 15.1 6V8Z"}
  ];

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.f,position:"relative",maxWidth:430,margin:"0 auto"}}>
      {renderScreen()}
      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:50,left:"50%",transform:"translateX(-50%)",zIndex:60,background:`linear-gradient(135deg,${C.gold},#B8942F)`,color:"#0A0A0F",padding:"8px 20px",borderRadius:10,fontSize:12,fontWeight:700,fontFamily:F.f,boxShadow:"0 8px 32px rgba(212,168,83,0.3)",animation:"fadeIn 0.3s ease"}}>{toast}</div>}
      {/* CHANGE #4: Bottom nav — position:fixed, always visible, z-index:40 */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:40,background:"linear-gradient(180deg,rgba(6,6,12,0.97),rgba(6,6,12,1.0))",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderTop:"1px solid rgba(212,168,83,0.12)",padding:"6px 4px 16px",display:"flex",justifyContent:"space-around"}}>
        {navDefs.map(n=>{
          const active=navScreen===n.id;
          return(
            <button key={n.id} onClick={()=>navigate(n.id,n.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"2px 0",minWidth:0,flex:1,position:"relative"}}>
              {active&&<div style={{position:"absolute",top:-6,width:24,height:2.5,borderRadius:99,background:C.gold,boxShadow:`0 0 10px ${C.gold}80`}}/>}
              <div style={{width:30,height:30,borderRadius:10,background:active?`${C.gold}18`:"rgba(255,255,255,0.15)",border:active?`1px solid ${C.gold}30`:"1px solid rgba(255,255,255,0.35)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={active?C.gold:"#FFFFFF"} style={{transition:"all 0.2s"}}><path d={n.icon}/></svg>
              </div>
              <span style={{fontSize:8,letterSpacing:.3,color:active?C.gold:"#FFFFFF",fontWeight:active?700:500,fontFamily:F.f,whiteSpace:"nowrap"}}>{n.l}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};margin:0;overflow-x:hidden;}
        ::-webkit-scrollbar{display:none;}
        button{font-family:${F.f};}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@300;400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
// deployed Mon Mar  2 09:01:48 UTC 2026
// v9.7 deployed Tue Mar 17 07:05:47 UTC 2026
