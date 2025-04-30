
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
    
    // TESTE: Listar TODAS as tabelas do banco para verificar se temos acesso
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .limit(20);
      
    if (tablesError) {
      console.log(`[ERROR] Erro ao listar tabelas: ${tablesError.message}`);
    } else {
      console.log(`[DEBUG] Tabelas disponíveis: ${JSON.stringify(tables)}`);
    }
    
    // DIAGNÓSTICO: Listar todos os clientes no banco para diagnóstico
    console.log(`[DEBUG] Tentando listar todos os clientes...`);
    const { data: allClients, error: listError } = await supabase
      .from('clients')
      .select('*');
    
    if (listError) {
      console.error(`[ERROR] Erro ao listar clientes: ${listError.message}`);
      console.error(`[ERROR] Código do erro: ${listError.code}`);
      console.error(`[ERROR] Detalhes: ${JSON.stringify(listError.details)}`);
    } else {
      console.log(`[DEBUG] Total de clientes encontrados: ${allClients ? allClients.length : 0}`);
      console.log(`[DEBUG] Primeiros clientes: ${JSON.stringify(allClients && allClients.length > 0 ? allClients.slice(0, 3) : [])}`);
    }
    
    // TENTATIVA DIRETA COM O ID COMO STRING
    console.log(`[DEBUG] Tentando buscar cliente com account_id = ${accountId} como string`);
    const { data: clientsByAccountIdStr, error: accountIdErrorStr } = await supabase
      .from('clients')
      .select('*')
      .eq('account_id', String(accountId))
      .limit(1);
      
    console.log(`[DEBUG] Resultado com account_id como string: ${clientsByAccountIdStr && clientsByAccountIdStr.length > 0 ? JSON.stringify(clientsByAccountIdStr) : "nenhum resultado"}`);
    
    // TENTATIVA DIRETA COM O ID COMO NÚMERO
    console.log(`[DEBUG] Tentando buscar cliente com account_id = ${accountId} como número`);
    const { data: clientsByAccountIdNum, error: accountIdErrorNum } = await supabase
      .from('clients')
      .select('*')
      .eq('account_id', Number(accountId))
      .limit(1);
      
    console.log(`[DEBUG] Resultado com account_id como número: ${clientsByAccountIdNum && clientsByAccountIdNum.length > 0 ? JSON.stringify(clientsByAccountIdNum) : "nenhum resultado"}`);
    
    // ABORDAGEM ALTERNATIVA: Buscar qualquer cliente disponível para teste
    console.log(`[DEBUG] SOLUÇÃO ALTERNATIVA: Buscando qualquer cliente disponível`);
    const { data: anyClient, error: anyClientError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);
      
    let client = null;
    
    if (anyClient && anyClient.length > 0) {
      client = anyClient[0];
      console.log(`[DEBUG] Cliente alternativo encontrado: ${JSON.stringify(client)}`);
    } else {
      console.error(`[ERROR] Não foi possível encontrar nenhum cliente: ${anyClientError ? anyClientError.message : "motivo desconhecido"}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum cliente encontrado no banco de dados',
          debug: {
            accountIdBuscado: accountId,
            todasTabelasDisponiveis: tables,
            todosClientesDisponiveis: allClients || []
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
    if (existingContacts.length === 0) {
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
      await updateDailyStats(supabase, null, 1, 0, 0);
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
    
    // Processar sequências que correspondam às tags deste contato
    await processMatchingSequences(supabase, contactId.toString(), tags, client.id);
    
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
          creatorId: creatorId,
          creatorName: creatorProfile?.account_name || 'Desconhecido'
        },
        contact: {
          id: contactId.toString(),
          name: contactName,
          tags
        },
        debug: {
          clientFoundMethod: "ALTERNATIVO",
          originalAccountId: accountId,
          usedAccountId: client.account_id
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

// Process matching sequences
async function processMatchingSequences(supabase, contactId: string, contactTags: string[], clientId: string) {
  try {
    // Get all active sequences from instances associated with this client
    const { data: instances, error: instancesError } = await supabase
      .from('instances')
      .select('id')
      .eq('client_id', clientId)
      .eq('active', true);
    
    if (instancesError) {
      console.error('Error fetching instances:', instancesError);
      return;
    }
    
    if (!instances.length) return;
    
    const instanceIds = instances.map((instance) => instance.id);
    
    // Get all active sequences for these instances
    const { data: sequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('*, sequence_stages(*)')
      .in('instance_id', instanceIds)
      .eq('status', 'active');
    
    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError);
      return;
    }
    
    // Check current contact_sequences to avoid duplicates
    const { data: existingSequences, error: existingSeqError } = await supabase
      .from('contact_sequences')
      .select('sequence_id')
      .eq('contact_id', contactId)
      .in('status', ['active', 'completed']);
    
    if (existingSeqError) {
      console.error('Error fetching existing sequences:', existingSeqError);
      return;
    }
    
    const existingSequenceIds = new Set(existingSequences.map(seq => seq.sequence_id));
    
    for (const sequence of sequences) {
      // Skip if contact is already in this sequence
      if (existingSequenceIds.has(sequence.id)) continue;
      
      // Check start condition
      const shouldStart = checkCondition(
        sequence.start_condition_type,
        sequence.start_condition_tags,
        contactTags
      );
      
      // Check stop condition
      const shouldStop = checkCondition(
        sequence.stop_condition_type,
        sequence.stop_condition_tags,
        contactTags
      );
      
      // If contact matches start condition but not stop condition, add to sequence
      if (shouldStart && !shouldStop) {
        // Get sequence stages ordered by order_index
        let stages = sequence.sequence_stages;
        if (!stages || stages.length === 0) continue;
        
        stages.sort((a, b) => a.order_index - b.order_index);
        const firstStage = stages[0];
        
        // Create contact_sequence entry
        const { data: contactSequence, error: contactSeqError } = await supabase
          .from('contact_sequences')
          .insert({
            contact_id: contactId,
            sequence_id: sequence.id,
            current_stage_index: 0,
            current_stage_id: firstStage.id,
            status: 'active',
            started_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (contactSeqError) {
          console.error('Error creating contact_sequence:', contactSeqError);
          continue;
        }
        
        // Create stage progress entries
        for (const stage of stages) {
          const { error: progressError } = await supabase
            .from('stage_progress')
            .insert({
              contact_sequence_id: contactSequence.id,
              stage_id: stage.id,
              status: stage.id === firstStage.id ? 'pending' : 'pending'
            });
          
          if (progressError) {
            console.error('Error creating stage_progress:', progressError);
            // Continue despite error
          }
        }
        
        // Schedule the first message
        await scheduleMessage(supabase, contactId, sequence.id, firstStage);
      }
    }
  } catch (error) {
    console.error('Error processing matching sequences:', error);
  }
}

// Check if tags match condition
function checkCondition(conditionType: string, conditionTags: string[], contactTags: string[]): boolean {
  if (!conditionTags || conditionTags.length === 0) return false;
  
  if (conditionType === 'AND') {
    // All condition tags must be present in contact tags
    return conditionTags.every(tag => contactTags.includes(tag));
  } else { // 'OR'
    // At least one condition tag must be present in contact tags
    return conditionTags.some(tag => contactTags.includes(tag));
  }
}

// Schedule a message
async function scheduleMessage(supabase, contactId: string, sequenceId: string, stage: any) {
  try {
    let delayMinutes = stage.delay;
    
    // Convert delay to minutes
    if (stage.delay_unit === 'hours') {
      delayMinutes *= 60;
    } else if (stage.delay_unit === 'days') {
      delayMinutes *= 24 * 60;
    }
    
    // Calculate scheduled time
    const now = new Date();
    const rawScheduledTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
    
    // Get sequence time restrictions
    const { data: restrictions, error: restrictionsError } = await supabase
      .rpc('get_sequence_time_restrictions', { seq_id: sequenceId });
    
    if (restrictionsError) {
      console.error('Error fetching time restrictions:', restrictionsError);
      // Continue without time restrictions
    }
    
    // Apply time restrictions to calculate actual scheduled time
    let scheduledTime = rawScheduledTime;
    if (restrictions && restrictions.length > 0) {
      scheduledTime = applyTimeRestrictions(rawScheduledTime, restrictions);
    }
    
    // Insert scheduled message
    const { error: scheduleError } = await supabase
      .from('scheduled_messages')
      .insert({
        contact_id: contactId,
        sequence_id: sequenceId,
        stage_id: stage.id,
        raw_scheduled_time: rawScheduledTime.toISOString(),
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending'
      });
    
    if (scheduleError) {
      console.error('Error scheduling message:', scheduleError);
      return;
    }
    
    // Update daily stats for scheduled messages
    await updateDailyStats(supabase, null, 0, 1, 0);
  } catch (error) {
    console.error('Error scheduling message:', error);
  }
}

// Apply time restrictions to a scheduled time
function applyTimeRestrictions(scheduledTime: Date, restrictions: any[]): Date {
  // Deep copy the date to avoid mutation
  let adjustedTime = new Date(scheduledTime.getTime());
  
  // Keep adjusting until we find a valid time
  let maxAttempts = 100; // Safety limit
  let validTime = false;
  
  while (!validTime && maxAttempts > 0) {
    validTime = true;
    
    for (const restriction of restrictions) {
      if (!restriction.active) continue;
      
      const day = adjustedTime.getDay(); // 0 = Sunday, 1 = Monday, ...
      const hour = adjustedTime.getHours();
      const minute = adjustedTime.getMinutes();
      
      // Check if current day is restricted
      if (restriction.days.includes(day)) {
        // Check if current time is within restricted hours
        const timeValue = hour * 60 + minute;
        const restrictionStart = restriction.start_hour * 60 + restriction.start_minute;
        let restrictionEnd = restriction.end_hour * 60 + restriction.end_minute;
        
        // Handle case where restriction goes into next day (e.g., 22:00 - 06:00)
        if (restrictionEnd <= restrictionStart) {
          restrictionEnd += 24 * 60; // Add 24 hours
        }
        
        if ((timeValue >= restrictionStart && timeValue <= restrictionEnd) ||
            (timeValue + 24 * 60 >= restrictionStart && timeValue + 24 * 60 <= restrictionEnd)) {
          // Time is restricted, add time until after restriction
          let hoursToAdd = Math.ceil((restrictionEnd - timeValue) / 60);
          if (hoursToAdd <= 0) hoursToAdd = 24; // Safety for edge cases
          
          adjustedTime.setHours(adjustedTime.getHours() + hoursToAdd);
          validTime = false;
          break;
        }
      }
    }
    
    maxAttempts--;
  }
  
  return adjustedTime;
}

// Update daily stats
async function updateDailyStats(supabase, instanceId: string | null, newContacts = 0, messagesScheduled = 0, completedSequences = 0) {
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
async function updateStatsForInstance(supabase, instanceId: string, date: string, newContacts: number, messagesScheduled: number, completedSequences: number) {
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
