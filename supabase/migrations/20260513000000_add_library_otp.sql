-- Tabela para códigos de acesso à biblioteca (clientes sem conta)
CREATE TABLE IF NOT EXISTS public.library_access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(email)
);

-- Habilitar RLS mas restringir tudo (apenas Edge Functions com Service Role acessam)
ALTER TABLE public.library_access_codes ENABLE ROW LEVEL SECURITY;
