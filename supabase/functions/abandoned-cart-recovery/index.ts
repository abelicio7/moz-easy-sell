import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')

  try {
    console.log("Iniciando processo de recuperação de vendas...")

    // 1. Recuperar da tabela 'carts' (Carrinhos Abandonados)
    const { data: carts, error: cartError } = await supabase
      .from('carts')
      .select('*, products(name)')
      .eq('status', 'pending')
      .is('contacted_at', null)
      .limit(20)

    if (cartError) throw cartError;

    let processedCount = 0;

    if (carts && carts.length > 0) {
      console.log(`Encontrados ${carts.length} carrinhos para recuperar.`);
      
      for (const cart of carts) {
        try {
          if (!cart.email) continue;

          await sendRecoveryEmail({
            email: cart.email,
            name: cart.customer_name || 'Cliente',
            productName: cart.products?.name || 'Produto Selecionado',
            apiKey: BREVO_API_KEY || ''
          });

          // Atualizar para evitar reenvio
          await supabase
            .from('carts')
            .update({ contacted_at: new Date().toISOString() })
            .eq('email', cart.email)
            .eq('product_id', cart.product_id);

          processedCount++;
        } catch (emailErr) {
          console.error(`Erro ao enviar para ${cart.email}:`, emailErr.message);
        }
      }
    }

    // 2. Recuperar da tabela 'orders' (Pedidos Pendentes > 2h)
    // Isso ajuda a recuperar quem chegou no checkout mas não pagou
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('*, products(name)')
      .eq('status', 'pending')
      .lt('created_at', twoHoursAgo)
      .limit(10);

    if (pendingOrders && pendingOrders.length > 0) {
      console.log(`Encontrados ${pendingOrders.length} pedidos pendentes antigos.`);
      // Poderíamos implementar lógica similar aqui se desejado
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount,
      message: `${processedCount} emails de recuperação enviados.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na função de recuperação:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})

async function sendRecoveryEmail({ email, name, productName, apiKey }: { email: string, name: string, productName: string, apiKey: string }) {
  if (!apiKey) {
    console.error("BREVO_API_KEY não configurada no Supabase.");
    throw new Error("Configuração de e-mail ausente.");
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: "EnsinaPay", email: "vendas@ensinapay.co.mz" },
      to: [{ email, name }],
      subject: `Esqueceu algo? O seu ${productName} está à sua espera!`,
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 15px; padding: 30px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 40px;">
          </div>
          <h2 style="color: #000; text-align: center;">Olá, ${name}!</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">Vimos que você demonstrou interesse no produto <strong>${productName}</strong>, mas por algum motivo a compra não foi concluída.</p>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">Sabemos que imprevistos acontecem, por isso guardamos o seu lugar! O conteúdo que você deseja está a apenas um clique de distância.</p>
          
          <div style="margin: 40px 0; text-align: center;">
            <a href="https://ensinapay.com/biblioteca" style="background-color: #10b981; color: #000; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 18px; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">CONCLUIR MINHA COMPRA AGORA</a>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; border: 1px solid #f3f4f6;">
            <p style="margin: 0; font-size: 14px; color: #666; text-align: center;">
              <strong>Dificuldades com o pagamento?</strong><br>
              Lembre-se que aceitamos <strong>M-Pesa e E-Mola</strong> de forma automática. Se precisar de ajuda manual, basta responder a este e-mail.
            </p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 11px; color: #999; text-align: center; line-height: 1.4;">
            EnsinaPay - A nova era dos conteúdos digitais em Moçambique.<br>
            Você recebeu este e-mail porque iniciou um checkout em nossa plataforma.
          </p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
  }
}
