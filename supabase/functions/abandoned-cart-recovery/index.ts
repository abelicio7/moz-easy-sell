import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "suporte@ensinapay.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Find pending carts older than 1 hour, not yet contacted
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: abandonedCarts, error: fetchError } = await supabase
      .from("carts")
      .select(`*, products(name, price)`)
      .eq("status", "pending")
      .is("contacted_at", null)
      .lt("created_at", oneHourAgo.toISOString());

    if (fetchError) throw fetchError;
    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(JSON.stringify({ message: "No abandoned carts to process" }), { status: 200 });
    }

    console.log(`Processing ${abandonedCarts.length} abandoned carts...`);

    for (const cart of abandonedCarts) {
      const checkoutUrl = `https://ensinapay.com/checkout/${cart.product_id}?email=${encodeURIComponent(cart.email)}&name=${encodeURIComponent(cart.customer_name || '')}`;
      
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; color: #ffffff; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 40px;">
          </div>
          <h2 style="color: #ffffff; margin-bottom: 20px;">Olá ${cart.customer_name || 'Amigo(a)'}!</h2>
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">
            Vimos que você quase garantiu o seu <strong>${cart.products?.name}</strong>, mas a sua compra ainda não foi finalizada.
          </p>
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">
            Ficou com alguma dúvida? O seu acesso ainda está reservado e estamos aqui para ajudar você a dar o próximo passo.
          </p>
          
          <div style="background-color: #1f2937; padding: 25px; border-radius: 12px; border: 1px solid #374151; margin: 30px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #9ca3af; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Produto:</p>
            <h3 style="margin: 0 0 20px 0; color: #10b981; font-size: 20px;">${cart.products?.name}</h3>
            <a href="${checkoutUrl}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 16px; text-transform: uppercase;">Finalizar Minha Compra</a>
          </div>
          
          <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
            Se precisar de ajuda, responda a este e-mail ou fale connosco pelo WhatsApp.
          </p>
          <hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">
          <p style="text-align: center; color: #4b5563; font-size: 12px;">&copy; ${new Date().getFullYear()} EnsinaPay. Todos os direitos reservados.</p>
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
          subject: `🛒 Quase lá! Seu ${cart.products?.name} está à sua espera`,
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
