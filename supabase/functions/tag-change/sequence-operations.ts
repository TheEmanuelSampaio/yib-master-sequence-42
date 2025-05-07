
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Processa o conteúdo de uma mensagem substituindo as variáveis
 * 
 * @param content Conteúdo original da mensagem
 * @param variables Objeto com as variáveis e seus valores
 * @param type Tipo da sequência (message, pattern, typebot)
 * @returns O conteúdo processado com as variáveis substituídas
 */
function processVariables(content: string, variables: Record<string, string> | undefined, type: string): string {
  console.log(`[VARIÁVEIS] Processando variáveis para conteúdo do tipo ${type}`);
  console.log(`[VARIÁVEIS] Conteúdo original: ${content}`);
  
  if (!variables || Object.keys(variables).length === 0) {
    console.log('[VARIÁVEIS] Nenhuma variável recebida, retornando conteúdo original');
    return content;
  }
  
  if (type === 'typebot') {
    // Para typebot, mantemos o conteúdo original para o estágio
    // e adicionamos as variáveis ao payload que será enviado ao typebot
    const typebotContent = JSON.stringify({
      stage: content,
      variables: variables
    });
    console.log(`[VARIÁVEIS] Conteúdo typebot processado: ${typebotContent}`);
    return typebotContent;
  } else {
    // Para message e pattern, substituímos as variáveis no texto
    let processedContent = content;
    const variablePattern = /\{([^}]+)\}/g;
    let hasSubstitutions = false;
    
    // Encontrar todas as ocorrências de {variable} e substituir
    processedContent = processedContent.replace(variablePattern, (match, variableName) => {
      if (variables && variables[variableName] !== undefined) {
        hasSubstitutions = true;
        console.log(`[VARIÁVEIS] Substituindo {${variableName}} por "${variables[variableName]}"`);
        return variables[variableName];
      }
      
      console.log(`[VARIÁVEIS] Variável {${variableName}} não encontrada no payload, substituindo por string vazia`);
      hasSubstitutions = true;
      return ''; // Retorna string vazia quando a variável não existe
    });
    
    if (hasSubstitutions) {
      console.log(`[VARIÁVEIS] Conteúdo após substituição: ${processedContent}`);
    } else {
      console.log('[VARIÁVEIS] Nenhuma substituição realizada');
    }
    
    return processedContent;
  }
}

/**
 * Verifica se o contato deve ser adicionado a alguma sequência com base nas tags do contato
 * e nas condições das sequências ativas.
 * 
 * @param supabase Cliente Supabase para operações de banco de dados
 * @param clientId ID do cliente associado ao contato
 * @param contactId ID do contato que será verificado
 * @param tags Array de tags associadas ao contato
 * @param variables Objeto opcional com variáveis para substituição nos textos
 */
export async function processSequences(
  supabase: any,
  clientId: string, 
  contactId: string, 
  tags: string[],
  variables?: Record<string, string>
) {
  console.log(`[5. SEQUÊNCIAS] Iniciando verificação de sequências para contato ${contactId} com tags: ${tags.join(', ')}`);
  
  if (variables && Object.keys(variables).length > 0) {
    console.log(`[5. SEQUÊNCIAS] Variáveis recebidas: ${JSON.stringify(variables)}`);
  } else {
    console.log(`[5. SEQUÊNCIAS] Sem variáveis recebidas`);
  }
  
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
      .select('*')
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
        
        // Verificar condições de início da sequência
        const matchesStartCondition = checkCondition(tags, sequence.start_condition_tags, sequence.start_condition_type);
        console.log(`[5. SEQUÊNCIAS] Verificando condição de início para sequência ${sequence.name}: ${matchesStartCondition ? 'ATENDE' : 'NÃO ATENDE'}`);
        
        // Verificar condições de parada da sequência
        const matchesStopCondition = checkCondition(tags, sequence.stop_condition_tags, sequence.stop_condition_type);
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
          
          // Processar o conteúdo da mensagem substituindo variáveis
          const originalContent = firstStage.content;
          const processedContent = processVariables(originalContent, variables, firstStage.type);
          
          console.log(`[5. SEQUÊNCIAS] Tipo da mensagem: ${firstStage.type}`);
          console.log(`[5. SEQUÊNCIAS] Conteúdo original: ${originalContent}`);
          console.log(`[5. SEQUÊNCIAS] Conteúdo processado: ${processedContent}`);
          
          // Agendar a mensagem para o primeiro estágio
          const { error: scheduleError } = await supabase
            .from('scheduled_messages')
            .insert([{
              contact_id: contactId,
              sequence_id: sequence.id,
              stage_id: firstStage.id,
              raw_scheduled_time: scheduledTime.toISOString(),
              scheduled_time: scheduledTime.toISOString(),
              status: 'pending',
              variables: variables || {},
              processed_content: processedContent
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
