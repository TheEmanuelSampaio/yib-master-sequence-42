
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

// Cria um cliente Supabase com a role de serviço (bypass RLS)
export const createServiceClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas');
    throw new Error('Configuração de ambiente incompleta');
  }
  
  console.log('[DB-HELPERS] Usando cliente Supabase com service role (bypasses RLS)');
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': 'tag-change-function',
      },
    },
  });
};

// Cria um cliente Supabase anônimo
export const createAnonClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': 'tag-change-function',
      },
    },
  });
};

// Handler de erro padrão
export const handleError = (error: any, message: string) => {
  console.error(`[ERRO] ${message}:`, error);
  return new Response(
    JSON.stringify({ 
      error: message, 
      details: error.message || JSON.stringify(error)
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};
