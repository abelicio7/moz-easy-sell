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
    const DEBITO_WEBHOOK_SECRET = Deno.env.get("DEBITO_WEBHOOK_SECRET");
    
    // Check for secret in header or query param
    const authHeader = req.headers.get("x-debito-secret") || req.headers.get("Authorization")?.replace("Bearer ", "");
    const url = new URL(req.url);
    const urlSecret = url.searchParams.get("secret");

    if (DEBITO_WEBHOOK_SECRET && authHeader !== DEBITO_WEBHOOK_SECRET && urlSecret !== DEBITO_WEBHOOK_SECRET) {
      console.error("Unauthorized webhook attempt: Secret mismatch");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );


    const body = await req.json();
    console.log("DEBITO WEBHOOK BODY:", JSON.stringify(body, null, 2));
    console.log("DEBITO WEBHOOK HEADERS:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

    // Try multiple ways to identify the order
    const reference = body.debito_reference || body.transaction?.debito_reference || body.data?.debito_reference || body.payment?.id || body.payment_id || body.id || body.reference;
    const orderId = body.order_id || body.source_id || body.transaction?.source_id || body.data?.source_id || body.external_id || body.reference;
    const providerStatus = (body.status || body.transaction?.status || body.data?.status || body.payment?.status || body.result || body.state || "").toUpperCase();

    console.log("Extracted Info:", { reference, orderId, providerStatus });

    if (!reference && !orderId) {
      console.error("No identifier (reference or order_id) found in webhook body. All fields checked:", Object.keys(body));
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

    const isPaid = ["COMPLETED", "SUCCESS", "PAID", "SUCCESSFUL", "SETTLED", "APPROVED", "CONFIRMED"].includes(providerStatus);

    
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
