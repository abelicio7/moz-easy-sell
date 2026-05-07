import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log("Iniciando varredura de pedidos pendentes...");

    // 1. Buscar pedidos pendentes (limite de 20 para evitar timeout)
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, debito_reference, status')
      .eq('status', 'pending')
      .not('debito_reference', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log("Nenhum pedido pendente para processar.");
      return new Response(JSON.stringify({ message: "No pending orders" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processando ${pendingOrders.length} pedidos...`);
    const results = [];

    const DEBITO_API_KEY = Deno.env.get('DEBITO_API_KEY');
    const MERCHANT_ID = Deno.env.get('DEBITO_MERCHANT_ID');
    const DEBITO_BASE_URL = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1";

    for (const order of pendingOrders) {
      try {
        console.log(`Verificando Pedido: ${order.id} | Ref: ${order.debito_reference}`);
        
        const response = await fetch(`${DEBITO_BASE_URL}/payment-orchestrator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEBITO_API_KEY}`
          },
          body: JSON.stringify({
            action: "status",
            merchant_id: MERCHANT_ID,
            transaction_id: order.debito_reference
          })
        });

        const debitoData = await response.json();
        
        const isPaid = 
          debitoData.success && 
          (debitoData.data?.status === 'success' || 
           debitoData.data?.status === 'completed' || 
           debitoData.status === 'success');

        if (isPaid) {
          console.log(`PAGAMENTO CONFIRMADO para pedido ${order.id}. Atualizando...`);
          
          // Atualiza status para pago
          await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id);

          // Dispara entrega
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deliver-product`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({ orderId: order.id })
          }).catch(err => console.error(`Erro ao entregar pedido ${order.id}:`, err));

          results.push({ order_id: order.id, status: 'paid' });
        } else {
          results.push({ order_id: order.id, status: 'still_pending' });
        }
      } catch (err) {
        console.error(`Erro ao processar pedido ${order.id}:`, err.message);
        results.push({ order_id: order.id, error: err.message });
      }
    }

    return new Response(JSON.stringify({ processed: pendingOrders.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Erro na varredura:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
