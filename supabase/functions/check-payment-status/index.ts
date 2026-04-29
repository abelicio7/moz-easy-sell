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
        
        // --- 1. NOTIFY CUSTOMER (Premium Delivery Email) ---
        if (ord.customer_email && !ord.customer_notified) {
          const customerHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px; background-color: #fff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #16a34a; margin: 0;">Pagamento Confirmado! 🎉</h1>
                <p style="color: #666;">Olá, ${ord.customer_name}. Seu acesso já está liberado.</p>
              </div>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: #111827;">${prod?.name}</h3>
                <p style="font-size: 14px; color: #4b5563;">${prod?.description || ""}</p>
                <div style="margin-top: 20px; text-align: center;">
                  ${prod?.delivery_type === 'link' 
                    ? `<a href="${prod?.delivery_content}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Aceder ao Produto</a>`
                    : `<div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">${prod?.delivery_content}</div>`
                  }
                </div>
              </div>
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">Dúvidas? Entre em contacto com o suporte do vendedor.</p>
            </div>
          `;
          
          await supabase.functions.invoke("send-email-notification", { 
            body: { to: ord.customer_email, subject: `Sua compra de "${prod?.name}" foi aprovada!`, htmlContent: customerHtml, senderName: "EnsinaPay" } 
          });
          await supabase.from("orders").update({ customer_notified: true }).eq("id", id);
        }

        // --- 2. NOTIFY SELLER (Premium Sale Alert) ---
        if (prod?.user_id && !ord.seller_notified) {
          let sEmail = prod.profiles?.email;
          if (!sEmail) { 
            const { data: aU } = await supabase.auth.admin.getUserById(prod.user_id); 
            sEmail = aU?.user?.email; 
          }
          
          if (sEmail) {
            const sellerHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px; background-color: #f0fdf4; border: 1px solid #bbf7d0;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h1 style="color: #166534; margin: 0;">Venda Realizada! 💰</h1>
                  <p style="color: #166534; font-weight: bold;">Você acabou de ganhar dinheiro na EnsinaPay.</p>
                </div>
                <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #dcfce7;">
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">Produto:</p>
                  <p style="margin: 0 0 15px 0; font-weight: bold; font-size: 18px; color: #111827;">${prod?.name}</p>
                  
                  <div style="border-top: 1px solid #eee; padding-top: 15px;">
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Valor:</strong> ${ord.price} MT</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Cliente:</strong> ${ord.customer_name}</p>
                  </div>
                </div>
                <div style="text-align: center; margin-top: 25px;">
                  <a href="${Deno.env.get("PUBLIC_SITE_URL") || 'https://ensinapay.com'}/dashboard" style="display: inline-block; background-color: #166534; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver no Dashboard</a>
                </div>
              </div>
            `;
            
            await supabase.functions.invoke("send-email-notification", { 
              body: { to: sEmail, subject: `💸 VENDA REALIZADA: ${prod?.name}`, htmlContent: sellerHtml, senderName: "EnsinaPay Vendas" } 
            });
            await supabase.from("orders").update({ seller_notified: true }).eq("id", id);

            // --- 3. NOTIFY SYSTEM ADMIN (Monitoring) ---
            await supabase.functions.invoke("notify-admins", {
              body: {
                subject: `📈 NOVA VENDA NO SISTEMA: ${ord.price} MT`,
                htmlContent: `
                  <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h3>Relatório de Venda Instantâneo</h3>
                    <p><strong>Produto:</strong> ${prod?.name}</p>
                    <p><strong>Valor:</strong> ${ord.price} MT</p>
                    <p><strong>Vendedor:</strong> ${prod.profiles?.full_name || 'Vendedor'}</p>
                    <p><strong>Comprador:</strong> ${ord.customer_name} (${ord.customer_email})</p>
                  </div>
                `
              }
            });
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
