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
      console.log("Brevo Error (Customer Email):", emailError)
      // We log but still try to mark as delivered so customer at least has library access,
      // and seller/admin get notified.
    }

    // 3. Update order status to delivered
    const { error: updateStatusError } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId)

    if (updateStatusError) {
      console.error("Error updating status to delivered:", updateStatusError)
    } else {
      console.log(`Product delivered successfully to ${customerEmail}`)
    }

    // 4. Notify Seller and Admins
    try {
      const productName = order.products?.name || 'Produto';
      const sellerId = order.products?.user_id;

      let seller: any = null;
      if (sellerId) {
        const { data: sellerData, error: sellerError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', sellerId)
          .single();
        if (!sellerError) {
          seller = sellerData;
        } else {
          console.error('Error fetching seller details for delivery notifications:', sellerError);
        }
      }

      // 4A. Notify Seller
      if (seller && seller.email) {
        const sellerSubject = `🎉 Venda Realizada! - ${productName}`;
        const sellerHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #10b981;">Parabéns! Nova venda realizada.</h2>
            <p>O seu produto <strong>${productName}</strong> foi vendido com sucesso!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <h3>Detalhes da Venda:</h3>
            <p><strong>Pedido ID:</strong> ${order.id}</p>
            <p><strong>Cliente:</strong> ${order.customer_name} (${order.customer_email})</p>
            <p><strong>Valor do Produto:</strong> ${order.price} MT</p>
            <p><strong>Data:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            <br />
            <p>Boas vendas!<br/>Equipe EnsinaPay</p>
          </div>
        `;
        
        const sellerEmailResp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: "EnsinaPay", email: "suporte@ensinapay.com" },
            to: [{ email: seller.email, name: seller.full_name }],
            subject: sellerSubject,
            htmlContent: sellerHtml
          })
        });
        if (!sellerEmailResp.ok) {
          console.error('Error sending seller email via Brevo:', await sellerEmailResp.text());
        }
      }

      // 4B. Notify Admins
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin');

      if (!adminError && admins && admins.length > 0) {
        const adminEmails = admins.map(a => ({ email: a.email })).filter(a => a.email);
        const adminSubject = `✅ Pedido pago: ${order.id}`;
        const adminHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #10b981;">Novo pagamento confirmado e produto entregue.</h2>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <ul>
              <li><strong>Pedido ID:</strong> ${order.id}</li>
              <li><strong>Produto:</strong> ${productName}</li>
              <li><strong>Cliente:</strong> ${order.customer_name} (${order.customer_email})</li>
              <li><strong>Vendedor:</strong> ${seller?.full_name || 'Desconhecido'} (${seller?.email || 'N/A'})</li>
              <li><strong>Valor:</strong> ${order.price} MT</li>
              <li><strong>Status:</strong> delivered</li>
              <li><strong>Data:</strong> ${new Date(order.created_at).toLocaleString()}</li>
            </ul>
          </div>
        `;

        const adminEmailResp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: "EnsinaPay System", email: "suporte@ensinapay.com" },
            to: adminEmails,
            subject: adminSubject,
            htmlContent: adminHtml
          })
        });
        if (!adminEmailResp.ok) {
          console.error('Error sending admin email via Brevo:', await adminEmailResp.text());
        }
      }

      // 4C. Send Web Push Notification to Seller
      try {
        const PUBLIC_VAPID_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || "";
        const PRIVATE_VAPID_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || "";

        if (sellerId) {
          const { data: subs, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', sellerId);

          if (!subsError && subs && subs.length > 0) {
            const webpush = (await import('npm:web-push')).default;
            webpush.setVapidDetails(
              'mailto:suporte@ensinapay.com',
              PUBLIC_VAPID_KEY,
              PRIVATE_VAPID_KEY
            );

            for (const sub of subs) {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth
                }
              };

              const payload = JSON.stringify({
                title: "Venda realizada! 🎉",
                body: `Comissão: ${order.price} MT - ID: ${order.id.slice(0, 8).toUpperCase()}`,
                url: "/dashboard/sales"
              });
              let pushError = null;
              await webpush.sendNotification(pushSubscription, payload).catch((e: any) => {
                console.error("WebPush send error for sub:", e);
                pushError = e.message || String(e);
              });
              
              if (pushError) {
                return new Response(JSON.stringify({ success: false, message: "Push error: " + pushError }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
              }
            }
            console.log(`Sent push notifications to ${subs.length} devices for seller ${sellerId}`);
          }
        }
      } catch (pushErr) {
        console.error("Error sending Web Push notification:", pushErr);
        return new Response(JSON.stringify({ success: false, message: "Fatal Push error: " + pushErr.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

    } catch (err) {
      console.error('Error processing seller/admin notification emails in deliver-product:', err);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Product delivered and notifications sent" }),
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
