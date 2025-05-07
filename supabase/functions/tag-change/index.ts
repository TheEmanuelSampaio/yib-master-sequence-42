
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from './client-utils.ts';
import { handleClient } from './client-operations.ts';
import { handleContact } from './contact-operations.ts';
import { handleTags } from './tag-operations.ts';
import { processSequences } from './sequence-operations.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req) => {
  console.log('[INIT] Inicializando função tag-change');
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role para bypassing RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[DB-HELPERS] Usando cliente Supabase com service role (bypasses RLS)');
    
    // Parse the request body
    const body = await req.text();
    
    // Tentando converter body para JSON
    let jsonData;
    try {
      jsonData = JSON.parse(body);
      console.log('[1. BODY] JSON parseado com sucesso');
      console.log(`[1. BODY] Body recebido: ${body}`);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Payload JSON inválido', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar o formato do JSON e extrair os dados relevantes
    const { accountData, contactData, conversationData, variables, authToken } = jsonData;
    
    // Log das variáveis recebidas
    console.log(`[1. BODY] Variáveis recebidas: ${JSON.stringify(variables || {})}`);
    
    if (!accountData || !contactData || !conversationData) {
      return new Response(
        JSON.stringify({ 
          error: 'Formato de dados inválido',
          esperado: {
            accountData: {
              accountId: 'número ou string',
              accountName: 'string'
            },
            contactData: { 
              id: 'number ou string', 
              name: 'string', 
              phoneNumber: 'string' 
            },
            conversationData: {
              inboxId: 'number',
              conversationId: 'number',
              displayId: 'number',
              labels: 'string'
            },
            variables: 'objeto opcional com chaves e valores string',
            authToken: 'token de autenticação para o cliente'
          },
          recebido: jsonData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[1. BODY] Formato utilizado: data direto');
    
    const { accountId, accountName } = accountData;
    const { id: contactId, name: contactName, phoneNumber } = contactData;
    const { inboxId, conversationId, displayId, labels } = conversationData;
    
    console.log(`[1. BODY] Processando dados: contactId=${contactId}, name=${contactName}, phoneNumber=${phoneNumber}, accountId=${accountId}, accountName=${accountName}, tags=${labels}`);
    
    // Validar token de autenticação
    if (!authToken) {
      console.error(`[SEGURANÇA] Tentativa de acesso sem token de autenticação para o cliente com accountId=${accountId}`);
      
      // Registrar tentativa não autorizada
      await supabase.from("security_logs").insert({
        client_account_id: String(accountId),
        action: "tag_change_unauthorized_access",
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
        details: { error: "Missing authentication token", account_name: accountName }
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Token de autenticação necessário', 
          details: 'É necessário fornecer um token de autenticação válido para este cliente' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar se o token corresponde ao accountId fornecido
    const { data: clientAuth, error: clientAuthError } = await supabase
      .from("clients")
      .select("id, auth_token")
      .eq("account_id", accountId)
      .maybeSingle();
    
    if (clientAuthError) {
      console.error(`[SEGURANÇA] Erro ao verificar autenticação do cliente: ${clientAuthError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao verificar autenticação', 
          details: clientAuthError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!clientAuth || clientAuth.auth_token !== authToken) {
      console.error(`[SEGURANÇA] Token inválido fornecido para o cliente com accountId=${accountId}`);
      
      // Registrar tentativa não autorizada
      await supabase.from("security_logs").insert({
        client_account_id: String(accountId),
        action: "tag_change_invalid_token",
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
        details: { 
          error: clientAuth ? "Invalid token" : "Client not found", 
          account_name: accountName 
        }
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Token de autenticação inválido', 
          details: 'O token fornecido não corresponde ao cliente especificado' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Token válido, continuar com o processamento
    console.log(`[SEGURANÇA] Token de autenticação válido para o cliente com accountId=${accountId}`);
    
    // Buscar cliente com account_id
    const clientResult = await handleClient(supabase, accountId, accountName, "system");
    
    if (!clientResult.success) {
      return new Response(
        JSON.stringify({ 
          error: clientResult.error, 
          details: clientResult.details 
        }),
        { status: clientResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const client = clientResult.client;
    
    // Parse labels to tags array
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];
    
    // Handle contact creation/update
    const contactResult = await handleContact(
      supabase, 
      contactId, 
      contactName, 
      phoneNumber, 
      client, 
      conversationId,
      displayId,
      inboxId
    );
    
    if (!contactResult.success) {
      return new Response(
        JSON.stringify({ 
          error: contactResult.error, 
          details: contactResult.details 
        }),
        { status: contactResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const contact = contactResult.contact;
    
    // Handle tags
    const tagsResult = await handleTags(supabase, tags, client, contact);
    
    if (!tagsResult.success) {
      return new Response(
        JSON.stringify({ 
          error: tagsResult.error, 
          details: tagsResult.details 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar sequências para este contato e tags
    console.log(`[5. SEQUÊNCIAS] Verificando sequências para o contato ${contact.id} com client_id ${client.id}`);
    const sequencesResult = await processSequences(supabase, client.id, contact.id, tags, variables);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contato processado com sucesso',
        client: {
          id: client.id,
          accountName: client.account_name,
          accountId: client.account_id,
          creatorId: client.created_by,
          creatorName: client.creator_account_name
        },
        contact: {
          id: contact.id,
          name: contact.name,
          tags
        },
        stats: {
          ...tagsResult.stats,
          sequences: sequencesResult.success ? {
            processed: sequencesResult.sequencesProcessed,
            added: sequencesResult.sequencesAdded,
            skipped: sequencesResult.sequencesSkipped
          } : { error: sequencesResult.error }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[ERRO] Erro interno do servidor: ${JSON.stringify(error)}`);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
