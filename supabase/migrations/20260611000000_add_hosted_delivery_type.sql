ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_delivery_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_delivery_type_check CHECK (delivery_type IN ('link', 'file', 'message', 'hosted'));
