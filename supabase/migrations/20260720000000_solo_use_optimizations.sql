-- 1. Auto-aprovação de Produtos criados por Administradores
CREATE OR REPLACE FUNCTION auto_approve_admin_products()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id AND (role = 'admin' OR is_admin = true)
  ) THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_approve_admin_products ON public.products;

CREATE TRIGGER tr_auto_approve_admin_products
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION auto_approve_admin_products();

-- 2. Aprovar produtos pendentes existentes do admin
UPDATE public.products
SET status = 'approved'
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'admin' OR is_admin = true
) AND status = 'pending';

-- 3. Função de autolimpeza de registros antigos (preservação do limite de 500 MB)
CREATE OR REPLACE FUNCTION cleanup_old_database_logs()
RETURNS void AS $$
BEGIN
  -- Limpar logs de webhook com mais de 15 dias
  DELETE FROM public.webhook_logs WHERE created_at < NOW() - INTERVAL '15 days';
  -- Limpar carrinhos abandonados com mais de 15 dias
  DELETE FROM public.carts WHERE created_at < NOW() - INTERVAL '15 days';
  -- Limpar pedidos pendentes não concluídos com mais de 15 dias
  DELETE FROM public.orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '15 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover agendamento antigo se existir de forma segura
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-db-cleanup') THEN
    PERFORM cron.unschedule('daily-db-cleanup');
  END IF;
END $$;

-- Agendar a tarefa de limpeza no pg_cron para rodar diariamente às 03:00 da manhã
SELECT cron.schedule(
    'daily-db-cleanup',
    '0 3 * * *',
    $$ SELECT cleanup_old_database_logs(); $$
);
