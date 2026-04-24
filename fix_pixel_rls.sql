-- Permite que qualquer pessoa veja as configurações de Pixel e Analytics
-- Isso é necessário para que o rastreio funcione para clientes não logados.

DROP POLICY IF EXISTS "Anyone can view active pixel integrations" ON public.seller_integrations;

CREATE POLICY "Anyone can view active pixel integrations"
ON public.seller_integrations
FOR SELECT
USING (is_active = true AND integration_type IN ('facebook_pixel', 'pixel_facebook', 'google_analytics'));
