-- Create library_sessions table
CREATE TABLE IF NOT EXISTS public.library_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on library_sessions
ALTER TABLE public.library_sessions ENABLE ROW LEVEL SECURITY;

-- No policies are added to library_sessions, making it only accessible via service_role / postgres.

-- Create RPC check_customer_has_orders
CREATE OR REPLACE FUNCTION public.check_customer_has_orders(p_email text)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE customer_email = LOWER(TRIM(p_email))
      AND status IN ('paid', 'delivered')
  );
END;
$$ LANGUAGE plpgsql;

-- Create RPC get_library_purchases
CREATE OR REPLACE FUNCTION public.get_library_purchases(p_email text, p_token text)
RETURNS TABLE (
  id UUID,
  price NUMERIC,
  created_at TIMESTAMPTZ,
  product_id UUID,
  product_name TEXT,
  product_description TEXT,
  product_image_url TEXT,
  product_delivery_type TEXT,
  product_delivery_content TEXT
) SECURITY DEFINER AS $$
BEGIN
  -- Verificar se existe uma sessão válida para este email e token
  IF EXISTS (
    SELECT 1 FROM public.library_sessions
    WHERE email = LOWER(TRIM(p_email))
      AND token = p_token
      AND expires_at > NOW()
  ) THEN
    RETURN QUERY
    SELECT 
      o.id,
      o.price,
      o.created_at,
      p.id as product_id,
      p.name as product_name,
      p.description as product_description,
      p.image_url as product_image_url,
      p.delivery_type as product_delivery_type,
      p.delivery_content as product_delivery_content
    FROM public.orders o
    JOIN public.products p ON o.product_id = p.id
    WHERE o.customer_email = LOWER(TRIM(p_email))
      AND o.status IN ('paid', 'delivered')
    ORDER BY o.created_at DESC;
  ELSE
    RAISE EXCEPTION 'Sessão inválida ou expirada';
  END IF;
END;
$$ LANGUAGE plpgsql;
