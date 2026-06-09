-- Function to securely fetch a product's facebook pixel without exposing the whole integrations table
CREATE OR REPLACE FUNCTION public.get_product_pixel(p_product_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT config->>'pixelId' 
  FROM public.seller_integrations si
  JOIN public.products p ON p.user_id = si.user_id
  WHERE p.id = p_product_id
    AND si.integration_type = 'facebook_pixel'
    AND si.is_active = true
  LIMIT 1;
$$;

-- Ensure anon has execute permissions
GRANT EXECUTE ON FUNCTION public.get_product_pixel(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_product_pixel(UUID) TO authenticated;
