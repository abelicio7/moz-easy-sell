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
    const body = await req.json()
    console.log("WEBHOOK RECEIVED:", body)

    // Débito format: { reference: "...", status: "paid/completed", ... }
    const reference = body.reference || body.debito_reference || body.id
    const status = body.status

    if (!reference) {
      throw new Error("No reference found in webhook body")
    }

    if (status === 'completed' || status === 'paid' || status === 'successful') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

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
        
        // We call it asynchronously and don't wait for it to finish for the webhook response
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
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
