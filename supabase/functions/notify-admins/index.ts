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

  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')

  try {
    const { subject, htmlContent } = await req.json()
    console.log(`Notifying admins: ${subject}`)

    // 1. Get all admin emails
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')

    if (adminError) throw adminError

    if (!admins || admins.length === 0) {
      console.log("No admins found to notify.")
      return new Response(JSON.stringify({ success: true, message: "No admins found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminEmails = admins.map(a => ({ email: a.email })).filter(a => a.email)

    // 2. Send email via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "EnsinaPay System", email: "suporte@ensinapay.com" },
        to: adminEmails,
        subject: subject,
        htmlContent: htmlContent
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Email failed: ${errorText}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Notify Admins Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
