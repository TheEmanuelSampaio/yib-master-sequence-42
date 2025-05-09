import { isAllowedByTimeRestriction } from "./time-restriction";

export const processSequences = async (
  supabase: any,
  clientId: string,
  contactId: string,
  tags: string[],
  variables?: Record<string, string>
) => {
  let sequencesProcessed = 0;
  let sequencesAdded = 0;
  let sequencesSkipped = 0;
  let removedCount = 0;

  try {
    // Get all sequences for this client
    const { data: clientSequences, error: clientSequencesError } = await supabase
      .from('sequences')
      .select('*')
      .eq('client_id', clientId)
      .eq('active', true);

    if (clientSequencesError) {
      console.error(`[5. SEQUÊNCIAS] Erro ao buscar sequências ativas para o cliente ${clientId}: ${clientSequencesError.message}`);
      return { success: false, error: 'Erro ao buscar sequências do cliente', details: clientSequencesError.message };
    }

    console.log(`[5.1 SEQUÊNCIAS] Encontradas ${clientSequences.length} sequências ativas para o cliente ${clientId}`);

    // Get all contact sequences for this contact
    const { data: contactSequences, error: contactSequencesError } = await supabase
      .from('contact_sequences')
      .select('*')
      .eq('contact_id', contactId)
      .in('status', ['active', 'paused']);

    if (contactSequencesError) {
      console.error(`[5. SEQUÊNCIAS] Erro ao buscar contact sequences para o contato ${contactId}: ${contactSequencesError.message}`);
      return { success: false, error: 'Erro ao buscar contact sequences', details: contactSequencesError.message };
    }

    console.log(`[5.2 SEQUÊNCIAS] Contato ${contactId} está em ${contactSequences.length} sequências`);

    // Process each active sequence for this contact
    for (const contactSequence of contactSequences) {
      const sequence = clientSequences.find(seq => seq.id === contactSequence.sequence_id);
      if (!sequence) {
        console.warn(`[5.2 SEQUENCE] Sequência ${contactSequence.sequence_id} não encontrada ou inativa, ignorando`);
        continue;
      }
      
      // Check for stop condition
      // If stop condition is met, change status to "stopped" (not "removed")
      if (isStopConditionMet(sequence, tags)) {
        console.log(`[5.3 SEQUENCE] A condição de parada foi atendida para a sequência ${sequence.id} - o contato será removido`);
        
        // Get current timestamp for the audit trail
        const now = new Date().toISOString();
        
        // Mark pending messages as "stopped" instead of deleting them
        const { error: msgError } = await supabase
          .from('scheduled_messages')
          .update({ 
            status: 'stopped',
            removed_at: now
          })
          .eq('contact_id', contactId)
          .eq('sequence_id', sequence.id)
          .in('status', ['pending', 'processing', 'waiting']);
          
        if (msgError) {
          console.error(`[ERROR] Erro ao marcar mensagens como paradas: ${msgError.message}`);
        } else {
          console.log(`[5.3 SEQUENCE] Mensagens agendadas foram marcadas como paradas`);
        }
        
        // Mark sequence as "stopped" instead of "removed"
        const { error: seqError } = await supabase
          .from('contact_sequences')
          .update({ 
            status: 'stopped',
            removed_at: now
          })
          .eq('id', contactSequence.id);
          
        if (seqError) {
          console.error(`[ERROR] Erro ao marcar a sequência como parada: ${seqError.message}`);
        } else {
          console.log(`[5.3 SEQUENCE] Sequência marcada como parada`);
          removedCount++;
          // Incrementar estatísticas de sequências removidas
          // try {
          //   // Obter ID da instância
          //   const { data: sequenceData } = await supabase
          //     .from('sequences')
          //     .select('instance_id')
          //     .eq('id', sequence.id)
          //     .single();
            
          //   if (sequenceData) {
          //     const today = new Date().toISOString().split('T')[0];
              
          //     // Verificar se já existe estatística para hoje
          //     const { data: existingStats } = await supabase
          //       .from('daily_stats')
          //       .select('*')
          //       .eq('instance_id', sequenceData.instance_id)
          //       .eq('date', today)
          //       .maybeSingle();
            
          //     if (existingStats) {
          //       await supabase
          //         .from('daily_stats')
          //         .update({
          //           completed_sequences: existingStats.completed_sequences + 1
          //         })
          //         .eq('id', existingStats.id);
          //     } else {
          //       await supabase
          //         .from('daily_stats')
          //         .insert({
          //           instance_id: sequenceData.instance_id,
          //           date: today,
          //           messages_scheduled: 0,
          //           messages_sent: 0,
          //           messages_failed: 0,
          //           completed_sequences: 1,
          //           new_contacts: 0
          //         });
          //     }
          //   }
          // } catch (statsError) {
          //   console.error('[STATISTICS] Erro ao atualizar estatísticas:', JSON.stringify(statsError));
          // }
        }
        
        // Atualizar o status na tabela stage_progress para "removed" onde o status for "pending"
        const { error: progError } = await supabase
          .from('stage_progress')
          .update({ status: 'removed' })
          .eq('contact_sequence_id', contactSequence.id)
          .eq('status', 'pending');
          
        if (progError) {
          console.error(`[ERROR] Erro ao atualizar progresso do estágio: ${progError.message}`);
        }
        
        continue;
      }

      // Check if the sequence has time restrictions and if it's allowed to run at this time
      if (sequence.timeRestrictions && sequence.timeRestrictions.length > 0) {
        const now = new Date();
        const isAllowed = isAllowedByTimeRestriction(sequence.timeRestrictions, now);

        if (!isAllowed) {
          console.log(`[5.3 SEQUENCE] Horário não permitido para a sequência ${sequence.id}, ignorando`);
          sequencesSkipped++;
          continue;
        }
      }

      // Get the current stage
      const { data: currentStage, error: currentStageError } = await supabase
        .from('sequence_stages')
        .select('*')
        .eq('id', contactSequence.current_stage_id)
        .single();

      if (currentStageError) {
        console.error(`[5.3 SEQUENCE] Erro ao buscar o estágio atual da sequência ${sequence.id}: ${currentStageError.message}`);
        continue;
      }

      // Get the variables from the current stage
      const messageVariables = variables || {};

      // Process the message content with the variables
      let processedContent = null;

      // Process the content according to the message type
      if (currentStage.type === 'message' || currentStage.type === 'pattern') {
        console.log('[VARIÁVEIS] Processando variáveis para conteúdo do tipo', currentStage.type);
        try {
          processedContent = processMessageContent(currentStage.content, messageVariables);
          console.log('[VARIÁVEIS] Conteúdo processado com sucesso:', processedContent);
        } catch (varError) {
          console.error('[VARIÁVEIS] Erro ao processar variáveis:', varError);
          processedContent = currentStage.content;
        }
      }
      // For the type typebot, we just pass the variables, the content will be processed by the typebot
      else if (currentStage.type === 'typebot') {
        console.log('[VARIÁVEIS] Mensagem do tipo typebot, as variáveis serão passadas para o typebot');
      }

      // Schedule the message
      const delayMs = calculateDelayMs(currentStage.delay, currentStage.delay_unit);
      const scheduledTime = new Date(Date.now() + delayMs);

      const { data: scheduledMessage, error: scheduleError } = await supabase
        .from('scheduled_messages')
        .insert([{
          contact_id: contactId,
          sequence_id: sequence.id,
          stage_id: currentStage.id,
          raw_scheduled_time: scheduledTime.toISOString(),
          scheduled_time: scheduledTime.toISOString(),
          status: 'pending',
          variables: messageVariables,
          processed_content: processedContent
        }])
        .select()
        .single();

      if (scheduleError) {
        console.error(`[5.3 SEQUENCE] Erro ao agendar mensagem para o contato ${contactId} na sequência ${sequence.id}: ${scheduleError.message}`);
        continue;
      }

      console.log(`[5.3 SEQUENCE] Mensagem agendada com sucesso para o contato ${contactId} na sequência ${sequence.id} para ${scheduledTime.toISOString()}`);
      sequencesProcessed++;
    }

    // Check if there are sequences that the contact is not in and that match the start condition
    for (const sequence of clientSequences) {
      const contactInSequence = contactSequences.find(cs => cs.sequence_id === sequence.id);
      if (contactInSequence) {
        continue;
      }

      if (isStartConditionMet(sequence, tags)) {
        console.log(`[5.4 SEQUENCE] A condição de início foi atendida para a sequência ${sequence.id} - adicionando contato`);

        // Get the first stage
        const { data: firstStage, error: firstStageError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', sequence.id)
          .order('order_index', { ascending: true })
          .limit(1)
          .single();

        if (firstStageError) {
          console.error(`[5.4 SEQUENCE] Erro ao buscar o primeiro estágio da sequência ${sequence.id}: ${firstStageError.message}`);
          continue;
        }

        // Create a new contact sequence
        const { data: newContactSequence, error: newContactSequenceError } = await supabase
          .from('contact_sequences')
          .insert([{
            contact_id: contactId,
            sequence_id: sequence.id,
            current_stage_id: firstStage.id,
            current_stage_index: 1,
            status: 'active',
            started_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (newContactSequenceError) {
          console.error(`[5.4 SEQUENCE] Erro ao criar contact sequence para o contato ${contactId} na sequência ${sequence.id}: ${newContactSequenceError.message}`);
          continue;
        }

        console.log(`[5.4 SEQUENCE] Contact sequence criada com sucesso para o contato ${contactId} na sequência ${sequence.id}`);

        // Create a new stage progress
        const { error: newProgressError } = await supabase
          .from('stage_progress')
          .insert([{
            contact_sequence_id: newContactSequence.id,
            stage_id: firstStage.id,
            status: 'pending'
          }]);

        if (newProgressError) {
          console.error(`[5.4 SEQUENCE] Erro ao criar progresso para o primeiro estágio: ${newProgressError.message}`);
        }

        // Get the variables from the current stage
        const messageVariables = variables || {};

        // Process the message content with the variables
        let processedContent = null;

        // Process the content according to the message type
        if (firstStage.type === 'message' || firstStage.type === 'pattern') {
          console.log('[VARIÁVEIS] Processando variáveis para conteúdo do tipo', firstStage.type);
          try {
            processedContent = processMessageContent(firstStage.content, messageVariables);
            console.log('[VARIÁVEIS] Conteúdo processado com sucesso:', processedContent);
          } catch (varError) {
            console.error('[VARIÁVEIS] Erro ao processar variáveis:', varError);
            processedContent = firstStage.content;
          }
        }
        // For the type typebot, we just pass the variables, the content will be processed by the typebot
        else if (firstStage.type === 'typebot') {
          console.log('[VARIÁVEIS] Mensagem do tipo typebot, as variáveis serão passadas para o typebot');
        }

        // Schedule the message
        const delayMs = calculateDelayMs(firstStage.delay, firstStage.delay_unit);
        const scheduledTime = new Date(Date.now() + delayMs);

        const { error: scheduleError } = await supabase
          .from('scheduled_messages')
          .insert([{
            contact_id: contactId,
            sequence_id: sequence.id,
            stage_id: firstStage.id,
            raw_scheduled_time: scheduledTime.toISOString(),
            scheduled_time: scheduledTime.toISOString(),
            status: 'pending',
            variables: messageVariables,
            processed_content: processedContent
          }]);

        if (scheduleError) {
          console.error(`[5.4 SEQUENCE] Erro ao agendar mensagem para o contato ${contactId} na sequência ${sequence.id}: ${scheduleError.message}`);
          continue;
        }

        console.log(`[5.4 SEQUENCE] Mensagem agendada com sucesso para o contato ${contactId} na sequência ${sequence.id} para ${scheduledTime.toISOString()}`);
        sequencesAdded++;
      }
    }

    return {
      success: true,
      sequencesProcessed,
      sequencesAdded,
      sequencesSkipped,
      sequencesRemoved: removedCount
    };
  } catch (error) {
    console.error(`[5. SEQUÊNCIAS] Erro ao processar sequências para o contato ${contactId}: ${error.message}`);
    return { success: false, error: 'Erro ao processar sequências', details: error.message };
  }
};

function isStartConditionMet(sequence: any, tags: string[]): boolean {
  if (!sequence.startCondition || !sequence.startCondition.tags || sequence.startCondition.tags.length === 0) {
    return false;
  }

  if (sequence.startCondition.type === 'AND') {
    return sequence.startCondition.tags.every((tag: string) => tags.includes(tag));
  } else if (sequence.startCondition.type === 'OR') {
    return sequence.startCondition.tags.some((tag: string) => tags.includes(tag));
  }

  return false;
}

function isStopConditionMet(sequence: any, tags: string[]): boolean {
  if (!sequence.stopCondition || !sequence.stopCondition.tags || sequence.stopCondition.tags.length === 0) {
    return false;
  }

  if (sequence.stopCondition.type === 'AND') {
    return sequence.stopCondition.tags.every((tag: string) => tags.includes(tag));
  } else if (sequence.stopCondition.type === 'OR') {
    return sequence.stopCondition.tags.some((tag: string) => tags.includes(tag));
  }

  return false;
}

// Função auxiliar para calcular atraso em milissegundos
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

// Função auxiliar para processar conteúdo da mensagem com variáveis
function processMessageContent(content: string, variables: Record<string, any>): string {
  console.log('[VARIÁVEIS] Variáveis disponíveis:', variables);
  
  // Se não tiver variáveis ou não for uma string, retornar conteúdo original
  if (!variables || typeof content !== 'string') {
    return content;
  }

  let processedContent = content;
  
  // Substituir todas as variáveis no formato {nome_variavel}
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    if (processedContent.includes(placeholder)) {
      console.log(`[VARIÁVEIS] Substituindo ${key} por ${value}`);
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value));
    }
  }

  console.log('[VARIÁVEIS] Conteúdo após substituição:', processedContent);
  return processedContent;
}
