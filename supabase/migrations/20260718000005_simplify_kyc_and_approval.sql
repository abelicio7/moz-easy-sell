-- supabase/migrations/20260718000005_simplify_kyc_and_approval.sql

-- 1. Habilitar extensões se necessário
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Garantir que a conta principal do proprietário está configurada como admin aprovado
UPDATE public.profiles
SET role = 'admin', status = 'approved', identity_status = 'approved'
WHERE id IN (
  SELECT id FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- 3. Otimizar o agendamento de verificação de pagamentos
SELECT cron.unschedule('check-pending-payments');

SELECT cron.schedule(
    'check-pending-payments',
    '*/5 * * * *', -- Roda a cada 5 minutos
    $$
    SELECT
      CASE
        WHEN EXISTS (
          SELECT 1 FROM public.orders 
          WHERE status = 'pending' AND debito_reference IS NOT NULL
        ) THEN
          net.http_post(
            url := 'https://ekprysxfgkafpwjbocab.supabase.co/functions/v1/check-all-orders',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1)
            ),
            body := '{}'
          )
        ELSE NULL
      END;
    $$
);

-- 4. Criar rotina de autolimpeza diária de logs do pg_net para evitar inchaço do banco
SELECT cron.unschedule('cleanup-pg-net-logs');

SELECT cron.schedule(
    'cleanup-pg-net-logs',
    '0 0 * * *', -- Diariamente à meia-noite
    $$ DELETE FROM net.http_responses WHERE created_at < NOW() - INTERVAL '3 days'; $$
);
