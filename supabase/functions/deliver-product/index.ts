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
    const { orderId } = await req.json()
    console.log(`Delivering product for order ${orderId}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get order and product details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, products(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`)
    }

    if (order.status !== 'paid') {
      console.log(`Order ${orderId} is not paid yet (status: ${order.status}). Skipping delivery.`)
      return new Response(JSON.stringify({ success: false, message: "Order not paid" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const customerEmail = order.customer_email
    const productName = order.products.name
    const deliveryContent = order.products.delivery_content

    // 2. Send email via Brevo
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured")
    }

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "EnsinaPay", email: "entregas@ensinapay.co.mz" },
        to: [{ email: customerEmail, name: order.customer_name }],
        subject: `Seu acesso: ${productName}`,
        htmlContent: `
          <h1>Olá, ${order.customer_name}!</h1>
          <p>Obrigado por sua compra do produto <strong>${productName}</strong>.</p>
          <p>Aqui está o seu conteúdo:</p>
          <div style="padding: 20px; background-color: #f4f4f4; border-radius: 10px;">
            ${deliveryContent}
          </div>
          <p>Se tiver qualquer dúvida, entre em contacto conosco.</p>
          <p>Atenciosamente,<br>Equipa EnsinaPay</p>
        `
      })
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text()
      console.error("Brevo Error:", emailError)
      throw new Error("Failed to send delivery email")
    }

    // 3. Update order status to delivered
    await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId)

    console.log(`Product delivered successfully to ${customerEmail}`)

    return new Response(
      JSON.stringify({ success: true, message: "Product delivered" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Delivery Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
