import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nova infraestrutura da Debito Pay via Supabase Edge Functions
const DEBITO_BASE_URL = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1";
const WALLET_CODES: Record<string, string> = {
  mpesa: "23798",
  emola: "71535",
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

async function callDebitoOrchestrator(options: RequestInit, retries = 2): Promise<{ response: Response; text: string }> {
  let lastError: Error | null = null;
  const url = `${DEBITO_BASE_URL}/payment-orchestrator`;
  
  for (let i = 0; i <= retries; i++) {
    try {
      console.log(`Débito Pay attempt ${i + 1}/${retries + 1}`);
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

    const walletCode = WALLET_CODES[payment_method];
    if (!walletCode) {
      return new Response(
        JSON.stringify({ error: "Método de pagamento inválido. Use 'mpesa' ou 'emola'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone and ensure Mozambican prefix
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("258")) {
      cleanPhone = "+" + cleanPhone;
    } else if (cleanPhone.length === 9) {
      cleanPhone = "+258" + cleanPhone;
    }

    console.log(`Initiating ${payment_method} payment for Order ${order_id} via Orchestrator`);

    let responseText: string;
    let debitoResponse: Response;

    try {
      const result = await callDebitoOrchestrator({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          action: "process",
          api_key: PAYMENT_API_TOKEN.replace("Bearer ", "").trim(),
          backend_transaction: true,
          payment_method: payment_method,
          wallet_code: walletCode,
          amount: Number(amount),
          currency: "MZN",
          phone: cleanPhone,
          source: "gateway",
          source_id: order_id
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

    console.log("Débito Pay Response:", debitoResponse.status, responseText.substring(0, 500));

    let debitoData: any;
    try {
      debitoData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Serviço de pagamento retornou resposta inválida." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!debitoResponse.ok || !debitoData.success) {
      return new Response(
        JSON.stringify({
          error: debitoData.message || debitoData.error || "Erro ao processar pagamento",
          details: debitoData.errors || null,
        }),
        { status: debitoResponse.status === 200 ? 400 : debitoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map new payment_id to debito_reference for backward compatibility
    const paymentId = debitoData.payment_id || debitoData.id;

    await supabase
      .from("orders")
      .update({
        debito_reference: paymentId,
        status: "processing",
      })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        success: true,
        debito_reference: paymentId,
        status: "pending",
        payment_id: paymentId
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
