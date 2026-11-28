-- GOOD TIMES · owner note 2026-11-12, part 2: venue cards that showed an EVENT FLYER (Eventbrite art) instead of the place.
-- Replaced with each venue's own site photo (checked by eye); Punch Bowl Social cleared (no Atlanta-specific photo found).
begin;
with p(id,img,src) as (values
('fd6d1a7c-3347-418c-9a3b-e11db36f87cd'::uuid,'https://static.wixstatic.com/media/11b092_409f79ef68a94df48c251d503aa27866~mv2.png/v1/fill/w_762,h_454,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/11b092_409f79ef68a94df48c251d503aa27866~mv2.png','https://www.wawa-online.org/about-6-1'),
('e965eeac-2395-466a-9253-50f83206e37b'::uuid,'https://www.emoryconferencecenter.com/files/6547/21649759_ImageLargeWidth.avif','https://www.emoryconferencecenter.com/photo-gallery.htm'),
('9cecdb11-e6e9-4f66-8ba5-ee174c8707c0'::uuid,'https://images.squarespace-cdn.com/content/v1/5dc303a64543244bccde26dd/2c928377-b5c9-422d-8a62-2136911e1d47/DSC_1703.jpg?format=1500w','https://www.pathfoundation.org/our-story'),
('1a66afc6-ffbf-4b13-801d-3ca42a4f6595'::uuid,'https://static.wixstatic.com/media/4a4ccb_70e78be346a64ba4aba53dfca2d99e14~mv2_d_3024_4032_s_4_2.jpg/v1/fill/w_1366,h_900,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/4a4ccb_70e78be346a64ba4aba53dfca2d99e14~mv2_d_3024_4032_s_4_2.jpg','https://www.sceptrebrewingarts.com/'),
('e90c96fa-56ed-450d-a717-c653744a2cac'::uuid,'https://justtrainatl.com/wp-content/uploads/2026/06/6526a8de39a7a314dd7c8928_About-Us-Just-Train-Hero-Image.webp','https://justtrainatl.com/about-just-train-about/'),
('275ba880-98cd-4bfa-95ff-f47ea4df7330'::uuid,'https://cdn.prod.website-files.com/6901c2cb4db5c6368a4691d2/69a6730e19922e0ca59fc066_DSC06014%20(2)-p-800.jpg','https://modexstudio.com/gallery'),
('c3b41713-8bbe-45b0-9c83-b83144e18be0'::uuid,'https://thegatheringspot.club/wp-content/uploads/2026/07/IMG_1069-scaled.jpg','https://thegatheringspot.club/events/'),
('d3782ae5-82c0-459a-b500-7ae42adf4c79'::uuid,'https://www.parktavern.com/wp-content/uploads/2024/09/brewpub-atlanta-in-piedmont-park1.jpg','https://www.parktavern.com/drinks-menu/'))
update public.gt_venues g set hero_image=p.img, photo_credit='Official venue website', updated_at=now(),
 metadata=coalesce(g.metadata,'{}'::jsonb)||jsonb_build_object('photo_status','official_site_photo','photo_source_url',p.src,'photo_checked_at',now(),
   'photo_checked_by','owner_pass_2026_11_12_visual_review','photo_replaced',g.hero_image)
from p where g.id=p.id;
update public.gt_venues set hero_image=null, updated_at=now(),
 metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('photo_status','needs_venue_photo','photo_replaced',hero_image,'photo_checked_by','owner_pass_2026_11_12_visual_review')
 where id='530805b4-ba3e-4e85-80eb-935d23028eda';
commit;
