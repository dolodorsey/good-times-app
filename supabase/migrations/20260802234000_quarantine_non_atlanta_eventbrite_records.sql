begin;

-- These exact records were created by the 2026-08-02 bounded Eventbrite test.
-- Their JSON-LD explicitly identifies a VirtualLocation/online attendance and
-- provides no Atlanta venue or address. Preserve the evidence, but remove the
-- records from publication and ranking.
update public.gt_sourced_events
set raw_data = coalesce(raw_data, '{}'::jsonb) || jsonb_build_object(
      'quality_quarantine', jsonb_build_object(
        'reason', 'eventbrite_virtual_or_non_atlanta',
        'quarantined_at', now(),
        'previous_is_verified', is_verified,
        'previous_is_published', is_published,
        'previous_published_to_gt', published_to_gt
      )
    ),
    is_verified = false,
    is_published = false,
    published_to_gt = false,
    legacy_quarantined_at = now(),
    legacy_quarantine_reason = 'eventbrite_virtual_or_non_atlanta',
    updated_at = now()
where id in (
  'f0834974-9288-403d-bd36-141fe66aa8a8',
  '366699b0-aed2-4a27-ad3e-3248f28bf1c6',
  '0173e00a-ded8-4b75-a46d-49a019110ba8',
  '2438606d-0aaf-4418-80a3-abfd29bcbdc3',
  '56132dbe-9702-4c1f-bbc0-6f4f1cbab632',
  'bbac8b7a-2044-47d7-97a3-b71b4210624f',
  '0184792d-34c7-43b8-97aa-2b03703985a9'
);

update public.gt_shows
set status = 'cancelled',
    display_priority = 0,
    is_featured = false,
    is_curated = true,
    curation_reason = 'quarantined_eventbrite_virtual_or_non_atlanta',
    updated_at = now()
where source_url in (
  'https://www.eventbrite.com/e/tickets-south-african-teachers-in-the-netherlands-1992231356617',
  'https://www.eventbrite.com/e/tickets-nis2-ben-jij-er-al-helemaal-klaar-voor-1993317890469',
  'https://www.eventbrite.com/e/registratie-she-connects-1991274089405',
  'https://www.eventbrite.com/e/tickets-webinar-passend-en-toegankelijk-lezen-op-school-en-thuis-1988471166788',
  'https://www.eventbrite.com/e/tickets-skills-dialoog-1-samen-op-de-luisterladder-1989298473284',
  'https://www.eventbrite.com/e/london-career-fair-tickets-238771741707',
  'https://www.eventbrite.com/e/tickets-violence-et-grossesse-1989219341599'
);

select public.gt_refresh_atlanta_display_priority();

commit;
