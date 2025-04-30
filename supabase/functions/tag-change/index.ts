
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
    const { accountData, contactData, conversationData } = jsonData;
    
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
            }
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
    
    // Buscar cliente com account_id
    console.log(`[2. CLIENTE] Verificando cliente para accountId=${accountId}, accountName="${accountName}"`);
    
    // Tentar como número primeiro
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('account_id', Number(accountId))
      .limit(1);
    
    if (clientError) {
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
      const { data: clientDataStr, error: clientErrorStr } = await supabase
        .from('clients')
        .select('*')
        .eq('account_id', String(accountId))
        .limit(1);
      
      if (clientErrorStr) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao buscar cliente como string', 
            details: clientErrorStr.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (clientDataStr && clientDataStr.length > 0) {
        client = clientDataStr[0];
      }
    } else {
      client = clientData[0];
    }
    
    // Se ainda não encontrou o cliente, criar um novo
    let creatorId = 'bacc7854-def1-4928-99c6-51b716de46b0'; // Default creator ID
    
    if (!client) {
      console.log('[2. CLIENTE] Cliente não encontrado, criando um novo...');
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert([
          { 
            account_id: accountId, 
            account_name: accountName, 
            created_by: creatorId, // Use um UUID válido aqui
            creator_account_name: 'Sistema (Auto)'
          }
        ])
        .select();
      
      if (createError) {
        console.error(`[2. CLIENTE] Erro ao criar cliente: ${JSON.stringify(createError)}`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar cliente', 
            details: createError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      client = newClient[0];
    }
    
    // Parse labels to tags array
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];
    
    // Verificar se já existe um contato para esse número e account_id
    const { data: existingContacts, error: contactQueryError } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('client_id', client.id);
    
    if (contactQueryError) {
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
      const contactUniqueId = `${client.id}:${String(contactId)}`;
      console.log(`[3. CONTATO] Criando novo contato: ${contactUniqueId}`);
      
      const { data: newContact, error: createContactError } = await supabase
        .from('contacts')
        .insert([
          {
            id: contactUniqueId, // ID único combinando cliente e ID do contato
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
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar contato', 
            details: createContactError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      contact = newContact[0];
      
      // Increment daily stats for new contact
      try {
        await supabase.rpc('increment_daily_stats', { 
          instance_id: null, 
          stat_date: new Date().toISOString().split('T')[0],
          new_contacts: 1 
        });
      } catch (statsError) {
        console.error(`[ESTATÍSTICAS] Erro ao incrementar estatísticas: ${JSON.stringify(statsError)}`);
      }
    } else {
      contact = existingContacts[0];
      console.log(`[3. CONTATO] Contato existente encontrado: ${contact.id}`);
      
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
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao atualizar contato', 
            details: updateContactError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Estatísticas para o payload de resposta
    let tagsAdded = 0;
    let existingTags = 0;
    let tagErrors = 0;
    
    // 1. Verificar se as tags existem e criar as que não existem
    if (tags.length > 0) {
      console.log(`[4. TAGS] Processando ${tags.length} tags...`);
      for (const tagName of tags) {
        // Verificar se a tag já existe
        const { data: existingTag, error: tagQueryError } = await supabase
          .from('tags')
          .select('*')
          .eq('name', tagName)
          .eq('created_by', client.created_by);
        
        if (tagQueryError) {
          console.error(`[4. TAGS] Erro ao consultar tag ${tagName}: ${JSON.stringify(tagQueryError)}`);
          tagErrors++;
          continue;
        }
        
        // Se a tag não existe, criá-la
        if (!existingTag || existingTag.length === 0) {
          try {
            console.log(`[4. TAGS] Criando nova tag: ${tagName} (criador: ${client.created_by})`);
            // Inserir tag usando a função RPC com os parâmetros na ordem correta
            const { error: upsertError } = await supabase.rpc('insert_tag_if_not_exists_for_user', {
              p_name: tagName,
              p_created_by: client.created_by
            });
            
            if (upsertError) {
              console.error(`[4. TAGS] Erro ao criar tag ${tagName}: ${JSON.stringify(upsertError)}`);
              tagErrors++;
              continue;
            } else {
              tagsAdded++;
            }
          } catch (err) {
            console.error(`[4. TAGS] Exceção ao criar tag ${tagName}: ${JSON.stringify(err)}`);
            tagErrors++;
            continue;
          }
        } else {
          console.log(`[4. TAGS] Tag já existente: ${tagName}`);
          existingTags++;
        }
      }
    }
    
    // Atualizar tags do contato
    if (tags.length > 0) {
      console.log(`[4. TAGS] Atualizando tags do contato: ${contact.id}`);
      // Primeiro remover tags existentes
      const { error: deleteTagsError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contact.id);
      
      if (deleteTagsError) {
        console.error(`[4. TAGS] Erro ao remover tags existentes: ${JSON.stringify(deleteTagsError)}`);
        tagErrors++;
      }
      
      // Inserir novas tags
      const tagInserts = tags.map(tag => ({
        contact_id: contact.id,
        tag_name: tag
      }));
      
      if (tagInserts.length > 0) {
        console.log(`[4. TAGS] Inserindo ${tagInserts.length} novas tags para o contato`);
        const { error: insertTagsError } = await supabase
          .from('contact_tags')
          .insert(tagInserts);
        
        if (insertTagsError) {
          console.error(`[4. TAGS] Erro ao inserir novas tags: ${JSON.stringify(insertTagsError)}`);
          tagErrors++;
        } else {
          console.log(`[4. TAGS] Tags adicionadas com sucesso`);
        }
      }
    }
    
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
          tagsAdded,
          existingTags,
          tagErrors
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
