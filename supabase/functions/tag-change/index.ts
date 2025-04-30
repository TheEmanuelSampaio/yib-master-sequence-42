
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Parse the request body
    const { data } = await req.json();
    
    console.log(`[DEBUG] Payload recebido:`, JSON.stringify(data, null, 2));
    
    if (!data || !data.accountId || !data.accountName || !data.contact || !data.conversation) {
      return new Response(
        JSON.stringify({ error: 'Missing required data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { accountId, accountName } = data;
    const { id: contactId, name: contactName, phoneNumber } = data.contact;
    const { inboxId, conversationId, displayId, labels } = data.conversation;
    
    console.log(`[DEBUG] Processando contato ${contactName} com labels: ${labels}`);
    console.log(`[DEBUG] Account ID: ${accountId}, Account Name: ${accountName}`);
    
    // TENTATIVA DIRETA: Buscar o primeiro cliente disponível sem filtros
    // Isso deve nos mostrar se temos acesso ao banco
    console.log(`[DEBUG] Buscando qualquer cliente disponível (sem filtros)...`);
    const { data: anyClient, error: anyClientError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
      
    if (anyClientError) {
      console.error(`[ERROR] Erro ao buscar clientes: ${anyClientError.message}`);
      console.error(`[ERROR] Código do erro: ${anyClientError.code}`);
      console.error(`[ERROR] Detalhes: ${JSON.stringify(anyClientError.details)}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao acessar a tabela de clientes',
          details: anyClientError.message,
          code: anyClientError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[DEBUG] Total de clientes encontrados (sem filtro): ${anyClient ? anyClient.length : 0}`);
    if (anyClient) {
      console.log(`[DEBUG] Primeiros clientes encontrados: ${JSON.stringify(anyClient.slice(0, 2))}`);
    }
    
    // Tenta buscar cliente pelo account_id
    let client = null;
    
    if (anyClient && anyClient.length > 0) {
      // Filtre manualmente, já que temos os dados
      client = anyClient.find(c => String(c.account_id) === String(accountId));
      
      if (client) {
        console.log(`[DEBUG] Cliente encontrado por account_id = ${accountId}: ${JSON.stringify(client)}`);
      } else {
        console.log(`[DEBUG] Nenhum cliente encontrado com account_id = ${accountId}, usando o primeiro disponível`);
        client = anyClient[0]; // Usa o primeiro cliente como fallback
        console.log(`[DEBUG] Cliente fallback: ${JSON.stringify(client)}`);
      }
    } else {
      console.error(`[ERROR] Nenhum cliente disponível no banco de dados`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum cliente encontrado no banco de dados',
          debug: {
            accountIdBuscado: accountId,
            totalClientesBanco: 0
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Buscar o perfil do criador do cliente
    let creatorProfile = null;
    if (client && client.created_by) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', client.created_by)
        .maybeSingle();
      
      if (!profileError && profile) {
        creatorProfile = profile;
        console.log(`[DEBUG] Perfil do criador encontrado: ${JSON.stringify(profile)}`);
      } else if (profileError) {
        console.log(`[ERROR] Erro ao buscar perfil do criador: ${profileError.message}`);
      }
    }
    
    // Verificar se o contato já existe
    console.log(`[DEBUG] Verificando se o contato ${contactId} já existe`);
    const { data: existingContacts, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId.toString());
    
    if (contactError) {
      console.error(`[ERROR] Erro ao verificar contato: ${contactError.message}`);
      return new Response(
        JSON.stringify({ error: 'Falha ao verificar contato', details: contactError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse labels to tags array
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()) : [];
    console.log(`[DEBUG] Tags processadas: ${JSON.stringify(tags)}`);
    
    // Insert or update contact
    if (!existingContacts || existingContacts.length === 0) {
      // Insert new contact
      console.log(`[DEBUG] Inserindo novo contato: ${contactName}`);
      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          id: contactId.toString(),
          name: contactName,
          phone_number: phoneNumber,
          client_id: client.id,
          inbox_id: inboxId,
          conversation_id: conversationId,
          display_id: displayId
        });
      
      if (insertError) {
        console.error(`[ERROR] Erro ao criar contato: ${insertError.message}`);
        return new Response(
          JSON.stringify({ error: 'Falha ao criar contato', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update daily stats for new contacts
      updateDailyStats(supabase, null, 1, 0, 0);
    } else {
      // Update existing contact
      console.log(`[DEBUG] Atualizando contato existente: ${contactName}`);
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          name: contactName,
          inbox_id: inboxId,
          conversation_id: conversationId,
          display_id: displayId,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId.toString());
      
      if (updateError) {
        console.error(`[ERROR] Erro ao atualizar contato: ${updateError.message}`);
        return new Response(
          JSON.stringify({ error: 'Falha ao atualizar contato', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Delete existing tags for this contact
    console.log(`[DEBUG] Removendo tags existentes para o contato ${contactId}`);
    const { error: deleteTagsError } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId.toString());
    
    if (deleteTagsError) {
      console.error(`[ERROR] Erro ao excluir tags do contato: ${deleteTagsError.message}`);
      // Continue despite error
    }
    
    // Usar o ID do criador do cliente como criador das tags
    let creatorId = null;
    
    if (creatorProfile && creatorProfile.id) {
      creatorId = creatorProfile.id;
      console.log(`[DEBUG] Usando criador do cliente para as tags: ${creatorId}`);
    } else {
      console.log(`[DEBUG] Criador não encontrado, buscando alternativa...`);
      
      // 1. Tentar buscar um admin
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id, account_name, role')
        .eq('role', 'admin')
        .limit(1);
      
      console.log(`[DEBUG] Busca por admin: ${JSON.stringify(adminUsers)}`);
      
      if (!adminError && adminUsers && adminUsers.length > 0) {
        creatorId = adminUsers[0].id;
        console.log(`[DEBUG] Usando admin como criador: ${creatorId}`);
      } else {
        // 2. Buscar qualquer usuário válido
        const { data: anyUser, error: anyUserError } = await supabase
          .from('profiles')
          .select('id, account_name, role')
          .limit(1);
        
        console.log(`[DEBUG] Busca por qualquer usuário: ${JSON.stringify(anyUser)}`);
        
        if (!anyUserError && anyUser && anyUser.length > 0) {
          creatorId = anyUser[0].id;
          console.log(`[DEBUG] Usando usuário alternativo: ${creatorId}`);
        }
      }
    }
    
    if (!creatorId) {
      console.error(`[ERROR] Nenhum usuário válido encontrado para criar tags`);
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível processar tags, nenhum usuário válido encontrado',
          partial_success: true,
          contact: {
            id: contactId.toString(),
            name: contactName,
            tags
          }
        }),
        { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Adicionar tags para o contato e garantir que existam na tabela global de tags
    console.log(`[DEBUG] Processando ${tags.length} tags para o contato`);
    let addedTags = 0;
    let existingTagsCount = 0;
    let tagErrors = 0;
    
    for (const tag of tags) {
      console.log(`[DEBUG] Processando tag: ${tag}`);
      
      try {
        // 1. Inserir em contact_tags (relação contato-tag)
        const { error: insertTagError } = await supabase
          .from('contact_tags')
          .insert({
            contact_id: contactId.toString(),
            tag_name: tag
          });
        
        if (insertTagError && !insertTagError.message.includes('duplicate')) {
          console.error(`[ERROR] Erro ao inserir tag ${tag}: ${insertTagError.message}`);
          tagErrors++;
          // Continue mesmo com erro
        }
        
        // 2. Verificar se a tag existe na tabela global de tags
        const { data: existingTag, error: checkTagError } = await supabase
          .from('tags')
          .select('name')
          .eq('name', tag)
          .maybeSingle();
        
        if (checkTagError) {
          console.error(`[ERROR] Erro ao verificar tag ${tag}: ${checkTagError.message}`);
          tagErrors++;
        }
        
        // 3. Se a tag não existir, adicioná-la à tabela global usando o criador do cliente
        if (!existingTag) {
          console.log(`[DEBUG] Adicionando tag global: ${tag}`);
          
          const { data: insertedTag, error: insertGlobalTagError } = await supabase
            .from('tags')
            .insert({
              name: tag,
              created_by: creatorId
            })
            .select()
            .single();
          
          if (insertGlobalTagError) {
            console.error(`[ERROR] Erro ao inserir tag global ${tag}: ${insertGlobalTagError.message}`);
            tagErrors++;
          } else {
            console.log(`[DEBUG] Tag global adicionada: ${JSON.stringify(insertedTag)}`);
            addedTags++;
          }
        } else {
          console.log(`[DEBUG] Tag já existe globalmente: ${tag}`);
          existingTagsCount++;
        }
      } catch (tagError) {
        console.error(`[ERROR] Erro não tratado na tag ${tag}: ${tagError}`);
        tagErrors++;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contato processado com sucesso',
        stats: {
          tagsAdded: addedTags,
          existingTags: existingTagsCount,
          tagErrors
        },
        client: {
          id: client.id,
          accountName: client.account_name,
          accountId: client.account_id,
          requestedAccountId: accountId,
          isExactMatch: String(client.account_id) === String(accountId)
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

// Update daily stats
async function updateDailyStats(supabase, instanceId, newContacts = 0, messagesScheduled = 0, completedSequences = 0) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // If instanceId is null, update stats for all instances
    if (instanceId === null) {
      if (newContacts > 0 || messagesScheduled > 0 || completedSequences > 0) {
        const { data: instances } = await supabase
          .from('instances')
          .select('id')
          .eq('active', true);
        
        if (instances && instances.length > 0) {
          for (const instance of instances) {
            await updateStatsForInstance(supabase, instance.id, today, newContacts, messagesScheduled, completedSequences);
          }
        }
      }
    } else {
      // Update stats for specific instance
      await updateStatsForInstance(supabase, instanceId, today, newContacts, messagesScheduled, completedSequences);
    }
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

// Update stats for a specific instance
async function updateStatsForInstance(supabase, instanceId, date, newContacts, messagesScheduled, completedSequences) {
  // Check if entry exists for today
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('instance_id', instanceId)
    .eq('date', date)
    .maybeSingle();
  
  if (existing) {
    // Update existing entry
    await supabase
      .from('daily_stats')
      .update({
        new_contacts: existing.new_contacts + newContacts,
        messages_scheduled: existing.messages_scheduled + messagesScheduled,
        completed_sequences: existing.completed_sequences + completedSequences
      })
      .eq('id', existing.id);
  } else {
    // Create new entry
    await supabase
      .from('daily_stats')
      .insert({
        instance_id: instanceId,
        date,
        new_contacts: newContacts,
        messages_scheduled: messagesScheduled,
        completed_sequences: completedSequences
      });
  }
}
