-- Function to safely increment click counts for affiliate links
create or replace function public.increment_affiliate_clicks(aff_code text)
returns void
language plpgsql
security definer
as $$
begin
  update public.affiliate_links
  set clicks_count = clicks_count + 1
  where code = aff_code;
end;
$$;
