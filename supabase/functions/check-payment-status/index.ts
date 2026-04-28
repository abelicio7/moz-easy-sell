import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEBITO_BASE_URL = "https://my.debito.co.mz/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYMENT_API_TOKEN = Deno.env.get("PAYMENT_API_TOKEN");
    if (!PAYMENT_API_TOKEN) {
      throw new Error("PAYMENT_API_TOKEN not configured");
    }

    const url = new URL(req.url);
    const debitoReference = url.searchParams.get("debito_reference");
    const orderId = url.searchParams.get("order_id");

    if (!debitoReference || !orderId) {
      return new Response(
        JSON.stringify({ error: "debito_reference e order_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusResponse = await fetch(
      `${DEBITO_BASE_URL}/transactions/${debitoReference}/status`,
      {
        headers: {
          "Authorization": `Bearer ${PAYMENT_API_TOKEN}`,
          "Accept": "application/json",
        },
      }
    );

    const statusData = await statusResponse.json();
    console.log(`[Order ${orderId}] Debito API Status:`, JSON.stringify(statusData));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        status, customer_email, customer_name, price, customer_notified, seller_notified, 
        products(
          name, delivery_type, delivery_content, user_id,
          profiles(email, full_name)
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error(`[Order ${orderId}] Failed to fetch order:`, orderErr);
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
    }

    const product = Array.isArray(order.products) ? order.products[0] : order.products;
    const productName = product?.name || "Produto";
    const sellerProfile = Array.isArray(product?.profiles) ? product?.profiles[0] : product?.profiles;

    const debitoStatus = (statusData.status || statusData.transaction?.status || statusData.data?.status || "").toUpperCase();
    const isPaid = ["COMPLETED", "SUCCESS", "PAID", "SUCCESSFUL", "SETTLED", "APPROVED", "AUTHORIZED"].includes(debitoStatus);
    const isFailed = ["FAILED", "CANCELLED", "REJECTED"].includes(debitoStatus);

    let currentStatus = order.status;
    if (isPaid) currentStatus = "paid";
    else if (isFailed) currentStatus = "failed";

    // 1. Update status if changed
    if (currentStatus !== order.status) {
      console.log(`[Order ${orderId}] Updating status: ${order.status} -> ${currentStatus}`);
      await supabase.from("orders").update({ status: currentStatus }).eq("id", orderId);
    }

    // 2. Notifications
    if (currentStatus === "paid") {
      console.log(`[Order ${orderId}] Processing notifications for paid order...`);

      // 2.1 Customer Notification (Product Delivery)
      if (order.customer_email && !order.customer_notified) {
        console.log(`[Order ${orderId}] Delivering product to: ${order.customer_email}`);
        
        const customerHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px;">
            <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #f3f4f6; text-align: center;">
              <h2 style="color: #111827;">Pagamento Confirmado! 🎉</h2>
              <p>Olá <strong>${order.customer_name}</strong>,</p>
              <p>Seu pagamento para o produto <strong>${productName}</strong> foi aprovado.</p>
              
              <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e5e7eb;">
                ${product?.delivery_type === "link" 
                  ? `<p>Acesse seu produto clicando abaixo:</p>
                     <a href="${product?.delivery_content || '#'}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar Produto</a>`
                  : `<p>Seu conteúdo exclusivo:</p>
                     <div style="background-color: #fff; padding: 15px; border-radius: 6px; border: 1px dashed #ccc; font-family: monospace; white-space: pre-wrap;">${product?.delivery_content || ''}</div>`
                }
              </div>
              <p style="font-size: 12px; color: #6b7280;">Obrigado por escolher a <strong>EnsinaPay</strong>!</p>
            </div>
          </div>
        `;

        const { error: emailErr } = await supabase.functions.invoke("send-email-notification", {
          body: { to: order.customer_email, subject: `Seu Produto: ${productName}`, htmlContent: customerHtml, senderName: "EnsinaPay" }
        });

        if (!emailErr) {
          await supabase.from("orders").update({ customer_notified: true }).eq("id", orderId);
          console.log(`[Order ${orderId}] Customer notified.`);
        } else {
          console.error(`[Order ${orderId}] Failed to notify customer:`, emailErr);
        }
      }

      // 2.2 Seller Notification (Sale Alert)
      if (product?.user_id && !order.seller_notified) {
        let sellerEmail = sellerProfile?.email;
        let sellerName = sellerProfile?.full_name || "Vendedor";

        // Fallback for seller info
        if (!sellerEmail) {
          const { data: authUser } = await supabase.auth.admin.getUserById(product.user_id);
          sellerEmail = authUser?.user?.email;
          sellerName = authUser?.user?.user_metadata?.full_name || sellerName;
        }

        if (sellerEmail) {
          console.log(`[Order ${orderId}] Notifying seller: ${sellerEmail}`);
          const sellerHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f0fdf4; padding: 40px 20px;">
              <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #dcfce7; text-align: center;">
                <h2 style="color: #166534;">Nova Venda Realizada! 💰</h2>
                <p>Parabéns, <strong>${sellerName}</strong>!</p>
                <div style="margin: 20px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; text-align: left; border: 1px solid #e2e8f0;">
                  <p><strong>Produto:</strong> ${productName}</p>
                  <p><strong>Valor:</strong> ${Number(order.price || 0).toFixed(2)} MT</p>
                  <p><strong>Cliente:</strong> ${order.customer_name}</p>
                </div>
                <a href="${Deno.env.get("PUBLIC_URL") || 'https://www.ensinapay.com'}/dashboard/sales" style="background-color: #16a34a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver Dashboard</a>
              </div>
            </div>
          `;

          const { error: sellerErr } = await supabase.functions.invoke("send-email-notification", {
            body: { to: sellerEmail, subject: `VENDA REALIZADA: ${productName}`, htmlContent: sellerHtml, senderName: "Vendas EnsinaPay" }
          });

          if (!sellerErr) {
            await supabase.from("orders").update({ seller_notified: true }).eq("id", orderId);
            console.log(`[Order ${orderId}] Seller notified.`);
          }
        }
      }

      // 2.3 Webhook Trigger
      try {
        const { data: webhooks } = await supabase.from("seller_integrations").select("config").eq("user_id", product.user_id).eq("integration_type", "webhook").eq("is_active", true);
        if (webhooks?.[0]?.config?.url) {
          await fetch(webhooks[0].config.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "payment_approved", order_id: orderId, price: order.price, product_name: productName })
          });
        }
      } catch (whErr) { console.error("Webhook failure:", whErr); }
    }

    return new Response(
      JSON.stringify({
        status: debitoStatus,
        order_status: currentStatus,
        raw_debito_data: statusData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Critical error in check-payment-status:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
