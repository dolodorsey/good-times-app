-- GOOD TIMES · owner note 2026-11-12 ("why are we still missing pics")
-- Photos from each venue's OWN website, rendered in a real browser (home + about/gallery pages), every one checked by eye.
-- Rejected: logos, flyers, merchandise, stock (e.g. a Stocksy file on Cotto's site), and photos of a different location
-- (Kids Empire Bolingbrook IL, Natural Body Snellville, Ghee Miami, Ritz-Carlton beach resorts).
-- Also replaces values that never displayed: raw Google photo codes (need an API key) and links that 404/401/403.
begin;
with p(id,img,src) as (values
('854d0b8e-888d-4411-b815-573fc740c7e7'::uuid,'https://static.wixstatic.com/media/5009c7_57c2ac1c499a4a4ca4478d37029079c5~mv2.jpg/v1/fill/w_1366,h_958,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/5009c7_57c2ac1c499a4a4ca4478d37029079c5~mv2.jpg','https://www.omakasetableatl.com/menu'),
('cb88fcc5-c16e-4c85-bd44-f62b1b73bf12'::uuid,'https://sluttyveganatl.com/wp-content/uploads/2021/04/Unknown-scaled.jpeg?id=1940','https://sluttyveganatl.com/about/'),
('6b818fec-f4b2-48ca-a12a-7c15d23347d8'::uuid,'https://images.squarespace-cdn.com/content/v1/69e63a8daae3df744635027d/5821d8b2-758b-453a-ad5b-2356e8c6899b/Tasting+Room+1.jpg?format=1500w','https://www.sagra-eav.com/about'),
('8cfb6297-e023-4d01-8bdf-8ed096fb34b0'::uuid,'https://royalpeacocklounge.com/wp-content/uploads/2023/05/DSC_0369.jpg','https://royalpeacocklounge.com/'),
('c166b377-673c-40e7-b948-fd2460b31101'::uuid,'https://barcelonawinebar.com/media/Barcelona_FF_250-1400x600.jpg','https://barcelonawinebar.com/private-events/'),
('abe87d6a-2c33-437e-ad5a-f60140dcb816'::uuid,'https://canoeatl.com/wp-content/uploads/2017/10/Setting-Hero.jpg','https://canoeatl.com/menu/'),
('6a4a687f-fc69-41f0-99ac-21b38eb8f5f2'::uuid,'https://cdn.spotapps.co/spothopper/image/fetch/f_auto,q_auto:best,c_fit,h_1200/http://static.spotapps.co/spots/20/94a93dee94483da869fb4ca3ae80e1/:original','https://eightsushiatl.com/atlanta-west-midtown-eight-sushi-lounge-drink-menu'),
('8970a49b-0f32-472d-904e-c41984295e84'::uuid,'https://tassilisrawreality.com/__l5e/assets-v1/f43d868c-3748-4be4-8342-94cf428fac4e/South_of_Border_Salad.png','https://tassilisrawreality.com/menu'),
('b78d12d3-4d1e-488f-83db-ca11dc59eb9c'::uuid,'https://images.squarespace-cdn.com/content/v1/61d7610c217e3c072ec0c94e/3d2724a5-0db2-46d8-bad0-1686dace6ebc/mujo_012822_final_0056.jpg?format=1500w','https://www.mujoatl.com/private-events'),
('3b31d241-6566-4940-bea2-863acc5f30b7'::uuid,'https://images.squarespace-cdn.com/content/v1/68084605947182676e95d9d5/c31d4ca9-33fa-43e1-834a-656f286000ed/Large+party+private+dinner+setting.jpg?format=1500w','https://www.luellaatl.com/'),
('4d2f4d4e-d21c-4046-82ee-73fb548309bf'::uuid,'https://shopmashburn.com/cdn/shop/files/About-1-Beginning_788x1135.png?v=1614767397','https://shopmashburn.com/pages/sid-mashburn-about-us'),
('26fa734e-03ad-4c67-ab96-be370d8481af'::uuid,'https://shopmashburn.com/cdn/shop/files/22-AM-About-1-Beginning-sq_788x1135.jpg?v=1655058019','https://shopmashburn.com/pages/ann-mashburn-about-us'),
('098d8a2a-4a39-406f-8d99-165a33a89d86'::uuid,'https://northsidetavern.com/images/f/dsc_7844-copy-1600.jpg','https://northsidetavern.com/chicken-raid-2-photos.html'),
('482bdae2-a221-4fd4-ac41-d11c4cc957cf'::uuid,'https://experienceavalon.com/wp-content/uploads/2025/07/About-page.png','https://experienceavalon.com/events/'),
('a0df72e8-683c-4ee6-ac5e-1d1b0ad386ef'::uuid,'https://static.wixstatic.com/media/c57921_036d88f4c582494aa66d41e07b0b7090~mv2.jpg/v1/fill/w_1284,h_751,al_c,q_85,enc_avif,quality_auto/c57921_036d88f4c582494aa66d41e07b0b7090~mv2.jpg','https://www.mysistersroom.com/events'),
('88fad061-b61e-48d6-be08-e6acf6eff320'::uuid,'https://images.squarespace-cdn.com/content/v1/627a97904976422bd6a2e3bc/1772550793148-QNIPBQHEDY1YYR7HOJRY/07.24.24_Breaker_SG-39+%282%29.jpg?format=1000w','https://www.breakerbreakeratl.com/privateevents'),
('487fd3a7-6419-4bc2-ae95-dc9b3abd6c16'::uuid,'https://images.squarespace-cdn.com/content/v1/5d7bcdf141f5707bcedfab7d/99e9f85a-b2da-4ab4-91f1-cecfd5724867/464130286_552311254114759_8098536221471069254_n-2.jpg?format=1500w','https://www.ticonderogaclub.com/menu'),
('d898df8c-b9b1-45e5-a757-720ae1dd5dcd'::uuid,'https://images.squarespace-cdn.com/content/v1/5e8294d0e67ce214c00a6cc3/1587598928122-WNE237LSTE0SG09VVCN3/mjqcrowd.jpg?format=1500w','https://www.mjqofficial.com/about'),
('28ca446a-58b7-4c8f-8475-63f016a55830'::uuid,'https://pastabish.com/wp-content/uploads/2025/12/2.jpg','https://pastabish.com/about-us/'),
('abe5dcfa-a304-42f9-b754-59441264ffb1'::uuid,'https://images.squarespace-cdn.com/content/v1/5fa2f9c185b60500e0b6656f/d5fd7910-75c4-49fa-99ed-8e224df17c58/Interior+20.jpeg?format=2500w','https://theblindpigparlourbar.com/'),
('53e3f699-e0c1-4d8a-afb0-56c61fa236cd'::uuid,'https://images.squarespace-cdn.com/content/v1/6037e1a721fdb7390514d078/c5dbcfb5-e27d-4007-aea8-0292f9e33c1c/JoJos0012.jpg?format=1500w','https://www.jojosbeloved.com/private-events'),
('6779ede8-8a6f-461c-a041-430b44c0571b'::uuid,'https://sluttyveganatl.com/wp-content/uploads/2020/08/PinkyGrandOpening-scaled.jpg','https://sluttyveganatl.com/about/'),
('f0395989-f079-4fca-ab56-61d7afe2fb23'::uuid,'https://www.homegrownga.com/wp-content/uploads/2025/04/crab_po_boy.webp','https://www.homegrownga.com/menu/'),
('5acce7fd-2955-40ed-b3c0-06f06012b891'::uuid,'https://brashcoffee.com/cdn/shop/files/brash_nov-18_2048x2048.jpg?v=1793817723','https://brashcoffee.com/'),
('42666f27-decb-4f3c-a710-ace7931ef404'::uuid,'https://www.escapethenetherworld.com/wp-content/uploads/cache/2017/08/Nosferatu/2943884296.jpg','https://www.escapethenetherworld.com/gallery/'),
('2744c27b-b68a-4b07-a2dd-e44dbf03eacc'::uuid,'https://www.cfbhall.com/media/un4huhd0/tickets_visit-bg_mobile.jpg','https://www.cfbhall.com/visit/hours-information/'),
('134aae4d-631c-4d95-a946-d6fc73dfd14a'::uuid,'https://www.masqueradeatlanta.com/wp-content/uploads/2017/05/Superheaven-2025-Credit-desotophoto-1-e1765383199144-2048x926.jpg','https://www.masqueradeatlanta.com/gallery/'),
('6460118c-897c-478f-95eb-e765df5b6b7f'::uuid,'https://jaggersuite.com/wp-content/uploads/2026/05/ATLDX-Jagger-Suite-Overview-with-Stardust.webp','https://jaggersuite.com/'),
('0774b79b-e2b5-465a-b8f2-fcb3457c53d0'::uuid,'https://www.spasydell.com/wp-content/uploads/2026/06/Hero@1.2x-7-2.avif','https://www.spasydell.com/'),
('3f88f114-42d3-4c4a-8f9c-6bdc5dab090f'::uuid,'https://static.wixstatic.com/media/00c2f5_500897ca1e404f31a2735855b6bb1d4c~mv2.png/v1/crop/x_0,y_9,w_5001,h_3332/fill/w_976,h_650,fp_0.50_0.50,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/hompage%20building.png','https://www.pullmanyards.com/about'),
('d46dc306-dc0f-467d-a81f-271ff40b0c06'::uuid,'https://static.wixstatic.com/media/4748f3_03c54ff473fe40f4bad636848875a056~mv2.jpg/v1/fill/w_1366,h_561,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/4748f3_03c54ff473fe40f4bad636848875a056~mv2.jpg','https://www.ragorama.com/'),
('c42fd2c3-14ce-4ab9-a5a8-8982e15e116e'::uuid,'https://static.wixstatic.com/media/ced4e0_d00af5545fa24358bf240b4b2a3a34a2~mv2.jpg/v1/fill/w_683,h_623,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/ced4e0_d00af5545fa24358bf240b4b2a3a34a2~mv2.jpg','https://www.southernfirekitchen.com/about-us'),
('6644719c-673c-4a92-ad0b-8492aa20a05c'::uuid,'https://cdn.artcld.com/img/w_1920,h_1920,c_fit/o08ceczblib4l7v776xw.jpg','https://www.whitespace814.com/'),
('b0fc8f14-9ef0-4e81-99ab-385b708e988d'::uuid,'https://images.squarespace-cdn.com/content/v1/683fb0b4ba94e671bfcb869e/a100c2a5-2eb8-49c9-8904-6643e761bf5d/KMC+Georgia+Shrine?format=1500w','https://www.meditationingeorgia.org/upcoming-events'),
('88d31118-4902-44e2-95c1-0a142ff00f97'::uuid,'https://d16bl9hbknyxy0.cloudfront.net/acb845c4-7c10-49e1-b473-40115e23ad50/4aa0b96b-c611-4f67-b88c-57760ec3a270/img_8537.jpeg?w=2400&h=2400&fit=inside&Expires=9223372036854775&Signature=OkwXqDwFBBdV~URbGIxWXDrqb5Y96sl-o4cQvbwtog8~EwFJYlUom36b-1DHSsf~MKKmotp7o4gE6tm7UqEyARGMIdwngv4rVQMn814~S~voG9pklz5pRH9-7iJLXGoOOGjhZ8qmhcFPyGV3163c0t6B0MPJkFGHkKTPM~ykvWDPD7mlTQ3BfHMqGdXSCd9OaS21tV0prOFpzS0PglxEuFMjjfBoxVsM9EnmvW9Oh4vMhIUZql9Elv1U0dyV~HbsFdwD9JDqH-1UVvd7b6Ks7WUhJUk9knDkV~XpgTZgKMmr2uKdAS78i1S0ccoLWTBQV0UupMRAzB59ckhNXYh2vQ__&Key-Pair-Id=K2SKI2Y48Y62V1','https://www.leeandwhiteatl.com/events-calendar/'),
('e9f21ac7-8bca-4e0c-916c-92c60c6787bc'::uuid,'https://www.masqueradeatlanta.com/wp-content/uploads/2025/12/wow-heaven-credit-elena-de-soto-5-e1765406905741-2048x1049.jpg','https://www.masqueradeatlanta.com/gallery/'),
('025bd88f-1eec-4def-af17-d5616efea053'::uuid,'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEil4LxUOfKYNA94v-8nw9lru7307TOlib5cfVGNTrUJ6rAfh01ye_i7oCwTPewPwNXn7yqYhIVg9nlqcbARgotlqYkQEYAFA7e2BPl7qZKzY0Au5fA8aiXqK7oUsHRf3c6kvIXx-g1MJ08/s1200/002.jpg','https://www.twourbanlicks.com/p/complete.html'),
('52f55bbb-3c6e-41be-aa59-c3c1f4ca846c'::uuid,'https://static.wixstatic.com/media/9545e7_00646306207a4f31a086987fff25b32a~mv2.jpg/v1/fill/w_683,h_679,al_t,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/9545e7_00646306207a4f31a086987fff25b32a~mv2.jpg','https://www.apachexlr.com/events'),
('ab1de6bb-8fe2-44bb-b536-8822bb35f77e'::uuid,'https://www.redphonebooth.com/media/lounge-fireplace.jpg','https://www.redphonebooth.com/'),
('fce1d770-712b-4063-a15d-26d5ddc0699c'::uuid,'https://static.wixstatic.com/media/c546f1_4351faeb8b4d4859a5c9ba27a84e689e~mv2.jpg/v1/fill/w_1326,h_900,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/c546f1_4351faeb8b4d4859a5c9ba27a84e689e~mv2.jpg','https://www.ourbaratl.com/events'),
('0a432f3f-e1a5-4f14-8d14-605507532df8'::uuid,'https://static.wixstatic.com/media/1c77d6_d4dd4dba54504be8ae349d100999ba15~mv2.jpg/v1/fill/w_1206,h_948,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1c77d6_d4dd4dba54504be8ae349d100999ba15~mv2.jpg','https://www.playfunvillefactory.com/'),
('51f9ac38-3143-46d4-81cf-52947b37a2c2'::uuid,'https://thevelvetnote.com/images/footer-background.webp','https://thevelvetnote.com/Menu/'),
('c7e0b90a-ad2f-4ca1-baef-88cecec4a3d7'::uuid,'https://www.urbanair.com/_next/image?url=https%3A%2F%2Fwww.urbanair.com%2Fwp-content%2Fuploads%2F2024%2F08%2FMini-Karts-2-1600x900-1-1024x576.jpg&w=750&q=75','https://www.urbanair.com/georgia-kennesaw/'),
('3786f030-043d-4686-9e25-495ad91ac18e'::uuid,'https://alons.com/wp-content/uploads/2025/10/25_0401_VHD_Alon_s_1039-scaled.jpg','https://alons.com/about/'),
('089de72f-4a7e-4b58-942d-21fd505f5c02'::uuid,'https://static.wixstatic.com/media/b57416_bddc802c91ab4a068c0824a605db7216~mv2.jpg/v1/fill/w_1366,h_788,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/b57416_bddc802c91ab4a068c0824a605db7216~mv2.jpg','https://www.thirtythreeatl.com/copy-of-menu'),
('d3aab937-c2e8-451f-9f19-8468eea9b19a'::uuid,'https://marymacs.com/wp-content/themes/marymacs/images/marymacs.jpg','https://marymacs.com/'),
('449053b7-2c44-46fa-b3b0-e28c0c9d1b60'::uuid,'https://cdn.spotapps.co/spothopper/image/fetch/f_auto,q_auto:best,c_fit,h_1200/http://static.spotapps.co/spots/5b/9f87cf26924a37a8a8af36a6abac53/:original','https://statsatl.com/'),
('e2c765df-ab98-4384-962c-72ee8829dbb0'::uuid,'https://images.squarespace-cdn.com/content/v1/66902061eb17a004878ab3f5/77efa227-16c6-4aac-97fb-0f490ca585d3/Screenshot+2024-08-26+at+8.55.16%E2%80%AFAM.png?format=1500w','https://www.millerunion.com/about'),
('d8527409-5e88-4c2b-bd5a-c42e045fe108'::uuid,'https://bonesrestaurant.com/wp-content/uploads/2019/03/tony3-2000x1333-DC8A1267.jpg','https://bonesrestaurant.com/'),
('6001c994-fc87-4d62-a1f8-acf4809a6640'::uuid,'https://d1w7312wesee68.cloudfront.net/9H2JZwYsgVE3CB_zFj02mOkmBGyAR3o8D4jn6U14Mwk/ext:webp/quality:85/preset:xxl/plain/s3://toast-sites-resources-prod/restaurantImages/4cde4c9c-6fa4-4e08-a741-c7bcee264b7d/HungryAFFinals8354.jpg','https://thehungryaf.com/menu/hungry-af-buckhead-2221-peachtree-road-northeast-suite-e'),
('e9d0cb4f-7844-4cc1-a120-da4fb2a728e5'::uuid,'https://blakesontheparkatl.com/wp-content/uploads/2018/03/20170825_150430.jpg','https://blakesontheparkatl.com/#gallery'),
('d6d20f01-d9e6-40f4-962a-51cf6d53b708'::uuid,'https://chopslobsterbar.com/_astro/atlanta-interior.BPla1Xuv_Z1k9Ehp.webp','https://chopslobsterbar.com/locations/atlanta-buckhead/private-events'),
('0f743cb7-272a-42fe-9291-68b008e67baf'::uuid,'https://bunny-wp-pullzone-pfjrnfv5uz.b-cdn.net/wp-content/uploads/2022/09/ccATLSIgo-805168-Lakemont-Golf-Course-High.jpg?width=1920&height=1080&aspect_ratio=1920:1080','https://atlantaevergreen.com/social-events/'),
('0cdf79d1-641e-4119-8c68-02ab311dba99'::uuid,'https://cdn.spotapps.co/spothopper/image/fetch/f_auto,q_auto:best,c_fit,h_1200/http://static.spotapps.co/spots/bb/4d7238655f4fca9e0916d924691a89/:original','https://darkhorseatlanta.com/atlanta-virginia-highlands-dark-horse-tavern-events'),
('5f399ce3-01c8-4e49-82d0-667257d2b06f'::uuid,'https://glennhotel.com/wp-content/uploads/2021/01/glennhotel-model-room-02.jpg','https://glennhotel.com/meetings-events/'),
('7465f811-549b-4d78-a9ef-de3284c89b71'::uuid,'https://cdn.spotapps.co/spothopper/image/fetch/f_auto,q_auto:best,c_fit,h_1200/http://static.spotapps.co/spots/de/b287f37aae4fbdbd3ef390121b2710/:original','https://johnnyshideaway.com/'),
('e5a137f9-3393-4c7c-95aa-530cc182317d'::uuid,'https://cdn.spotapps.co/spothopper/image/fetch/f_auto,q_auto:best,c_fit,h_1200/http://static.spotapps.co/spots/b4/10c008f2084b218b5de4fe161f2094/:original','https://metrodineratl.com/'),
('ad894b29-26ce-433d-b0a7-c9ac3f4b1ed1'::uuid,'https://highlandcigar.com/wp-content/themes/highland-cigar/assets/images/bar.jpg','https://highlandcigar.com/'),
('21068dac-f1ee-48b2-9874-13db757db245'::uuid,'https://images.getbento.com/accounts/df6599070a7d3089eace6bccf2cf7e89/media/images/35147RR_Homepage.jpg?w=1200&fit=crop&auto=compress,format&cs=origin&crop=focalpoint&fp-x=0.5&fp-y=0.5','https://www.raysrestaurants.com/'),
('022153d5-8158-4fde-bd24-99b179576586'::uuid,'https://static.wixstatic.com/media/8c5b49_13d6acfaf9fa4daa9db97368866bd462.jpg/v1/fit/w_2500,h_1330,al_c/8c5b49_13d6acfaf9fa4daa9db97368866bd462.jpg','https://www.publik654.com/events-cszx'),
('aa1e90af-785d-4d25-9de0-30f9e196d5e9'::uuid,'https://www.daveandbusters.com/content/dam/dnb/home-page-compressed/20241215_DB_14_MIDWAY-GAMES_0299_R1.jpg','https://www.daveandbusters.com/us/en/about/blog'),
('f0bd9ac1-1fe2-42dc-9285-c28766ce2fa6'::uuid,'https://cdn.builder.io/o/assets%2Fd80894dbb7e449539fe3384e280a2583%2Fe3328d6bb2fb46e5b60443492bf83980?alt=media&token=75979bf7-1a37-4caf-9cc1-d2a5633c8b91&apiKey=d80894dbb7e449539fe3384e280a2583','https://www.maggianos.com/menus'),
('a61c1afc-c66c-4c92-b3a0-7d6593e94ba4'::uuid,'https://www.staging.badearl.com/imgs/EARL-bg-1920-01.jpg','https://badearl.com/menu-daily/'),
('05709974-be3e-4303-b1e2-d945bdeed922'::uuid,'https://media.fogodechao.com/wp-content/uploads/2026/10/29023818/DSC05739-hero.webp','https://fogodechao.com/'),
('7aae8769-4a90-4417-a4e4-1766f619ced0'::uuid,'https://cafe.hardrock.com/atlanta/files/5283/HardRockATL2021_1110_065531-5_ALIVECOVERAGE.jpg','https://cafe.hardrock.com/parties-and-events.aspx'),
('42ad5ffe-e2ad-40a6-9f7a-2230594104a3'::uuid,'https://hippohopp.com/assets/media/hero-real-1200.webp','https://hippohopp.com/events/'),
('79be92f5-ad81-4efe-aaf1-734da6a3f3c1'::uuid,'https://cdn.spotapps.co/spothopper/image/fetch/f_auto,q_auto:best,c_fit,h_1200/http://static.spotapps.co/spots/67/df372ae6124ca3b14ecdbab6be293e/:original','https://glennsskylounge.com/'),
('0be14234-6a11-4bb8-b1bd-4a2b1761d7fe'::uuid,'https://theslimefactory.com/assets/georgia-large-party-v1.webp','https://theslimefactory.com/events'),
('d7ddf831-1dd6-41f5-ada7-9eefeacbed50'::uuid,'https://assets01.esinfra.net/uploads/Escape_Rooms_Sandy_Springs_GA_1740239fdb.jpeg','https://www.escapology.com/en/about-escapology-franchise'),
('6c10bb09-f39d-4b23-8d82-ee992b6512ba'::uuid,'https://dunwoodynature.org/wp-content/uploads/Screen-Shot-2023-09-28-at-12.43.55-PM-1454x770.webp','https://dunwoodynature.org/about/'),
('635fabda-edc2-4bc1-b530-875f1647391f'::uuid,'https://images.squarespace-cdn.com/content/v1/67b38f2514a9e35ff0694ea4/1742330809416-WC9Y4LUSZ258NTUOU1K6/homepage-location+copy+2.png','https://www.thevortexbar.com/'),
('4b38e41c-401d-485a-9866-b9a76b27d701'::uuid,'https://poncecitymarket.com/wp-content/uploads/2024/12/Citizen-Supply-at-Ponce-City-Market_Courtesy-of-Jamestown.jpg','https://poncecitymarket.com/'),
('a86eab4d-03f4-44a4-a20c-d7315c21048e'::uuid,'https://poncecitymarket.com/wp-content/uploads/2024/12/Ponce-City-Market_Photo-Courtesy-of-Jamestown13-scaled.jpg','https://poncecitymarket.com/'))
update public.gt_venues g set hero_image=p.img, photo_credit='Official venue website', updated_at=now(),
 metadata=coalesce(g.metadata,'{}'::jsonb)||jsonb_build_object('photo_status','official_site_photo','photo_source_url',p.src,'photo_checked_at',now(),
   'photo_checked_by','owner_pass_2026_11_12_visual_review','photo_replaced',g.hero_image)
from p where g.id=p.id;

-- Same place listed twice (same address/site). Keep the fuller row; the other is marked merged (not deleted).
update public.gt_venues set hero_image=(select hero_image from public.gt_venues where id='5a12c247-8e73-4466-b416-116050e9043a'),
 photo_credit='Official venue website', updated_at=now(),
 metadata=coalesce(metadata,'{}'::jsonb)||'{"photo_status":"official_site_photo","photo_checked_by":"owner_pass_2026_11_12_visual_review"}'
 where id='52f0334e-bf87-4469-9f01-13828b768227';
update public.gt_venues set website='https://thevortexatl.com', updated_at=now(),
 metadata=coalesce(metadata,'{}'::jsonb)||'{"website_fixed":"owner_pass_2026_11_12","was":"https://thevortexbarandgrill.com (unrelated page)"}'
 where id='635fabda-edc2-4bc1-b530-875f1647391f';
update public.gt_venues g set status='merged_duplicate', updated_at=now(),
 metadata=coalesce(g.metadata,'{}'::jsonb)||jsonb_build_object('merged_into',m.keep,'merged_by','owner_pass_2026_11_12')
from (values ('5a12c247-8e73-4466-b416-116050e9043a'::uuid,'52f0334e-bf87-4469-9f01-13828b768227'),
             ('82977737-e3c7-4032-8119-6c4afe0521a6'::uuid,'52f0334e-bf87-4469-9f01-13828b768227'),
             ('c928ceee-d0b6-40ee-af0a-a99a2bf113b6'::uuid,'635fabda-edc2-4bc1-b530-875f1647391f'),
             ('403c60b9-0664-47f4-98f3-063b9a98eccc'::uuid,'79be92f5-ad81-4efe-aaf1-734da6a3f3c1'),
             ('48518d23-008c-4335-997d-cc3a1646ec67'::uuid,'51f9ac38-3143-46d4-81cf-52947b37a2c2')) m(id,keep)
where g.id=m.id and g.status='active';
commit;
refresh materialized view public.mv_gt_venue_taxonomy_directory;
