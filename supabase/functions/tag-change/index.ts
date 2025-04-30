
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
    
    // Se ainda não encontrou o cliente, criar um novo
    if (!client) {
      console.log(`[QUERY] Cliente não encontrado, criando novo cliente...`);
      
      const { data: newClient, error: createError } = await supabase
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
      
      if (createError) {
        console.error(`[QUERY] Erro ao criar cliente: ${createError.message}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar cliente', 
            details: createError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      client = newClient[0];
      console.log(`[QUERY] Novo cliente criado: ${JSON.stringify(client)}`);
    }
    
    // Parse labels to tags array
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];
    console.log(`[DEBUG] Tags processadas: ${JSON.stringify(tags)}`);
    
    // Verificar se já existe um contato para esse número e account_id
    console.log(`[CONTACT] Verificando se contato ${phoneNumber} já existe para a conta ${client.id}...`);
    const { data: existingContacts, error: contactQueryError } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('client_id', client.id);
    
    if (contactQueryError) {
      console.error(`[CONTACT] Erro ao buscar contato: ${contactQueryError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar contato', 
          details: contactQueryError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let contact = null;
    
    // Criar ou atualizar contato
    if (!existingContacts || existingContacts.length === 0) {
      console.log(`[CONTACT] Contato não encontrado para essa conta, criando novo contato...`);
      
      const { data: newContact, error: createContactError } = await supabase
        .from('contacts')
        .insert([
          {
            id: `${client.id}:${String(contactId)}`, // ID único combinando cliente e ID do contato
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
      
      contact = newContact[0];
      console.log(`[CONTACT] Contato criado com sucesso: ${JSON.stringify(contact)}`);
    } else {
      contact = existingContacts[0];
      console.log(`[CONTACT] Contato já existe para essa conta: ${JSON.stringify(contact)}`);
      
      // Atualizar informações do contato se necessário
      const { error: updateContactError } = await supabase
        .from('contacts')
        .update({
          name: contactName,
          conversation_id: conversationId,
          display_id: displayId,
          inbox_id: inboxId
        })
        .eq('id', contact.id);
      
      if (updateContactError) {
        console.error(`[CONTACT] Erro ao atualizar contato: ${updateContactError.message}`);
      } else {
        console.log(`[CONTACT] Informações do contato atualizadas com sucesso`);
      }
    }
    
    // Estatísticas para o payload de resposta
    let tagsAdded = 0;
    let existingTags = 0;
    let tagErrors = 0;
    
    // 1. Verificar se as tags existem e criar as que não existem
    if (tags.length > 0) {
      console.log(`[TAGS] Processando ${tags.length} tags...`);
      
      for (const tagName of tags) {
        // Verificar se a tag já existe para este created_by
        const { data: existingTag, error: tagQueryError } = await supabase
          .from('tags')
          .select('*')
          .eq('name', tagName)
          .eq('created_by', client.created_by);
        
        if (tagQueryError) {
          console.error(`[TAGS] Erro ao verificar tag ${tagName}: ${tagQueryError.message}`);
          tagErrors++;
          continue;
        }
        
        // Se a tag não existe, criá-la
        if (!existingTag || existingTag.length === 0) {
          console.log(`[TAGS] Tag ${tagName} não encontrada para o cliente, criando...`);
          
          try {
            // Verificar se a tag com o mesmo nome já existe para outro created_by
            // Para evitar erro de chave duplicada, precisamos fazer um select com count
            const { count, error: countError } = await supabase
              .from('tags')
              .select('*', { count: 'exact', head: true })
              .eq('name', tagName);
            
            if (countError) {
              console.error(`[TAGS] Erro ao verificar existência global da tag ${tagName}: ${countError.message}`);
              tagErrors++;
              continue;
            }
            
            // Se a tag não existe globalmente, podemos criar normalmente
            if (count === 0) {
              const { error: createTagError } = await supabase
                .from('tags')
                .insert([
                  {
                    name: tagName,
                    created_by: client.created_by
                  }
                ]);
              
              if (createTagError) {
                console.error(`[TAGS] Erro ao criar tag ${tagName}: ${createTagError.message}`);
                tagErrors++;
              } else {
                console.log(`[TAGS] Tag ${tagName} criada com sucesso para o cliente`);
                tagsAdded++;
              }
            } else {
              // Se a tag já existe no sistema para outro usuário, tentamos inserir com a função RPC
              // IMPORTANTE: Agora passando os parâmetros na ordem correta
              const { error: upsertError } = await supabase.rpc('insert_tag_if_not_exists_for_user', {
                p_name: tagName,
                p_created_by: client.created_by
              });
              
              if (upsertError) {
                console.error(`[TAGS] Erro ao inserir tag com RPC ${tagName}: ${upsertError.message}`);
                tagErrors++;
              } else {
                console.log(`[TAGS] Tag ${tagName} criada/verificada via RPC com sucesso`);
                tagsAdded++;
              }
            }
          } catch (err) {
            console.error(`[TAGS] Erro não tratado ao criar tag ${tagName}: ${err.message}`);
            tagErrors++;
          }
        } else {
          console.log(`[TAGS] Tag ${tagName} já existe para o cliente`);
          existingTags++;
        }
      }
    }
    
    // Atualizar tags do contato
    if (tags.length > 0) {
      console.log(`[TAGS] Atualizando tags do contato...`);
      
      // Primeiro remover tags existentes
      const { error: deleteTagsError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contact.id);
      
      if (deleteTagsError) {
        console.error(`[TAGS] Erro ao remover tags existentes: ${deleteTagsError.message}`);
        tagErrors++;
      }
      
      // Inserir novas tags
      const tagInserts = tags.map(tag => ({
        contact_id: contact.id,
        tag_name: tag
      }));
      
      const { error: insertTagsError } = await supabase
        .from('contact_tags')
        .insert(tagInserts);
      
      if (insertTagsError) {
        console.error(`[TAGS] Erro ao inserir novas tags: ${insertTagsError.message}`);
        tagErrors++;
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
          id: contact.id,
          name: contact.name,
          tags
        },
        stats: {
          tagsAdded,
          existingTags,
          tagErrors
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
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
