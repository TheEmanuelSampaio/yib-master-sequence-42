
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface SequenceCondition {
  operator: "AND" | "OR";
  groups: ConditionGroup[];
}

interface ConditionGroup {
  operator: "AND" | "OR";
  tags: string[];
}

// Legacy type - for backward compatibility
interface TagCondition {
  type: "AND" | "OR";
  tags: string[];
}

export async function processSequences(supabase: any, clientId: string, contactId: string, contactTags: string[]) {
  try {
    console.log(`[SEQUENCE-OPS] Processando sequências para cliente ${clientId} e contato ${contactId}`);
    console.log(`[SEQUENCE-OPS] Tags do contato: ${contactTags.join(', ')}`);
    
    // Buscar todas as sequências ativas para esta instância
    const { data: activeSequences, error: sequencesError } = await supabase
      .from('sequences')
      .select(`
        id, 
        name, 
        instance_id,
        start_condition_type, 
        start_condition_tags,
        stop_condition_type,
        stop_condition_tags,
        instances!inner(client_id)
      `)
      .eq('status', 'active')
      .eq('instances.client_id', clientId);

    if (sequencesError) {
      console.error(`[SEQUENCE-OPS] Erro ao buscar sequências: ${JSON.stringify(sequencesError)}`);
      return { success: false, error: 'Falha ao buscar sequências' };
    }

    console.log(`[SEQUENCE-OPS] Encontradas ${activeSequences.length} sequências ativas`);
    
    // Buscar a nova estrutura de condições para todas as sequências
    const { data: conditionGroups, error: groupsError } = await supabase
      .from('sequence_condition_groups')
      .select('id, sequence_id, condition_type, group_operator');
      
    if (groupsError) {
      console.error(`[SEQUENCE-OPS] Erro ao buscar grupos de condições: ${JSON.stringify(groupsError)}`);
      // Continue com o método legado
    }
    
    // Buscar as tags para cada grupo de condição
    const { data: conditionTags, error: tagsError } = await supabase
      .from('sequence_condition_tags')
      .select('id, group_id, tag_name');
      
    if (tagsError) {
      console.error(`[SEQUENCE-OPS] Erro ao buscar tags de condições: ${JSON.stringify(tagsError)}`);
      // Continue com o método legado
    }
    
    // Mapear os grupos e suas tags por sequence_id e condition_type
    const conditionsBySequence = new Map();
    
    if (conditionGroups && conditionTags) {
      // Agrupar tags por grupo
      const tagsByGroup = new Map();
      conditionTags.forEach(tag => {
        if (!tagsByGroup.has(tag.group_id)) {
          tagsByGroup.set(tag.group_id, []);
        }
        tagsByGroup.get(tag.group_id).push(tag.tag_name);
      });
      
      // Agrupar grupos por sequência e tipo
      conditionGroups.forEach(group => {
        const key = `${group.sequence_id}-${group.condition_type}`;
        if (!conditionsBySequence.has(key)) {
          conditionsBySequence.set(key, {
            operator: group.group_operator,
            groups: []
          });
        }
        
        conditionsBySequence.get(key).groups.push({
          operator: group.group_operator,
          tags: tagsByGroup.get(group.id) || []
        });
      });
    }
    
    // Verificar sequências onde o contato já está
    const { data: existingContactSequences, error: existingError } = await supabase
      .from('contact_sequences')
      .select('sequence_id, status')
      .eq('contact_id', contactId);
      
    if (existingError) {
      console.error(`[SEQUENCE-OPS] Erro ao buscar sequências existentes: ${JSON.stringify(existingError)}`);
      return { success: false, error: 'Falha ao verificar sequências existentes' };
    }
    
    const activeContactSequenceIds = new Set(
      existingContactSequences
        .filter(cs => cs.status === 'active')
        .map(cs => cs.sequence_id)
    );
    
    const processedSequences = new Set();
    let sequencesAdded = 0;
    let sequencesSkipped = 0;
    
    // Verificar cada sequência ativa
    for (const sequence of activeSequences) {
      processedSequences.add(sequence.id);
      
      // Verificar se o contato já está nesta sequência
      if (activeContactSequenceIds.has(sequence.id)) {
        console.log(`[SEQUENCE-OPS] Contato já está na sequência ${sequence.id}`);
        
        // Verificar condição de parada
        const shouldStop = await checkStopCondition(
          sequence, 
          contactTags, 
          conditionsBySequence
        );
        
        if (shouldStop) {
          console.log(`[SEQUENCE-OPS] Removendo contato da sequência ${sequence.id} por condição de parada`);
          
          // Remover contato da sequência
          const { error: updateError } = await supabase
            .from('contact_sequences')
            .update({
              status: 'removed',
              removed_at: new Date().toISOString()
            })
            .eq('contact_id', contactId)
            .eq('sequence_id', sequence.id)
            .eq('status', 'active');
            
          if (updateError) {
            console.error(`[SEQUENCE-OPS] Erro ao remover contato: ${JSON.stringify(updateError)}`);
          }
        }
        
        sequencesSkipped++;
        continue;
      }
      
      // Verificar condição de início
      const shouldStart = await checkStartCondition(
        sequence, 
        contactTags, 
        conditionsBySequence
      );
      
      if (shouldStart) {
        console.log(`[SEQUENCE-OPS] Adicionando contato à sequência ${sequence.id}`);
        
        // Buscar estágios da sequência
        const { data: stages, error: stagesError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', sequence.id)
          .order('order_index', { ascending: true });
          
        if (stagesError) {
          console.error(`[SEQUENCE-OPS] Erro ao buscar estágios: ${JSON.stringify(stagesError)}`);
          continue;
        }
        
        if (!stages || stages.length === 0) {
          console.log(`[SEQUENCE-OPS] Sequência ${sequence.id} não tem estágios`);
          continue;
        }
        
        // Criar uma entrada de contato_sequence
        const { data: contactSequence, error: insertError } = await supabase
          .from('contact_sequences')
          .insert({
            contact_id: contactId,
            sequence_id: sequence.id,
            current_stage_id: stages[0].id,
            current_stage_index: 0,
            status: 'active',
            started_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (insertError) {
          console.error(`[SEQUENCE-OPS] Erro ao inserir contato_sequence: ${JSON.stringify(insertError)}`);
          continue;
        }
        
        console.log(`[SEQUENCE-OPS] contact_sequence criado: ${contactSequence.id}`);
        
        // Criar progresso de estágio para cada estágio
        const stageProgressEntries = stages.map((stage, index) => ({
          contact_sequence_id: contactSequence.id,
          stage_id: stage.id,
          status: index === 0 ? 'pending' : 'waiting'
        }));
        
        const { error: progressError } = await supabase
          .from('stage_progress')
          .insert(stageProgressEntries);
          
        if (progressError) {
          console.error(`[SEQUENCE-OPS] Erro ao inserir stage_progress: ${JSON.stringify(progressError)}`);
          continue;
        }
        
        // Agendar a primeira mensagem
        await scheduleNextMessage(supabase, contactSequence.id, contactId, sequence.id, stages[0].id, 0);
        
        sequencesAdded++;
      } else {
        sequencesSkipped++;
      }
    }
    
    return {
      success: true,
      sequencesProcessed: processedSequences.size,
      sequencesAdded,
      sequencesSkipped
    };
  } catch (error) {
    console.error(`[SEQUENCE-OPS] Erro ao processar sequências: ${error.message}`);
    return { success: false, error: 'Erro interno ao processar sequências' };
  }
}

// Função para verificar se uma condição de início é atendida
async function checkStartCondition(
  sequence: any, 
  contactTags: string[],
  conditionsBySequence: Map<string, SequenceCondition>
) {
  const key = `${sequence.id}-start`;
  
  // Verificar se temos a nova estrutura de condições
  if (conditionsBySequence.has(key)) {
    const condition = conditionsBySequence.get(key);
    return evaluateConditionStructure(condition, contactTags);
  }
  
  // Método legado
  console.log(`[SEQUENCE-OPS] Usando método legado para condições de início da sequência ${sequence.id}`);
  return evaluateLegacyCondition(
    sequence.start_condition_type,
    sequence.start_condition_tags || [],
    contactTags
  );
}

// Função para verificar se uma condição de parada é atendida
async function checkStopCondition(
  sequence: any, 
  contactTags: string[],
  conditionsBySequence: Map<string, SequenceCondition>
) {
  const key = `${sequence.id}-stop`;
  
  // Verificar se temos a nova estrutura de condições
  if (conditionsBySequence.has(key)) {
    const condition = conditionsBySequence.get(key);
    return evaluateConditionStructure(condition, contactTags);
  }
  
  // Método legado
  console.log(`[SEQUENCE-OPS] Usando método legado para condições de parada da sequência ${sequence.id}`);
  return evaluateLegacyCondition(
    sequence.stop_condition_type,
    sequence.stop_condition_tags || [],
    contactTags
  );
}

// Avaliar a nova estrutura de condições
function evaluateConditionStructure(condition: SequenceCondition, contactTags: string[]) {
  // Se não houver grupos ou condição, não há condições para satisfazer
  if (!condition || !condition.groups || condition.groups.length === 0) {
    return false;
  }
  
  const mainOperator = condition.operator;
  
  // Avaliar cada grupo
  const groupResults = condition.groups.map(group => {
    // Se não houver tags no grupo, o grupo é considerado falso
    if (!group.tags || group.tags.length === 0) {
      return false;
    }
    
    // Verificar cada tag no grupo
    const tagResults = group.tags.map(tag => contactTags.includes(tag));
    
    // Aplicar o operador do grupo
    return group.operator === 'AND'
      ? tagResults.every(result => result) // Todas as tags devem ser encontradas
      : tagResults.some(result => result); // Pelo menos uma tag deve ser encontrada
  });
  
  // Aplicar o operador principal
  return mainOperator === 'AND'
    ? groupResults.every(result => result) // Todos os grupos devem ser verdadeiros
    : groupResults.some(result => result); // Pelo menos um grupo deve ser verdadeiro
}

// Método legado para avaliar condições
function evaluateLegacyCondition(
  conditionType: string,
  conditionTags: string[],
  contactTags: string[]
) {
  // Se não houver tags na condição, não há condições para satisfazer
  if (!conditionTags || conditionTags.length === 0) {
    return false;
  }
  
  // Verificar cada tag na condição
  const results = conditionTags.map(tag => contactTags.includes(tag));
  
  // Aplicar o operador da condição
  return conditionType === 'AND'
    ? results.every(result => result) // Todas as tags devem ser encontradas
    : results.some(result => result); // Pelo menos uma tag deve ser encontrada
}

// Função para agendar a próxima mensagem
async function scheduleNextMessage(
  supabase: any,
  contactSequenceId: string, 
  contactId: string, 
  sequenceId: string, 
  stageId: string,
  stageIndex: number
) {
  try {
    // Buscar informações do estágio
    const { data: stage, error: stageError } = await supabase
      .from('sequence_stages')
      .select('*')
      .eq('id', stageId)
      .single();
      
    if (stageError) {
      console.error(`[SEQUENCE-OPS] Erro ao buscar estágio: ${JSON.stringify(stageError)}`);
      return { success: false, error: 'Falha ao buscar informações do estágio' };
    }
    
    // Calcular tempo de agendamento
    const delay = stage.delay;
    const delayUnit = stage.delay_unit;
    
    let delayMs = 0;
    
    switch(delayUnit) {
      case 'minutes':
        delayMs = delay * 60 * 1000;
        break;
      case 'hours':
        delayMs = delay * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = delay * 24 * 60 * 60 * 1000;
        break;
      default:
        delayMs = delay * 60 * 1000; // Padrão para minutos
    }
    
    // Se for o primeiro estágio, aplicar um pequeno atraso inicial
    if (stageIndex === 0) {
      delayMs = Math.min(delayMs, 20 * 60 * 1000); // Máximo 20 minutos para o primeiro estágio
    }
    
    // Calcular horário de agendamento raw (antes de verificar restrições)
    const rawScheduledTime = new Date(Date.now() + delayMs);
    
    // Buscar restrições de horário para aplicar
    const timeRestrictions = await getTimeRestrictions(supabase, sequenceId);
    
    // Aplicar restrições e obter horário final
    const scheduledTime = applyTimeRestrictions(rawScheduledTime, timeRestrictions);
    
    // Criar mensagem agendada
    const { data: scheduledMessage, error: scheduleError } = await supabase
      .from('scheduled_messages')
      .insert({
        contact_id: contactId,
        sequence_id: sequenceId,
        stage_id: stageId, 
        status: 'waiting',
        raw_scheduled_time: rawScheduledTime.toISOString(),
        scheduled_time: scheduledTime.toISOString()
      })
      .select()
      .single();
      
    if (scheduleError) {
      console.error(`[SEQUENCE-OPS] Erro ao agendar mensagem: ${JSON.stringify(scheduleError)}`);
      return { success: false, error: 'Falha ao agendar mensagem' };
    }
    
    console.log(`[SEQUENCE-OPS] Mensagem agendada: ${scheduledMessage.id} para ${scheduledTime.toISOString()}`);
    
    return { success: true, scheduledMessage };
  } catch (error) {
    console.error(`[SEQUENCE-OPS] Erro ao agendar mensagem: ${error.message}`);
    return { success: false, error: 'Erro interno ao agendar mensagem' };
  }
}

// Função para obter restrições de horário
async function getTimeRestrictions(supabase: any, sequenceId: string) {
  const { data, error } = await supabase
    .rpc('get_sequence_time_restrictions', { seq_id: sequenceId });
    
  if (error) {
    console.error(`[SEQUENCE-OPS] Erro ao buscar restrições de horário: ${JSON.stringify(error)}`);
    return [];
  }
  
  return data || [];
}

// Função para aplicar restrições de horário
function applyTimeRestrictions(scheduledTime: Date, restrictions: any[]) {
  // Se não houver restrições, retornar o tempo original
  if (!restrictions || restrictions.length === 0) {
    return scheduledTime;
  }
  
  let currentTime = new Date(scheduledTime);
  let needsAdjustment = true;
  let safetyCounter = 0;
  const maxIterations = 100; // Evitar loops infinitos
  
  while (needsAdjustment && safetyCounter < maxIterations) {
    safetyCounter++;
    needsAdjustment = false;
    
    const dayOfWeek = currentTime.getDay(); // 0 (Domingo) a 6 (Sábado)
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    // Verificar cada restrição
    for (const restriction of restrictions) {
      // Pular restrições inativas
      if (!restriction.active) continue;
      
      // Verificar se o dia atual está na lista de dias restritos
      if (restriction.days.includes(dayOfWeek)) {
        // Converter horas e minutos para minutos totais para facilitar a comparação
        const currentTimeInMinutes = hours * 60 + minutes;
        const startTimeInMinutes = restriction.start_hour * 60 + restriction.start_minute;
        const endTimeInMinutes = restriction.end_hour * 60 + restriction.end_minute;
        
        // Verificar caso especial onde o período cruza a meia-noite
        if (startTimeInMinutes > endTimeInMinutes) {
          // Período noturno (ex: das 22h às 8h)
          if (
            (currentTimeInMinutes >= startTimeInMinutes) || 
            (currentTimeInMinutes < endTimeInMinutes)
          ) {
            // Avançar para o fim da restrição
            currentTime = new Date(currentTime);
            currentTime.setHours(restriction.end_hour);
            currentTime.setMinutes(restriction.end_minute);
            needsAdjustment = true;
            break;
          }
        } 
        else {
          // Período normal (ex: das 8h às 17h)
          if (
            (currentTimeInMinutes >= startTimeInMinutes) && 
            (currentTimeInMinutes < endTimeInMinutes)
          ) {
            // Avançar para o fim da restrição
            currentTime = new Date(currentTime);
            currentTime.setHours(restriction.end_hour);
            currentTime.setMinutes(restriction.end_minute);
            needsAdjustment = true;
            break;
          }
        }
      }
    }
  }
  
  return currentTime;
}
