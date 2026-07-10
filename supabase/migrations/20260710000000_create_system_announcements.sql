CREATE TABLE IF NOT EXISTS system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

-- Permissões: Qualquer usuário autenticado lê avisos ativos
CREATE POLICY "Permitir leitura de avisos ativos" 
ON system_announcements FOR SELECT 
TO authenticated 
USING (is_active = true);

-- Permissões: Apenas admins gerenciam
CREATE POLICY "Permitir gerenciamento por admins" 
ON system_announcements FOR ALL 
TO authenticated 
USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
