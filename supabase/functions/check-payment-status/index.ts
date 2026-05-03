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
    let debitoReference = url.searchParams.get("debito_reference");
    let orderId = url.searchParams.get("order_id");

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.debito_reference) debitoReference = body.debito_reference;
        if (body.order_id) orderId = body.order_id;
      } catch(e) { /* ignore JSON parse error */ }
    }

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

      const { data: ord, error: ordErr } = await supabase.from("orders").select(`*, products(*, profiles(*))`).eq("id", id).single();
      if (ordErr) console.error(`[DB ERROR] Failed to fetch order ${id}:`, ordErr);
      if (!ord) {
        console.error(`[NOT FOUND] Order ${id} was not found in database or query failed.`);
        return null;
      }
      
      console.log(`[Order Found] Current status: ${ord.status}`);

      // New Status Logic from Orchestrator API
      const apiStatus = (data.payment?.status || data.status || data.transaction?.status || data.data?.status || "").toUpperCase();
      const isP = ["SUCCESS", "PAID", "COMPLETED", "SETTLED", "APPROVED"].includes(apiStatus);
      const isF = ["FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(apiStatus);
      
      console.log(`[Status Eval] apiStatus is ${apiStatus}. isP: ${isP}, isF: ${isF}`);

      let newS = ord.status;
      if (isP) newS = "paid";
      else if (isF) newS = "failed";

      if (newS !== ord.status) {
        console.log(`[Status Change] Attempting to update order ${id} to ${newS}`);
        const { error: updErr } = await supabase.from("orders").update({ status: newS }).eq("id", id);
        if (updErr) {
          console.error(`[UPDATE ERROR] Failed to update order ${id} to ${newS}:`, updErr);
        } else {
          console.log(`[UPDATE SUCCESS] Order ${id} updated to ${newS}`);
        }
      }

      if (newS === "paid") {
        const prod = Array.isArray(ord.products) ? ord.products[0] : ord.products;
        const notificationPromises = [];
        
        // --- 1. NOTIFY CUSTOMER (Premium Access Email) ---
        if (ord.customer_email && !ord.customer_notified) {
          const deliveryUrl = `${Deno.env.get("PUBLIC_SITE_URL") || 'https://ensinapay.com'}/biblioteca?email=${encodeURIComponent(ord.customer_email)}`;

          const customerHtml = `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
              <div style="background-color: #141416; padding: 40px 20px; text-align: center; border-bottom: 1px solid #1c1c1e;">
                <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 32px;">
              </div>
              <div style="padding: 50px 40px; background-color: #0a0a0b; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px;">Compra Confirmada! 🚀</h1>
                <p style="color: #9ca3af; font-size: 16px; line-height: 1.5; margin: 0 0 40px 0;">O teu pagamento foi processado com sucesso. O teu conteúdo já te espera.</p>
                
                <div style="background-color: #141416; padding: 25px; border-radius: 16px; border: 1px solid #232326; text-align: left; margin-bottom: 40px;">
                  <h3 style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">Detalhes do Pedido:</h3>
                  <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 5px 0;">${prod?.name}</p>
                  <p style="color: #10b981; font-size: 16px; font-weight: 600; margin: 0;">${ord.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</p>
                </div>
                
                <a href="${deliveryUrl}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 20px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 10px 20px rgba(16,185,129,0.2);">Aceder Agora</a>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">Podes ver todas as tuas compras em <a href="https://ensinapay.com/biblioteca" style="color: #10b981; text-decoration: none; font-weight: 600;">ensinapay.com/biblioteca</a></p>
              </div>
              <div style="background-color: #141416; padding: 30px; text-align: center; border-top: 1px solid #1c1c1e;">
                <p style="color: #4b5563; font-size: 12px; margin: 0;">EnsinaPay - A nova era dos conteúdos em Moçambique.</p>
              </div>
            </div>
          `;
          
          const sendCustomerEmail = async () => {
            try {
              await supabase.functions.invoke("send-email-notification", { 
                body: { to: ord.customer_email, subject: `✅ Seu acesso chegou: ${prod?.name}`, htmlContent: customerHtml, senderName: "EnsinaPay" } 
              });
              const { error: notifyCustErr } = await supabase.from("orders").update({ customer_notified: true }).eq("id", id);
              if (notifyCustErr) console.error(`[DB ERROR] Failed to set customer_notified=true for order ${id}:`, notifyCustErr);
            } catch(e) { console.error("Customer email flow crash:", e); }
          };
          notificationPromises.push(sendCustomerEmail());
        }

        // --- 2. NOTIFY SELLER & RECORD COMMISSIONS ---
        if (prod?.user_id && !ord.seller_notified) {
          let sEmail = prod.profiles?.email;
          if (!sEmail) { 
            const { data: aU } = await supabase.auth.admin.getUserById(prod.user_id); 
            sEmail = aU?.user?.email; 
          }
          
          if (sEmail) {
            const sellerHtml = `
              <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
                <div style="background-color: #141416; padding: 30px; text-align: center; border-bottom: 1px solid #1c1c1e;">
                  <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 28px;">
                </div>
                <div style="padding: 40px; text-align: center;">
                  <p style="color: #10b981; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Venda Realizada! 💸</p>
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px;">Acabaste de vender!</h1>
                  <p style="color: #9ca3af; font-size: 15px; margin-bottom: 30px;">O produto <strong>${prod?.name}</strong> foi vendido com sucesso.</p>
                  
                  <div style="background-color: #141416; padding: 20px; border-radius: 12px; border: 1px solid #232326; display: inline-block; min-width: 200px;">
                    <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; margin: 0 0 5px 0;">Valor da Venda:</p>
                    <p style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0;">${ord.price.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</p>
                  </div>
                </div>
              </div>
            `;
            
            const sendSellerEmail = async () => {
              try {
                await supabase.functions.invoke("send-email-notification", { 
                  body: { to: sEmail, subject: `💸 VENDA REALIZADA: ${prod?.name}`, htmlContent: sellerHtml, senderName: "EnsinaPay Vendas" } 
                });
                const { error: notifySellErr } = await supabase.from("orders").update({ seller_notified: true }).eq("id", id);
                if (notifySellErr) console.error(`[DB ERROR] Failed to set seller_notified=true for order ${id}:`, notifySellErr);
              } catch(e) { console.error("Seller email flow crash:", e); }
            };
            notificationPromises.push(sendSellerEmail());
          }
        }

        // Run notifications in parallel but wait for them to finish before responding to keep function alive
        // in Supabase Edge Functions environment.
        if (notificationPromises.length > 0) {
          console.log(`[Speed] Triggering ${notificationPromises.length} notifications in parallel...`);
          await Promise.all(notificationPromises);
        }

          // --- 5. CALCULATE AND RECORD COMMISSIONS (CRITICAL) ---
          const { data: existingCommissions } = await supabase.from("commissions").select("id").eq("order_id", id).limit(1);
          
          if (!existingCommissions || existingCommissions.length === 0) {
            console.log(`[Commission] Calculating splits for order ${id}...`);
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
                  <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
                    <div style="background-color: #141416; padding: 30px; text-align: center; border-bottom: 1px solid #1c1c1e;">
                      <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 28px;">
                    </div>
                    <div style="padding: 40px; text-align: center;">
                      <p style="color: #10b981; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Comissão Recebida! 🎉</p>
                      <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 30px 0;">Parabéns, ${affProfile.full_name || 'Afiliado'}!</h2>
                      
                      <div style="background-color: #141416; padding: 30px; border-radius: 20px; border: 1px solid #232326; margin-bottom: 30px;">
                        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px 0;">A tua comissão de afiliado:</p>
                        <h1 style="color: #10b981; font-size: 48px; font-weight: 900; margin: 0;">${affiliateCommission.toFixed(2)} MT</h1>
                      </div>
                      
                      <p style="color: #9ca3af; font-size: 15px;">Produto: <b style="color: #ffffff;">${prod?.name}</b></p>
                    </div>
                    <div style="background-color: #141416; padding: 25px; text-align: center;">
                      <a href="https://ensinapay.com/dashboard/finance" style="display: inline-block; background-color: #10b981; color: #000000; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 14px;">Ver Carteira</a>
                    </div>
                  </div>
                `;
                try {
                  await supabase.functions.invoke("send-email-notification", { 
                    body: { 
                      to: affProfile.email, 
                      subject: `🎉 Parabéns! Ganhaste ${affiliateCommission.toFixed(2)} MT de Comissão`, 
                      htmlContent: affHtml 
                    } 
                  });
                } catch(e) { console.error("Affiliate email crash:", e); }
              }
            }
            const { error: insErr } = await supabase.from("commissions").insert(splits);
            if (insErr) console.error(`[Commission Error] Failed to insert splits for order ${id}:`, insErr);
            else console.log(`[Commission Success] Recorded earnings for order ${id}`);
          } else {
            console.log(`[Commission] Earnings already recorded for order ${id}. Skipping.`);
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
