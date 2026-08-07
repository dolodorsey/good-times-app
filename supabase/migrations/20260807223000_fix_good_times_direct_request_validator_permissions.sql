-- Good Times direct-request submissions use the public validator from an RLS-protected insert path.
-- The table INSERT grant alone is insufficient when the CHECK constraint calls this function.
grant execute on function public.gt_consumer_request_details_valid(text, jsonb) to anon, authenticated;
