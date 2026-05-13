import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
    const { email, code } = await req.json()
    if (!email || !code) throw new Error("Email e código são obrigatórios")

    console.log(`Verificando código para: ${email}`)

    // 1. Buscar o código no banco
    const { data: otpRecord, error: fetchError } = await supabase
      .from('library_access_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .single()

    if (fetchError || !otpRecord) {
      console.warn(`Código inválido para ${email}: ${code}`)
      return new Response(JSON.stringify({ success: false, error: "Código inválido ou expirado" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Verificar expiração
    const now = new Date()
    const expiresAt = new Date(otpRecord.expires_at)

    if (now > expiresAt) {
      console.warn(`Código expirado para ${email}`)
      return new Response(JSON.stringify({ success: false, error: "Código expirado. Solicite um novo." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Sucesso! Remover o código para não ser usado de novo
    await supabase
      .from('library_access_codes')
      .delete()
      .eq('email', email)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Verify Library Code Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
