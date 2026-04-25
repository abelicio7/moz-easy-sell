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
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://www.ensinapay.com/logo.png" alt="EnsinaPay" style="max-height: 45px;" />
            </div>
            <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
              <h2 style="color: #111827; margin-top: 0; font-size: 24px; text-align: center;">Pagamento Confirmado! 🎉</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Olá <strong>${order.customer_name?.split(" ")[0] || ''}</strong>,</p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Temos uma ótima notícia! O seu pagamento referente ao produto <strong>${product?.name}</strong> foi aprovado com sucesso.</p>
              
              <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e5e7eb; text-align: center;">
                ${product?.delivery_type === "link" 
                  ? `<p style="margin: 0 0 15px 0; color: #374151; font-size: 15px;">Clique no botão abaixo para acessar o seu produto agora mesmo:</p>
                     <a href="${product?.delivery_content}" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">Acessar Meu Produto</a>`
                  : `<p style="margin: 0 0 10px 0; color: #374151; font-size: 15px; font-weight: bold;">O seu conteúdo exclusivo:</p>
                     <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px dashed #cbd5e1; text-align: left; white-space: pre-wrap; color: #1e293b; font-size: 14px; font-family: monospace;">${product?.delivery_content}</div>`
                }
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                Obrigado por escolher a <strong>EnsinaPay</strong>!<br>
                Qualquer dúvida, estamos à disposição.
              </p>
            </div>
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

        // 1.1 NOTIFY SELLER
        if (product?.user_id) {
          try {
            // Get seller profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", product.user_id)
              .single();

            if (profile?.email) {
              const sellerHtmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f0fdf4; padding: 40px 20px;">
                  <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #dcfce7; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
                    <h2 style="color: #166534; margin: 0; font-size: 24px;">Venda Realizada!</h2>
                    <p style="color: #6b7280; font-size: 16px; margin-top: 10px;">Boas notícias, <strong>${profile.full_name || 'Vendedor'}</strong>!</p>
                    
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; text-align: left; border: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px; font-weight: bold; uppercase;">Detalhes da Transação:</p>
                      <p style="margin: 5px 0; color: #1e293b; font-size: 15px;"><strong>Produto:</strong> ${product?.name}</p>
                      <p style="margin: 5px 0; color: #1e293b; font-size: 15px;"><strong>Valor:</strong> ${order.price.toFixed(2)} MT</p>
                      <p style="margin: 5px 0; color: #1e293b; font-size: 15px;"><strong>Cliente:</strong> ${order.customer_name}</p>
                    </div>

                    <a href="https://www.ensinapay.com/dashboard/sales" style="background-color: #16a34a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 14px;">Ver no Dashboard</a>
                    
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
                      Continue o excelente trabalho!<br>
                      Equipa EnsinaPay
                    </p>
                  </div>
                </div>
              `;

              await supabase.functions.invoke("send-email-notification", {
                body: {
                  to: profile.email,
                  subject: `VENDA REALIZADA: ${product?.name} (MT ${order.price.toFixed(2)})`,
                  htmlContent: sellerHtmlContent,
                  senderName: "Vendas EnsinaPay"
                }
              });
            }
          } catch (sellerErr) {
            console.error("Failed to notify seller:", sellerErr);
          }
        }
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
        raw_debito_data: statusData,
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
