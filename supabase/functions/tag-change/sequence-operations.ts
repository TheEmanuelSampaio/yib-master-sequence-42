import { corsHeaders } from '../_shared/cors.ts';

/**
 * Verifica se o contato deve ser adicionado a alguma sequência com base nas tags do contato
 * e nas condições das sequências ativas.
 * 
 * @param supabase Cliente Supabase para operações de banco de dados
 * @param clientId ID do cliente associado ao contato
 * @param contactId ID do contato que será verificado
 * @param tags Array de tags associadas ao contato
 */
export async function processSequences(
  supabase: any,
  clientId: string, 
  contactId: string, 
  tags: string[]
) {
  console.log(`[5. SEQUÊNCIAS] Iniciando verificação de sequências para contato ${contactId} com tags: ${tags.join(', ')}`);
  
  if (!tags || tags.length === 0) {
    console.log(`[5. SEQUÊNCIAS] Contato não tem tags, pulando verificação de sequências`);
    return {
      success: true,
      sequencesProcessed: 0,
      sequencesAdded: 0,
      sequencesSkipped: 0
    };
  }
  
  // Buscar instâncias ativas para este cliente
  const { data: instances, error: instancesError } = await supabase
    .from('instances')
    .select('*')
    .eq('client_id', clientId)
    .eq('active', true);
  
  if (instancesError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao buscar instâncias: ${JSON.stringify(instancesError)}`);
    return {
      success: false,
      error: 'Erro ao buscar instâncias',
      details: instancesError.message
    };
  }
  
  if (!instances || instances.length === 0) {
    console.log(`[5. SEQUÊNCIAS] Nenhuma instância ativa encontrada para o cliente ${clientId}`);
    return {
      success: true,
      sequencesProcessed: 0,
      sequencesAdded: 0,
      sequencesSkipped: 0
    };
  }
  
  console.log(`[5. SEQUÊNCIAS] Encontradas ${instances.length} instâncias ativas`);
  let sequencesProcessed = 0;
  let sequencesAdded = 0;
  let sequencesSkipped = 0;
  
  // Para cada instância, verificar sequências
  for (const instance of instances) {
    // Buscar sequências ativas para esta instância
    const { data: sequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('*, sequence_condition_groups(*, sequence_condition_tags(*))')
      .eq('instance_id', instance.id)
      .eq('status', 'active');
    
    if (sequencesError) {
      console.error(`[5. SEQUÊNCIAS] Erro ao buscar sequências para instância ${instance.name}: ${JSON.stringify(sequencesError)}`);
      continue;
    }
    
    if (!sequences || sequences.length === 0) {
      console.log(`[5. SEQUÊNCIAS] Nenhuma sequência ativa encontrada para instância ${instance.name}`);
      continue;
    }
    
    console.log(`[5. SEQUÊNCIAS] Encontradas ${sequences.length} sequências ativas para instância ${instance.name}`);
    
    // Para cada sequência, verificar se o contato atende às condições
    for (const sequence of sequences) {
      sequencesProcessed++;
      try {
        // Verificar se o contato já está em alguma sequência ativa ou pausada
        const { data: existingActiveContactSequence, error: existingActiveError } = await supabase
          .from('contact_sequences')
          .select('*')
          .eq('contact_id', contactId)
          .eq('sequence_id', sequence.id)
          .in('status', ['active', 'paused'])
          .limit(1);
        
        if (existingActiveError) {
          console.error(`[5. SEQUÊNCIAS] Erro ao verificar se contato já está na sequência: ${JSON.stringify(existingActiveError)}`);
          continue;
        }
        
        if (existingActiveContactSequence && existingActiveContactSequence.length > 0) {
          console.log(`[5. SEQUÊNCIAS] Contato já está na sequência ${sequence.name}, status: ${existingActiveContactSequence[0].status}`);
          sequencesSkipped++;
          continue;
        }
        
        // Verificar se o contato atende às condições de início da sequência
        let matchesStartCondition = false;
        
        // Se a sequência usa condições avançadas, use a lógica avançada
        if (sequence.use_advanced_start_condition) {
          matchesStartCondition = checkAdvancedCondition(tags, sequence, 'start');
        } else {
          // Caso contrário, use a lógica simples
          matchesStartCondition = checkCondition(tags, sequence.start_condition_tags, sequence.start_condition_type);
        }
        
        console.log(`[5. SEQUÊNCIAS] Verificando condição de início para sequência ${sequence.name}: ${matchesStartCondition ? 'ATENDE' : 'NÃO ATENDE'}`);
        
        // Verificar condições de parada da sequência
        let matchesStopCondition = false;
        
        // Se a sequência usa condições avançadas de parada, use a lógica avançada
        if (sequence.use_advanced_stop_condition) {
          matchesStopCondition = checkAdvancedCondition(tags, sequence, 'stop');
        } else {
          // Caso contrário, use a lógica simples
          matchesStopCondition = checkCondition(tags, sequence.stop_condition_tags, sequence.stop_condition_type);
        }
        
        console.log(`[5. SEQUÊNCIAS] Verificando condição de parada para sequência ${sequence.name}: ${matchesStopCondition ? 'ATENDE' : 'NÃO ATENDE'}`);
        
        // Se atende à condição de início e não atende à condição de parada, adicionar à sequência
        if (matchesStartCondition && !matchesStopCondition) {
          // Buscar o primeiro estágio da sequência
          const { data: stages, error: stagesError } = await supabase
            .from('sequence_stages')
            .select('*')
            .eq('sequence_id', sequence.id)
            .order('order_index', { ascending: true })
            .limit(1);
          
          if (stagesError || !stages || stages.length === 0) {
            console.error(`[5. SEQUÊNCIAS] Erro ao buscar estágios da sequência ou nenhum estágio encontrado: ${JSON.stringify(stagesError || 'Nenhum estágio')}`);
            continue;
          }
          
          const firstStage = stages[0];
          const now = new Date().toISOString();
          let contactSequenceId = '';
          
          // Criar uma nova entrada para o contato na sequência
          const { data: newContactSequence, error: insertError } = await supabase
            .from('contact_sequences')
            .insert([{
              contact_id: contactId,
              sequence_id: sequence.id,
              current_stage_index: 0,
              current_stage_id: firstStage.id,
              status: 'active',
              started_at: now
            }])
            .select();
          
          if (insertError) {
            console.error(`[5. SEQUÊNCIAS] Erro ao adicionar contato à sequência: ${JSON.stringify(insertError)}`);
            continue;
          }
          
          console.log(`[5. SEQUÊNCIAS] Contato adicionado com sucesso à sequência ${sequence.name}!`);
          contactSequenceId = newContactSequence[0].id;
          sequencesAdded++;
          
          // Adicionar registro de progresso do estágio
          const { error: progressError } = await supabase
            .from('stage_progress')
            .insert([{
              contact_sequence_id: contactSequenceId,
              stage_id: firstStage.id,
              status: 'pending'
            }]);
          
          if (progressError) {
            console.error(`[5. SEQUÊNCIAS] Erro ao adicionar progresso do estágio: ${JSON.stringify(progressError)}`);
            continue;
          }
          
          // Calcular o tempo de agendamento da mensagem
          const delayMs = calculateDelayMs(firstStage.delay, firstStage.delay_unit);
          const scheduledTime = new Date(Date.now() + delayMs);
          
          // Agendar a mensagem para o primeiro estágio
          const { error: scheduleError } = await supabase
            .from('scheduled_messages')
            .insert([{
              contact_id: contactId,
              sequence_id: sequence.id,
              stage_id: firstStage.id,
              raw_scheduled_time: scheduledTime.toISOString(),
              scheduled_time: scheduledTime.toISOString(),
              status: 'pending'
            }]);
          
          if (scheduleError) {
            console.error(`[5. SEQUÊNCIAS] Erro ao agendar mensagem: ${JSON.stringify(scheduleError)}`);
            continue;
          }
          
          console.log(`[5. SEQUÊNCIAS] Mensagem agendada com sucesso para ${scheduledTime.toISOString()}`);
          
          // Incrementar estatísticas diárias
          try {
            const today = new Date().toISOString().split('T')[0];
            
            // Verificar se já existe um registro para este dia e instância
            const { data: existingStats } = await supabase
              .from('daily_stats')
              .select('*')
              .eq('instance_id', instance.id)
              .eq('date', today)
              .maybeSingle();
            
            if (existingStats) {
              // Se existe, fazer update
              await supabase
                .from('daily_stats')
                .update({
                  messages_scheduled: existingStats.messages_scheduled + 1
                })
                .eq('id', existingStats.id);
            } else {
              // Se não existe, criar um novo
              await supabase
                .from('daily_stats')
                .insert([{
                  instance_id: instance.id,
                  date: today,
                  messages_scheduled: 1,
                  messages_sent: 0,
                  messages_failed: 0,
                  completed_sequences: 0,
                  new_contacts: 0
                }]);
            }
          } catch (statsError) {
            console.error(`[ESTATÍSTICAS] Erro ao incrementar estatísticas: ${JSON.stringify(statsError)}`);
          }
        } else {
          console.log(`[5. SEQUÊNCIAS] Contato não adicionado à sequência ${sequence.name}: não atende às condições necessárias`);
          sequencesSkipped++;
        }
      } catch (error) {
        console.error(`[5. SEQUÊNCIAS] Erro ao processar sequência ${sequence.name}: ${JSON.stringify(error)}`);
        sequencesSkipped++;
      }
    }
  }
  
  return {
    success: true,
    sequencesProcessed,
    sequencesAdded,
    sequencesSkipped
  };
}

/**
 * Verifica se as tags do contato atendem a condições avançadas (com grupos)
 * 
 * @param contactTags Tags do contato
 * @param sequence Sequência com grupos de condição
 * @param conditionType Tipo de condição ('start' ou 'stop')
 * @returns boolean Retorna true se as tags do contato atendem às condições
 */
function checkAdvancedCondition(contactTags: string[], sequence: any, conditionType: 'start' | 'stop'): boolean {
  // Verificar se há grupos de condição
  if (!sequence.sequence_condition_groups || sequence.sequence_condition_groups.length === 0) {
    console.log(`[CONDIÇÃO-AVANÇADA] Nenhum grupo de condição encontrado para ${conditionType}`);
    return false;
  }
  
  // Filtrar os grupos pelo tipo (start ou stop)
  const conditionGroups = sequence.sequence_condition_groups.filter((group: any) => group.type === conditionType);
  
  if (conditionGroups.length === 0) {
    console.log(`[CONDIÇÃO-AVANÇADA] Nenhum grupo de condição do tipo ${conditionType} encontrado`);
    return false;
  }
  
  // Ordenar os grupos por índice
  conditionGroups.sort((a: any, b: any) => a.group_index - b.group_index);
  
  // Obter o operador principal (AND/OR) entre os grupos
  const conditionOperator = conditionGroups[0].condition_operator;
  console.log(`[CONDIÇÃO-AVANÇADA] Operador entre grupos: ${conditionOperator}`);
  
  // Avaliar cada grupo
  const groupResults = conditionGroups.map((group: any) => {
    // Obter as tags deste grupo
    const groupTags = group.sequence_condition_tags.map((tagObj: any) => tagObj.tag_name);
    
    // Obter o operador do grupo (AND/OR)
    const groupOperator = group.group_operator;
    
    // Avaliar este grupo com suas tags
    const groupResult = checkCondition(contactTags, groupTags, groupOperator);
    console.log(`[CONDIÇÃO-AVANÇADA] Grupo ${group.group_index} (${groupOperator}): ${groupResult ? 'ATENDE' : 'NÃO ATENDE'}`);
    
    return groupResult;
  });
  
  // Aplicar o operador principal aos resultados dos grupos
  if (conditionOperator === 'AND') {
    // Todos os grupos devem ser true
    const result = groupResults.every(result => result === true);
    console.log(`[CONDIÇÃO-AVANÇADA] Resultado final (AND): ${result ? 'ATENDE' : 'NÃO ATENDE'}`);
    return result;
  } else {
    // Pelo menos um grupo deve ser true
    const result = groupResults.some(result => result === true);
    console.log(`[CONDIÇÃO-AVANÇADA] Resultado final (OR): ${result ? 'ATENDE' : 'NÃO ATENDE'}`);
    return result;
  }
}

/**
 * Verifica se as tags do contato atendem a uma condição (AND/OR)
 */
function checkCondition(contactTags: string[], conditionTags: string[], conditionType: string): boolean {
  if (!conditionTags || conditionTags.length === 0) {
    return false;
  }
  
  if (conditionType === 'AND') {
    // Todas as tags da condição devem existir nas tags do contato
    return conditionTags.every(tag => contactTags.includes(tag));
  } else if (conditionType === 'OR') {
    // Ao menos uma tag da condição deve existir nas tags do contato
    return conditionTags.some(tag => contactTags.includes(tag));
  }
  
  return false;
}

/**
 * Calcula o atraso em milissegundos com base na unidade (minutes, hours, days)
 */
function calculateDelayMs(delay: number, unit: string): number {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  switch (unit) {
    case 'minutes':
      return delay * minute;
    case 'hours':
      return delay * hour;
    case 'days':
      return delay * day;
    default:
      return delay * minute; // Fallback para minutos
  }
}
