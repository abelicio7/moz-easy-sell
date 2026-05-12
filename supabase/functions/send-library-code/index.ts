import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { email } = await req.json()
    if (!email) throw new Error("Email é obrigatório")

    console.log(`Gerando código de acesso para biblioteca: ${email}`)

    // 1. Verificar se o usuário tem compras (opcional, mas recomendado)
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_email', email)
      .in('status', ['paid', 'delivered'])
      .limit(1)

    // Mesmo que não tenha compras, enviamos o código para não vazar se o email existe ou não, 
    // mas a biblioteca estará vazia.

    // 2. Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

    // 3. Salvar no banco (usando a tabela handle_2fa_codes ou similar)
    const { error: insertError } = await supabase
      .from('otp_codes') // Assumindo que existe uma tabela para OTPs genéricos
      .upsert({ 
        email, 
        code, 
        expires_at: expiresAt,
        type: 'library_access'
      }, { onConflict: 'email, type' })

    // Se a tabela otp_codes não existir, tentamos usar a lógica de metadata ou outra
    if (insertError) {
       console.warn("Tabela otp_codes não encontrada, tentando handle_2fa_codes...")
       await supabase.from('handle_2fa_codes').upsert({ email, code, expires_at: expiresAt })
    }

    // 4. Enviar email via Brevo
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "EnsinaPay", email: "suporte@ensinapay.com" },
        to: [{ email }],
        subject: `Seu código de acesso: ${code}`,
        htmlContent: `
          <div style="font-family: sans-serif; text-align: center; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
            <h2 style="color: #000;">Aceder à sua Biblioteca 📚</h2>
            <p>Use o código abaixo para visualizar todos os seus produtos digitais adquiridos na EnsinaPay.</p>
            <div style="font-size: 42px; font-weight: 900; letter-spacing: 10px; margin: 30px 0; color: #10b981;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">Este código expira em 15 minutos.</p>
            <p style="color: #999; font-size: 12px; margin-top: 40px;">Se você não solicitou este acesso, ignore este e-mail.</p>
          </div>
        `
      })
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Send Library Code Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
