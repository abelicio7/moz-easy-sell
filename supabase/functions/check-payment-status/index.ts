import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEBITO_BASE_URL = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1";

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
        JSON.stringify({ error: "debito_reference (payment_id) e order_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Helper to process an order (status update + notifications)
    const processOrder = async (id: string, debitoRef: string, forceData?: any) => {
      console.log(`[Background Process] Checking Order ${id} (Ref: ${debitoRef})...`);
      
      let data = forceData;
      if (!data) {
        try {
          const res = await fetch(`${DEBITO_BASE_URL}/payment-orchestrator`, {
            method: "POST",
            headers: { 
              "Authorization": `Bearer ${PAYMENT_API_TOKEN}`, 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              action: "check-status",
              api_key: PAYMENT_API_TOKEN,
              backend_transaction: true,
              payment_id: debitoRef
            })
          });
          data = await res.json();
          console.log(`[Status API Response for ${id}]:`, JSON.stringify(data));
        } catch (fetchErr) {
          console.error(`Failed to fetch status for ${id}:`, fetchErr.message);
          return null;
        }
      }

      const { data: ord } = await supabase.from("orders").select(`*, products(*, profiles(*))`).eq("id", id).single();
      if (!ord) return null;

      // New Status Logic from Orchestrator API
      const apiStatus = (data.payment?.status || data.status || data.transaction?.status || data.data?.status || "").toUpperCase();
      const isP = ["SUCCESS", "PAID", "COMPLETED", "SETTLED", "APPROVED"].includes(apiStatus);
      const isF = ["FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(apiStatus);

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
          const deliveryUrl = `${Deno.env.get("PUBLIC_SITE_URL") || 'https://ensinapay.com'}/biblioteca?email=${encodeURIComponent(ord.customer_email)}`;

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
                </div>
                <div style="text-align: center;">
                  <a href="${deliveryUrl}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 18px 45px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Aceder ao Conteúdo</a>
                </div>
                <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 30px;">
                  Pode aceder a todos os seus produtos em <a href="https://ensinapay.com/biblioteca" style="color: #10b981; font-weight: bold; text-decoration: none;">ensinapay.com/biblioteca</a>
                </p>
              </div>
            </div>
          `;
          
          await supabase.functions.invoke("send-email-notification", { 
            body: { to: ord.customer_email, subject: `✅ Seu acesso chegou: ${prod?.name}`, htmlContent: customerHtml, senderName: "EnsinaPay" } 
          });
          await supabase.from("orders").update({ customer_notified: true }).eq("id", id);
        }

        // --- 2. NOTIFY SELLER ---
        if (prod?.user_id && !ord.seller_notified) {
          let sEmail = prod.profiles?.email;
          if (!sEmail) { 
            const { data: aU } = await supabase.auth.admin.getUserById(prod.user_id); 
            sEmail = aU?.user?.email; 
          }
          
          if (sEmail) {
            const sellerHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; color: #ffffff; padding: 40px 30px;">
                <h2 style="font-size: 22px; font-weight: 800; color: #10b981;">Venda Realizada! 💸</h2>
                <p style="font-size: 16px; color: #d1d5db;">Você acabou de vender o produto <b>${prod?.name}</b>.</p>
                <h1 style="font-size: 48px; font-weight: 900; color: #10b981; margin: 20px 0;">${ord.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</h1>
                <p style="font-size: 14px; color: #9ca3af;">Comprador: ${ord.customer_name} (${ord.customer_email})</p>
              </div>
            `;
            
            await supabase.functions.invoke("send-email-notification", { 
              body: { to: sEmail, subject: `💸 VENDA REALIZADA: ${prod?.name}`, htmlContent: sellerHtml, senderName: "EnsinaPay Vendas" } 
            });
            await supabase.from("orders").update({ seller_notified: true }).eq("id", id);

            // --- 5. CALCULATE AND RECORD COMMISSIONS ---
            let affiliateCommission = 0;
            if (ord.affiliate_id) {
              const { data: offer } = await supabase.from("affiliate_offers").select("commission_percent").eq("product_id", ord.product_id).eq("is_active", true).maybeSingle();
              if (offer) affiliateCommission = ord.price * (Number(offer.commission_percent) / 100);
            }

            const sellerNet = ord.price - affiliateCommission;
            const splits = [{ order_id: ord.id, user_id: prod.user_id, amount: sellerNet, user_type: 'seller' }];
            if (affiliateCommission > 0 && ord.affiliate_id) {
              splits.push({ order_id: ord.id, user_id: ord.affiliate_id, amount: affiliateCommission, user_type: 'affiliate' });

              // --- 6. NOTIFY AFFILIATE ---
              const { data: affProfile } = await supabase.from("profiles").select("email, full_name").eq("id", ord.affiliate_id).single();
              if (affProfile && affProfile.email) {
                const affHtml = `
                  <div style="font-family: sans-serif; background-color: #f8f9fa; color: #333; padding: 40px; border-radius: 16px; border-top: 5px solid #10b981;">
                    <h2>Nova Comissão Recebida! 🎉</h2>
                    <p>Olá ${affProfile.full_name || 'Afiliado'},</p>
                    <p>Alguém acabou de comprar o produto <b>${prod?.name}</b> através do seu link de afiliado!</p>
                    <p>A sua comissão de <b>${affiliateCommission.toFixed(2)} MT</b> já foi adicionada ao seu saldo na EnsinaPay.</p>
                    <a href="${Deno.env.get("PUBLIC_SITE_URL") || 'https://ensinapay.com'}/dashboard/finance" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 20px;">Ver Meu Saldo</a>
                  </div>
                `;
                await supabase.functions.invoke("send-email-notification", { 
                  body: { 
                    to: affProfile.email, 
                    subject: \`🎉 Parabéns! Ganhaste \${affiliateCommission.toFixed(2)} MT de Comissão\`, 
                    htmlContent: affHtml 
                  } 
                });
              }
            }
            await supabase.from("commissions").insert(splits);
          }
        }
      }
      return { status: apiStatus, order_status: newS };
    };

    // 1. Process the requested order
    const result = await processOrder(orderId, debitoReference);

    // 2. "Parasitic Polling": Process the OLDEST pending order
    try {
      const { data: orphaned } = await supabase.from("orders").select("id, debito_reference").eq("status", "processing").neq("id", orderId).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (orphaned && orphaned.debito_reference) {
        console.log(`[Parasitic Polling] Auto-checking orphaned order: ${orphaned.id}`);
        await processOrder(orphaned.id, orphaned.debito_reference);
      }
      await supabase.functions.invoke("abandoned-cart-recovery");
    } catch (e) { console.error("Parasitic polling failed:", e); }

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Critical error in check-payment-status:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
