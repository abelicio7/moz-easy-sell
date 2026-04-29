-- SQL PARA RESTAURAR 100% DO SALDO HISTÓRICO
-- Este script gera registos de comissão para todas as vendas antigas sem aplicar taxas.

INSERT INTO public.commissions (user_id, order_id, amount, user_type)
SELECT 
  p.user_id,
  o.id as order_id,
  o.price as amount, -- Define 100% do valor como saldo (sem taxas para o histórico)
  'seller' as user_type
FROM public.orders o
JOIN public.products p ON o.product_id = p.id
WHERE o.status = 'paid'
AND NOT EXISTS (
  SELECT 1 FROM public.commissions c WHERE c.order_id = o.id
);

-- Após rodar, o seu Saldo Disponível será exatamente igual ao seu Faturamento Total.
