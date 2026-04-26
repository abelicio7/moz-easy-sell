import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      throw new Error('Chave da API do Brevo não configurada.');
    }

    // Corpo da requisição deve conter os dados do email
    const { to, subject, htmlContent, senderName = "EnsinaPay" } = await req.json();

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { 
          name: senderName, 
          email: Deno.env.get("BREVO_SENDER_EMAIL") || "suporte@ensinapay.com" 
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API do Brevo:", errorText);
      throw new Error(`Falha ao enviar email pelo Brevo: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Email enviado com sucesso!", result);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )

  } catch (error) {
    console.error("Erro ao processar envio de email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    )
  }
})
