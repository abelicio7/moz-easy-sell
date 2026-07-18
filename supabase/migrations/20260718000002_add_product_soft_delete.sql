-- supabase/migrations/20260718000002_add_product_soft_delete.sql

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
