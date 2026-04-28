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
        
        // Notify Customer
        if (ord.customer_email && !ord.customer_notified) {
          const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #eee;border-radius:12px;"><h2>Pagamento Aprovado!</h2><p>Olá <strong>${ord.customer_name}</strong>, seu acesso para <strong>${prod?.name}</strong> está liberado:</p><div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">${prod?.delivery_type === 'link' ? `<a href="${prod?.delivery_content}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Acessar Produto</a>` : `<p>Conteúdo: ${prod?.delivery_content}</p>`}</div></div>`;
          await supabase.functions.invoke("send-email-notification", { body: { to: ord.customer_email, subject: `Seu Produto: ${prod?.name}`, htmlContent: html } });
          await supabase.from("orders").update({ customer_notified: true }).eq("id", id);
        }

        // Notify Seller
        if (prod?.user_id && !ord.seller_notified) {
          let sEmail = prod.profiles?.email;
          if (!sEmail) { const { data: aU } = await supabase.auth.admin.getUserById(prod.user_id); sEmail = aU?.user?.email; }
          if (sEmail) {
            const sHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f0fdf4;padding:20px;border-radius:16px;text-align:center;"><h2>Venda Realizada! 💰</h2><p>Produto: ${prod?.name}<br>Valor: ${ord.price} MT<br>Cliente: ${ord.customer_name}</p></div>`;
            await supabase.functions.invoke("send-email-notification", { body: { to: sEmail, subject: `VENDA: ${prod?.name}`, htmlContent: sHtml } });
            await supabase.from("orders").update({ seller_notified: true }).eq("id", id);
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
