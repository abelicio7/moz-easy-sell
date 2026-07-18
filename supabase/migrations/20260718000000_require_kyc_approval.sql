-- supabase/migrations/20260718000000_require_kyc_approval.sql

-- 1. Redefine handle_new_user to set default profile status to 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'display_name',
    ''
  );

  INSERT INTO public.profiles (id, full_name, email, status, role, identity_status)
  VALUES (
    NEW.id,
    user_name,
    NEW.email,
    'pending', -- Pending manual admin approval
    'seller',
    'unverified'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Transition approved profiles that haven't confirmed KYC to pending status (except admins)
UPDATE public.profiles
SET status = 'pending'
WHERE status = 'approved' 
  AND (identity_status != 'approved' OR identity_status IS NULL)
  AND (role != 'admin' OR role IS NULL);

-- 3. Move products of unverified sellers back to pending status
UPDATE public.products
SET status = 'pending'
FROM public.profiles
WHERE products.user_id = profiles.id
  AND (profiles.identity_status != 'approved' OR profiles.identity_status IS NULL)
  AND (profiles.role != 'admin' OR profiles.role IS NULL);

-- 4. Update get_seller_status to coalesce status to 'pending'
CREATE OR REPLACE FUNCTION public.get_seller_status(p_seller_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM public.profiles WHERE id = p_seller_id;
  RETURN COALESCE(v_status, 'pending');
END;
$$;
