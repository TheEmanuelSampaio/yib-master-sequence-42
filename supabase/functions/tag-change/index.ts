
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("[INIT] Inicializando função tag-change");

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verificar se é POST e analisar o corpo da requisição
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse do body
    const body = await req.text();
    console.log(`[REQUEST] Body recebido: ${body}`);
    
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

    // Extrair dados relevantes
    const { chatwootData } = jsonData.body || jsonData;
    
    if (!chatwootData) {
      console.error(`[VALIDATE] Dados do Chatwoot ausentes`);
      return new Response(
        JSON.stringify({ error: 'Dados do Chatwoot ausentes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { accountData, contactData, conversationData } = chatwootData;
    
    if (!accountData || !contactData || !conversationData) {
      console.error(`[VALIDATE] Dados incompletos no payload:`, JSON.stringify({
        temAccountData: !!accountData,
        temContactData: !!contactData,
        temConversationData: !!conversationData
      }));
      return new Response(
        JSON.stringify({ error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados do contato
    const { id: contactId, name, phoneNumber } = contactData;
    const { inboxId, conversationId, displayId, labels: labelsString } = conversationData;
    const { accountId, accountName } = accountData;

    console.log(`[CONTACT] Processando contato: ${contactId}, ${name}, ${phoneNumber}, tags: ${labelsString}`);

    // Verificar se já existe um cliente para essa conta Chatwoot
    console.log(`[CLIENT] Verificando cliente para conta ${accountId} (${accountName})`);
    let { data: existingClient, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle();

    if (clientError) {
      console.error(`[CLIENT] Erro ao buscar cliente: ${clientError.message}`);
    }

    if (!existingClient) {
      // Criar cliente se não existir
      const { data: createdClient, error: createError } = await supabase
        .from('clients')
        .insert({
          account_id: accountId,
          account_name: accountName,
          created_by: '00000000-0000-0000-0000-000000000000', // Sistema
          creator_account_name: 'Sistema'
        })
        .select('id')
        .single();

      if (createError) {
        console.error(`[CLIENT] Erro ao criar cliente: ${createError.message}`);
        throw createError;
      }

      existingClient = createdClient;
      console.log(`[CLIENT] Cliente criado com ID: ${existingClient.id}`);
    } else {
      console.log(`[CLIENT] Cliente encontrado com ID: ${existingClient.id}`);
    }

    // Verificar se o contato já existe
    console.log(`[CONTACT] Verificando contato ${contactId}`);
    const { data: existingContact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId.toString())
      .maybeSingle();

    if (contactError) {
      console.error(`[CONTACT] Erro ao buscar contato: ${contactError.message}`);
    }

    // Criar ou atualizar contato
    if (!existingContact) {
      // Criar contato
      const { error: createContactError } = await supabase
        .from('contacts')
        .insert({
          id: contactId.toString(),
          name,
          phone_number: phoneNumber,
          inbox_id: inboxId,
          conversation_id: conversationId,
          display_id: displayId,
          client_id: existingClient.id
        });

      if (createContactError) {
        console.error(`[CONTACT] Erro ao criar contato: ${createContactError.message}`);
        throw createContactError;
      }

      console.log(`[CONTACT] Contato criado: ${contactId}`);

      // Incrementar contadores de estatísticas
      const today = new Date().toISOString().split('T')[0];
      
      // Buscar todas as instâncias do cliente
      const { data: instances } = await supabase
        .from('instances')
        .select('id')
        .eq('client_id', existingClient.id);
        
      if (instances && instances.length > 0) {
        for (const instance of instances) {
          const { error: statsError } = await supabase.rpc('increment_daily_stats', {
            instance_id: instance.id,
            stat_date: today,
            completed_seqs: 0,
            msgs_sent: 0,
            msgs_failed: 0,
            msgs_scheduled: 0,
            new_contacts: 1
          });
          
          if (statsError) {
            console.error(`[STATS] Erro ao atualizar estatísticas: ${statsError.message}`);
          }
        }
      }
    } else {
      // Atualizar contato se necessário
      const { error: updateContactError } = await supabase
        .from('contacts')
        .update({
          name,
          phone_number: phoneNumber,
          inbox_id: inboxId,
          conversation_id: conversationId,
          display_id: displayId
        })
        .eq('id', contactId.toString());

      if (updateContactError) {
        console.error(`[CONTACT] Erro ao atualizar contato: ${updateContactError.message}`);
        throw updateContactError;
      }

      console.log(`[CONTACT] Contato atualizado: ${contactId}`);
    }

    // Processar tags (labels)
    console.log(`[TAGS] Processando tags: ${labelsString}`);
    const tags = labelsString ? labelsString.split(',').map(tag => tag.trim()) : [];
    
    // Buscar todas as tags atuais do contato
    const { data: existingTags, error: tagsError } = await supabase
      .from('contact_tags')
      .select('tag_name')
      .eq('contact_id', contactId.toString());
      
    if (tagsError) {
      console.error(`[TAGS] Erro ao buscar tags existentes: ${tagsError.message}`);
    }
    
    const currentTags = existingTags ? existingTags.map(t => t.tag_name) : [];
    console.log(`[TAGS] Tags atuais: ${JSON.stringify(currentTags)}`);
    console.log(`[TAGS] Novas tags: ${JSON.stringify(tags)}`);
    
    // Tags a serem adicionadas (estão na nova lista mas não na atual)
    const tagsToAdd = tags.filter(tag => !currentTags.includes(tag));
    console.log(`[TAGS] Tags a adicionar: ${JSON.stringify(tagsToAdd)}`);
    
    // Tags a serem removidas (estão na lista atual mas não na nova)
    const tagsToRemove = currentTags.filter(tag => !tags.includes(tag));
    console.log(`[TAGS] Tags a remover: ${JSON.stringify(tagsToRemove)}`);
    
    // Adicionar novas tags
    const tagInsertPromises = [];
    for (const tag of tagsToAdd) {
      if (!tag) continue;
      
      try {
        // Verificar se a tag existe no sistema e criar se necessário
        try {
          // Use RPC function para inserir tag se não existir
          const { error: rpcError } = await supabase.rpc('insert_tag_if_not_exists_for_user', {
            p_name: tag,
            p_created_by: '00000000-0000-0000-0000-000000000000' // Sistema
          });
          
          if (rpcError) {
            console.error(`[TAGS] Erro ao inserir tag com RPC ${tag}: ${rpcError.message}`);
            // Continuar mesmo com erro, já que a tag pode já existir
          }
        } catch (error) {
          console.error(`[TAGS] Erro na execução de RPC para tag ${tag}: ${error.message}`);
          // Continuar mesmo com erro
        }
        
        // Adicionar a tag ao contato
        const { error: tagContactError } = await supabase
          .from('contact_tags')
          .insert({
            contact_id: contactId.toString(),
            tag_name: tag
          });
        
        if (tagContactError) {
          if (tagContactError.code === '23505') { // Unique violation
            console.log(`[TAGS] Tag ${tag} já associada ao contato ${contactId}`);
          } else {
            console.error(`[TAGS] Erro ao associar tag ${tag} ao contato: ${tagContactError.message}`);
          }
        } else {
          console.log(`[TAGS] Tag ${tag} adicionada ao contato ${contactId}`);
        }
      } catch (error) {
        console.error(`[TAGS] Erro geral ao processar tag ${tag}: ${error.message}`);
      }
    }
    
    // Remover tags que não estão mais presentes
    if (tagsToRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId.toString())
        .in('tag_name', tagsToRemove);
      
      if (removeError) {
        console.error(`[TAGS] Erro ao remover tags do contato: ${removeError.message}`);
      } else {
        console.log(`[TAGS] ${tagsToRemove.length} tags removidas do contato ${contactId}`);
      }
    }

    // Verificar e processar sequências
    console.log(`[SEQUENCES] Verificando sequências elegíveis para o contato ${contactId}`);
    
    // Buscar todas as instâncias ativas do cliente
    const { data: activeInstances, error: instanceError } = await supabase
      .from('instances')
      .select('id, name')
      .eq('client_id', existingClient.id)
      .eq('active', true);
      
    if (instanceError) {
      console.error(`[INSTANCES] Erro ao buscar instâncias: ${instanceError.message}`);
      throw instanceError;
    }
    
    console.log(`[INSTANCES] Encontradas ${activeInstances?.length || 0} instâncias ativas`);
    
    if (!activeInstances || activeInstances.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Contato processado com sucesso, mas nenhuma instância ativa encontrada.',
          details: {
            contactId,
            tagsAdded: tagsToAdd.length,
            tagsRemoved: tagsToRemove.length
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Para cada instância, verificar sequências elegíveis
    let totalEligibleSequences = 0;
    let totalAddedSequences = 0;
    let totalRemovedSequences = 0;
    
    for (const instance of activeInstances) {
      console.log(`[INSTANCE] Processando instância ${instance.id} (${instance.name})`);
      
      // Buscar sequências ativas da instância
      const { data: activeSequences, error: sequencesError } = await supabase
        .from('sequences')
        .select('*')
        .eq('instance_id', instance.id)
        .eq('status', 'active');
        
      if (sequencesError) {
        console.error(`[SEQUENCES] Erro ao buscar sequências: ${sequencesError.message}`);
        continue;
      }
      
      console.log(`[SEQUENCES] Encontradas ${activeSequences?.length || 0} sequências ativas para instância ${instance.name}`);
      
      if (!activeSequences || activeSequences.length === 0) {
        continue;
      }
      
      // Para cada sequência, verificar elegibilidade com base nas tags
      for (const sequence of activeSequences) {
        console.log(`[SEQUENCE] Verificando elegibilidade para sequência ${sequence.id} (${sequence.name})`);
        
        // Verificação de condição de início
        const { start_condition_type, start_condition_tags } = sequence;
        console.log(`[SEQUENCE] Condição de início: ${start_condition_type}, tags: ${JSON.stringify(start_condition_tags)}`);
        
        let isEligible = false;
        
        // Verificar condição de início
        if (start_condition_type === 'AND') {
          // Todos os tags devem estar presentes
          isEligible = start_condition_tags.every(tag => tags.includes(tag));
          console.log(`[SEQUENCE] Verificação AND - ${isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}`);
        } else {
          // Qualquer uma das tags deve estar presente
          isEligible = start_condition_tags.some(tag => tags.includes(tag));
          console.log(`[SEQUENCE] Verificação OR - ${isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}`);
        }
        
        if (isEligible) {
          totalEligibleSequences++;
          console.log(`[SEQUENCE] Contato ${contactId} é elegível para sequência ${sequence.name}`);
          
          // Verificar se o contato já está na sequência
          const { data: existingContactSequence, error: contactSeqError } = await supabase
            .from('contact_sequences')
            .select('id, status')
            .eq('contact_id', contactId.toString())
            .eq('sequence_id', sequence.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (contactSeqError) {
            console.error(`[SEQUENCE] Erro ao verificar se contato já está na sequência: ${contactSeqError.message}`);
            continue;
          }
          
          // Se o contato já está ativo nesta sequência, pular
          if (existingContactSequence && existingContactSequence.status === 'active') {
            console.log(`[SEQUENCE] Contato ${contactId} já está ativo na sequência ${sequence.name}`);
            continue;
          }
          
          // Verificar condição de parada
          const { stop_condition_type, stop_condition_tags } = sequence;
          console.log(`[SEQUENCE] Condição de parada: ${stop_condition_type}, tags: ${JSON.stringify(stop_condition_tags)}`);
          
          if (stop_condition_tags && stop_condition_tags.length > 0) {
            let shouldStop = false;
            
            if (stop_condition_type === 'AND') {
              // Todos os tags de parada devem estar presentes
              shouldStop = stop_condition_tags.every(tag => tags.includes(tag));
            } else {
              // Qualquer uma das tags de parada deve estar presente
              shouldStop = stop_condition_tags.some(tag => tags.includes(tag));
            }
            
            if (shouldStop) {
              console.log(`[SEQUENCE] Contato ${contactId} atende condição de parada para sequência ${sequence.name}`);
              
              // Se o contato estiver em uma sequência inativa ou concluída, não temos que fazer nada
              if (existingContactSequence && existingContactSequence.status !== 'active') {
                console.log(`[SEQUENCE] Contato já está em estado não-ativo (${existingContactSequence.status}) na sequência`);
                continue;
              }
              
              // Se o contato estiver ativo na sequência, remover
              if (existingContactSequence) {
                const { error: removeError } = await supabase
                  .from('contact_sequences')
                  .update({
                    status: 'removed',
                    removed_at: new Date().toISOString()
                  })
                  .eq('id', existingContactSequence.id);
                  
                if (removeError) {
                  console.error(`[SEQUENCE] Erro ao remover contato da sequência: ${removeError.message}`);
                } else {
                  console.log(`[SEQUENCE] Contato ${contactId} removido da sequência ${sequence.name}`);
                  totalRemovedSequences++;
                }
              }
              
              continue;
            }
          }
          
          // Se o contato já concluiu ou foi removido da sequência, não adicionar novamente
          if (existingContactSequence && 
              (existingContactSequence.status === 'completed' || existingContactSequence.status === 'removed')) {
            console.log(`[SEQUENCE] Contato ${contactId} já esteve na sequência ${sequence.name} (status: ${existingContactSequence.status})`);
            continue;
          }
          
          // Adicionar contato à sequência
          try {
            // Buscar o primeiro estágio da sequência
            const { data: firstStage, error: stageError } = await supabase
              .from('sequence_stages')
              .select('*')
              .eq('sequence_id', sequence.id)
              .order('order_index', { ascending: true })
              .limit(1)
              .single();
              
            if (stageError) {
              console.error(`[STAGE] Erro ao buscar primeiro estágio da sequência: ${stageError.message}`);
              continue;
            }
            
            if (!firstStage) {
              console.error(`[STAGE] Nenhum estágio encontrado para a sequência ${sequence.name}`);
              continue;
            }
            
            console.log(`[STAGE] Primeiro estágio encontrado: ${firstStage.id} (${firstStage.name})`);
            
            // Criar registro na tabela contact_sequences
            const { data: contactSequence, error: createSeqError } = await supabase
              .from('contact_sequences')
              .insert({
                contact_id: contactId.toString(),
                sequence_id: sequence.id,
                current_stage_index: 0,
                current_stage_id: firstStage.id,
                status: 'active'
              })
              .select('id')
              .single();
              
            if (createSeqError) {
              console.error(`[SEQUENCE] Erro ao adicionar contato à sequência: ${createSeqError.message}`);
              continue;
            }
            
            console.log(`[SEQUENCE] Contato ${contactId} adicionado à sequência ${sequence.name}`);
            totalAddedSequences++;
            
            // Criar registro de progresso para o primeiro estágio
            const { error: progressError } = await supabase
              .from('stage_progress')
              .insert({
                contact_sequence_id: contactSequence.id,
                stage_id: firstStage.id,
                status: 'pending'
              });
              
            if (progressError) {
              console.error(`[PROGRESS] Erro ao criar registro de progresso: ${progressError.message}`);
            }
            
            // Calcular o tempo para o primeiro envio
            console.log(`[SCHEDULE] Calculando tempo para primeiro envio do estágio ${firstStage.name}`);
            const now = new Date();
            let scheduledTime = new Date(now);
            
            // Adicionar o delay do estágio
            switch (firstStage.delay_unit) {
              case 'minutes':
                scheduledTime.setMinutes(scheduledTime.getMinutes() + firstStage.delay);
                break;
              case 'hours':
                scheduledTime.setHours(scheduledTime.getHours() + firstStage.delay);
                break;
              case 'days':
                scheduledTime.setDate(scheduledTime.getDate() + firstStage.delay);
                break;
              default:
                scheduledTime.setMinutes(scheduledTime.getMinutes() + firstStage.delay);
            }
            
            const rawScheduledTime = new Date(scheduledTime);
            console.log(`[SCHEDULE] Tempo inicial calculado: ${scheduledTime.toISOString()}`);
            
            // Verificar restrições de horário
            // Aqui deveríamos ajustar o scheduledTime com base nas restrições
            // Por simplicidade, vamos pular esta etapa no exemplo
            
            // Criar mensagem agendada
            const { error: scheduleError } = await supabase
              .from('scheduled_messages')
              .insert({
                contact_id: contactId.toString(),
                sequence_id: sequence.id,
                stage_id: firstStage.id,
                raw_scheduled_time: rawScheduledTime.toISOString(),
                scheduled_time: scheduledTime.toISOString(),
                status: 'pending'
              });
              
            if (scheduleError) {
              console.error(`[SCHEDULE] Erro ao agendar mensagem: ${scheduleError.message}`);
            } else {
              console.log(`[SCHEDULE] Mensagem agendada para ${scheduledTime.toISOString()}`);
              
              // Incrementar contadores de estatísticas
              const today = new Date().toISOString().split('T')[0];
              
              const { error: statsError } = await supabase.rpc('increment_daily_stats', {
                instance_id: instance.id,
                stat_date: today,
                completed_seqs: 0,
                msgs_sent: 0,
                msgs_failed: 0,
                msgs_scheduled: 1,
                new_contacts: 0
              });
              
              if (statsError) {
                console.error(`[STATS] Erro ao atualizar estatísticas: ${statsError.message}`);
              }
            }
          } catch (error) {
            console.error(`[CRITICAL] Erro ao processar adição à sequência: ${error.message}`);
          }
        } else {
          console.log(`[SEQUENCE] Contato ${contactId} NÃO é elegível para sequência ${sequence.name}`);
          
          // Se o contato está na sequência mas não atende mais os critérios, verificar se deve ser removido
          const { data: existingContactSequence, error: contactSeqError } = await supabase
            .from('contact_sequences')
            .select('id, status')
            .eq('contact_id', contactId.toString())
            .eq('sequence_id', sequence.id)
            .eq('status', 'active')
            .maybeSingle();
            
          if (contactSeqError) {
            console.error(`[SEQUENCE] Erro ao verificar se contato está na sequência: ${contactSeqError.message}`);
            continue;
          }
          
          if (existingContactSequence) {
            console.log(`[SEQUENCE] Contato ${contactId} está na sequência ${sequence.name} mas não atende mais os critérios`);
            
            // Aqui você pode decidir se deseja remover o contato da sequência
            // Por padrão, estamos deixando ele continuar na sequência mesmo que não atenda mais os critérios iniciais
          }
        }
      }
    }

    // Responder com sucesso e estatísticas
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contato e tags processados com sucesso',
        details: {
          contactId,
          clientId: existingClient.id,
          tagsAdded: tagsToAdd.length,
          tagsRemoved: tagsToRemove.length,
          eligibleSequences: totalEligibleSequences,
          addedToSequences: totalAddedSequences,
          removedFromSequences: totalRemovedSequences
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[CRITICAL] Erro não tratado: ${error.message}`);
    console.error(error.stack);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
