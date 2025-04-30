
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

// Initialize Supabase client
export const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Get Supabase client with service role (bypasses RLS)
export const getSupabaseServiceClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseServiceKey) {
    console.error('[DB-HELPERS] Chave service role não encontrada!');
    return getSupabaseClient(); // Fallback para client normal
  }
  
  console.log('[DB-HELPERS] Usando cliente Supabase com service role (bypasses RLS)');
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Helper function to handle errors in Supabase queries
export const logQueryError = (stage: string, error: any) => {
  console.error(`[${stage}] Erro: ${error.message}${error.code ? ` (código: ${error.code})` : ''}`);
  return error;
};

// Helper for creating consistent responses
export const createResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

// Helper for creating error responses
export const createErrorResponse = (message: string, details?: any, status = 400) => {
  return createResponse({ error: message, details }, status);
};
