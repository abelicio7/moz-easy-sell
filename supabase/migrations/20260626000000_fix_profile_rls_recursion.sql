-- Create is_admin helper function that executes as security definer to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Drop and recreate policies on public.profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- Drop and recreate policies on public.products
DROP POLICY IF EXISTS "Admins can update all products" ON public.products;
CREATE POLICY "Admins can update all products"
    ON public.products FOR UPDATE
    USING (public.is_admin());

-- Drop and recreate policies on public.withdrawals
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can view all withdrawals"
    ON public.withdrawals FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can update all withdrawals"
    ON public.withdrawals FOR UPDATE
    USING (public.is_admin());

-- Drop and recreate policies on public.audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_admin());

-- Drop and recreate policies on public.profile_update_requests
DROP POLICY IF EXISTS "Admins can view all requests" ON public.profile_update_requests;
CREATE POLICY "Admins can view all requests"
    ON public.profile_update_requests FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all requests" ON public.profile_update_requests;
CREATE POLICY "Admins can update all requests"
    ON public.profile_update_requests FOR UPDATE
    USING (public.is_admin());

-- Drop and recreate policy on storage.objects for KYC documents
DROP POLICY IF EXISTS "Admins can view any kyc doc" ON storage.objects;
CREATE POLICY "Admins can view any kyc doc"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'kyc_documents' AND public.is_admin());
