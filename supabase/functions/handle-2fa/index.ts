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
        console.error("BREVO_API_KEY is not set. Simulating email send for code:", otpCode);
      } else {
        const htmlContent = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://www.ensinapay.com/logo.png" alt="EnsinaPay" style="max-height: 45px;" />
            </div>
            <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6; text-align: center;">
              <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Código de Verificação de Segurança</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Use o código abaixo para acessar a sua conta na EnsinaPay:</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px auto; max-width: 200px; letter-spacing: 5px;">
                <h1 style="color: #000; margin: 0; font-size: 32px;">${otpCode}</h1>
              </div>
              
              <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">Este código expira em 5 minutos. Não o compartilhe com ninguém.</p>
            </div>
          </div>
        `;

        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
            "Accept": "application/json"
          },
          body: JSON.stringify({
            sender: { email: senderEmail, name: "EnsinaPay Segurança" },
            to: [{ email: user.email }],
            subject: "Seu código de acesso - EnsinaPay",
            htmlContent: htmlContent
          })
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
