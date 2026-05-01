import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const E2_BASE_URL = "https://e2payments.explicador.co.mz/v1";

async function getE2Token(): Promise<string> {
  const clientId = Deno.env.get("E2_CLIENT_ID");
  const clientSecret = Deno.env.get("E2_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("E2 credentials not configured");
  }

  const response = await fetch(`${E2_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Auth failed");
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const debitoReference = url.searchParams.get("debito_reference"); // Agora contém o E2 Transaction ID
    const orderId = url.searchParams.get("order_id");

    if (!debitoReference || !orderId) {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const processOrder = async (id: string, e2Ref: string) => {
      console.log(`[E2 Check] Checking Status for Order ${id} (Ref: ${e2Ref})`);
      
      let token: string;
      try {
        token = await getE2Token();
      } catch (err) {
        console.error("Auth error:", err.message);
        return null;
      }

      // Try fetching status from E2
      // Standard endpoint for E2: /c2b/payment-status/{id}
      const res = await fetch(`${E2_BASE_URL}/c2b/payment-status/${e2Ref}`, {
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
      });
      
      const data = await res.json();
      console.log(`[E2 Response]:`, JSON.stringify(data));

      const { data: ord } = await supabase.from("orders").select(`*, products(*, profiles(*))`).eq("id", id).single();
      if (!ord) return null;

      // Status mapping for e2Payments (usually 'success' or 'completed')
      const e2Status = (data.status || data.transaction_status || "").toLowerCase();
      const isP = ["success", "completed", "paid"].includes(e2Status);
      const isF = ["failed", "cancelled", "rejected", "expired"].includes(e2Status);

      let newS = ord.status;
      if (isP) newS = "paid";
      else if (isF) newS = "failed";

      if (newS !== ord.status) {
        await supabase.from("orders").update({ status: newS }).eq("id", id);
      }

      if (newS === "paid") {
        const prod = Array.isArray(ord.products) ? ord.products[0] : ord.products;
        
        // 1. NOTIFY CUSTOMER
        if (ord.customer_email && !ord.customer_notified) {
          const deliveryUrl = `${Deno.env.get("PUBLIC_SITE_URL") || 'https://ensinapay.com'}/biblioteca?email=${encodeURIComponent(ord.customer_email)}`;
          const customerHtml = `
            <div style="font-family: sans-serif; background-color: #111827; color: white; padding: 40px; border-radius: 16px;">
              <h1>Pagamento Confirmado! 🚀</h1>
              <p>O seu acesso ao produto <b>${prod?.name}</b> já está liberado.</p>
              <a href="${deliveryUrl}" style="background: #10b981; color: black; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 20px;">Aceder Agora</a>
            </div>
          `;
          await supabase.functions.invoke("send-email-notification", { body: { to: ord.customer_email, subject: `✅ Acesso Liberado: ${prod?.name}`, htmlContent: customerHtml } });
          await supabase.from("orders").update({ customer_notified: true }).eq("id", id);
        }

        // 2. NOTIFY SELLER & COMMISSIONS
        if (prod?.user_id && !ord.seller_notified) {
          const sellerHtml = `<div style="padding: 20px;"><h2>Venda Realizada! 💸</h2><p>${ord.price} MT recebidos.</p></div>`;
          await supabase.functions.invoke("send-email-notification", { body: { to: prod.profiles?.email, subject: `💸 Venda de ${prod?.name}`, htmlContent: sellerHtml } });
          
          let affComm = 0;
          if (ord.affiliate_id) {
            const { data: offer } = await supabase.from("affiliate_offers").select("commission_percent").eq("product_id", ord.product_id).maybeSingle();
            if (offer) affComm = ord.price * (Number(offer.commission_percent) / 100);
          }
          const sellerNet = ord.price - affComm;
          const splits = [{ order_id: ord.id, user_id: prod.user_id, amount: sellerNet, user_type: 'seller' }];
          if (affComm > 0 && ord.affiliate_id) splits.push({ order_id: ord.id, user_id: ord.affiliate_id, amount: affComm, user_type: 'affiliate' });
          await supabase.from("commissions").insert(splits);
          await supabase.from("orders").update({ seller_notified: true }).eq("id", id);
        }
      }
      return { status: e2Status, order_status: newS };
    };

    const result = await processOrder(orderId, debitoReference);
    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("Check status error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
