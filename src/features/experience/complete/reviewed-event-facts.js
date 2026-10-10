/** Narrow, source-reviewed display corrections. Never publish into the source database.
 * Evidence: docs/evidence/2026-10-10-event-source-review.md.
 * Match the immutable record, provider identity and occurrence; never a fuzzy title.
 */
const SOURCE='https://www.eventbrite.com/e/reggae-vs-soca-reggae-on-the-rooftop-free-entry-til-11pm-tickets-2001072123589'
export function reviewedEventFacts(event){
 if(event.city_key==='atlanta'&&event.id==='381bff7b-c1d3-46bd-b1f9-f373eaa34709'&&event.event_date==='2026-10-10'&&event.ticket_url==='https://www.eventbrite.com/e/we-should-link-atl-bracket-party-drake-edition-tickets-1997844875804')return {...event,status:'postponed',source_fact_corrections:[{fields:['status'],source_url:event.ticket_url,observed_on:'2026-10-10',original_status:event.source_fact_corrections?.[0]?.original_status||event.status}]}
 if(event.city_key==='atlanta'&&event.id==='89d0604e-fa2e-48f6-87f8-d62cf28054bd'&&event.event_date==='2026-10-10'&&event.ticket_url==='https://www.eventbrite.com/e/prvcy-saturdays-embr-lounge-tickets-1979600848427')return {...event,status:'cancelled',source_fact_corrections:[{fields:['status'],source_url:event.ticket_url,observed_on:'2026-10-10',original_status:event.source_fact_corrections?.[0]?.original_status||event.status}]}
 if(event.city_key!=='atlanta'||event.id!=='7e09a6d0-df5f-44ea-9352-e240215e78e6'||event.event_date!=='2026-10-10'||event.ticket_url!==SOURCE)return event
 return {...event,title:'REGGAE VS SOCA | REGGAE ON THE ROOFTOP | FREE ENTRY TIL 11PM',age_requirement:'21+',age_requirement_verified_at:'2026-10-10T11:11:07Z',source_fact_corrections:[{fields:['title','age_requirement'],source_url:SOURCE,observed_on:'2026-10-10',original_title:event.source_fact_corrections?.[0]?.original_title||event.title,original_age_requirement:event.source_fact_corrections?.[0]?.original_age_requirement||event.age_requirement_raw||event.age_requirement||null}]}
}

// Keep the reviewed title discoverable while the upstream record awaits publication review.
export function reviewedTitleMatches(query){const q=String(query||'').trim().toLowerCase();return q&&'reggae vs soca | reggae on the rooftop | free entry til 11pm'.includes(q)?['7e09a6d0-df5f-44ea-9352-e240215e78e6']:[]}
