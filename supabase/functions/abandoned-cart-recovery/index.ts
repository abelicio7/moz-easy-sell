import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "suporte@ensinapay.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Find pending carts older than 15 minutes, not yet contacted
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const { data: abandonedCarts, error: fetchError } = await supabase
      .from("carts")
      .select(`*, products(name, price, image_url)`)
      .eq("status", "pending")
      .is("contacted_at", null)
      .lt("created_at", fifteenMinutesAgo.toISOString());

    if (fetchError) throw fetchError;
    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(JSON.stringify({ message: "No abandoned carts to process" }), { status: 200 });
    }

    console.log(`Processing ${abandonedCarts.length} abandoned carts...`);

    for (const cart of abandonedCarts) {
      const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://ensinapay.com";
      const checkoutUrl = `${siteUrl}/checkout/${cart.product_id}?email=${encodeURIComponent(cart.email)}&name=${encodeURIComponent(cart.customer_name || '')}`;
      
      const emailHtml = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
          <div style="background-color: #141416; padding: 40px 20px; text-align: center; border-bottom: 1px solid #1c1c1e;">
            <img src="${siteUrl}/logo.png" alt="EnsinaPay" style="height: 32px;">
          </div>
          <div style="padding: 50px 40px; background-color: #0a0a0b; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px;">Esqueceu algo? 🛒</h1>
            <p style="color: #9ca3af; font-size: 16px; line-height: 1.5; margin: 0 0 40px 0;">Olá ${cart.customer_name || 'Amigo(a)'}, vimos que quase garantiu o seu conteúdo, mas não finalizou a compra.</p>
            
            <div style="background-color: #141416; padding: 25px; border-radius: 16px; border: 1px solid #232326; text-align: left; margin-bottom: 40px;">
              <h3 style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">Item no Carrinho:</h3>
              <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 5px 0;">${cart.products?.name}</p>
              <p style="color: #10b981; font-size: 16px; font-weight: 600; margin: 0;">${Number(cart.products?.price).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</p>
            </div>
            
            <a href="${checkoutUrl}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 20px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 10px 20px rgba(16,185,129,0.2);">Concluir Compra</a>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">Precisa de ajuda? Basta responder a este email.</p>
          </div>
          <div style="background-color: #141416; padding: 30px; text-align: center; border-top: 1px solid #1c1c1e;">
            <p style="color: #4b5563; font-size: 12px; margin: 0;">EnsinaPay - A nova era dos conteúdos em Moçambique.</p>
          </div>
        </div>
      `;

      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY!,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "EnsinaPay", email: BREVO_SENDER_EMAIL },
          to: [{ email: cart.email, name: cart.customer_name }],
          subject: `🛒 Quase lá! O seu ${cart.products?.name} está à espera`,
          htmlContent: emailHtml,
        }),
      });

      if (brevoResponse.ok) {
        await supabase
          .from("carts")
          .update({ contacted_at: new Date().toISOString() })
          .eq("id", cart.id);
      } else {
        console.error(`Failed to send email to ${cart.email}:`, await brevoResponse.text());
      }
    }

    return new Response(JSON.stringify({ success: true, processed: abandonedCarts.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
