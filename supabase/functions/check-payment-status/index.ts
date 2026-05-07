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
    const { order_id, debito_reference } = await req.json()
    console.log(`Checking status for order ${order_id} (Ref: ${debito_reference})...`)

    // 1. Get current order from DB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('status, debito_reference')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw new Error("Order not found")
    }

    // If already paid, just return success
    if (order.status === 'paid' || order.status === 'delivered') {
      return new Response(
        JSON.stringify({ order_status: 'paid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ref = debito_reference || order.debito_reference

    if (!ref) {
      return new Response(
        JSON.stringify({ order_status: 'pending', message: 'No reference yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. POLL DEBITO API (Backup for missing webhook)
    const DEBITO_API_KEY = Deno.env.get('DEBITO_API_KEY')
    const MERCHANT_ID = Deno.env.get('DEBITO_MERCHANT_ID')
    const DEBITO_BASE_URL = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1"

    console.log(`Polling Débito Orchestrator for ref ${ref}...`)
    
    const payload = {
      action: "check-status",
      merchant_id: MERCHANT_ID,
      transaction_id: ref,
      payment_id: ref,
      paymentId: ref,
      id: ref,
      reference: ref,
      currency: "MZN"
    };

    let response = await fetch(`${DEBITO_BASE_URL}/payment-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEBITO_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    let debitoData = await response.json();

    // Se não encontrar pela referência, tenta pelo ID do pedido (UUID)
    if (!debitoData.success || debitoData.error?.includes("payment_id") || debitoData.error === "Payment not found") {
      console.log(`Ref não encontrada no Check-Status. Tentando pelo ID do pedido: ${order_id}`);
      const retryResponse = await fetch(`${DEBITO_BASE_URL}/payment-orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEBITO_API_KEY}`
        },
        body: JSON.stringify({
          ...payload,
          transaction_id: order_id,
          payment_id: order_id,
          paymentId: order_id,
          id: order_id,
          external_reference: order_id
        })
      });
      debitoData = await retryResponse.json();
    }

    console.log("Resposta do Gateway:", JSON.stringify(debitoData));

    // Lógica de detecção ultra-flexível (Sincronizada com check-all-orders)
    const status = (
      debitoData.payment?.status || 
      debitoData.data?.status || 
      debitoData.status || 
      ""
    ).toLowerCase();
    
    const success = debitoData.success === true || debitoData.status === "success" || debitoData.message === "success";
    
    const isPaid = (success || status === "success") && (
      status === "success" || 
      status === "completed" || 
      status === "paid" || 
      status === "pago" || 
      status === "successful" ||
      status === "complete"
    );

    if (isPaid) {
      console.log(`✅ Payment confirmed via Polling for ${order_id}. Updating DB...`)
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order_id)

      if (!updateError) {
        // TRIGGER DELIVERY
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deliver-product`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ orderId: order_id })
        }).catch(err => console.error("Error triggering delivery from polling:", err))
        
        return new Response(
          JSON.stringify({ order_status: 'paid' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ order_status: order.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Check Status Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
