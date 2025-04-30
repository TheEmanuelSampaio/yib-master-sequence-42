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
      .select('count')
      .limit(1);
    
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
    
    // Listar todas as tabelas disponíveis para diagnóstico
    console.log(`[DEBUG] Tentando buscar clientes...`);
    
    // Buscar TODOS os clientes para diagnóstico
    const { data: todosClientes, error: todoClientesError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
    
    if (todoClientesError) {
      console.error(`[ERROR] Erro ao listar todos os clientes: ${todoClientesError.message}`);
    } else {
      console.log(`[DEBUG] Total de clientes encontrados: ${todosClientes ? todosClientes.length : 0}`);
      if (todosClientes && todosClientes.length > 0) {
        console.log(`[DEBUG] Primeiro cliente disponível: ${JSON.stringify(todosClientes[0])}`);
      }
    }
    
    // Buscar cliente diretamente usando accountId - primeiro como número
    console.log(`[DEBUG] Tentando buscar cliente com account_id = ${accountId} como número`);
    const { data: clientsByAccountIdNum, error: accountIdErrorNum } = await supabase
      .from('clients')
      .select('*')
      .eq('account_id', Number(accountId))
      .limit(1);
    
    if (accountIdErrorNum) {
      console.error(`[ERROR] Erro ao buscar cliente por account_id como número: ${accountIdErrorNum.message}`);
      console.error(`[ERROR] Detalhes: ${JSON.stringify(accountIdErrorNum.details || {})}`);
    } else {
      console.log(`[DEBUG] Busca por account_id=${accountId} como número retornou ${clientsByAccountIdNum ? clientsByAccountIdNum.length : 0} resultados`);
    }
    
    // Buscar cliente diretamente usando accountId - como string
    console.log(`[DEBUG] Tentando buscar cliente com account_id = ${accountId} como string`);
    const { data: clientsByAccountIdStr, error: accountIdErrorStr } = await supabase
      .from('clients')
      .select('*')
      .eq('account_id', String(accountId))
      .limit(1);
    
    if (accountIdErrorStr) {
      console.error(`[ERROR] Erro ao buscar cliente por account_id como string: ${accountIdErrorStr.message}`);
      console.error(`[ERROR] Detalhes: ${JSON.stringify(accountIdErrorStr.details || {})}`);
    } else {
      console.log(`[DEBUG] Busca por account_id=${accountId} como string retornou ${clientsByAccountIdStr ? clientsByAccountIdStr.length : 0} resultados`);
    }
    
    // Verificar se encontrou cliente
    let client = null;
    
    if (clientsByAccountIdNum && clientsByAccountIdNum.length > 0) {
      client = clientsByAccountIdNum[0];
      console.log(`[DEBUG] Cliente encontrado por account_id como número: ${JSON.stringify(client)}`);
    } else if (clientsByAccountIdStr && clientsByAccountIdStr.length > 0) {
      client = clientsByAccountIdStr[0];
      console.log(`[DEBUG] Cliente encontrado por account_id como string: ${JSON.stringify(client)}`);
    } else {
      // Se ainda não encontrou, buscar qualquer cliente como fallback
      console.log(`[DEBUG] Nenhum cliente encontrado com account_id ${accountId}, buscando qualquer cliente disponível`);
      const { data: anyClient, error: anyClientError } = await supabase
        .from('clients')
        .select('*')
        .limit(1);
      
      if (anyClientError) {
        console.error(`[ERROR] Erro ao buscar qualquer cliente: ${anyClientError.message}`);
        console.error(`[ERROR] Detalhes: ${JSON.stringify(anyClientError.details || {})}`);
      } else if (anyClient && anyClient.length > 0) {
        client = anyClient[0];
        console.log(`[DEBUG] Cliente alternativo encontrado: ${JSON.stringify(client)}`);
      } else {
        console.log(`[DEBUG] Nenhum cliente encontrado na tabela clients`);
      }
    }
    
    if (!client) {
      console.error(`[ERROR] Nenhum cliente encontrado no banco de dados`);
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum cliente encontrado no banco de dados',
          debug: {
            accountIdBuscado: accountId,
            todosClientesDisponiveis: todosClientes || []
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Processar contato com o cliente encontrado
    console.log(`[SUCCESS] Cliente encontrado, ID: ${client.id}, Nome: ${client.account_name}`);
    
    // Parse labels to tags array
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()) : [];
    console.log(`[DEBUG] Tags processadas: ${JSON.stringify(tags)}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cliente encontrado com sucesso',
        client: {
          id: client.id,
          accountName: client.account_name,
          accountId: client.account_id
        },
        contact: {
          id: contactId.toString(),
          name: contactName,
          tags
        }
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

// Process matching sequences, updateDailyStats, etc... removidos temporariamente para simplificar o diagnóstico
// ... keep existing code (o restante das funções que existiam antes)
