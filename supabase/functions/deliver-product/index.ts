import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
      console.error(`Order error: ${orderError?.message}`)
      throw new Error(`Order not found: ${orderId}`)
    }

    console.log(`Order status: ${order.status}`)

    // If already delivered, we might still want to allow a retry if it's a manual action,
    // but for now let's just make sure it's at least 'paid' or 'delivered'
    if (!['paid', 'delivered'].includes(order.status)) {
      console.log(`Order ${orderId} is not paid (status: ${order.status}). Skipping delivery.`)
      return new Response(JSON.stringify({ success: false, message: `Order status is ${order.status}, not paid` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const customerEmail = order.customer_email
    const productName = order.products.name
    const deliveryContent = order.products.delivery_content

    // 2. Send email via Brevo
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured")
    }

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
        <div style="background-color: #141416; padding: 40px 20px; text-align: center; border-bottom: 1px solid #1c1c1e;">
          <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 32px;">
        </div>
        <div style="padding: 50px 40px; background-color: #0a0a0b; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px;">O teu acesso chegou! 🚀</h1>
          <p style="color: #9ca3af; font-size: 16px; line-height: 1.5; margin: 0 0 40px 0;">Olá ${order.customer_name}, o teu pagamento foi confirmado e o produto <strong>${productName}</strong> já está disponível.</p>
          
          <div style="background-color: #141416; padding: 25px; border-radius: 16px; border: 1px solid #232326; text-align: left; margin-bottom: 40px;">
            <h3 style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">Conteúdo do Produto:</h3>
            <div style="color: #ffffff; font-size: 16px; line-height: 1.6;">
              ${deliveryContent}
            </div>
          </div>

          <div style="border-t: 1px solid #1c1c1e; padding-top: 30px; margin-top: 30px;">
            <p style="color: #ffffff; font-weight: 700; margin-bottom: 20px;">Queres ver todos os teus produtos num só lugar?</p>
            <a href="https://ensinapay.com/biblioteca" style="display: inline-block; background-color: #10b981; color: #000000; padding: 20px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Aceder à Minha Biblioteca</a>
          </div>
        </div>
        <div style="background-color: #141416; padding: 30px; text-align: center; border-top: 1px solid #1c1c1e;">
          <p style="color: #4b5563; font-size: 12px; margin: 0;">EnsinaPay - A nova era dos conteúdos digitais em Moçambique.</p>
        </div>
      </div>
    `;

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "EnsinaPay", email: "suporte@ensinapay.com" },
        to: [{ email: customerEmail, name: order.customer_name }],
        subject: `✅ Acesso Confirmado: ${productName}`,
        htmlContent: htmlContent
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
