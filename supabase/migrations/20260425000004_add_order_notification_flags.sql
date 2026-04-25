-- Add notification flags to orders to track email delivery
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_notified BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_notified BOOLEAN DEFAULT false;
