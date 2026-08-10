-- Correct customer-facing taxonomy for recurring Atlanta nightlife listings that
-- upstream sources misclassified because venue names contain Restaurant/Sports
-- or the music style was mistaken for a concert/culture category.
-- Narrow guards protect true concerts, wellness, comedy and other After Dark uses.

update public.gt_shows
set category_key_v2='nightlife',
    subcategory_key_v2=case
      when lower(event_name) like '%after dark%' then 'late_night'
      when lower(event_name) like 'playhouse sundays%' then 'weekly_parties'
      else coalesce(subcategory_key_v2,'weekly_parties')
    end,
    updated_at=now()
where city_key='atlanta'
  and show_date >= date '2026-08-09'
  and (
    (lower(venue_name) like '%utopia%' and lower(event_name) like '%after dark%' and event_type <> 'concert')
    or (lower(venue_name) like '%p sports%' and lower(event_name) like 'playhouse sundays%')
  )
  and lower(event_name) !~ '(yoga|pilates|fitness|workshop|class|comedy|theater|theatre|screening|artist talk|live music show|concert|symphony)';
