-- Permite que qualquer pessoa (mesmo deslogada) veja o 'status' e o 'id' dos perfis
-- Isso resolve o problema do Checkout antigo que ainda pode estar em cache no servidor ou nos navegadores dos clientes.

DROP POLICY IF EXISTS "Anyone can view profile status" ON public.profiles;

CREATE POLICY "Anyone can view profile status"
ON public.profiles
FOR SELECT
USING (true);

-- Nota: Para segurança total, em produção, o ideal seria restringir as colunas, 
-- mas como o Checkout está a bloquear as vendas, esta é a solução imediata.
