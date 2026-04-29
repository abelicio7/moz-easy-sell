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

    // 1. Check for a dedicated Admin Notification Email in environment variables
    const directAdminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
    let adminEmails: string[] = [];

    if (directAdminEmail) {
      adminEmails = directAdminEmail.split(",").map(e => e.trim());
    } else {
      // Fallback: Fetch all admin emails from the profiles table
      const { data: admins, error: adminErr } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "admin");

      if (!adminErr && admins) {
        adminEmails = admins.map(a => a.email).filter(Boolean);
      }
    }

    if (adminEmails.length === 0) {
      console.log("No admins found to notify.");
      return new Response(JSON.stringify({ success: true, message: "No admins found" }), { headers: corsHeaders });
    }

    console.log(`Sending admin notifications to: ${adminEmails.join(", ")}`);

    for (const email of adminEmails) {
      console.log(`Attempting to notify: ${email}`);
      const { data, error: invokeErr } = await supabase.functions.invoke("send-email-notification", {
        body: { 
          to: email, 
          subject: subject, 
          htmlContent: htmlContent, 
          senderName: "EnsinaPay System" 
        }
      });

      if (invokeErr) {
        console.error(`Error invoking email for ${email}:`, invokeErr);
        return new Response(JSON.stringify({ error: `Falha ao disparar e-mail para ${email}: ${invokeErr.message}` }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        });
      }
      
      if (data?.error) {
        console.error(`Email API error for ${email}:`, data.error);
        return new Response(JSON.stringify({ error: `Erro no Brevo (${email}): ${data.error}` }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        });
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
