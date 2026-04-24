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
    console.log("Status check:", JSON.stringify(statusData));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch up-to-date order status and details to avoid duplicate emails
    const { data: order } = await supabase
      .from("orders")
      .select("status, customer_email, customer_name, price, products(name, delivery_type, delivery_content, user_id)")
      .eq("id", orderId)
      .single();

    let orderStatus = "processing";
    const debitoStatus = (statusData.status || statusData.transaction?.status || statusData.data?.status || "").toUpperCase();
    
    if (debitoStatus === "COMPLETED" || debitoStatus === "SUCCESS" || debitoStatus === "PAID" || debitoStatus === "SUCCESSFUL") {
      orderStatus = "paid";
    } else if (debitoStatus === "FAILED" || debitoStatus === "CANCELLED" || debitoStatus === "REJECTED") {
      orderStatus = "failed";
    }

    if (orderStatus !== "processing" && order?.status !== orderStatus) {
      await supabase
        .from("orders")
        .update({ status: orderStatus })
        .eq("id", orderId);

      // Trigger email delivery using the configured send-email-notification edge function (which uses Brevo)
      if (orderStatus === "paid" && order?.customer_email) {
        const product = order.products as any;
        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Pagamento Confirmado! 🎉</h2>
            <p>Olá ${order.customer_name?.split(" ")[0] || ''},</p>
            <p>Seu pagamento para o produto <strong>${product?.name}</strong> foi aprovado com sucesso.</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #eee;">
              ${product?.delivery_type === "link" 
                ? `<p style="margin: 0; text-align: center;"><strong>Acesse seu produto clicando no botão abaixo:</strong><br><br>
                   <a href="${product?.delivery_content}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Acessar Produto</a></p>`
                : `<p style="margin: 0;"><strong>Seu Conteúdo Abaixo:</strong><br><br><span style="white-space: pre-wrap;">${product?.delivery_content}</span></p>`
              }
            </div>
            <p>Obrigado por comprar conosco!</p>
          </div>
        `;

        console.log("Invoking email notification for order", orderId);
        await supabase.functions.invoke("send-email-notification", {
          body: {
            to: order.customer_email,
            subject: `Seu Produto: ${product?.name}`,
            htmlContent: htmlContent,
            senderName: "Equipa EnsinaPay"
          }
        });
      }

      // 2. Trigger webhook se existir
      if (orderStatus === "paid" && order?.products) {
        const product = order.products as any;
        if (product?.user_id) {
          try {
            const { data: webhooks } = await supabase
              .from("seller_integrations")
              .select("config")
              .eq("user_id", product.user_id)
              .eq("integration_type", "webhook")
              .eq("is_active", true);

            if (webhooks && webhooks.length > 0 && webhooks[0].config?.url) {
              console.log("Triggering webhook to:", webhooks[0].config.url);
              // Faz o disparo do webhook de forma assíncrona (não espera a resposta)
              fetch(webhooks[0].config.url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: "payment_approved",
                  order_id: orderId,
                  customer_email: order.customer_email,
                  customer_name: order.customer_name,
                  price: order.price,
                  product_name: product.name,
                  timestamp: new Date().toISOString()
                })
              }).catch(err => console.error("Webhook trigger failed", err));
            }
          } catch (whErr) {
            console.error("Failed to process webhook:", whErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: debitoStatus || "PENDING",
        order_status: orderStatus,
        provider_reference: statusData.provider_reference || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
