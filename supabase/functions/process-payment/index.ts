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

  try {
    const { order_id, amount, phone, payment_method } = await req.json()
    console.log(`Processing payment for order ${order_id}, amount ${amount}, phone ${phone}`)

    const DEBITO_API_KEY = Deno.env.get('DEBITO_API_KEY')
    const DEBITO_BASE_URL = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1"

    console.log("Environment check:", { 
      hasApiKey: !!DEBITO_API_KEY, 
      baseUrl: DEBITO_BASE_URL,
      supabaseUrl: !!Deno.env.get('SUPABASE_URL')
    })

    if (!DEBITO_API_KEY) {
      throw new Error('DEBITO_API_KEY not configured in Supabase Secrets')
    }

    // 1. Call Débito API to request payment
    const response = await fetch(`${DEBITO_BASE_URL}/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEBITO_API_KEY}`
      },
      body: JSON.stringify({
        amount: amount,
        phone: phone,
        method: payment_method, // mpesa or emola
        external_reference: order_id,
        description: `Pagamento de Pedido #${order_id}`
      })
    })

    const debitoData = await response.json()
    console.log("Débito Response:", debitoData)

    if (!response.ok || !debitoData.success) {
      throw new Error(debitoData.message || 'Error processing payment with Débito')
    }

    // 2. Update order with Débito reference
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        debito_reference: debitoData.reference || debitoData.debito_reference,
        status: 'pending'
      })
      .eq('id', order_id)

    if (updateError) {
      console.error("Error updating order:", updateError)
    }

    return new Response(
      JSON.stringify(debitoData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Payment Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
