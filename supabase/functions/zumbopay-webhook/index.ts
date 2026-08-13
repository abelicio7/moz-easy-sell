import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as crypto from "https://deno.land/std@0.177.0/node/crypto.ts";

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

  try {
    // 1. Get raw body for HMAC validation
    const rawBody = await req.text();
    const signature = req.headers.get('x-zumbopay-signature');
    const webhookSecret = Deno.env.get('ZUMBOPAY_WEBHOOK_SECRET');

    console.log("ZumboPay Webhook Signature Received:", signature);

    // Parse body early
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error("Failed to parse body JSON:", parseErr);
    }

    // Capture headers for diagnostic audit log
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    let logId: string | null = null;
    // 2. LOG RAW WEBHOOK FIRST FOR AUDIT
    try {
      const { data: logData } = await supabase.from('webhook_logs').insert({ 
          payload: {
            gateway: "zumbopay",
            headers: headersObj,
            body: body,
            rawBody: rawBody,
            signature: signature,
            has_secret: !!webhookSecret
          }
      }).select('id').single();
      logId = logData?.id;
    } catch (logErr) {
      console.error("Error writing webhook log to DB:", logErr);
    }

    const diagnostic: any = {
      received_signature: signature,
      received_zumbo_signature: req.headers.get('x-zumbo-signature'),
      secret_length: webhookSecret?.length || 0,
      secret_prefix: webhookSecret ? webhookSecret.substring(0, 8) + '...' : 'none',
      status: 'pending'
    };

    // 3. VALIDATION (HMAC-SHA256 of the raw body)
    if (webhookSecret) {
      // Calculate normal body HMAC
      const hmac1 = crypto.createHmac("sha256", webhookSecret);
      hmac1.update(rawBody);
      const calculatedHashRaw = hmac1.digest("hex");
      diagnostic.calculated_hash_raw = calculatedHashRaw;

      // Calculate Stripe-like timestamp.body HMAC
      const zumboTimestamp = req.headers.get('x-zumbopay-timestamp') || req.headers.get('x-zumbo-timestamp') || '';
      diagnostic.timestamp = zumboTimestamp;
      const signString = `${zumboTimestamp}.${rawBody}`;
      const hmac2 = crypto.createHmac("sha256", webhookSecret);
      hmac2.update(signString);
      const calculatedHashStripe = hmac2.digest("hex");
      diagnostic.calculated_hash_stripe = calculatedHashStripe;

      // Extract Stripe-like signature if present in x-zumbo-signature (t=...,v1=...)
      let stripeSigHex = '';
      const zumboSigHeader = req.headers.get('x-zumbo-signature') || '';
      const v1Match = zumboSigHeader.match(/v1=([a-f0-9]+)/i);
      if (v1Match) {
        stripeSigHex = v1Match[1];
      }
      diagnostic.extracted_stripe_sig = stripeSigHex;

      const isRawMatch = signature && (calculatedHashRaw === signature);
      const isStripeMatch = stripeSigHex && (calculatedHashStripe === stripeSigHex);

      diagnostic.is_raw_match = isRawMatch;
      diagnostic.is_stripe_match = isStripeMatch;

      if (!isRawMatch && !isStripeMatch) {
        console.error(`INVALID WEBHOOK SIGNATURE. Hash mismatch. Raw calculated: ${calculatedHashRaw}, Stripe calculated: ${calculatedHashStripe}`);
        diagnostic.status = 'failed_signature_mismatch';
        
        if (logId) {
          await supabase.from('webhook_logs').update({
            payload: {
              gateway: "zumbopay",
              headers: headersObj,
              body: body,
              rawBody: rawBody,
              signature: signature,
              has_secret: !!webhookSecret,
              diagnostic: diagnostic
            }
          }).eq('id', logId);
        }

        return new Response(JSON.stringify({ error: "Invalid signature", diagnostic }), { status: 401, headers: corsHeaders });
      }
      
      diagnostic.status = 'validated';
      console.log("Webhook signature validated successfully.");
    } else {
      console.warn("ZUMBOPAY_WEBHOOK_SECRET not set. Skipping signature validation (DANGEROUS).");
      diagnostic.status = 'skipped_no_secret';
    }

    const event = body.event || body.event_type || body.type;
    const data = body.data || body;

    // ZumboPay sends reference in various fields depending on context
    const reference = data?.source_id || data?.reference || data?.transaction_reference || data?.id || body?.reference || body?.transaction_reference || body?.id;
    const status = (data?.status || body?.status || "").toLowerCase();

    console.log(`Processing ZumboPay event: ${event} for reference: ${reference}, status: ${status}`);

    // 4. PROCESS SUCCESSFUL PAYMENT EVENTS
    const isSuccessEvent = event === 'payment.succeeded' || event === 'charge.succeeded' || event === 'charge.success' || event === 'payment.completed';
    const isSuccessStatus = status === 'success' || status === 'succeeded' || status === 'paid' || status === 'completed';

    if (isSuccessEvent || (reference && isSuccessStatus)) {
      if (!reference) {
        console.error("ERRO: Nenhuma referência encontrada no corpo do webhook da ZumboPay.", body);
        diagnostic.error = "No reference found";
        
        if (logId) {
          await supabase.from('webhook_logs').update({
            payload: {
              gateway: "zumbopay",
              headers: headersObj,
              body: body,
              rawBody: rawBody,
              signature: signature,
              has_secret: !!webhookSecret,
              diagnostic: diagnostic
            }
          }).eq('id', logId);
        }
        return new Response(JSON.stringify({ error: "No reference found" }), { status: 200, headers: corsHeaders });
      }

      // 1. Tentar encontrar por debito_reference (ID do ZumboPay / ID de transação)
      console.log(`Procurando pedido com debito_reference: ${reference}`);
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, customer_email')
        .eq('debito_reference', reference)
        .maybeSingle();

      if (orderError) console.error("Erro na busca 1:", orderError);

      if (order) {
        console.log(`Pedido encontrado via debito_reference: ${order.id}`);
        if (order.status !== 'paid' && order.status !== 'delivered') {
          await processSuccessfulPayment(supabase, order.id);
        }
      } else {
        // 2. Fallback: Tentar encontrar pelo próprio ID do pedido (UUID)
        console.log(`Não encontrado por referência. Tentando buscar por UUID do pedido: ${reference}`);
        const { data: orderById, error: idError } = await supabase
          .from('orders')
          .select('id, status')
          .eq('id', reference)
          .maybeSingle();

        if (orderById) {
          console.log(`Pedido encontrado via UUID: ${orderById.id}`);
          if (orderById.status !== 'paid' && orderById.status !== 'delivered') {
            await processSuccessfulPayment(supabase, orderById.id);
          }
        } else {
          console.warn(`ALERTA: Nenhum pedido localizado no banco para a referência ZumboPay: ${reference}`);
          diagnostic.warning = `No order found for reference ${reference}`;
        }
      }
    }

    if (logId) {
      diagnostic.status = 'processed';
      diagnostic.processed_reference = reference;
      await supabase.from('webhook_logs').update({
        payload: {
          gateway: "zumbopay",
          headers: headersObj,
          body: body,
          rawBody: rawBody,
          signature: signature,
          has_secret: !!webhookSecret,
          diagnostic: diagnostic
        }
      }).eq('id', logId);
    }

    // 5. RESPOND 200 OK
    return new Response(JSON.stringify({ success: true, diagnostic }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("ZumboPay Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processSuccessfulPayment(supabase: any, orderId: string) {
  console.log(`Confirming payment for order: ${orderId}`);
  
  // Update status
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId);

  if (updateError) throw updateError;

  // Trigger Delivery
  console.log(`Triggering delivery for order: ${orderId}`);
  const deliveryResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deliver-product`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({ orderId: orderId })
  });
  if (!deliveryResponse.ok) {
    console.error('Error triggering delivery:', await deliveryResponse.text());
  }
}
