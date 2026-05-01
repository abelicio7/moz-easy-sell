import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const E2_BASE_URL = "https://e2payments.explicador.co.mz/v1";
const WALLET_IDS: Record<string, string> = {
  mpesa: "999813",
  emola: "999814",
};

async function getE2Token(): Promise<string> {
  const clientId = Deno.env.get("E2_CLIENT_ID");
  const clientSecret = Deno.env.get("E2_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("E2 credentials not configured");
  }

  const response = await fetch(`${E2_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to obtain E2 access token");
  }

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, payment_method, amount, phone, product_name } = await req.json();

    if (!order_id || !payment_method || !amount || !phone) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: order_id, payment_method, amount, phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const walletId = WALLET_IDS[payment_method];
    if (!walletId) {
      return new Response(
        JSON.stringify({ error: "Método de pagamento inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone (9 digits)
    const cleanPhone = phone.replace(/\D/g, "").slice(-9);
    
    console.log(`[E2Payments] Initiating ${payment_method} for Order ${order_id}`);

    // 1. Get OAuth Token
    let token: string;
    try {
      token = await getE2Token();
    } catch (err) {
      console.error("Token error:", err.message);
      return new Response(
        JSON.stringify({ error: "Erro de autenticação com o provedor de pagamentos." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Process Payment
    const endpoint = payment_method === "mpesa" ? "mpesa-payment" : "emola-payment";
    const paymentUrl = `${E2_BASE_URL}/c2b/${endpoint}/${walletId}`;
    
    const paymentResponse = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: Deno.env.get("E2_CLIENT_ID"),
        amount: String(amount),
        phone: cleanPhone,
        reference: order_id.substring(0, 20),
      }),
    });

    const paymentData = await paymentResponse.json();
    console.log("E2 Response:", JSON.stringify(paymentData));

    if (!paymentResponse.ok) {
      return new Response(
        JSON.stringify({ error: paymentData.message || "Erro ao processar pagamento na e2Payments" }),
        { status: paymentResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map E2 transaction ID to debito_reference column
    const transactionId = paymentData.transaction_id || paymentData.id || paymentData.reference;

    await supabase
      .from("orders")
      .update({
        debito_reference: transactionId,
        status: "processing",
      })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        status: "pending",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
