create table if not exists public.carts (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  customer_name text,
  product_id uuid references public.products(id) on delete cascade,
  status text default 'pending', -- pending, recovered, abandoned
  contacted_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.carts enable row level security;

-- Policy: Anyone can insert (needed for checkout page)
create policy "Anyone can insert carts" on public.carts 
  for insert with check (true);

-- Policy: Anyone can update their own cart (if we have a way to identify them, but for now let's keep it open for insert/update by email or service role)
create policy "Update cart by id" on public.carts 
  for update using (true);

-- View for Admin
create policy "Admins can view all carts" on public.carts
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Service role access
create policy "Service role manage all" on public.carts
  for all using (true);
