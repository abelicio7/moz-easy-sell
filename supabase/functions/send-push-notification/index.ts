import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, title, body, url } = await req.json();

    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // VAPID Keys
    const PUBLIC_VAPID_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || "";
    const PRIVATE_VAPID_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || "";

    // Get user subscriptions
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subsError) {
      throw new Error(`Error fetching subscriptions: ${subsError.message}`);
    }

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: "No push subscriptions found for user", success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webpush = (await import('npm:web-push')).default;
    webpush.setVapidDetails(
      'mailto:suporte@ensinapay.com',
      PUBLIC_VAPID_KEY,
      PRIVATE_VAPID_KEY
    );

    const payload = JSON.stringify({
      title: title,
      body: body,
      url: url || '/dashboard'
    });

    let successCount = 0;
    let failCount = 0;

    // Send notifications to all subscriber endpoints for this user
    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (e) {
        console.error("WebPush send error for sub:", e);
        failCount++;
        // Optional: If error is 410 Gone, delete the subscription from DB immediately.
        if (e.statusCode === 410 || e.statusCode === 404) {
             await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Push notifications sent successfully. Sent: ${successCount}, Failed: ${failCount}` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("send-push-notification error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
