-- 1. Alter profiles status check constraint to support 'blocked' and 'suspended' status
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'blocked', 'suspended'));

-- 2. Add custom_fee column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_fee NUMERIC;
