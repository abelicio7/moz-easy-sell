-- supabase/migrations/20260718000001_add_kyc_selfie_column.sql

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_selfie_url TEXT;
