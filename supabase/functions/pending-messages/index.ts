
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Logs de inicialização
console.log(`[INIT] Inicializando função pending-messages`);
console.log(`[INIT] SUPABASE_URL definido: ${supabaseUrl ? 'SIM' : 'NÃO'}`);
console.log(`[INIT] SUPABASE_ANON_KEY definido: ${supabaseAnonKey ? 'SIM' : 'NÃO'}`);

Deno.serve(async (req) => {
  console.log(`[REQUEST] Método: ${req.method}, URL: ${req.url}`);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Requisição OPTIONS recebida, retornando cabeçalhos CORS`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[CLIENT] Criando cliente Supabase...`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log(`[CLIENT] Cliente Supabase criado com sucesso`);
    
    // Parse the request body
    console.log(`[PARSE] Iniciando parse do corpo da requisição...`);
    const body = await req.text();
    console.log(`[PARSE] Body recebido: ${body}`);
    
    // Tentando converter body para JSON
    let jsonData;
    try {
      jsonData = JSON.parse(body);
      console.log(`[PARSE] JSON parseado com sucesso`);
    } catch (parseError) {
      console.error(`[PARSE] Erro ao parsear JSON: ${parseError.message}`);
      return new Response(
        JSON.stringify({ error: 'Payload JSON inválido', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Autenticação com token
    const { authToken, adminId } = jsonData;
    
    if (!authToken) {
      console.error(`[SEGURANÇA] Tentativa de acesso sem token de autenticação`);
      return new Response(
        JSON.stringify({ 
          error: 'Token de autenticação necessário', 
          details: 'É necessário fornecer um token de autenticação válido' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar token de administrador
    const { data: admin, error: adminError } = await supabase
      .from("profiles")
      .select("id, account_name, role, auth_token")
      .eq("auth_token", authToken)
      .maybeSingle();
      
    if (adminError || !admin) {
      console.error(`[SEGURANÇA] Token de autenticação inválido ou não pertence a um administrador`);
      
      // Registrar tentativa não autorizada
      await supabase.from("security_logs").insert({
        client_account_id: "system",
        action: "pending_messages_unauthorized_access",
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
        details: { error: "Invalid authentication token" }
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Token de autenticação inválido', 
          details: 'O token fornecido não é válido ou não pertence a um administrador' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[SEGURANÇA] Autenticação realizada para ${admin.account_name} (${admin.role})`);
    
    // Pegar mensagens pendentes com horário de envio menor que o horário atual
    console.log(`[QUERY] Buscando mensagens pendentes...`);
    const now = new Date();
    
    // Definir qual admin ID usar para filtragem
    const filterAdminId = (adminId && admin.role === 'super_admin') ? adminId : admin.id;
    
    // Se não for super_admin e adminId é fornecido, filtrar apenas para esse admin
    let adminClientIds = [];
    
    if (admin.role !== 'super_admin' || (adminId && admin.role === 'super_admin')) {
      console.log(`[QUERY] Filtrando mensagens para admin_id=${filterAdminId}`);
      
      // Primeiro, obter os IDs dos clientes associados a este admin
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('created_by', filterAdminId);
      
      if (clientsError) {
        console.error(`[QUERY] Erro ao buscar clientes do admin: ${clientsError.message}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao buscar clientes do admin', 
            details: clientsError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Extrair os IDs dos clientes
      adminClientIds = clientsData?.map(client => client.id) || [];
      console.log(`[QUERY] Encontrados ${adminClientIds.length} clientes para o admin ${filterAdminId}`);
      
      // Se não houver clientes para este admin, retornar array vazio
      if (adminClientIds.length === 0) {
        console.log(`[RESULT] Nenhum cliente encontrado para o admin ${filterAdminId}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            messages: [],
            meta: {
              count: 0,
              processedAt: now.toISOString(),
              admin: {
                id: admin.id,
                role: admin.role,
                name: admin.account_name
              }
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log(`[QUERY] Admin é super_admin e não especificou adminId, buscando todas as mensagens pendentes`);
    }
    
    // Construir a consulta principal para buscar mensagens pendentes
    let pendingMessagesQuery = supabase
      .from('scheduled_messages')
      .select(`
        id,
        status,
        scheduled_time,
        raw_scheduled_time,
        variables,
        processed_content,
        contacts!inner(
          id, 
          name, 
          phone_number, 
          client_id,
          inbox_id,
          conversation_id,
          display_id
        ),
        sequences!inner(
          id, 
          name,
          instances!inner(
            id, 
            name, 
            evolution_api_url, 
            api_key
          )
        ),
        sequence_stages!inner(
          id, 
          name, 
          content, 
          type
        )
      `)
      .eq('status', 'pending')
      .lt('scheduled_time', now.toISOString())
      .order('scheduled_time', { ascending: true });
    
    // Se temos clientIds para filtrar, adicionar à consulta
    if (adminClientIds.length > 0) {
      pendingMessagesQuery = pendingMessagesQuery.in('contacts.client_id', adminClientIds);
    }
      
    // Limitar a 10 mensagens por vez para evitar sobrecarga
    pendingMessagesQuery = pendingMessagesQuery.limit(10);
    
    const { data: pendingMessages, error: messagesError } = await pendingMessagesQuery;

    if (messagesError) {
      console.error(`[QUERY] Erro ao buscar mensagens pendentes: ${messagesError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar mensagens pendentes', 
          details: messagesError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não houver mensagens pendentes, retornar array vazio
    if (!pendingMessages || pendingMessages.length === 0) {
      console.log(`[RESULT] Nenhuma mensagem pendente encontrada`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          messages: [] 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RESULT] Encontradas ${pendingMessages.length} mensagens pendentes`);

    // Marcar as mensagens como "processing"
    const messageIds = pendingMessages.map(msg => msg.id);
    
    const { error: updateError } = await supabase
      .from('scheduled_messages')
      .update({ status: 'processing' })
      .in('id', messageIds);

    if (updateError) {
      console.error(`[UPDATE] Erro ao atualizar status das mensagens: ${updateError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao atualizar status das mensagens', 
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter tags de contatos para incluir no payload
    const contactIds = pendingMessages.map(msg => msg.contacts.id);
    const { data: contactTags, error: tagsError } = await supabase
      .from('contact_tags')
      .select('contact_id, tag_name')
      .in('contact_id', contactIds);

    if (tagsError) {
      console.log(`[TAGS] Erro ao buscar tags dos contatos: ${tagsError.message}`);
    }

    // Agrupar tags por contato
    const tagsByContact = {};
    contactTags?.forEach(tag => {
      if (!tagsByContact[tag.contact_id]) {
        tagsByContact[tag.contact_id] = [];
      }
      tagsByContact[tag.contact_id].push(tag.tag_name);
    });

    // Recuperar a lista completa de estágios para cada sequência para calcular o número do estágio
    const sequenceIds = [...new Set(pendingMessages.map(msg => msg.sequences.id))];
    const stagesBySequence = {};
    
    for (const sequenceId of sequenceIds) {
      const { data: stages, error: stagesError } = await supabase
        .from('sequence_stages')
        .select('id')
        .eq('sequence_id', sequenceId)
        .order('created_at', { ascending: true });
        
      if (stagesError) {
        console.error(`[STAGES] Erro ao buscar estágios da sequência ${sequenceId}: ${stagesError.message}`);
        continue;
      }
      
      // Criar um mapa de ID do estágio para seu número na sequência (começando do 1)
      stagesBySequence[sequenceId] = {};
      stages?.forEach((stage, index) => {
        stagesBySequence[sequenceId][stage.id] = index + 1;
      });
    }

    // Obter informações sobre os clientes para incluir adminId
    const clientIds = [...new Set(pendingMessages.map(msg => msg.contacts.client_id))];
    const clientsData = {};
    
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, account_id, account_name, created_by')
      .in('id', clientIds);
      
    if (clientsError) {
      console.error(`[CLIENTS] Erro ao buscar informações dos clientes: ${clientsError.message}`);
    } else {
      clients?.forEach(client => {
        clientsData[client.id] = {
          accountId: client.account_id,
          accountName: client.account_name,
          adminId: client.created_by
        };
      });
    }

    // Formatar mensagens no formato esperado pelo N8N
    const formattedMessages = pendingMessages.map(msg => {
      const contact = msg.contacts;
      const sequence = msg.sequences;
      const stage = msg.sequence_stages;
      const instance = sequence.instances;
      
      // Obter tags do contato, se existirem
      const contactTagsList = tagsByContact[contact.id] || [];
      
      // Obter dados do cliente, incluindo adminId
      const clientData = clientsData[contact.client_id] || {
        accountId: 0,
        accountName: "Unknown",
        adminId: admin.id // Fallback para o admin atual
      };
      
      // Calcular o número do estágio (começando do 1)
      const stageNumber = stagesBySequence[sequence.id]?.[stage.id] || 1;
      
      // Usar conteúdo processado com variáveis substituídas se disponível
      let content;
      let variables = msg.variables || {};
      
      console.log(`[VARIÁVEIS] Processando mensagem ${msg.id} do tipo ${stage.type}`);
      console.log(`[VARIÁVEIS] Variáveis armazenadas: ${JSON.stringify(variables || {})}`);
      
      if (stage.type === 'typebot') {
        // Se for typebot, o conteúdo processado já deve estar no formato esperado
        try {
          if (msg.processed_content) {
            const typebotData = JSON.parse(msg.processed_content);
            content = typebotData.stage;
            // Adicionar as variáveis ao payload se existirem
            if (typebotData.variables) {
              variables = { ...variables, ...typebotData.variables };
            }
          } else {
            content = stage.content;
          }
        } catch (e) {
          console.log(`[VARIÁVEIS] Erro ao processar conteúdo do typebot: ${e.message}`);
          content = stage.content;
        }
      } else {
        // Se for message ou pattern, usar o conteúdo processado ou o original
        content = msg.processed_content || stage.content;
      }
      
      console.log(`[VARIÁVEIS] Tipo: ${stage.type}, Usando conteúdo: ${content}`);
      console.log(`[VARIÁVEIS] Variáveis da mensagem: ${JSON.stringify(variables)}`);
      
      return {
        id: msg.id,
        stageNumber: stageNumber,
        chatwootData: {
          accountData: {
            accountId: clientData.accountId,
            accountName: clientData.accountName,
            adminId: clientData.adminId, // Incluir adminId no payload
          },
          contactData: {
            id: contact.id,
            name: contact.name,
            phoneNumber: contact.phone_number,
          },
          conversationData: {
            inboxId: contact.inbox_id,
            conversationId: contact.conversation_id,
            displayId: contact.display_id,
            labels: contactTagsList.join(", ")
          },
          variables: variables // Incluir variáveis no payload
        },
        instanceData: {
          id: instance.id,
          name: instance.name,
          evolutionApiUrl: instance.evolution_api_url,
          apiKey: instance.api_key
        },
        sequenceData: {
          instanceName: instance.name,
          sequenceName: sequence.name,
          type: stage.type,
          stage: {
            [stageNumber === 1 ? "stg1" : `stg${stageNumber}`]: {
              id: stage.id,
              content: content, // Usar conteúdo processado com variáveis
              rawScheduledTime: msg.raw_scheduled_time,
              scheduledTime: msg.scheduled_time
            }
          }
        }
      };
    });

    // Registrar o sucesso no log de segurança
    await supabase.from("security_logs").insert({
      client_account_id: "system",
      action: "pending_messages_retrieved",
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
      details: { 
        admin_id: admin.id,
        admin_role: admin.role,
        messages_count: formattedMessages.length,
        filtered_by_admin_id: adminId || null
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messages: formattedMessages,
        meta: {
          count: formattedMessages.length,
          processedAt: now.toISOString(),
          admin: {
            id: admin.id,
            role: admin.role,
            name: admin.account_name
          }
        },
        logs: [
          { level: 'info', message: `[RESULT] Processadas ${formattedMessages.length} mensagens pendentes` }
        ]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[CRITICAL] Erro não tratado: ${error.message}`);
    console.error(`[CRITICAL] Stack: ${error.stack}`);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
