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
    
      const response = await fetch(`${DEBITO_BASE_URL}/payment-orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEBITO_API_KEY}`
        },
        body: JSON.stringify({
          action: "status",
          merchant_id: MERCHANT_ID,
          transaction_id: ref,
          payment_id: ref,
          reference: ref,
          currency: "MZN"
        })
      })

    const debitoData = await response.json()
    console.log("Débito Status Response:", debitoData)

    // LOG POLLING RESULT FOR DEBUGGING
    await supabase.from('webhook_logs').insert({ 
        payload: { 
            type: 'polling_check', 
            order_id, 
            reference: ref, 
            response: debitoData 
        } 
    })

    const isPaid = 
        debitoData.success && 
        (debitoData.data?.status === 'success' || 
         debitoData.data?.status === 'completed' || 
         debitoData.status === 'success')

    if (isPaid) {
      console.log(`Payment confirmed via Polling for ${order_id}. Updating DB...`)
      
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
