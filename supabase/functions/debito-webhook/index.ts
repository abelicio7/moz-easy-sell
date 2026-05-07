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
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('DEBITO_WEBHOOK_SECRET');

    console.log("Webhook Signature Received:", signature);

    // 2. VALIDATION (As per docs: HMAC-SHA256)
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac("sha256", webhookSecret);
      hmac.update(rawBody);
      const hash = hmac.digest("hex");

      if (hash !== signature) {
        console.error("INVALID WEBHOOK SIGNATURE. Hash mismatch.");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
      }
      console.log("Webhook signature validated successfully.");
    } else if (!webhookSecret) {
      console.warn("DEBITO_WEBHOOK_SECRET not set. Skipping signature validation (DANGEROUS).");
    }

    const body = JSON.parse(rawBody);
    const { event, data, timestamp } = body;

    // 3. LOG RAW WEBHOOK FOR AUDIT
    await supabase.from('webhook_logs').insert({ 
        payload: body,
        event_type: event,
        reference: data?.reference
    });

    console.log(`Processing event: ${event} for reference: ${data?.reference}`);

    // 4. ONLY PROCESS 'payment.completed'
    if (event === 'payment.completed') {
      const reference = data.reference;
      const paymentId = data.payment_id;

      if (!reference) {
        throw new Error("No reference found in webhook data");
      }

      // Check if order exists and is not already paid (Idempotency)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('debito_reference', reference)
        .maybeSingle();

      if (orderError) throw orderError;

      if (!order) {
        // Fallback: check if reference is the order ID
        const { data: orderById, error: idError } = await supabase
          .from('orders')
          .select('id, status')
          .eq('id', reference)
          .maybeSingle();
        
        if (orderById) {
          if (orderById.status !== 'paid' && orderById.status !== 'delivered') {
            await processSuccessfulPayment(supabase, orderById.id);
          } else {
            console.log(`Order ${orderById.id} already processed.`);
          }
        } else {
          console.warn(`No order found for reference ${reference}`);
        }
      } else {
        if (order.status !== 'paid' && order.status !== 'delivered') {
          await processSuccessfulPayment(supabase, order.id);
        } else {
          console.log(`Order ${order.id} already processed.`);
        }
      }
    }

    // 5. RESPOND 200 OK (Must be within 5 seconds as per docs)
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Webhook Error:", error.message);
    // Always return 200 if possible to stop retries unless it's a real server error
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
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deliver-product`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({ orderId: orderId })
  }).catch(err => console.error("Error triggering delivery:", err));
}
