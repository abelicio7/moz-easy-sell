import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as crypto from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // 1. Get raw body for HMAC validation
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('DEBITO_WEBHOOK_SECRET');

    console.log("Webhook Signature Received:", signature);

    // Parse body early
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error("Failed to parse body JSON:", parseErr);
    }

    // Capture headers for diagnostic audit log
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    // 2. LOG RAW WEBHOOK FIRST FOR AUDIT (Even if signature validation fails!)
    await supabase.from('webhook_logs').insert({ 
        payload: {
          headers: headersObj,
          body: body,
          rawBody: rawBody,
          signature: signature,
          has_secret: !!webhookSecret
        }
    });

    // 3. VALIDATION (As per docs: HMAC-SHA256)
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac("sha256", webhookSecret);
      hmac.update(rawBody);
      const hash = hmac.digest("hex");

      if (hash !== signature) {
        console.error(`INVALID WEBHOOK SIGNATURE. Hash mismatch. Calculated: ${hash}, Received: ${signature}`);
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
      }
      console.log("Webhook signature validated successfully.");
    } else if (!webhookSecret) {
      console.warn("DEBITO_WEBHOOK_SECRET not set. Skipping signature validation (DANGEROUS).");
    }

    const { event, data, timestamp } = body;

    // Débito Pay sends the reference in data.transaction_id or data.reference
    const reference = data?.transaction_id || data?.reference || data?.external_reference || data?.source_id || body?.reference || body?.id;
    const paymentId = data?.payment_id || data?.id || body?.id;

    console.log(`Processing event: ${event} for reference: ${reference}`);

    // 4. PROCESS 'payment.completed' or 'payment_completed'
    if (event === 'payment.completed' || event === 'payment_completed' || event === 'ORDER_PAID') {
      if (!reference) {
        console.error("ERRO: Nenhuma referência encontrada no corpo do webhook.", body);
        return new Response(JSON.stringify({ error: "No reference found" }), { status: 200, headers: corsHeaders });
      }

      // 1. Tentar encontrar por debito_reference (ID do Débito Pay)
      console.log(`Procurando pedido com debito_reference: ${reference}`);
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, customer_email')
        .eq('debito_reference', reference)
        .maybeSingle();

      if (orderError) console.error("Erro na busca 1:", orderError);

      if (order) {
        console.log(`Pedido encontrado via debito_reference: ${order.id}`);
        if (order.status !== 'paid' && order.status !== 'delivered') {
          await processSuccessfulPayment(supabase, order.id);
        }
      } else {
        // 2. Fallback: Tentar encontrar pelo próprio ID do pedido (UUID)
        console.log(`Não encontrado. Tentando buscar por UUID do pedido: ${reference}`);
        const { data: orderById, error: idError } = await supabase
          .from('orders')
          .select('id, status')
          .eq('id', reference)
          .maybeSingle();

        if (orderById) {
          console.log(`Pedido encontrado via UUID: ${orderById.id}`);
          if (orderById.status !== 'paid' && orderById.status !== 'delivered') {
            await processSuccessfulPayment(supabase, orderById.id);
          }
        } else {
          console.warn(`ALERTA: Nenhum pedido localizado no banco para a referência ${reference}`);
        }
      }
    }

    // 5. RESPOND 200 OK (Must be within 5 seconds as per docs)
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Webhook Error:", error.message);
    // Always return 200 if possible to stop retries unless it's a real server error
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processSuccessfulPayment(supabase: any, orderId: string) {
  console.log(`Confirming payment for order: ${orderId}`);
  
  // Update status
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId);

  if (updateError) throw updateError;

  // 1. Trigger Delivery (Sends email to customer and updates status to delivered)
  console.log(`Triggering delivery for order: ${orderId}`);
  const deliveryResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deliver-product`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({ orderId: orderId })
  });
  if (!deliveryResponse.ok) {
    console.error('Error triggering delivery:', await deliveryResponse.text());
  }

  // 2. Send Notifications to Seller and Admins
  try {
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, product_id, customer_name, customer_email, price, status, created_at, products(name, user_id)')
      .eq('id', orderId)
      .single();

    if (!orderFetchError && order) {
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
          console.error('Error fetching seller details:', sellerError);
        }
      }

      // 2A. Notify Seller
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
        
        await supabase.functions.invoke('send-email-notification', {
          method: 'POST',
          body: {
            to: seller.email,
            subject: sellerSubject,
            htmlContent: sellerHtml,
            senderName: "EnsinaPay"
          }
        }).catch((err: any) => console.error('Error invoking send-email-notification for seller:', err));
      }

      // 2B. Notify Admins
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
            <li><strong>Status:</strong> ${order.status}</li>
            <li><strong>Data:</strong> ${new Date(order.created_at).toLocaleString()}</li>
          </ul>
        </div>
      `;

      await supabase.functions.invoke('notify-admins', {
        method: 'POST',
        body: { subject: adminSubject, htmlContent: adminHtml }
      }).catch((err: any) => console.error('Error invoking notify-admins:', err));
    }
  } catch (err) {
    console.error('Error processing notification emails:', err);
  }
}
