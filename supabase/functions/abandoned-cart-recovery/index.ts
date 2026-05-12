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
      .limit(10)

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

    // 2. Recuperar da tabela 'orders' (Pedidos Pendentes que não estão em carts)
    // Buscamos pedidos de 2h até 24h atrás que ainda estão pendentes
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('*, products(name)')
      .eq('status', 'pending')
      .lt('created_at', twoHoursAgo)
      .gt('created_at', oneDayAgo)
      .limit(10);

    if (pendingOrders && pendingOrders.length > 0) {
      console.log(`Encontrados ${pendingOrders.length} pedidos pendentes para tentativa de recuperação.`);
      
      for (const order of pendingOrders) {
        try {
          // Aqui poderíamos enviar um e-mail ligeiramente diferente ou o mesmo
          await sendRecoveryEmail({
            email: order.customer_email,
            name: order.customer_name,
            productName: order.products?.name || 'Produto',
            apiKey: BREVO_API_KEY || ''
          });
          
          // Como 'orders' não tem contacted_at, vamos apenas logar ou 
          // poderíamos atualizar um campo de metadados se existisse.
          // Para evitar spam, o ideal é que o Checkout agora use a tabela 'carts'.
          console.log(`Email de recuperação enviado para pedido ${order.id}`);
          processedCount++;
        } catch (err) {
          console.error(`Erro ao recuperar pedido ${order.id}:`, err.message);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount,
      message: `${processedCount} emails de recuperação processados.` 
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
    throw new Error("BREVO_API_KEY não configurada.");
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: "EnsinaPay", email: "suporte@ensinapay.com" },
      to: [{ email, name }],
      subject: `Esqueceu algo? O seu ${productName} está à sua espera!`,
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 15px; padding: 30px; background-color: #ffffff;">
          <h2 style="color: #000; text-align: center;">Olá, ${name}!</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">Vimos que você demonstrou interesse no produto <strong>${productName}</strong>, mas a compra não foi finalizada.</p>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">O seu conteúdo está reservado. Não perca a oportunidade de começar hoje mesmo!</p>
          
          <div style="margin: 40px 0; text-align: center;">
            <a href="https://ensinapay.com/biblioteca" style="background-color: #10b981; color: #000; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 18px; display: inline-block;">CONCLUIR MINHA COMPRA</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 11px; color: #999; text-align: center;">EnsinaPay - A nova era dos conteúdos digitais em Moçambique.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Brevo Error: ${JSON.stringify(errorData)}`);
  }
}
