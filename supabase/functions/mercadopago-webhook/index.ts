import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    console.log(`Incoming Mercado Pago webhook request: ${url.search}`)

    // 1. Parse payment details from query params or body
    let paymentId = url.searchParams.get("id") || url.searchParams.get("data.id")
    let topic = url.searchParams.get("topic") || url.searchParams.get("type")

    let body: any = {}
    if (req.method === 'POST') {
      try {
        body = await req.json()
        console.log("Webhook body payload:", JSON.stringify(body))
      } catch (_) {
        console.log("No valid JSON body found in webhook request")
      }
    }

    const finalId = paymentId || body.data?.id || body.id
    const finalTopic = topic || body.type || body.action

    if (!finalId || (finalTopic !== 'payment' && finalTopic !== 'payment.updated' && finalTopic !== 'payment.created')) {
      console.log(`Ignoring webhook request. ID: ${finalId}, Topic: ${finalTopic}`)
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing Mercado Pago payment ID: ${finalId}`)

    // 2. Fetch payment details directly from Mercado Pago for verification (prevent spoofing)
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!MP_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN configuration missing in Supabase Secrets')
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${finalId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      }
    })

    if (!mpResponse.ok) {
      throw new Error(`Failed to fetch payment details from Mercado Pago for ID: ${finalId}`)
    }

    const mpData = await mpResponse.json()
    console.log(`Verified payment status for ${finalId}: ${mpData.status}`)

    if (mpData.status === 'approved') {
      // 3. Connect to Supabase
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Find order matching this payment_id
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('payment_id', String(finalId))
        .maybeSingle()

      if (orderError) {
        throw new Error(`Database error finding order: ${orderError.message}`)
      }

      if (!order) {
        console.log(`Order not found in DB for payment ID: ${finalId}. It could be from a different product or already processed.`)
        return new Response(JSON.stringify({ success: true, message: 'Order not found' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (order.status === 'paid' || order.status === 'delivered') {
        console.log(`Order ${order.id} is already marked as ${order.status}. Ignoring webhook.`)
        return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Update order status to paid
      console.log(`Updating order ${order.id} to paid...`)
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id)

      if (updateError) {
        throw new Error(`Failed to update order status: ${updateError.message}`)
      }

      // Trigger delivery Edge Function
      console.log(`Triggering product delivery for order ${order.id}...`)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deliver-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ orderId: order.id })
      }).catch(err => console.error("Error invoking deliver-product from webhook:", err))
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("Mercado Pago Webhook Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
