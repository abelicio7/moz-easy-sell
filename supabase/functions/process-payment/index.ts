import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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

  try {
    const { order_id, amount, phone, payment_method, name, email, cpf, product_name, product_id, origin } = await req.json()
    
    // MERCADO PAGO PIX PAYMENT PROCESS
    if (payment_method === 'pix') {
      const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
      if (!MP_ACCESS_TOKEN) {
        throw new Error('MERCADOPAGO_ACCESS_TOKEN configuration missing in Supabase Secrets')
      }

      console.log(`Generating Pix payment for order ${order_id}, amount ${amount}, email ${email}`)

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'X-Idempotency-Key': order_id
        },
        body: JSON.stringify({
          transaction_amount: Number(amount),
          description: product_name || 'Venda EnsinaPay',
          payment_method_id: 'pix',
          payer: {
            email: email,
            first_name: name.split(' ')[0] || "Cliente",
            last_name: name.split(' ').slice(1).join(' ') || "EnsinaPay",
            identification: {
              type: "CPF",
              number: cpf.replace(/\D/g, "")
            }
          }
        })
      })

      const mpData = await mpResponse.json()
      console.log("MERCADO PAGO RESPONSE (DEBUG):", JSON.stringify(mpData))

      if (!mpResponse.ok || mpData.status === 'rejected') {
        throw new Error(mpData.message || mpData.cause?.[0]?.description || 'Error processing payment with Mercado Pago')
      }

      const paymentId = String(mpData.id)
      const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code
      const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64

      // Update order in database
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_id: paymentId,
          pix_qr_code: qrCodeBase64,
          pix_copia_cola: qrCode,
          currency: 'BRL',
          status: 'pending'
        })
        .eq('id', order_id)

      if (updateError) {
        console.error("Error updating BRL order:", updateError)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          payment_id: paymentId,
          pix_qr_code: qrCodeBase64,
          pix_copia_cola: qrCode
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // MOZAMBIQUE LOCAL PAYMENT PROCESS via ZumboPay (M-Pesa / E-Mola)
    if (payment_method === 'emola' || payment_method === 'mpesa') {
      const ZUMBOPAY_API_KEY = Deno.env.get('ZUMBOPAY_API_KEY')
      const ZUMBOPAY_MERCHANT_ID = Deno.env.get('ZUMBOPAY_MERCHANT_ID')
      const ZUMBOPAY_WALLET_EMOLA = Deno.env.get('ZUMBOPAY_WALLET_EMOLA')
      const ZUMBOPAY_WALLET_MPESA = Deno.env.get('ZUMBOPAY_WALLET_MPESA')

      if (!ZUMBOPAY_API_KEY || !ZUMBOPAY_MERCHANT_ID) {
        throw new Error('ZumboPay configuration (API Key or Merchant ID) missing in Supabase Secrets')
      }

      const walletId = payment_method === 'emola' ? ZUMBOPAY_WALLET_EMOLA : ZUMBOPAY_WALLET_MPESA
      if (!walletId) {
        throw new Error(`ZumboPay Wallet ID not configured for ${payment_method}`)
      }

      // ZumboPay expects phone starting with 258 country code
      let msisdn = phone ? phone.replace(/\D/g, '') : ""
      if (msisdn && !msisdn.startsWith('258')) {
        msisdn = '258' + msisdn
      }

      console.log(`Processing ZumboPay payment for order ${order_id}, amount ${amount}, msisdn ${msisdn}, method ${payment_method}`)

      const paymentBody = {
        wallet_id: walletId,
        amount: Number(amount),
        msisdn: msisdn,
        customer_name: name || "Cliente EnsinaPay",
        source_id: order_id
      }

      const response = await fetch('https://zumbopay.com/api/public/v1/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZUMBOPAY_API_KEY}`,
          'X-Merchant-Id': ZUMBOPAY_MERCHANT_ID
        },
        body: JSON.stringify(paymentBody)
      })

      const zumboData = await response.json()
      console.log("RESPOSTA COMPLETA DA ZUMBOPAY (DEBUG):", JSON.stringify(zumboData))

      if (!response.ok || zumboData.error || zumboData.message) {
        console.error("ZumboPay error response:", JSON.stringify(zumboData))
        const errMsg = 
          (typeof zumboData.error === 'object' ? zumboData.error?.message : zumboData.error) || 
          zumboData.message || 
          'Error processing payment with ZumboPay'
        throw new Error(errMsg)
      }

      const ref = zumboData.data?.reference || zumboData.data?.id || zumboData.reference || zumboData.id

      if (!ref) {
        throw new Error("Nenhuma referência de transação retornada pela ZumboPay")
      }

      // Update order with ZumboPay reference
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          debito_reference: String(ref),
          currency: 'MZN',
          status: 'pending'
        })
        .eq('id', order_id)

      if (updateError) {
        console.error("Error updating order:", updateError)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          debito_reference: ref,
          reference: ref,
          data: zumboData.data
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unsupported payment method: ${payment_method}`)

  } catch (error) {
    console.error("Payment Error:", error.message)
    // Return 200 with success: false to avoid "Edge Function returned a non-2xx status code"
    // and show the actual error message to the user.
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
