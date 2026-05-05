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

    // Débito format: { reference: "...", status: "payment.completed", ... }
    // Note: status might be in 'type' or 'status' field.
    const reference = body.reference || body.debito_reference || body.id || (body.data && body.data.id)
    const status = body.status || body.type

    console.log(`Processing webhook: reference=${reference}, status=${status}`)

    if (!reference) {
      console.error("No reference found in webhook body:", body)
      return new Response(JSON.stringify({ error: "No reference found" }), { status: 200, headers: corsHeaders })
    }

    if (status === 'payment.completed' || status === 'completed' || status === 'paid' || status === 'successful') {
      // Find the order by reference and update to paid
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('debito_reference', reference)
        .select()

      if (error) {
        console.error("Error updating order status:", error)
        throw error
      }

      console.log(`Order updated to paid for reference ${reference}. Rows affected:`, data?.length)

      // TRIGGER DELIVERY
      if (data && data.length > 0) {
        const orderId = data[0].id
        console.log(`Triggering delivery for order ${orderId}...`)
        
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

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Webhook Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Return 200 even on error to stop Débito retries
    )
  }
})
