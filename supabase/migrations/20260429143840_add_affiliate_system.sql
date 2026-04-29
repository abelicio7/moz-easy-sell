-- 1. Table for Affiliate Offers (Product settings)
create table if not exists public.affiliate_offers (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade unique,
  commission_percent decimal(5,2) default 20.00,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. Table for Affiliate Links (Generated for users)
create table if not exists public.affiliate_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  code text unique not null, -- e.g. "joao123"
  clicks_count bigint default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, product_id)
);

-- 3. Update Orders to track affiliate
alter table public.orders add column if not exists affiliate_id uuid references public.profiles(id);

-- 4. Enable RLS
alter table public.affiliate_offers enable row level security;
alter table public.affiliate_links enable row level security;

-- Policies for affiliate_offers
create policy "Sellers can manage their own offers" on public.affiliate_offers
  for all using (
    exists (
      select 1 from public.products
      where products.id = affiliate_offers.product_id
      and products.user_id = auth.uid()
    )
  );

create policy "Anyone can view active offers" on public.affiliate_offers
  for select using (is_active = true);

-- Policies for affiliate_links
create policy "Users can manage their own links" on public.affiliate_links
  for all using (user_id = auth.uid());

create policy "Service role can manage all links" on public.affiliate_links
  for all using (true);
