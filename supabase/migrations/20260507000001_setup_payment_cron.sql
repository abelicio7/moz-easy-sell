-- Habilitar as extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover agendamento antigo se existir para evitar duplicidade
SELECT cron.unschedule('check-pending-payments');

-- Agendar a nova tarefa para rodar a cada 1 minuto
-- Esta tarefa chama a Edge Function 'check-all-orders'
SELECT cron.schedule(
    'check-pending-payments',
    '* * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://ekprysxfgkafpwjbocab.supabase.co/functions/v1/check-all-orders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1)
        ),
        body := '{}'
      )
    $$
);

-- Nota: Se o comando acima falhar por causa do 'vault', o usuário precisará inserir 
-- a SERVICE_ROLE_KEY manualmente ou garantir que ela está no Vault do Supabase.
