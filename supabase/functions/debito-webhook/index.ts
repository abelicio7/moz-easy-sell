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
    const body = await req.json()
    console.log("WEBHOOK RECEIVED:", body)

    // 0. LOG RAW WEBHOOK
    await supabase.from('webhook_logs').insert({ payload: body })

    // Débito Orchestrator format from test event:
    // { event: "payment.completed", data: { transaction_id: "...", status: "success", ... } }
    
    const event = body.event
    const data = body.data || {}
    
    const reference = data.transaction_id || data.reference || body.reference || body.id
    const status = event || body.status || body.type

    console.log(`Processing webhook: event=${event}, reference=${reference}, status=${status}`)

    if (!reference) {
      console.error("No reference found in webhook body:", body)
      return new Response(JSON.stringify({ error: "No reference found" }), { status: 200, headers: corsHeaders })
    }

    // Success conditions
    const isSuccess = 
      event === 'payment.completed' || 
      status === 'paid' || 
      status === 'completed' || 
      status === 'successful' || 
      data.status === 'success' ||
      data.status === 'completed'

    if (isSuccess) {
      // Find the order by reference and update to paid
      // We check both debito_reference (the ID from Débito) and potentially the ID if they match
      const { data: orders, error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('debito_reference', reference)
        .select()

      if (error) {
        console.error("Error updating order status:", error)
        throw error
      }

      if (orders && orders.length > 0) {
        const orderId = orders[0].id
        console.log(`Order ${orderId} updated to paid. Triggering delivery...`)
        
        // TRIGGER DELIVERY
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deliver-product`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ orderId })
        }).catch(err => console.error("Error triggering delivery:", err))
      } else {
        console.warn(`No order found with debito_reference ${reference}`)
        
        // Try fallback: check if reference IS the order UUID (source_id)
        if (reference.length > 30) { // Likely a UUID
            const { data: ordersByUuid, error: uuidError } = await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', reference)
            .select()
            
            if (!uuidError && ordersByUuid && ordersByUuid.length > 0) {
                const orderId = ordersByUuid[0].id
                console.log(`Order ${orderId} found by UUID and updated to paid. Triggering delivery...`)
                fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deliver-product`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                    },
                    body: JSON.stringify({ orderId })
                }).catch(err => console.error("Error triggering delivery:", err))
            }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Webhook Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
