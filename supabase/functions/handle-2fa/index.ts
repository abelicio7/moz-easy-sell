import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ping',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // TESTE DE CONECTIVIDADE (PING)
  if (req.headers.get('x-ping') === 'true') {
    return new Response(JSON.stringify({ success: true, message: 'CONEXÃO OK: Servidor handle-2fa respondendo.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.");
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Erro de configuração no servidor (Secrets faltando). Verifique os logs do Supabase.' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado. Faça login novamente.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();

    if (action === 'generate') {
      // 1. Generate a 6-digit code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // 2. Save code to DB
      const { error: insertError } = await supabaseAdmin.from('user_otp_codes').insert({
        user_id: user.id,
        code: otpCode,
        expires_at: expiresAt,
        used: false,
        attempts: 0
      });

      if (insertError) {
        throw new Error("Erro ao gerar código de segurança.");
      }

      // 3. Send email via Brevo
      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "suporte@ensinapay.com";
      
      if (!brevoApiKey) {
        return new Response(JSON.stringify({ success: false, error: "Serviço de email não configurado." }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const htmlContent = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
          <div style="background-color: #141416; padding: 40px 20px; text-align: center; border-bottom: 1px solid #1c1c1e;">
            <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 32px;">
          </div>
          <div style="padding: 50px 40px; background-color: #0a0a0b; text-align: center;">
            <h2 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -0.5px;">Código de Segurança</h2>
            <p style="color: #9ca3af; font-size: 16px; line-height: 1.5; margin: 0 0 40px 0;">Olá! Usa o código abaixo para validar o teu acesso à plataforma EnsinaPay.</p>
            
            <div style="background-color: #141416; padding: 25px; border-radius: 16px; border: 1px solid #232326; display: inline-block; margin-bottom: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
              <h1 style="color: #10b981; font-size: 42px; font-weight: 900; margin: 0; letter-spacing: 8px; font-family: monospace;">${otpCode}</h1>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Este código é válido por 10 minutos. Se não solicitaste este código, podes ignorar este email com segurança.</p>
          </div>
          <div style="background-color: #141416; padding: 30px; text-align: center; border-top: 1px solid #1c1c1e;">
            <p style="color: #4b5563; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} EnsinaPay. A maior plataforma de conteúdos de Moçambique.</p>
          </div>
        </div>
      `;

      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: "EnsinaPay Segurança" },
          to: [{ email: user.email }],
          subject: `${otpCode} é o seu código de segurança EnsinaPay`,
          htmlContent: htmlContent
        })
      });

      if (!brevoResponse.ok) {
        return new Response(JSON.stringify({ success: false, error: "Falha ao enviar email." }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Ação inválida');

  } catch (error: any) {
    console.error("Erro na função handle-2fa:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
