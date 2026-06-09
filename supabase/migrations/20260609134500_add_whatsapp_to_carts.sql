-- Add customer_whatsapp to carts table to allow seller contact
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS customer_whatsapp TEXT;

-- Enhance the carts table tracking for abandoned carts features
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS payment_phone TEXT;
