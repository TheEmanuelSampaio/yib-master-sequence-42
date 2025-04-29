
// supabase Edge Function for updating user profile structure
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Primeiro, alterar a estrutura da tabela profiles
    const { data: alterResult, error: alterError } = await supabase.rpc('admin_alter_profiles_table');
    
    if (alterError) {
      throw new Error(`Erro ao alterar tabela: ${alterError.message}`);
    }
    
    // Atualizar a função de trigger
    const { data: triggerResult, error: triggerError } = await supabase.rpc('admin_update_trigger_function');
    
    if (triggerError) {
      throw new Error(`Erro ao atualizar função de trigger: ${triggerError.message}`);
    }
    
    // Responder com sucesso
    return new Response(JSON.stringify({
      success: true,
      message: "Estrutura de perfil atualizada com sucesso"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
