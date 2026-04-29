-- SQL PARA RESTAURAR SALDO HISTÓRICO
-- Este script gera registos de comissão (lucro líquido) para todas as vendas antigas.

INSERT INTO public.commissions (user_id, order_id, amount, user_type)
SELECT 
  p.user_id,
  o.id as order_id,
  o.price * 0.95 as amount, -- Define 95% como lucro do vendedor (excluindo taxa de 5%)
  'seller' as user_type
FROM public.orders o
JOIN public.products p ON o.product_id = p.id
WHERE o.status = 'paid'
AND NOT EXISTS (
  SELECT 1 FROM public.commissions c WHERE c.order_id = o.id
);

-- Após rodar, o seu saldo no Dashboard e Financeiro aparecerá instantaneamente.
