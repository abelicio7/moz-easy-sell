-- Add unique constraint to prevent duplicate cart entries for the same customer/product combination
alter table public.carts 
add constraint carts_email_product_id_key unique (email, product_id);
