-- Fill verified public location/contact facts for approved GOOD TIMES nightlife photography.
-- These rows were already active/verified but were excluded by the customer-ready
-- RLS boundary because their address was blank.

update public.gt_venues
set address='887 Spring St NW, Atlanta, GA 30308',
    phone=coalesce(nullif(phone,''),'+1 404-892-3037'),
    updated_at=now()
where city_key='atlanta' and slug='cheetah-3-atl';

update public.gt_venues
set address='1353 Brockett Rd, Clarkston, GA 30021',
    phone=coalesce(nullif(phone,''),'+1 770-270-0350'),
    updated_at=now()
where city_key='atlanta' and slug='strokers-atl';
