-- Garantir que a tabela de integrações exista
CREATE TABLE IF NOT EXISTS public.seller_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- e.g., 'webhook', 'pixel_facebook', 'google_analytics'
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Habilitar RLS
ALTER TABLE public.seller_integrations ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar erro de duplicidade
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.seller_integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.seller_integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.seller_integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.seller_integrations;

-- Criar políticas
CREATE POLICY "Users can view their own integrations" ON public.seller_integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own integrations" ON public.seller_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own integrations" ON public.seller_integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own integrations" ON public.seller_integrations FOR DELETE USING (auth.uid() = user_id);
