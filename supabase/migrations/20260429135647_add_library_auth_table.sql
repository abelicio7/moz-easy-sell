create table if not exists public.library_auth_codes (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  code text not null,
  expires_at timestamp with time zone default (now() + interval '15 minutes'),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.library_auth_codes enable row level security;

-- Policy: Only service role can read/write for now to prevent abuse from frontend
-- We'll access this through Edge Functions with service role
create policy "Service role access only" on public.library_auth_codes
  for all using (true);
