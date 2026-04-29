-- Table to record all financial splits for every order
create table if not exists public.commissions (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade, -- Null for platform fee
  amount decimal(12,2) not null,
  user_type text not null, -- 'seller', 'affiliate', 'platform'
  status text default 'paid', -- commission status
  created_at timestamp with time zone default now()
);

-- Index for fast balance calculation
create index idx_commissions_user_id on public.commissions(user_id);
create index idx_commissions_order_id on public.commissions(order_id);

-- Enable RLS
alter table public.commissions enable row level security;

-- Policies
create policy "Users can view their own commissions" on public.commissions
  for select using (user_id = auth.uid());

create policy "Admins can view all commissions" on public.commissions
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Service role manage all" on public.commissions
  for all using (true);
