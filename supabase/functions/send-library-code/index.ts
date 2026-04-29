import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "suporte@ensinapay.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email) throw new Error("E-mail é obrigatório");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save code to DB
    const { error: dbError } = await supabase
      .from("library_auth_codes")
      .insert({ email: email.toLowerCase().trim(), code });

    if (dbError) throw dbError;

    // 3. Send email via Brevo
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; color: #ffffff; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 40px;">
        </div>
        <h2 style="text-align: center; color: #ffffff;">Seu Código de Acesso</h2>
        <p style="text-align: center; color: #9ca3af; font-size: 16px;">Use o código abaixo para entrar na sua biblioteca de produtos EnsinaPay:</p>
        
        <div style="background-color: #1f2937; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; border: 1px solid #374151;">
          <h1 style="font-size: 42px; font-weight: 900; color: #10b981; letter-spacing: 10px; margin: 0;">${code}</h1>
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 12px;">Este código expira em 15 minutos. Se você não solicitou este acesso, por favor ignore este e-mail.</p>
        <hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">
        <p style="text-align: center; color: #4b5563; font-size: 12px;">&copy; ${new Date().getFullYear()} EnsinaPay. Todos os direitos reservados.</p>
      </div>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "EnsinaPay", email: BREVO_SENDER_EMAIL },
        to: [{ email }],
        subject: `${code} é seu código de acesso à Biblioteca EnsinaPay`,
        htmlContent: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro Brevo: ${JSON.stringify(errorData)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
