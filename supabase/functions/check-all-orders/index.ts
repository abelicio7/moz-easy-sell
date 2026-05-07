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
            transaction_id: order.debito_reference,
            payment_id: order.debito_reference,
            reference: order.debito_reference,
            currency: "MZN"
          })
        });

        const debitoData = await response.json();
        console.log(`Resposta completa do Gateway para Ref ${order.debito_reference}:`, JSON.stringify(debitoData));

        // Lógica de detecção ultra-flexível
        const status = (debitoData.data?.status || debitoData.status || "").toLowerCase();
        const success = debitoData.success === true || debitoData.status === "success" || debitoData.message === "success";
        
        const isPaid = success && (
          status === "success" || 
          status === "completed" || 
          status === "paid" || 
          status === "pago" || 
          status === "successful" ||
          status === "complete"
        );

        if (isPaid) {
          console.log(`✅ PAGAMENTO CONFIRMADO: Pedido ${order.id}. Atualizando para 'paid'...`);
          
          await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id);

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
          console.log(`ℹ️ Pedido ${order.id} ainda não confirmado. Status recebido: ${status || "pendente"}`);
          results.push({ order_id: order.id, status: status || 'still_pending' });
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
