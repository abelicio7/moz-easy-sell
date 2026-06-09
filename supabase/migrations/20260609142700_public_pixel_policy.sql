-- Allow public unauthenticated users to view facebook_pixel integrations so they can be injected in Checkout
CREATE POLICY "Public can view active facebook pixel integrations"
ON public.seller_integrations FOR SELECT
USING (is_active = true AND integration_type = 'facebook_pixel');
