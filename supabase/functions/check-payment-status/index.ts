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

    // Helper to process an order (status update + notifications)
    const processOrder = async (id: string, debitoRef: string, forceData?: any) => {
      console.log(`[Background Process] Checking Order ${id}...`);
      
      let data = forceData;
      if (!data) {
        const res = await fetch(`${DEBITO_BASE_URL}/transactions/${debitoRef}/status`, {
          headers: { "Authorization": `Bearer ${PAYMENT_API_TOKEN}`, "Accept": "application/json" }
        });
        data = await res.json();
      }

      const { data: ord } = await supabase.from("orders").select(`*, products(*, profiles(*))`).eq("id", id).single();
      if (!ord) return null;

      const dStatus = (data.status || data.transaction?.status || data.data?.status || "").toUpperCase();
      const isP = ["COMPLETED", "SUCCESS", "PAID", "SUCCESSFUL", "SETTLED", "APPROVED", "AUTHORIZED"].includes(dStatus);
      const isF = ["FAILED", "CANCELLED", "REJECTED"].includes(dStatus);

      let newS = ord.status;
      if (isP) newS = "paid";
      else if (isF) newS = "failed";

      if (newS !== ord.status) {
        await supabase.from("orders").update({ status: newS }).eq("id", id);
      }

      if (newS === "paid") {
        const prod = Array.isArray(ord.products) ? ord.products[0] : ord.products;
        
        // --- 1. NOTIFY CUSTOMER (Premium Access Email) ---
        if (ord.customer_email && !ord.customer_notified) {
          // Intelligent Delivery Link: Direct if link, otherwise Thank You page
          const isDirectLink = prod?.delivery_type === 'link' && prod?.delivery_content?.startsWith('http');
          const deliveryUrl = isDirectLink 
            ? prod.delivery_content 
            : `${Deno.env.get("PUBLIC_SITE_URL") || 'https://ensinapay.com'}/thank-you?orderId=${ord.id}`;

          const customerHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 0 0 16px 16px; overflow: hidden; color: #ffffff;">
              <div style="background-color: #f3f4f6; padding: 30px; text-align: center;">
                <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 40px;">
              </div>
              <div style="padding: 40px 30px;">
                <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0;">Obrigado pela sua compra! 🚀</h1>
                <p style="font-size: 16px; color: #d1d5db; margin-bottom: 30px;">O seu pagamento foi confirmado e o seu acesso já está disponível.</p>
                
                <div style="background-color: #1f2937; padding: 25px; border-radius: 12px; border: 1px solid #374151; margin-bottom: 30px;">
                  <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin: 0 0 15px 0;">Detalhes do Pedido:</h3>
                  <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: #10b981;">${prod?.name}</p>
                  <p style="margin: 0 0 15px 0; font-size: 14px; color: #9ca3af;">Valor: ${ord.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</p>
                  
                  ${prod.profiles?.phone ? `
                    <div style="border-top: 1px solid #374151; padding-top: 15px; margin-top: 15px;">
                      <p style="margin: 0 0 10px 0; font-size: 13px; color: #9ca3af; text-transform: uppercase;">Dúvidas sobre o produto?</p>
                      <a href="https://wa.me/${prod.profiles.phone.replace(/\D/g, '')}" style="display: inline-block; background-color: transparent; color: #10b981; border: 1px solid #10b981; padding: 8px 15px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Falar com Vendedor</a>
                    </div>
                  ` : ''}
                </div>
                
                <div style="text-align: center;">
                  <a href="${deliveryUrl}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 18px 45px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Aceder ao Conteúdo</a>
                </div>
                
                <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 30px;">
                  Se tiver alguma dúvida, responda a este e-mail ou contacte o suporte.
                </p>
              </div>
              <div style="background-color: #000000; padding: 20px; text-align: center; font-size: 12px; color: #4b5563;">
                &copy; ${new Date().getFullYear()} EnsinaPay. Todos os direitos reservados.
              </div>
            </div>
          `;
          
          await supabase.functions.invoke("send-email-notification", { 
            body: { to: ord.customer_email, subject: `✅ Seu acesso chegou: ${prod?.name}`, htmlContent: customerHtml, senderName: "EnsinaPay" } 
          });
          await supabase.from("orders").update({ customer_notified: true }).eq("id", id);
        }

        // --- 2. NOTIFY SELLER (Hotmart Style Alert) ---
        if (prod?.user_id && !ord.seller_notified) {
          let sEmail = prod.profiles?.email;
          if (!sEmail) { 
            const { data: aU } = await supabase.auth.admin.getUserById(prod.user_id); 
            sEmail = aU?.user?.email; 
          }
          
          if (sEmail) {
            const sellerHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 0 0 16px 16px; overflow: hidden; color: #ffffff;">
                <div style="background-color: #f3f4f6; padding: 30px; text-align: center;">
                  <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 40px;">
                </div>
                <div style="padding: 40px 30px;">
                  <p style="font-size: 18px; color: #d1d5db; margin-bottom: 10px;">Parabéns!</p>
                  <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 30px 0; line-height: 1.2;">
                    Você acabou de vender uma cópia do produto <span style="text-transform: uppercase; color: #10b981;">${prod?.name}</span>!
                  </h2>
                  
                  <p style="font-size: 16px; color: #10b981; margin-bottom: 5px; font-weight: 600;">Você recebeu:</p>
                  <h1 style="font-size: 48px; font-weight: 900; color: #10b981; margin: 0 0 40px 0;">
                    ${ord.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                  </h1>
                  
                  <div style="background-color: #1f2937; padding: 25px; border-radius: 12px; border: 1px solid #374151;">
                    <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin: 0 0 20px 0;">Dados da Transação:</h3>
                    
                    <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">Nome:</span> ${ord.customer_name}</p>
                    <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">Email:</span> <a href="mailto:${ord.customer_email}" style="color: #10b981; text-decoration: none;">${ord.customer_email}</a></p>
                    ${ord.customer_phone ? `<p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">WhatsApp:</span> <a href="https://wa.me/${ord.customer_phone.replace(/\D/g, '')}" style="color: #10b981; text-decoration: none;">${ord.customer_phone}</a></p>` : ''}
                    <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">Método:</span> <span style="text-transform: uppercase; font-weight: bold;">${ord.payment_method || 'M-Pesa'}</span></p>
                    <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">Data:</span> ${new Date(ord.created_at).toLocaleString('pt-MZ')}</p>
                    <p style="margin: 0 0 20px 0; font-size: 15px;"><span style="color: #9ca3af;">ID:</span> ${ord.id.substring(0, 8).toUpperCase()}</p>
                    
                    <div style="border-top: 1px solid #374151; padding-top: 20px;">
                      <p style="margin: 0; font-size: 14px; font-weight: bold; color: #ffffff;">Valor Pago Pelo Comprador: <span style="color: #10b981;">${ord.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span></p>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 40px;">
                    <a href="https://ensinapay.com/dashboard/sales" style="display: inline-block; background-color: #10b981; color: #000000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 16px; text-transform: uppercase;">Ver Minhas Vendas</a>
                  </div>
                </div>
                <div style="background-color: #000000; padding: 20px; text-align: center; font-size: 12px; color: #4b5563;">
                  &copy; ${new Date().getFullYear()} EnsinaPay. Todos os direitos reservados.
                </div>
              </div>
            `;
            
            await supabase.functions.invoke("send-email-notification", { 
              body: { to: sEmail, subject: `💸 VENDA REALIZADA: ${prod?.name}`, htmlContent: sellerHtml, senderName: "EnsinaPay Vendas" } 
            });
            await supabase.from("orders").update({ seller_notified: true }).eq("id", id);

            // --- 3. NOTIFY SYSTEM ADMIN (Hotmart Style Monitoring) ---
            await supabase.functions.invoke("notify-admins", {
              body: {
                subject: `📈 NOVA VENDA: ${ord.price} MT`,
                htmlContent: sellerHtml.replace("Parabéns!", "Nova Venda Registada!").replace("Você recebeu:", "O vendedor recebeu:")
              }
            });
          }
        }
      }
      return { status: dStatus, order_status: newS };
    };

    // 1. Process the requested order
    const result = await processOrder(orderId, debitoReference, statusData);

    // 2. "Parasitic Polling": Process the OLDEST pending order to catch orphaned payments
    try {
      const { data: orphaned } = await supabase
        .from("orders")
        .select("id, debito_reference")
        .eq("status", "processing")
        .neq("id", orderId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (orphaned && orphaned.debito_reference) {
        console.log(`[Parasitic Polling] Auto-checking orphaned order: ${orphaned.id}`);
        await processOrder(orphaned.id, orphaned.debito_reference);
      }
    } catch (e) { console.error("Parasitic polling failed:", e); }

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Critical error in check-payment-status:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
