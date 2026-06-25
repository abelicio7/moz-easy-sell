-- Create security definer function to check seller status anonymously
CREATE OR REPLACE FUNCTION public.get_seller_status(p_seller_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM public.profiles WHERE id = p_seller_id;
  RETURN COALESCE(v_status, 'approved');
END;
$$;
