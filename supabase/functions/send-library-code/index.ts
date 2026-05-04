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
      .insert({ 
        email: email.toLowerCase().trim(), 
        code,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });


    if (dbError) throw dbError;

    // 3. Send email via Brevo
    const emailHtml = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
        <div style="background-color: #141416; padding: 40px 20px; text-align: center; border-bottom: 1px solid #1c1c1e;">
          <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 32px;">
        </div>
        <div style="padding: 50px 40px; background-color: #0a0a0b; text-align: center;">
          <h2 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -0.5px;">Acesso à Biblioteca</h2>
          <p style="color: #9ca3af; font-size: 16px; line-height: 1.5; margin: 0 0 40px 0;">Olá! Usa o código abaixo para entrar na tua biblioteca de produtos digitais.</p>
          
          <div style="background-color: #141416; padding: 25px; border-radius: 16px; border: 1px solid #232326; display: inline-block; margin-bottom: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <h1 style="color: #10b981; font-size: 42px; font-weight: 900; margin: 0; letter-spacing: 8px; font-family: monospace;">${code}</h1>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Este código é válido por 15 minutos. Se não solicitaste este acesso, podes ignorar este email.</p>
        </div>
        <div style="background-color: #141416; padding: 30px; text-align: center; border-top: 1px solid #1c1c1e;">
          <p style="color: #4b5563; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} EnsinaPay. Elevando o conteúdo digital em Moçambique.</p>
        </div>
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
