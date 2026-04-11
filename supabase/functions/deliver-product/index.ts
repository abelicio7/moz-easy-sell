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
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id");

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "order_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order with product info
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, product_id, customer_name, customer_email, products(name, description, delivery_type, delivery_content, image_url)")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Pagamento ainda não confirmado", status: order.status }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const product = order.products as any;

    return new Response(
      JSON.stringify({
        order_id: order.id,
        customer_name: order.customer_name,
        product_name: product?.name,
        product_description: product?.description,
        product_image: product?.image_url,
        delivery_type: product?.delivery_type || "link",
        delivery_content: product?.delivery_content,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Deliver product error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
