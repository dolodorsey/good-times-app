// Kollective-owned programming for the "From The Kollective" home rail.
// Source of truth for dates/times/links: the live Eventbrite listings under the
// Kollective org (verified 2026-11-03). Venues are intentionally omitted until
// they are announced on the listing — never invent venue details here.
//
// Launch scope: GOOD TIMES is Atlanta-only. Items with city 'dc' are held out of
// the customer surface until Dr. Dorsey expands scope (see SOURCE_OF_TRUTH_NOTE.md).

export const HOUSE_SCOPE = ['atlanta']

const EB = id => `https://www.eventbrite.com/e/${id}`
const BRAND = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics'

export const KOLLECTIVE_PROGRAMMING = [
  // THE BALL SERIES — semi-formal
  {key:'black-ball-2026-11-21',series:'black-ball',city:'atlanta',title:'Black Ball',kicker:'THE BALL SERIES',date:'2026-11-21',time:'21:00',line:'All Black · Semi-Formal',url:EB('black-ball-all-black-semi-formal-tickets-1985661310432'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196846294%2F2574990468831%2F1%2Foriginal.20261029-120309?auto=format%2Ccompress&q=75&sharp=10&s=a8067bcffb1ce987404c60deaf5bfb17"},
  {key:'snow-ball-2026-12-19',series:'snow-ball',city:'atlanta',title:'Snow Ball',kicker:'THE BALL SERIES',date:'2026-12-19',time:'21:00',line:'Winter White · Semi-Formal',url:EB('snow-ball-winter-white-party-tickets-1985661311435'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196846855%2F2574990468831%2F1%2Foriginal.20261029-121132?auto=format%2Ccompress&q=75&sharp=10&s=6628bf88a583a1b2f38dd79d77d5ff6e"},
  {key:'champagne-ball-2026-12-31',series:'champagne-ball',city:'atlanta',title:'Champagne Ball',kicker:'THE BALL SERIES',date:'2026-12-31',time:'21:00',line:'New Year’s Eve · Semi-Formal',url:EB('champagne-ball-new-years-eve-black-tie-tickets-1998051720482'),image:`${BRAND}/motion/111atl/champagne-ball.jpg`},
  {key:'diamond-ball-2026-12-10',series:'diamond-ball',city:'dc',title:'Diamond Ball',kicker:'THE BALL SERIES',date:'2026-12-10',time:'18:00',line:'Invitation-Only Charity Experience',url:EB('diamond-ball-invitation-only-charity-experience-tickets-2004063755641'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196847311%2F2574990468831%2F1%2Foriginal.20261029-121942?auto=format%2Ccompress&q=75&sharp=10&s=515fcb959b492962490dffad507a76b6"},
  {key:'crystal-ball-2026-12-10',series:'crystal-ball',city:'dc',title:'Crystal Ball',kicker:'THE BALL SERIES',date:'2026-12-10',time:'21:00',line:'Charity Experience · Semi-Formal',url:EB('crystal-ball-charity-experience-tickets-2004063810806'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196847494%2F2574990468831%2F1%2Foriginal.20261029-122321?auto=format%2Ccompress&q=75&sharp=10&s=c624dcf9f358b1d7281270cbd02b48de"},

  // MEMBER'S ELITE — Sports Division
  {key:'kings-2026-11-20',series:'kings-of-the-court',city:'atlanta',title:'Kings of the Court',kicker:'MEN’S BASKETBALL',date:'2026-11-20',time:'19:00',line:'Men’s 5v5 · $10K to win',url:EB('kings-of-the-court-mens-5v5-tickets-2003872195680'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196845971%2F2574990468831%2F1%2Foriginal.20261029-115823?auto=format%2Ccompress&q=75&sharp=10&s=8e22bb9df1567a944bf9b0385c4fe8d0"},
  {key:'kings-2026-12-18',series:'kings-of-the-court',city:'atlanta',title:'Kings of the Court',kicker:'MEN’S BASKETBALL',date:'2026-12-18',time:'19:00',line:'Men’s 5v5 · $10K to win',url:EB('kings-of-the-court-mens-5v5-tickets-2003872198689'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196846547%2F2574990468831%2F1%2Foriginal.20261029-120636?auto=format%2Ccompress&q=75&sharp=10&s=13aff6775c2b405a051fdd594eadd4ad"},
  {key:'she-bang-2026-11-21',series:'she-bang',city:'atlanta',title:'She Bang',kicker:'WOMEN’S BASKETBALL',date:'2026-11-21',time:'16:00',line:'Women’s Dunk League · $10K to win',url:EB('she-bang-womens-dunk-league-tickets-2003872196683'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196846230%2F2574990468831%2F1%2Foriginal.20261029-120213?auto=format%2Ccompress&q=75&sharp=10&s=00c8def7fcdb9a345db494656f0082db"},
  {key:'she-bang-2026-12-19',series:'she-bang',city:'atlanta',title:'She Bang',kicker:'WOMEN’S BASKETBALL',date:'2026-12-19',time:'16:00',line:'Women’s Dunk League · $10K to win',url:EB('she-bang-womens-dunk-league-tickets-2003872200695'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196846707%2F2574990468831%2F1%2Foriginal.20261029-120911?auto=format%2Ccompress&q=75&sharp=10&s=2b0ce7983e8772f49e83a5622f002004"},
  {key:'champ-sunday-2026-11-22',series:'championship-sunday',city:'atlanta',title:'Championship Sunday',kicker:'TOURNAMENT FINALS',date:'2026-11-22',time:'16:00',line:'Member’s Elite Sports Division',url:EB('championship-sunday-tickets-2003872197686'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196846415%2F2574990468831%2F1%2Foriginal.20261029-120452?auto=format%2Ccompress&q=75&sharp=10&s=1fe4c9e2b82a02123c8f730605d100cc"},
  {key:'champ-sunday-2026-12-20',series:'championship-sunday',city:'atlanta',title:'Championship Sunday',kicker:'TOURNAMENT FINALS',date:'2026-12-20',time:'16:00',line:'Member’s Elite Sports Division',url:EB('championship-sunday-tickets-2003872201698'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196846778%2F2574990468831%2F1%2Foriginal.20261029-121006?auto=format%2Ccompress&q=75&sharp=10&s=2ec5c67a8582ad72eda993e2dbf574d4"},

  // COMMUNITY
  {key:'turkey-drive-atl-2026-11-21',series:'turkey-drive',city:'atlanta',title:'Give a Gobble',kicker:'TURKEY DRIVE',date:'2026-11-21',time:'11:00',line:'Free community turkey giveaway',free:true,cta:'Free RSVP',url:EB('give-a-gobble-turkey-drive-giveaway-tickets-2004110761236'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196914878%2F2574990468831%2F1%2Foriginal.20261030-085051?auto=format%2Ccompress&q=75&sharp=10&s=934d9ffb280c780ea34bc07e275c3355"},
  {key:'turkey-drive-dc-2026-11-17',series:'turkey-drive-dc',city:'dc',title:'Give a Gobble',kicker:'TURKEY DRIVE',date:'2026-11-17',time:'11:00',line:'Free community turkey giveaway',free:true,cta:'Free RSVP',url:EB('give-a-gobble-turkey-drive-giveaway-tickets-2004110707074'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196914847%2F2574990468831%2F1%2Foriginal.20261030-084952?auto=format%2Ccompress&q=75&sharp=10&s=62f77de52e62c15d9415c6298f6d44d7"},
  {key:'santa-in-atlanta-2026-12-22',series:'santa-in-atlanta',city:'atlanta',title:'Santa in Atlanta',kicker:'CHRISTMAS CONCERT & TOY DRIVE',date:'2026-12-22',time:'20:00',line:'Free RSVP · Bring a new, unwrapped toy',free:true,cta:'Free RSVP',url:EB('santa-in-atlanta-tickets-2004110817404'),image:"https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196914904%2F2574990468831%2F1%2Foriginal.20261030-085135?auto=format%2Ccompress&q=75&sharp=10&s=dc213d3caaf17eef600938afba923ce6"},

  // BRANDS (no single date)
  {key:'american-track-field',series:'atf',city:'atlanta',kind:'brand',title:'American Track & Field',kicker:'NOW LAUNCHED',line:'The next era of competition',cta:'Explore ATF',url:'https://americantnf.com',image:'https://americantnf.com/atf/atf-02.webp'},
  {key:'sole-exchange',series:'sole-exchange',city:'atlanta',kind:'brand',title:'Sole Exchange',kicker:'SHOE DRIVE',line:'A Member’s Elite community drive',cta:'Learn More',url:'https://thememberselite.com/sole-exchange',image:`${BRAND}/websites/graphics/SOLE_EXCHANGE_WEBSITE/ChatGPT_Image_Jul_30_2026_02_35_07_AM_1_.png`},
]

/** Next upcoming occurrence of each in-scope series, chronological, brands last. */
export function upcomingKollective(today, items = KOLLECTIVE_PROGRAMMING, scope = HOUSE_SCOPE) {
  const bySeries = new Map()
  for (const item of items) {
    if (!scope.includes(item.city)) continue
    if (item.kind !== 'brand' && (!item.date || item.date < today)) continue
    const current = bySeries.get(item.series)
    if (!current || String(item.date) < String(current.date)) bySeries.set(item.series, item)
  }
  const rows = [...bySeries.values()]
  const events = rows.filter(r => r.kind !== 'brand').sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  return [...events, ...rows.filter(r => r.kind === 'brand')]
}
