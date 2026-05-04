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
      const isP = ["SUCCESS", "PAID", "COMPLETED", "SETTLED", "APPROVED", "CONFIRMED", "SUCCESSFUL"].includes(apiStatus);
      const isF = ["FAILED", "CANCELLED", "REJECTED", "EXPIRED", "DECLINED"].includes(apiStatus);

      
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

        const productData = ord.products;
        const prod = Array.isArray(productData) ? productData[0] : productData;

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


      // Commission recording removed as per user request (direct sales only)

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
