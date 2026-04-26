-- Add direct foreign key from products to profiles to enable PostgREST joins
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
