import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEBITO_BASE_URL = "https://my.debito.co.mz/api/v1";
const WALLET_IDS: Record<string, number> = {
  mpesa: 334838,
  emola: 226725,
};

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function callDebitoWithRetry(url: string, options: RequestInit, retries = 2): Promise<{ response: Response; text: string }> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      console.log(`Débito attempt ${i + 1}/${retries + 1}`);
      const response = await fetchWithTimeout(url, options);
      const text = await response.text();
      return { response, text };
    } catch (err) {
      lastError = err as Error;
      console.warn(`Attempt ${i + 1} failed:`, err.message);
      if (i < retries) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw lastError!;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYMENT_API_TOKEN = Deno.env.get("PAYMENT_API_TOKEN");
    if (!PAYMENT_API_TOKEN) {
      throw new Error("PAYMENT_API_TOKEN not configured");
    }

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
        JSON.stringify({ error: "Método de pagamento inválido. Use 'mpesa' ou 'emola'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "").replace(/^258/, "").replace(/^\+258/, "");
    if (cleanPhone.length < 9) {
      return new Response(
        JSON.stringify({ error: "Número de telefone inválido. Use formato: 84xxxxxxx" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = payment_method === "mpesa" ? "c2b/mpesa" : "c2b/emola";
    const debitoUrl = `${DEBITO_BASE_URL}/wallets/${walletId}/${endpoint}`;

    console.log(`Initiating ${payment_method} payment: ${debitoUrl}`);

    let responseText: string;
    let debitoResponse: Response;

    try {
      const result = await callDebitoWithRetry(debitoUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PAYMENT_API_TOKEN}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          msisdn: cleanPhone,
          amount: Number(amount),
          reference_description: `EnsinaPay - ${product_name || "Produto"}`.substring(0, 32),
        }),
      });
      debitoResponse = result.response;
      responseText = result.text;
    } catch (err) {
      console.error("All retry attempts failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Serviço de pagamento indisponível. Tente novamente em alguns minutos." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Débito raw response:", debitoResponse.status, responseText.substring(0, 500));

    let debitoData: any;
    try {
      debitoData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Serviço de pagamento retornou resposta inválida. Tente novamente." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!debitoResponse.ok) {
      return new Response(
        JSON.stringify({
          error: debitoData.message || "Erro ao processar pagamento",
          details: debitoData.errors || null,
        }),
        { status: debitoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("orders")
      .update({
        debito_reference: debitoData.debito_reference,
        status: "processing",
      })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        success: true,
        debito_reference: debitoData.debito_reference,
        status: debitoData.status,
        transaction_id: debitoData.transaction_id,
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
