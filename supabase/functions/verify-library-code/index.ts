import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, code } = await req.json();
    if (!email || !code) throw new Error("Email e código são obrigatórios");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Check if code matches and is not expired
    const { data, error } = await supabase
      .from("library_auth_codes")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("code", code.trim())
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Código inválido ou expirado");

    // 2. Delete the code so it can't be reused
    await supabase.from("library_auth_codes").delete().eq("id", data.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
