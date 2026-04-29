-- SCRIPT DE AJUSTE: MUDAR DE 95% PARA 100% NO HISTÓRICO
-- Este script atualiza as comissões antigas que foram gravadas com 5% de desconto.

UPDATE public.commissions c
SET amount = o.price
FROM public.orders o
WHERE c.order_id = o.id
AND c.user_type = 'seller'
AND c.amount < o.price; -- Só atualiza se o valor atual for menor que o preço original (ou seja, se houve desconto)

-- Após rodar este comando no SQL Editor do Supabase, o seu saldo disponível subirá para 1970 MT.
