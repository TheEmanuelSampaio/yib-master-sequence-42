
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Logs de inicialização
console.log(`[INIT] Inicializando function tag-change`);
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
    
    // Extrair dados da estrutura correta
    const { data } = jsonData;
    
    console.log(`[DEBUG] Payload recebido:`, JSON.stringify(data, null, 2));
    
    if (!data || !data.accountId || !data.accountName || !data.contact || !data.conversation) {
      console.error(`[VALIDATE] Dados obrigatórios ausentes:`, JSON.stringify({
        temData: !!data,
        temAccountId: data ? !!data.accountId : false,
        temAccountName: data ? !!data.accountName : false,
        temContact: data ? !!data.contact : false,
        temConversation: data ? !!data.conversation : false
      }));
      return new Response(
        JSON.stringify({ 
          error: 'Dados obrigatórios ausentes',
          esperado: {
            data: {
              accountId: 'número ou string',
              accountName: 'string',
              contact: { 
                id: 'number ou string', 
                name: 'string', 
                phoneNumber: 'string' 
              },
              conversation: {
                inboxId: 'number',
                conversationId: 'number',
                displayId: 'number',
                labels: 'string'
              }
            }
          },
          recebido: data
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { accountId, accountName } = data;
    const { id: contactId, name: contactName, phoneNumber } = data.contact;
    const { inboxId, conversationId, displayId, labels } = data.conversation;
    
    console.log(`[PROCESS] Processando contato ${contactName} com labels: ${labels}`);
    
    // Diagnóstico do cliente Supabase - teste de execução de consulta simples
    console.log(`[TEST] Testando conexão com o banco...`);
    const { data: testData, error: testError } = await supabase
      .from('clients')
      .select('count');
    
    if (testError) {
      console.error(`[TEST] Erro ao testar conexão: ${testError.message}`);
      console.error(`[TEST] Código: ${testError.code}, Detalhes: ${JSON.stringify(testError.details || {})}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao testar conexão com o banco de dados', 
          details: testError.message,
          code: testError.code,
          testErrorDetails: testError.details
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`[TEST] Conexão com banco OK: ${JSON.stringify(testData)}`);
    }
    
    // Verificar se há clientes e inserir um cliente de teste se necessário
    const { count } = testData[0] || { count: 0 };
    if (count === 0) {
      console.log(`[SETUP] Nenhum cliente encontrado. Inserindo cliente de teste...`);
      
      // Criar um cliente de teste
      const { data: insertedClient, error: insertError } = await supabase
        .from('clients')
        .insert([
          { 
            account_id: accountId, 
            account_name: accountName, 
            created_by: 'system', 
            creator_account_name: 'Sistema (Auto)'
          }
        ])
        .select();
      
      if (insertError) {
        console.error(`[SETUP] Erro ao inserir cliente de teste: ${insertError.message}`);
        console.error(`[SETUP] Detalhes: ${JSON.stringify(insertError.details || {})}`);
      } else {
        console.log(`[SETUP] Cliente de teste inserido com sucesso: ${JSON.stringify(insertedClient)}`);
      }
    }
    
    // Buscar cliente com account_id
    console.log(`[QUERY] Buscando cliente com account_id = ${accountId}`);
    
    // Tentar como número primeiro
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('account_id', Number(accountId))
      .limit(1);
    
    if (clientError) {
      console.error(`[QUERY] Erro ao buscar cliente: ${clientError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar cliente', 
          details: clientError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let client = null;
    
    // Se não encontrou como número, tentar como string
    if (!clientData || clientData.length === 0) {
      console.log(`[QUERY] Cliente não encontrado como número, tentando como string...`);
      
      const { data: clientDataStr, error: clientErrorStr } = await supabase
        .from('clients')
        .select('*')
        .eq('account_id', String(accountId))
        .limit(1);
      
      if (clientErrorStr) {
        console.error(`[QUERY] Erro ao buscar cliente como string: ${clientErrorStr.message}`);
      } else if (clientDataStr && clientDataStr.length > 0) {
        client = clientDataStr[0];
        console.log(`[QUERY] Cliente encontrado como string: ${JSON.stringify(client)}`);
      }
    } else {
      client = clientData[0];
      console.log(`[QUERY] Cliente encontrado como número: ${JSON.stringify(client)}`);
    }
    
    // Se ainda não encontrou, usar o cliente que acabamos de inserir
    if (!client) {
      console.log(`[QUERY] Cliente não encontrado, buscando todos os clientes...`);
      
      const { data: allClients, error: allClientsError } = await supabase
        .from('clients')
        .select('*')
        .limit(1);
      
      if (allClientsError) {
        console.error(`[QUERY] Erro ao buscar todos os clientes: ${allClientsError.message}`);
      } else if (allClients && allClients.length > 0) {
        client = allClients[0];
        console.log(`[QUERY] Usando primeiro cliente disponível: ${JSON.stringify(client)}`);
      }
    }
    
    if (!client) {
      console.error(`[ERROR] Nenhum cliente encontrado após todas as tentativas`);
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum cliente encontrado no banco de dados',
          debug: {
            accountIdBuscado: accountId,
            tentativasRealizadas: [
              'Como número', 
              'Como string', 
              'Todos os clientes'
            ]
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse labels to tags array
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()) : [];
    console.log(`[DEBUG] Tags processadas: ${JSON.stringify(tags)}`);
    
    // Verificar se o contato já existe
    console.log(`[CONTACT] Verificando se contato ${contactId} já existe...`);
    const { data: existingContact, error: contactLookupError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', String(contactId))
      .limit(1);
    
    if (contactLookupError) {
      console.error(`[CONTACT] Erro ao buscar contato: ${contactLookupError.message}`);
    }
    
    // Criar contato se não existir
    if (!existingContact || existingContact.length === 0) {
      console.log(`[CONTACT] Contato não encontrado, criando novo contato...`);
      
      const { data: newContact, error: createContactError } = await supabase
        .from('contacts')
        .insert([
          {
            id: String(contactId),
            client_id: client.id,
            name: contactName,
            phone_number: phoneNumber,
            conversation_id: conversationId,
            display_id: displayId,
            inbox_id: inboxId
          }
        ])
        .select();
      
      if (createContactError) {
        console.error(`[CONTACT] Erro ao criar contato: ${createContactError.message}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar contato', 
            details: createContactError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[CONTACT] Contato criado com sucesso: ${JSON.stringify(newContact)}`);
    } else {
      console.log(`[CONTACT] Contato já existe: ${JSON.stringify(existingContact[0])}`);
    }
    
    // Atualizar tags do contato
    if (tags.length > 0) {
      console.log(`[TAGS] Atualizando tags do contato...`);
      
      // Primeiro remover tags existentes
      const { error: deleteTagsError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', String(contactId));
      
      if (deleteTagsError) {
        console.error(`[TAGS] Erro ao remover tags existentes: ${deleteTagsError.message}`);
      }
      
      // Inserir novas tags
      const tagInserts = tags.map(tag => ({
        contact_id: String(contactId),
        tag_name: tag
      }));
      
      const { error: insertTagsError } = await supabase
        .from('contact_tags')
        .insert(tagInserts);
      
      if (insertTagsError) {
        console.error(`[TAGS] Erro ao inserir novas tags: ${insertTagsError.message}`);
      } else {
        console.log(`[TAGS] Tags atualizadas com sucesso: ${JSON.stringify(tags)}`);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contato processado com sucesso',
        client: {
          id: client.id,
          accountName: client.account_name,
          accountId: client.account_id
        },
        contact: {
          id: String(contactId),
          name: contactName,
          tags
        },
        logs: [
          { level: 'info', message: `[TEST] Conexão com banco OK: ${JSON.stringify(testData)}` },
          { level: 'info', message: `[QUERY] Cliente encontrado: ${client ? 'SIM' : 'NÃO'}` },
          { level: 'info', message: `[CONTACT] Contato processado: ${contactName}` }
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
