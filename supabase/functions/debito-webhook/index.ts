import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("Debito Webhook received:", JSON.stringify(body));

    // Try multiple ways to identify the order
    const reference = body.debito_reference || body.transaction?.debito_reference || body.data?.debito_reference || body.payment?.id || body.payment_id || body.id;
    const orderId = body.order_id || body.source_id || body.transaction?.source_id || body.data?.source_id;
    const providerStatus = (body.status || body.transaction?.status || body.data?.status || body.payment?.status || "").toUpperCase();

    if (!reference && !orderId) {
      console.error("No identifier (reference or order_id) found in webhook body");
      return new Response(JSON.stringify({ error: "No reference or order_id found" }), { status: 400 });
    }

    // Find the order (try ID first, then reference)
    let query = supabase.from("orders").select(`id, status, debito_reference`);
    
    if (orderId) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq("debito_reference", reference);
    }

    const { data: order, error: orderErr } = await query.maybeSingle();

    if (orderErr || !order) {
      console.error("Order not found for:", { orderId, reference }, orderErr);
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }

    const isPaid = ["COMPLETED", "SUCCESS", "PAID", "SUCCESSFUL", "SETTLED", "APPROVED", "AUTHORIZED"].includes(providerStatus);
    
    if (isPaid) {
      console.log(`Webhook confirming payment for order ${order.id}. Current status: ${order.status}`);
      
      // Update order with the reference if it was missing
      if (!order.debito_reference && reference) {
        await supabase.from("orders").update({ debito_reference: reference }).eq("id", order.id);
      }

      // We call check-payment-status to handle all the complex logic (commissions, emails, library access)
      // This ensures we have ONE place for the business logic.
      const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/check-payment-status`;
      
      console.log(`Triggering check-payment-status for order ${order.id}...`);
      try {
        const syncRes = await fetch(functionUrl, {
          method: 'POST',
          headers: { 
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            order_id: order.id,
            debito_reference: reference || order.debito_reference
          })
        });
        const syncResult = await syncRes.text();
        console.log(`Sync result for ${order.id}:`, syncResult);
      } catch (e) {
        console.error(`Failed to trigger status check for order ${order.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
