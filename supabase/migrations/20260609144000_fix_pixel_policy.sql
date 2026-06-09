-- Ensure anon has access
GRANT SELECT ON public.seller_integrations TO anon;
GRANT SELECT ON public.seller_integrations TO authenticated;

-- Ensure policy is TO public (which means applying to all roles including anon)
DROP POLICY IF EXISTS "Public can view active facebook pixel integrations" ON public.seller_integrations;
CREATE POLICY "Public can view active facebook pixel integrations"
ON public.seller_integrations FOR SELECT TO public
USING (is_active = true AND integration_type = 'facebook_pixel');
