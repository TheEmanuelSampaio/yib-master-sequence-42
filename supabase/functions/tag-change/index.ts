
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
    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    // Check if data is wrapped in a data object or directly in the body
    const data = requestBody.data || requestBody;
    
    if (!data || !data.accountId || !data.accountName || !data.contact || !data.conversation) {
      console.error('Missing required data:', JSON.stringify(data, null, 2));
      return new Response(
        JSON.stringify({ error: 'Missing required data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { accountId, accountName } = data;
    const { id: contactId, name: contactName, phoneNumber } = data.contact;
    const { inboxId, conversationId, displayId, labels } = data.conversation;
    
    console.log(`Processing contact ${contactName} with labels: ${labels}`);
    
    // **VERIFICAÇÃO DO CLIENTE**
    // Primeiro, busca diretamente pelo id na tabela clients
    console.log(`Consultando cliente com id = ${accountId}`);
    const { data: clientsById, error: idError } = await supabase
      .from('clients')
      .select('id, account_id, account_name, created_by')
      .eq('id', accountId)
      .maybeSingle();
    
    console.log('Resultado da consulta por id:', JSON.stringify(clientsById || 'nenhum resultado', null, 2));
    console.log('Erro na consulta por id:', idError?.message || 'Nenhum erro');
    
    // Se não encontrou pelo id, tenta pelo account_id
    let client = clientsById;
    if (!client) {
      console.log(`Tentando encontrar cliente com account_id = ${accountId}`);
      const { data: clientsByAccountId, error: accountIdError } = await supabase
        .from('clients')
        .select('id, account_id, account_name, created_by')
        .eq('account_id', accountId)
        .maybeSingle();
      
      console.log('Resultado da consulta por account_id:', JSON.stringify(clientsByAccountId || 'nenhum resultado', null, 2));
      console.log('Erro na consulta por account_id:', accountIdError?.message || 'Nenhum erro');
      
      client = clientsByAccountId;
    }

    // Verificação final se o cliente foi encontrado
    if (!client) {
      // Buscar todos os clientes para depuração
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, account_id, account_name')
        .limit(10);
      
      console.log('Primeiros 10 clientes no banco de dados:', JSON.stringify(allClients || [], null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: 'Cliente não encontrado com o ID fornecido',
          details: {
            tentou_id: accountId,
            tentou_account_id: accountId,
            clientes_disponiveis: allClients
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Cliente encontrado:', JSON.stringify(client, null, 2));
    
    // **VERIFICAÇÃO DO CRIADOR**
    // Buscar o perfil do criador
    const creatorId = client.created_by;
    console.log(`Buscando perfil do criador com ID: ${creatorId}`);
    
    const { data: creatorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, account_name, role')
      .eq('id', creatorId)
      .maybeSingle();
    
    if (profileError) {
      console.log('Erro ao buscar perfil do criador:', profileError);
    } else {
      console.log('Perfil do criador encontrado:', JSON.stringify(creatorProfile, null, 2));
    }
    
    // Se não encontrar um perfil de criador válido, procurar um usuário alternativo
    let finalCreatorId = creatorId;
    let creatorName = creatorProfile?.account_name || 'Desconhecido';
    
    if (!creatorProfile) {
      console.log('Perfil do criador não encontrado, buscando usuário alternativo...');
      
      // Tentar encontrar um usuário admin
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id, account_name')
        .eq('role', 'admin')
        .limit(1);
      
      if (!adminError && adminUsers && adminUsers.length > 0) {
        finalCreatorId = adminUsers[0].id;
        creatorName = adminUsers[0].account_name;
        console.log(`Usando admin como criador alternativo, ID: ${finalCreatorId}, Nome: ${creatorName}`);
      } else {
        // Se não encontrar admin, usar qualquer usuário
        const { data: anyUser, error: anyUserError } = await supabase
          .from('profiles')
          .select('id, account_name')
          .limit(1);
        
        if (!anyUserError && anyUser && anyUser.length > 0) {
          finalCreatorId = anyUser[0].id;
          creatorName = anyUser[0].account_name;
          console.log(`Usando primeiro usuário disponível como criador, ID: ${finalCreatorId}, Nome: ${creatorName}`);
        }
      }
    }
    
    // Verificação final do criador
    if (!finalCreatorId) {
      console.error('Não foi possível encontrar um usuário válido para criar tags.');
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum usuário válido encontrado para criar tags',
          partial_success: true,
          contact: {
            id: contactId.toString(),
            name: contactName
          }
        }),
        { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // **VERIFICAÇÃO DO CONTATO**
    // Verificar se o contato já existe
    const { data: existingContacts, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId.toString());
    
    if (contactError) {
      console.error('Erro ao verificar contato:', contactError);
      return new Response(
        JSON.stringify({ error: 'Falha ao verificar contato', details: contactError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Converter labels para array de tags
    const tags = labels ? labels.split(',').map((tag: string) => tag.trim()) : [];
    console.log(`Tags convertidas: ${JSON.stringify(tags)}`);
    
    // Inserir ou atualizar contato
    if (existingContacts.length === 0) {
      // Inserir novo contato
      console.log('Inserindo novo contato:', { 
        id: contactId.toString(), 
        name: contactName,
        client_id: client.id 
      });
      
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
        console.error('Erro ao criar contato:', insertError);
        return new Response(
          JSON.stringify({ error: 'Falha ao criar contato', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Atualizar estatísticas diárias para novos contatos
      await updateDailyStats(supabase, null, 1, 0, 0);
    } else {
      // Atualizar contato existente
      console.log('Atualizando contato existente:', contactId.toString());
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
        console.error('Erro ao atualizar contato:', updateError);
        return new Response(
          JSON.stringify({ error: 'Falha ao atualizar contato', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Excluir tags existentes para este contato
    const { error: deleteTagsError } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId.toString());
    
    if (deleteTagsError) {
      console.error('Erro ao excluir tags do contato:', deleteTagsError);
      // Continuar mesmo com o erro
    }
    
    // Adicionar tags para o contato
    let addedTags = 0;
    let existingTagsCount = 0;
    let tagErrors = 0;
    
    for (const tag of tags) {
      console.log(`Processando tag: ${tag}`);
      
      try {
        // Adicionar relação entre contato e tag
        const { error: insertTagError } = await supabase
          .from('contact_tags')
          .insert({
            contact_id: contactId.toString(),
            tag_name: tag
          });
        
        if (insertTagError && !insertTagError.message.includes('duplicate')) {
          console.error(`Erro ao adicionar tag ${tag} ao contato:`, insertTagError);
          tagErrors++;
          // Continuar mesmo com o erro
        }
        
        // Verificar se a tag existe na tabela global de tags
        console.log(`Verificando se a tag "${tag}" existe na tabela global`);
        const { data: existingTag, error: checkTagError } = await supabase
          .from('tags')
          .select('name')
          .eq('name', tag)
          .maybeSingle();
        
        if (checkTagError) {
          console.error(`Erro ao verificar tag ${tag}:`, checkTagError);
          tagErrors++;
        }
        
        // Se a tag não existe, adicionar
        if (!existingTag) {
          console.log(`Tag "${tag}" não encontrada na tabela global, adicionando...`);
          
          const { data: insertedTag, error: insertGlobalTagError } = await supabase
            .from('tags')
            .insert({
              name: tag,
              created_by: finalCreatorId
            })
            .select()
            .single();
          
          if (insertGlobalTagError) {
            console.error(`Erro ao adicionar tag ${tag} à tabela global:`, insertGlobalTagError);
            tagErrors++;
          } else {
            console.log(`Tag "${tag}" adicionada com sucesso à tabela global:`, JSON.stringify(insertedTag));
            addedTags++;
          }
        } else {
          console.log(`Tag "${tag}" já existe na tabela global`);
          existingTagsCount++;
        }
      } catch (tagError) {
        console.error(`Erro inesperado ao processar tag ${tag}:`, tagError);
        tagErrors++;
      }
    }
    
    // Processar sequências correspondentes
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
          account_id: client.account_id,
          accountName: client.account_name,
          creatorId: finalCreatorId,
          creatorName
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
    console.error('Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Processar sequências correspondentes
async function processMatchingSequences(supabase, contactId: string, contactTags: string[], clientId: string) {
  try {
    // Obter todas as instâncias ativas associadas a este cliente
    const { data: instances, error: instancesError } = await supabase
      .from('instances')
      .select('id')
      .eq('client_id', clientId)
      .eq('active', true);
    
    if (instancesError) {
      console.error('Erro ao buscar instâncias:', instancesError);
      return;
    }
    
    if (!instances.length) return;
    
    const instanceIds = instances.map((instance) => instance.id);
    
    // Obter todas as sequências ativas para estas instâncias
    const { data: sequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('*, sequence_stages(*)')
      .in('instance_id', instanceIds)
      .eq('status', 'active');
    
    if (sequencesError) {
      console.error('Erro ao buscar sequências:', sequencesError);
      return;
    }
    
    // Verificar sequências atuais do contato para evitar duplicatas
    const { data: existingSequences, error: existingSeqError } = await supabase
      .from('contact_sequences')
      .select('sequence_id')
      .eq('contact_id', contactId)
      .in('status', ['active', 'completed']);
    
    if (existingSeqError) {
      console.error('Erro ao buscar sequências existentes:', existingSeqError);
      return;
    }
    
    const existingSequenceIds = new Set(existingSequences.map(seq => seq.sequence_id));
    
    for (const sequence of sequences) {
      // Pular se o contato já está nesta sequência
      if (existingSequenceIds.has(sequence.id)) continue;
      
      // Verificar condição de início
      const shouldStart = checkCondition(
        sequence.start_condition_type,
        sequence.start_condition_tags,
        contactTags
      );
      
      // Verificar condição de parada
      const shouldStop = checkCondition(
        sequence.stop_condition_type,
        sequence.stop_condition_tags,
        contactTags
      );
      
      // Se o contato corresponde à condição de início mas não à condição de parada, adicionar à sequência
      if (shouldStart && !shouldStop) {
        // Obter estágios da sequência ordenados por order_index
        let stages = sequence.sequence_stages;
        if (!stages || stages.length === 0) continue;
        
        stages.sort((a, b) => a.order_index - b.order_index);
        const firstStage = stages[0];
        
        // Criar entrada contact_sequence
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
          console.error('Erro ao criar contact_sequence:', contactSeqError);
          continue;
        }
        
        // Criar entradas de progresso de estágio
        for (const stage of stages) {
          const { error: progressError } = await supabase
            .from('stage_progress')
            .insert({
              contact_sequence_id: contactSequence.id,
              stage_id: stage.id,
              status: stage.id === firstStage.id ? 'pending' : 'pending'
            });
          
          if (progressError) {
            console.error('Erro ao criar stage_progress:', progressError);
            // Continuar apesar do erro
          }
        }
        
        // Agendar a primeira mensagem
        await scheduleMessage(supabase, contactId, sequence.id, firstStage);
      }
    }
  } catch (error) {
    console.error('Erro ao processar sequências correspondentes:', error);
  }
}

// Verificar se tags correspondem à condição
function checkCondition(conditionType: string, conditionTags: string[], contactTags: string[]): boolean {
  if (!conditionTags || conditionTags.length === 0) return false;
  
  if (conditionType === 'AND') {
    // Todas as tags de condição devem estar presentes nas tags do contato
    return conditionTags.every(tag => contactTags.includes(tag));
  } else { // 'OR'
    // Pelo menos uma tag de condição deve estar presente nas tags do contato
    return conditionTags.some(tag => contactTags.includes(tag));
  }
}

// Agendar uma mensagem
async function scheduleMessage(supabase, contactId: string, sequenceId: string, stage: any) {
  try {
    let delayMinutes = stage.delay;
    
    // Converter atraso para minutos
    if (stage.delay_unit === 'hours') {
      delayMinutes *= 60;
    } else if (stage.delay_unit === 'days') {
      delayMinutes *= 24 * 60;
    }
    
    // Calcular horário agendado
    const now = new Date();
    const rawScheduledTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
    
    // Obter restrições de tempo da sequência
    const { data: restrictions, error: restrictionsError } = await supabase
      .rpc('get_sequence_time_restrictions', { seq_id: sequenceId });
    
    if (restrictionsError) {
      console.error('Erro ao buscar restrições de tempo:', restrictionsError);
      // Continuar sem restrições de tempo
    }
    
    // Aplicar restrições de tempo para calcular o horário agendado real
    let scheduledTime = rawScheduledTime;
    if (restrictions && restrictions.length > 0) {
      scheduledTime = applyTimeRestrictions(rawScheduledTime, restrictions);
    }
    
    // Inserir mensagem agendada
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
      console.error('Erro ao agendar mensagem:', scheduleError);
      return;
    }
    
    // Atualizar estatísticas diárias para mensagens agendadas
    await updateDailyStats(supabase, null, 0, 1, 0);
  } catch (error) {
    console.error('Erro ao agendar mensagem:', error);
  }
}

// Aplicar restrições de tempo a um horário agendado
function applyTimeRestrictions(scheduledTime: Date, restrictions: any[]): Date {
  // Deep copy da data para evitar mutação
  let adjustedTime = new Date(scheduledTime.getTime());
  
  // Continuar ajustando até encontrar um horário válido
  let maxAttempts = 100; // Limite de segurança
  let validTime = false;
  
  while (!validTime && maxAttempts > 0) {
    validTime = true;
    
    for (const restriction of restrictions) {
      if (!restriction.active) continue;
      
      const day = adjustedTime.getDay(); // 0 = Domingo, 1 = Segunda, ...
      const hour = adjustedTime.getHours();
      const minute = adjustedTime.getMinutes();
      
      // Verificar se o dia atual está restrito
      if (restriction.days.includes(day)) {
        // Verificar se o horário atual está dentro das horas restritas
        const timeValue = hour * 60 + minute;
        const restrictionStart = restriction.start_hour * 60 + restriction.start_minute;
        let restrictionEnd = restriction.end_hour * 60 + restriction.end_minute;
        
        // Lidar com o caso em que a restrição vai até o dia seguinte (por exemplo, 22:00 - 06:00)
        if (restrictionEnd <= restrictionStart) {
          restrictionEnd += 24 * 60; // Adicionar 24 horas
        }
        
        if ((timeValue >= restrictionStart && timeValue <= restrictionEnd) ||
            (timeValue + 24 * 60 >= restrictionStart && timeValue + 24 * 60 <= restrictionEnd)) {
          // Horário está restrito, adicionar horas até após a restrição
          let hoursToAdd = Math.ceil((restrictionEnd - timeValue) / 60);
          if (hoursToAdd <= 0) hoursToAdd = 24; // Segurança para casos limítrofes
          
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

// Atualizar estatísticas diárias
async function updateDailyStats(supabase, instanceId: string | null, newContacts = 0, messagesScheduled = 0, completedSequences = 0) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Se instanceId for nulo, atualizar estatísticas para todas as instâncias
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
      // Atualizar estatísticas para uma instância específica
      await updateStatsForInstance(supabase, instanceId, today, newContacts, messagesScheduled, completedSequences);
    }
  } catch (error) {
    console.error('Erro ao atualizar estatísticas diárias:', error);
  }
}

// Atualizar estatísticas para uma instância específica
async function updateStatsForInstance(supabase, instanceId: string, date: string, newContacts: number, messagesScheduled: number, completedSequences: number) {
  // Verificar se existe uma entrada para hoje
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('instance_id', instanceId)
    .eq('date', date)
    .maybeSingle();
  
  if (existing) {
    // Atualizar entrada existente
    await supabase
      .from('daily_stats')
      .update({
        new_contacts: existing.new_contacts + newContacts,
        messages_scheduled: existing.messages_scheduled + messagesScheduled,
        completed_sequences: existing.completed_sequences + completedSequences
      })
      .eq('id', existing.id);
  } else {
    // Criar nova entrada
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
