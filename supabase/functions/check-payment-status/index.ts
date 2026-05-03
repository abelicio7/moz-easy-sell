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
      const isP = ["SUCCESS", "COMPLETED"].includes(apiStatus);
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
        console.log(`[Speed] Triggering master delivery function for order ${id}...`);
        try {
          await supabase.functions.invoke("process-order-delivery", {
            body: { id: id }
          });
        } catch (e) {
          console.error(`[Critical] Failed to trigger delivery function:`, e);
        }
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
