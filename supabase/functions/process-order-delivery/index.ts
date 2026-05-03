import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-client@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // A requisição pode vir de um webhook (record) ou chamada direta (orderId)
    let orderData;
    try {
      const body = await req.json();
      orderData = body.record || body;
    } catch (e) {
      throw new Error("Invalid JSON body");
    }

    const orderId = orderData.id;
    if (!orderId) throw new Error("No order ID provided");

    console.log(`[Delivery] Processing delivery for order ${orderId}...`)

    // 1. Fetch full order details with product and seller info
    const { data: ord, error: ordErr } = await supabase
      .from('orders')
      .select(`*, products(*)`)
      .eq('id', orderId)
      .single()


    if (ordErr || !ord) throw new Error(`Order not found: ${ordErr?.message}`)
    
    // IMPORTANTE: Só entrega se estiver PAID
    if (ord.status !== 'paid') {
      console.log(`[Delivery] Order ${orderId} is status: ${ord.status}. Skipping delivery.`)
      return new Response(JSON.stringify({ success: false, message: "Order not paid" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const product = ord.products
    
    // 2. Fetch Seller Email from Profiles
    let sellerEmail = null
    if (product?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', product.user_id)
        .maybeSingle()
      sellerEmail = profile?.email
    }

    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://ensinapay.com'

    const notifications = []

    // --- A. CUSTOMER DELIVERY EMAIL ---
    if (!ord.customer_notified && ord.customer_email) {
      console.log(`[Delivery] Sending email to customer: ${ord.customer_email}`)
      const deliveryUrl = `${siteUrl}/biblioteca?email=${encodeURIComponent(ord.customer_email)}`
      const customerHtml = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
          <div style="background-color: #141416; padding: 40px 20px; text-align: center; border-bottom: 1px solid #1c1c1e;">
            <img src="${siteUrl}/logo.png" alt="EnsinaPay" style="height: 32px;">
          </div>
          <div style="padding: 50px 40px; background-color: #0a0a0b; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px;">O seu acesso chegou! 🚀</h1>
            <p style="color: #9ca3af; font-size: 16px; line-height: 1.5; margin: 0 0 40px 0;">Olá ${ord.customer_name}, o seu pagamento foi confirmado. O seu conteúdo já está disponível.</p>
            <div style="background-color: #141416; padding: 25px; border-radius: 16px; border: 1px solid #232326; text-align: left; margin-bottom: 40px;">
              <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 5px 0;">Produto:</p>
              <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0;">${product?.name}</p>
            </div>
            <a href="${deliveryUrl}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 20px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; text-transform: uppercase;">Aceder ao Conteúdo</a>
          </div>
        </div>`

      notifications.push(
        supabase.functions.invoke('send-email-notification', {
          body: { to: ord.customer_email, subject: `✅ Entrega: ${product?.name}`, htmlContent: customerHtml }
        }).then(async ({ data, error }) => {
          if (!error && data?.success) {
            await supabase.from('orders').update({ customer_notified: true }).eq('id', orderId)
            console.log(`[Delivery] Customer notified successfully for order ${orderId}`)
          } else {
            console.error(`[Delivery] Failed to send customer email:`, error || data?.error)
          }
        })
      )
    }

    // --- B. SELLER NOTIFICATION EMAIL ---
    if (!ord.seller_notified && sellerEmail) {
      console.log(`[Delivery] Sending notification to seller: ${sellerEmail}`)
      const sellerHtml = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
          <div style="background-color: #141416; padding: 30px; text-align: center;">
            <img src="${siteUrl}/logo.png" alt="EnsinaPay" style="height: 24px;">
          </div>
          <div style="padding: 40px; text-align: center;">
            <p style="color: #10b981; font-weight: 800; font-size: 14px; text-transform: uppercase;">Venda Realizada! 💸</p>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 10px 0;">Acabaste de vender!</h1>
            <p style="color: #9ca3af;">O produto <strong>${product?.name}</strong> foi vendido por ${ord.price} MT.</p>
          </div>
        </div>`

      notifications.push(
        supabase.functions.invoke('send-email-notification', {
          body: { to: sellerEmail, subject: `💸 Nova Venda: ${product?.name}`, htmlContent: sellerHtml, senderName: "EnsinaPay Vendas" }
        }).then(async ({ data, error }) => {
          if (!error && data?.success) {
            await supabase.from('orders').update({ seller_notified: true }).eq('id', orderId)
            console.log(`[Delivery] Seller notified successfully for order ${orderId}`)
          } else {
            console.error(`[Delivery] Failed to send seller email:`, error || data?.error)
          }
        })
      )
    }

    await Promise.all(notifications)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[Delivery Error]', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
