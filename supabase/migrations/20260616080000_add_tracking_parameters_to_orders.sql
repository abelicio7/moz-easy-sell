-- Add tracking_parameters column to orders table to store UTMs and other tracking metadata
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_parameters JSONB DEFAULT '{}'::jsonb;
