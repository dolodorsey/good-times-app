alter table public.good_times_consumer_requests
  drop constraint if exists good_times_consumer_requests_details_check,
  drop constraint if exists good_times_consumer_requests_city_check;

drop function if exists public.gt_consumer_request_details_valid(text, jsonb);
