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

    // Debito usually sends 'debito_reference' and 'status'
    // The exact path depends on how it's configured, but we check common locations
    const reference = body.debito_reference || body.transaction?.debito_reference || body.data?.debito_reference || body.payment?.id || body.payment_id;
    const providerStatus = (body.status || body.transaction?.status || body.data?.status || body.payment?.status || "").toUpperCase();

    if (!reference) {
      return new Response(JSON.stringify({ error: "No reference found" }), { status: 400 });
    }

    // Find the order by reference
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id, status, customer_email, customer_name, price, customer_notified, seller_notified, 
        products(
          name, delivery_type, delivery_content, user_id,
          profiles(email, full_name)
        )
      `)
      .eq("debito_reference", reference)
      .maybeSingle();

    if (orderErr || !order) {
      console.error("Order not found for reference:", reference, orderErr);
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }

    const isPaid = ["COMPLETED", "SUCCESS", "PAID", "SUCCESSFUL", "SETTLED", "APPROVED", "AUTHORIZED"].includes(providerStatus);
    
    if (isPaid && order.status !== "paid") {
      console.log(`Webhook confirming payment for order ${order.id}`);
      
      // Update order status
      await supabase.from("orders").update({ status: "paid" }).eq("id", order.id);

      // Trigger notifications using the same logic as check-payment-status
      // We call the check-payment-status function to reuse the logic and keep it DRY
      // but in a real production environment we might want to consolidate this.
      // For now, let's just trigger a call to check-payment-status which is already robust
      const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/check-payment-status?debito_reference=${reference}&order_id=${order.id}`;
      
      console.log("Triggering check-payment-status via webhook for final notifications...");
      await fetch(functionUrl, {
        method: 'GET',
        headers: { 
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        }
      });
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
