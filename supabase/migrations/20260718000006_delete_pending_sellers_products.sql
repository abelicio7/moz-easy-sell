-- supabase/migrations/20260718000006_delete_pending_sellers_products.sql

-- Remover permanentemente todos os produtos associados a perfis de usuários com status 'pending'
-- As restrições de chaves estrangeiras com "ON DELETE CASCADE" apagarão automaticamente
-- todos os pedidos, sessões e arquivos vinculados a esses produtos excluídos.
DELETE FROM public.products
WHERE user_id IN (
  SELECT id FROM public.profiles 
  WHERE status = 'pending'
);
