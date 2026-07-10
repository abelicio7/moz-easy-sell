import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("No authorization header")
    }
    
    // Inicializar cliente Supabase com as credenciais da requisição do cliente
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    // Obter usuário logado e verificar se é admin
    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser()
    if (userErr || !user) {
      throw new Error("Unauthorized")
    }
    
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profileErr || profile?.role !== 'admin') {
      throw new Error("Acesso negado: Apenas admins podem realizar esta ação")
    }
    
    const { subject, htmlContent } = await req.json()
    if (!subject || !htmlContent) {
      throw new Error("Assunto e conteúdo do e-mail são obrigatórios")
    }
    
    // Buscar todos os vendedores com e-mail cadastrado
    const { data: recipients, error: recipientsErr } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .not('email', 'is', null)
      
    if (recipientsErr) {
      throw recipientsErr
    }
      
    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, sentCount: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }
    
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY não configurado no Supabase")
    }
    
    let successCount = 0
    
    // Disparar e-mails em lotes paralelos controlados de 10 em 10
    const chunkSize = 10
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize)
      
      await Promise.all(chunk.map(async (recipient) => {
        try {
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': BREVO_API_KEY,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              sender: { name: "EnsinaPay", email: "suporte@ensinapay.com" },
              to: [{ email: recipient.email, name: recipient.full_name }],
              subject: subject,
              htmlContent: htmlContent.replace(/{nome}/g, recipient.full_name || 'Vendedor')
            })
          })
          
          if (response.ok) {
            successCount++
          } else {
            const errDetails = await response.text()
            console.error(`Falha no Brevo ao enviar para ${recipient.email}:`, errDetails)
          }
        } catch (e) {
          console.error(`Erro de rede ao enviar e-mail para ${recipient.email}:`, e)
        }
      }))
    }
    
    return new Response(JSON.stringify({ success: true, sentCount: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
    
  } catch (err: any) {
    console.error("Bulk Email Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
