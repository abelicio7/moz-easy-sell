import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user making the request
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { action, code } = await req.json();

    if (action === 'generate') {
      // 1. Invalidate any existing pending codes for this user
      await supabaseAdmin
        .from('user_otp_codes')
        .update({ used: true })
        .eq('user_id', user.id)
        .eq('used', false);

      // 2. Generate a 6-digit code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      // 3. Save code to DB
      await supabaseAdmin.from('user_otp_codes').insert({
        user_id: user.id,
        code: otpCode,
        expires_at: expiresAt,
        used: false,
        attempts: 0
      });

      // 4. Send email via Brevo
      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "suporte@ensinapay.com";
      
      if (!brevoApiKey) {
        console.error("ERRO CRÍTICO: BREVO_API_KEY não configurada nos Secrets da Supabase.");
        return new Response(JSON.stringify({ success: false, error: "Serviço de email não configurado (API Key em falta)." }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; color: #ffffff; padding: 40px 30px; text-align: center;">
          <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 40px; margin-bottom: 30px;">
          <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 10px;">Código de Segurança</h2>
          <p style="font-size: 16px; color: #9ca3af; margin-bottom: 30px;">Usa o código abaixo para validar o teu acesso à EnsinaPay:</p>
          <div style="background-color: #1f2937; padding: 20px; border-radius: 12px; border: 1px solid #374151; display: inline-block; margin-bottom: 30px;">
            <h1 style="font-size: 32px; font-weight: 900; color: #10b981; margin: 0; letter-spacing: 5px;">${otpCode}</h1>
          </div>
          <p style="font-size: 12px; color: #6b7280;">Este código expira em 5 minutos. Se não solicitaste este código, ignora este email.</p>
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
        const errorData = await brevoResponse.text();
        console.error("Erro na API do Brevo:", errorData);
        return new Response(JSON.stringify({ success: false, error: "Falha ao enviar email. Verifica o remetente no Brevo." }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      if (!code) throw new Error('Código não fornecido');

      // 1. Get the latest pending code
      const { data: otpData, error: otpError } = await supabaseAdmin
        .from('user_otp_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpData) {
        return new Response(JSON.stringify({ success: false, error: 'Código inválido ou expirado.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check expiration
      if (new Date(otpData.expires_at) < new Date()) {
        return new Response(JSON.stringify({ success: false, error: 'Este código expirou. Solicite um novo.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check max attempts
      if (otpData.attempts >= 5) {
        await supabaseAdmin.from('user_otp_codes').update({ used: true }).eq('id', otpData.id);
        return new Response(JSON.stringify({ success: false, error: 'Muitas tentativas falhas. Solicite um novo código.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify code
      if (otpData.code !== code.toString().trim()) {
        await supabaseAdmin.from('user_otp_codes').update({ attempts: otpData.attempts + 1 }).eq('id', otpData.id);
        return new Response(JSON.stringify({ success: false, error: 'Código incorreto.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Success! Mark as used
      await supabaseAdmin.from('user_otp_codes').update({ used: true }).eq('id', otpData.id);

      // Generate a Device Token for "Lembrar dispositivo"
      const deviceToken = crypto.randomUUID();
      const deviceExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      await supabaseAdmin.from('verified_devices').insert({
        user_id: user.id,
        device_token: deviceToken,
        expires_at: deviceExpiresAt
      });

      return new Response(JSON.stringify({ success: true, device_token: deviceToken }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Ação inválida');

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
