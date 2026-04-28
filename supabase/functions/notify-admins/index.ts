import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subject, htmlContent } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all admin emails
    const { data: admins, error: adminErr } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "admin");

    if (adminErr) throw adminErr;
    if (!admins || admins.length === 0) {
      console.log("No admins found to notify.");
      return new Response(JSON.stringify({ success: true, message: "No admins found" }), { headers: corsHeaders });
    }

    const adminEmails = admins.map(a => a.email).filter(Boolean);
    console.log(`Sending admin notifications to: ${adminEmails.join(", ")}`);

    for (const email of adminEmails) {
      try {
        await supabase.functions.invoke("send-email-notification", {
          body: { 
            to: email, 
            subject: subject, 
            htmlContent: htmlContent, 
            senderName: "EnsinaPay System" 
          }
        });
      } catch (err) {
        console.error(`Failed to notify admin ${email}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error) {
    console.error("Notify Admins error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400 
    });
  }
})
