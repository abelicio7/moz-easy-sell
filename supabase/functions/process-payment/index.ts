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
    
    // SANITIZE PHONE: Remove +258 and non-digits
    const cleanPhone = phone.replace(/\D/g, '').replace(/^258/, '')
    
    console.log(`Processing payment for order ${order_id}, amount ${amount}, phone ${cleanPhone}, method ${payment_method}`)

    const DEBITO_API_KEY = Deno.env.get('DEBITO_API_KEY')
    const MERCHANT_ID = Deno.env.get('DEBITO_MERCHANT_ID')
    const WALLET_EMOLA = Deno.env.get('DEBITO_WALLET_EMOLA')
    const WALLET_MPESA = Deno.env.get('DEBITO_WALLET_MPESA')
    
    const DEBITO_BASE_URL = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1"

    if (!DEBITO_API_KEY || !MERCHANT_ID) {
      throw new Error('DEBITO configuration missing in Supabase Secrets')
    }

    const walletCode = payment_method === 'emola' ? WALLET_EMOLA : WALLET_MPESA

    if (!walletCode) {
      throw new Error(`Wallet code not configured for ${payment_method}`)
    }

    // 1. Call Débito Payment Orchestrator with EXACT documentation fields
    const response = await fetch(`${DEBITO_BASE_URL}/payment-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEBITO_API_KEY}`
      },
      body: JSON.stringify({
        action: "process",
        payment_method: payment_method, // EXACT field name from docs
        merchant_id: MERCHANT_ID,
        wallet_code: walletCode,
        amount: Number(amount),
        currency: "MZN",
        phone: cleanPhone, // Use sanitized phone
        source: "gateway",
        source_id: order_id,
        external_reference: order_id
      })
    })

    const debitoData = await response.json()
    console.log("Débito Orchestrator Response:", debitoData)

    if (!response.ok || !debitoData.success) {
      throw new Error(debitoData.message || debitoData.error || 'Error processing payment with Débito Orchestrator')
    }

    // 2. Update order with Débito reference
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const debitoRef = debitoData.reference || debitoData.debito_reference || debitoData.id

    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        debito_reference: debitoRef,
        status: 'pending'
      })
      .eq('id', order_id)

    if (updateError) {
      console.error("Error updating order:", updateError)
    }

    return new Response(
      JSON.stringify({ ...debitoData, debito_reference: debitoRef }),
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
