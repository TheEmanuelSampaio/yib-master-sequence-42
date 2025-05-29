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
              accountName: 'string',
              adminId: 'ID do administrador que criou o cliente (opcional)'
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
    
    const { accountId, accountName, adminId } = accountData;
    const { id: contactId, name: contactName, phoneNumber } = contactData;
    const { inboxId, conversationId, displayId, labels } = conversationData;
    
    console.log(`[1. BODY] Processando dados: contactId=${contactId}, name=${contactName}, phoneNumber=${phoneNumber}, accountId=${accountId}, accountName=${accountName}, adminId=${adminId || 'não informado'}, tags=${labels}`);
    
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
    
    // Verificar primeiro se é um token global de admin ou super_admin
    const { data: adminWithToken, error: adminAuthError } = await supabase
      .from("profiles")
      .select("id, account_name, role, auth_token")
      .eq("auth_token", authToken)
      .maybeSingle();
      
    let isGlobalToken = false;
    let tokenOwner = null;
      
    if (adminWithToken) {
      console.log(`[SEGURANÇA] Token global válido pertencente a: ${adminWithToken.account_name} (${adminWithToken.role})`);
      
      // Para admins normais, verificar se eles têm acesso a este cliente específico
      if (adminWithToken.role !== 'super_admin') {
        // Verificar se o admin é o criador deste cliente
        const clientQueryParams = { 
          account_id: accountId 
        };
        
        // Se o adminId foi fornecido, usa-lo para busca mais específica
        if (adminId && adminId !== adminWithToken.id) {
          console.log(`[SEGURANÇA] adminId fornecido (${adminId}) é diferente do token owner (${adminWithToken.id}), verificando permissões`);
          
          // Admin está tentando acessar cliente de outro admin, verificar se é super_admin
          if (adminWithToken.role !== 'super_admin') {
            console.error(`[SEGURANÇA] Admin não super_admin tentando acessar cliente de outro admin`);
            
            await supabase.from("security_logs").insert({
              client_account_id: String(accountId),
              action: "tag_change_admin_unauthorized_cross_access",
              ip_address: req.headers.get("x-forwarded-for") || "unknown",
              user_agent: req.headers.get("user-agent") || "unknown",
              details: { 
                error: "Admin trying to access another admin's client", 
                admin_id: adminWithToken.id,
                admin_name: adminWithToken.account_name,
                target_admin_id: adminId
              }
            });
            
            return new Response(
              JSON.stringify({ 
                error: 'Acesso não autorizado', 
                details: 'Administradores não podem acessar clientes de outros administradores' 
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // Verificar se o admin tem acesso a este cliente
        const { data: clientAuth, error: clientAuthError } = await supabase
          .from("clients")
          .select("id")
          .eq("account_id", accountId)
          .eq("created_by", adminWithToken.id)
          .maybeSingle();
        
        if (!clientAuth && adminWithToken.role !== 'super_admin') {
          console.error(`[SEGURANÇA] Token de admin válido, mas este admin não tem acesso ao cliente com accountId=${accountId}`);
          
          // Registrar tentativa não autorizada
          await supabase.from("security_logs").insert({
            client_account_id: String(accountId),
            action: "tag_change_admin_unauthorized_access",
            ip_address: req.headers.get("x-forwarded-for") || "unknown",
            user_agent: req.headers.get("user-agent") || "unknown",
            details: { 
              error: "Admin not authorized for this client", 
              account_name: accountName,
              admin_name: adminWithToken.account_name
            }
          });
          
          return new Response(
            JSON.stringify({ 
              error: 'Acesso não autorizado', 
              details: 'O administrador não tem acesso a este cliente' 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      isGlobalToken = true;
      tokenOwner = adminWithToken;
    } else {
      // Se não for token global, verificar se é token específico de cliente
      let clientQuery = supabase.from("clients").select("id, auth_token");
      
      // Se o adminId foi fornecido, inclui-lo na busca
      if (adminId) {
        console.log(`[SEGURANÇA] Usando adminId=${adminId} para busca de cliente`);
        clientQuery = clientQuery
          .eq("account_id", accountId)
          .eq("created_by", adminId);
      } else {
        console.log(`[SEGURANÇA] adminId não fornecido, buscando apenas por account_id=${accountId}`);
        clientQuery = clientQuery.eq("account_id", accountId);
      }
      
      const { data: clientAuth, error: clientAuthError } = await clientQuery.maybeSingle();
      
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
            account_name: accountName,
            admin_id: adminId
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
    }
    
    // Token válido, continuar com o processamento
    if (isGlobalToken) {
      console.log(`[SEGURANÇA] Autenticação realizada com token global de ${tokenOwner.account_name} (${tokenOwner.role})`);
    } else {
      console.log(`[SEGURANÇA] Token de autenticação válido para o cliente com accountId=${accountId}`);
    }
    
    // Use the appropriate creator ID
    const creatorId = isGlobalToken ? tokenOwner.id : (adminId || "system");
    
    // Buscar cliente com account_id e adminId quando apropriado
    const clientResult = await handleClient(
      supabase, 
      accountId, 
      accountName, 
      adminId, 
      creatorId
    );
    
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
            skipped: sequencesResult.sequencesSkipped,
            removed: sequencesResult.sequencesRemoved || 0 // Adicionado contador de sequências removidas
          } : { error: sequencesResult.error }
        },
        authMethod: isGlobalToken ? `global_token:${tokenOwner.role}` : 'client_token'
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
