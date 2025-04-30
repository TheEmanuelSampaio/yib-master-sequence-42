
import { logQueryError } from '../_shared/db-helpers.ts';

// Check and process eligible sequences for a contact
export const processEligibleSequences = async (supabase: any, clientId: string, contactId: string, tags: string[]) => {
  console.log(`[5. SEQUÊNCIAS] Verificando sequências elegíveis para o contato ${contactId}`);
  
  // Get all active instances for the client
  console.log(`[5. SEQUÊNCIAS] Buscando instâncias ativas para cliente ${clientId}`);
  const { data: activeInstances, error: instanceError } = await supabase
    .from('instances')
    .select('id, name')
    .eq('client_id', clientId)
    .eq('active', true);
    
  if (instanceError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao buscar instâncias: ${instanceError.message}`, instanceError);
    throw instanceError;
  }
  
  console.log(`[5. SEQUÊNCIAS] Encontradas ${activeInstances?.length || 0} instâncias ativas para cliente ${clientId}`);
  
  // Debug logging to verify instances
  const { data: allInstances } = await supabase
    .from('instances')
    .select('id, name, client_id, active');
    
  console.log(`[5. SEQUÊNCIAS] DEBUG: Total de instâncias no banco: ${allInstances?.length || 0}`);
  if (allInstances && allInstances.length > 0) {
    console.log(`[5. SEQUÊNCIAS] DEBUG: Primeiras 3 instâncias:`);
    allInstances.slice(0, 3).forEach((inst: any, i: number) => {
      console.log(`  [${i+1}] ID=${inst.id}, Nome=${inst.name}, Cliente=${inst.client_id}, Ativa=${inst.active}`);
    });
    
    console.log(`[5. SEQUÊNCIAS] DEBUG: Filtro aplicado: { client_id: ${clientId}, active: true }`);
  }
    
  if (!activeInstances || activeInstances.length === 0) {
    console.log(`[5. SEQUÊNCIAS] ALERTA: Nenhuma instância ativa encontrada para o cliente ${clientId}`);
    return { eligibleSequences: 0, addedSequences: 0, removedSequences: 0 };
  }
  
  // Process sequences for each instance
  let totalEligibleSequences = 0;
  let totalAddedSequences = 0;
  let totalRemovedSequences = 0;
  
  for (const instance of activeInstances) {
    const result = await processSequencesForInstance(supabase, instance, contactId, tags);
    totalEligibleSequences += result.eligibleCount;
    totalAddedSequences += result.addedCount;
    totalRemovedSequences += result.removedCount;
  }
  
  return {
    eligibleSequences: totalEligibleSequences,
    addedSequences: totalAddedSequences,
    removedSequences: totalRemovedSequences
  };
};

// Process sequences for a specific instance
const processSequencesForInstance = async (supabase: any, instance: any, contactId: string, tags: string[]) => {
  console.log(`[5. SEQUÊNCIAS] Processando instância ${instance.id} (${instance.name})`);
  
  // Get active sequences for the instance
  const { data: activeSequences, error: sequencesError } = await supabase
    .from('sequences')
    .select('*')
    .eq('instance_id', instance.id)
    .eq('status', 'active');
    
  if (sequencesError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao buscar sequências para instância ${instance.name}: ${sequencesError.message}`);
    return { eligibleCount: 0, addedCount: 0, removedCount: 0 };
  }
  
  console.log(`[5. SEQUÊNCIAS] Encontradas ${activeSequences?.length || 0} sequências ativas para instância ${instance.name}`);
  
  if (!activeSequences || activeSequences.length === 0) {
    console.log(`[5. SEQUÊNCIAS] Nenhuma sequência ativa para instância ${instance.name}, pulando`);
    return { eligibleCount: 0, addedCount: 0, removedCount: 0 };
  }
  
  let eligibleCount = 0;
  let addedCount = 0;
  let removedCount = 0;
  
  // Process each sequence
  for (const sequence of activeSequences) {
    const result = await processSequence(supabase, sequence, contactId, tags);
    if (result.eligible) eligibleCount++;
    if (result.added) addedCount++;
    if (result.removed) removedCount++;
  }
  
  return { eligibleCount, addedCount, removedCount };
};

// Process a single sequence for eligibility
const processSequence = async (supabase: any, sequence: any, contactId: string, tags: string[]) => {
  console.log(`[5. SEQUÊNCIAS] Verificando elegibilidade para sequência ${sequence.id} (${sequence.name})`);
  
  // Check start condition
  const { start_condition_type, start_condition_tags } = sequence;
  console.log(`[5. SEQUÊNCIAS] Condição de início: ${start_condition_type}, tags: ${JSON.stringify(start_condition_tags)}`);
  
  let isEligible = false;
  
  // Check start condition
  if (start_condition_type === 'AND') {
    // All tags must be present
    isEligible = start_condition_tags.every((tag: string) => tags.includes(tag));
    console.log(`[5. SEQUÊNCIAS] Verificação AND - ${isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}`);
  } else {
    // Any of the tags must be present
    isEligible = start_condition_tags.some((tag: string) => tags.includes(tag));
    console.log(`[5. SEQUÊNCIAS] Verificação OR - ${isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}`);
  }
  
  if (!isEligible) {
    console.log(`[5. SEQUÊNCIAS] Contato ${contactId} NÃO é elegível para sequência ${sequence.name}`);
    return { eligible: false, added: false, removed: false };
  }
  
  console.log(`[5. SEQUÊNCIAS] Contato ${contactId} é elegível para sequência ${sequence.name}`);
  
  // Check if contact is already in the sequence
  console.log(`[5. SEQUÊNCIAS] Verificando se contato já está na sequência ${sequence.name}`);
  const { data: existingContactSequence, error: contactSeqError } = await supabase
    .from('contact_sequences')
    .select('id, status')
    .eq('contact_id', contactId)
    .eq('sequence_id', sequence.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (contactSeqError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao verificar se contato já está na sequência: ${contactSeqError.message}`);
    return { eligible: true, added: false, removed: false };
  }
  
  // Check stop conditions
  const { stop_condition_type, stop_condition_tags } = sequence;
  console.log(`[5. SEQUÊNCIAS] Condição de parada: ${stop_condition_type}, tags: ${JSON.stringify(stop_condition_tags)}`);
  
  let shouldStop = false;
  if (stop_condition_tags && stop_condition_tags.length > 0) {
    if (stop_condition_type === 'AND') {
      shouldStop = stop_condition_tags.every((tag: string) => tags.includes(tag));
      console.log(`[5. SEQUÊNCIAS] Verificação de parada AND - ${shouldStop ? 'DEVE PARAR' : 'NÃO DEVE PARAR'}`);
    } else {
      shouldStop = stop_condition_tags.some((tag: string) => tags.includes(tag));
      console.log(`[5. SEQUÊNCIAS] Verificação de parada OR - ${shouldStop ? 'DEVE PARAR' : 'NÃO DEVE PARAR'}`);
    }
  }
  
  // Handle stop condition
  if (shouldStop) {
    console.log(`[5. SEQUÊNCIAS] Contato ${contactId} atende condição de parada para sequência ${sequence.name}`);
    
    // If contact is in a non-active sequence, do nothing
    if (existingContactSequence && existingContactSequence.status !== 'active') {
      console.log(`[5. SEQUÊNCIAS] Contato já está em estado não-ativo (${existingContactSequence.status}) na sequência, pulando`);
      return { eligible: true, added: false, removed: false };
    }
    
    // If contact is active in sequence, remove
    if (existingContactSequence) {
      return await removeContactFromSequence(supabase, existingContactSequence.id, contactId, sequence.name);
    }
    
    return { eligible: true, added: false, removed: false };
  }
  
  // If contact is already active, no need to add
  if (existingContactSequence && existingContactSequence.status === 'active') {
    console.log(`[5. SEQUÊNCIAS] Contato ${contactId} já está ativo na sequência ${sequence.name}, pulando`);
    return { eligible: true, added: false, removed: false };
  }
  
  // If contact has already completed or been removed, do not add again
  if (existingContactSequence && 
      (existingContactSequence.status === 'completed' || existingContactSequence.status === 'removed')) {
    console.log(`[5. SEQUÊNCIAS] Contato ${contactId} já esteve na sequência ${sequence.name} (status: ${existingContactSequence.status}), não adicionar novamente`);
    return { eligible: true, added: false, removed: false };
  }
  
  // Add contact to sequence
  return await addContactToSequence(supabase, sequence, contactId);
};

// Remove contact from sequence
const removeContactFromSequence = async (supabase: any, contactSequenceId: string, contactId: string, sequenceName: string) => {
  console.log(`[5. SEQUÊNCIAS] Removendo contato ${contactId} da sequência ${sequenceName}`);
  
  const { error: removeError } = await supabase
    .from('contact_sequences')
    .update({
      status: 'removed',
      removed_at: new Date().toISOString()
    })
    .eq('id', contactSequenceId);
    
  if (removeError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao remover contato da sequência: ${removeError.message}`);
    return { eligible: true, added: false, removed: false };
  } else {
    console.log(`[5. SEQUÊNCIAS] Contato ${contactId} removido com sucesso da sequência ${sequenceName}`);
    return { eligible: true, added: false, removed: true };
  }
};

// Add contact to sequence
const addContactToSequence = async (supabase: any, sequence: any, contactId: string) => {
  console.log(`[5. SEQUÊNCIAS] Adicionando contato ${contactId} à sequência ${sequence.name}`);
  
  try {
    // Get first stage of sequence
    const { data: firstStage, error: stageError } = await supabase
      .from('sequence_stages')
      .select('*')
      .eq('sequence_id', sequence.id)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();
      
    if (stageError) {
      console.error(`[5. SEQUÊNCIAS] Erro ao buscar primeiro estágio da sequência: ${stageError.message}`);
      return { eligible: true, added: false, removed: false };
    }
    
    if (!firstStage) {
      console.error(`[5. SEQUÊNCIAS] Nenhum estágio encontrado para a sequência ${sequence.name}`);
      return { eligible: true, added: false, removed: false };
    }
    
    console.log(`[5. SEQUÊNCIAS] Primeiro estágio encontrado: ${firstStage.id} (${firstStage.name})`);
    
    // Create record in contact_sequences
    const { data: contactSequence, error: createSeqError } = await supabase
      .from('contact_sequences')
      .insert({
        contact_id: contactId,
        sequence_id: sequence.id,
        current_stage_index: 0,
        current_stage_id: firstStage.id,
        status: 'active'
      })
      .select('id')
      .single();
      
    if (createSeqError) {
      console.error(`[5. SEQUÊNCIAS] Erro ao adicionar contato à sequência: ${createSeqError.message} (código: ${createSeqError.code})`);
      return { eligible: true, added: false, removed: false };
    }
    
    console.log(`[5. SEQUÊNCIAS] Contato ${contactId} adicionado à sequência ${sequence.name} com ID ${contactSequence.id}`);
    
    // Create progress record for first stage
    const result = await createProgressRecord(supabase, contactSequence.id, firstStage);
    if (!result.success) {
      return { eligible: true, added: false, removed: false };
    }
    
    // Schedule first message
    const scheduled = await scheduleFirstMessage(supabase, contactId, sequence.id, firstStage);
    
    return { 
      eligible: true, 
      added: scheduled.success, 
      removed: false 
    };
  } catch (error: any) {
    console.error(`[5. SEQUÊNCIAS] Erro crítico ao processar adição à sequência: ${error.message}`);
    console.error(error.stack);
    return { eligible: true, added: false, removed: false };
  }
};

// Create progress record
const createProgressRecord = async (supabase: any, contactSequenceId: string, stage: any) => {
  const { error: progressError } = await supabase
    .from('stage_progress')
    .insert({
      contact_sequence_id: contactSequenceId,
      stage_id: stage.id,
      status: 'pending'
    });
    
  if (progressError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao criar registro de progresso: ${progressError.message}`);
    return { success: false };
  } else {
    console.log(`[5. SEQUÊNCIAS] Registro de progresso criado com sucesso para estágio ${stage.name}`);
    return { success: true };
  }
};

// Schedule first message
const scheduleFirstMessage = async (supabase: any, contactId: string, sequenceId: string, stage: any) => {
  // Calculate time for first message
  console.log(`[5. SEQUÊNCIAS] Calculando tempo para primeiro envio do estágio ${stage.name}`);
  const now = new Date();
  let scheduledTime = new Date(now);
  
  // Add stage delay
  console.log(`[5. SEQUÊNCIAS] Aplicando delay: ${stage.delay} ${stage.delay_unit}`);
  switch (stage.delay_unit) {
    case 'minutes':
      scheduledTime.setMinutes(scheduledTime.getMinutes() + stage.delay);
      break;
    case 'hours':
      scheduledTime.setHours(scheduledTime.getHours() + stage.delay);
      break;
    case 'days':
      scheduledTime.setDate(scheduledTime.getDate() + stage.delay);
      break;
    default:
      scheduledTime.setMinutes(scheduledTime.getMinutes() + stage.delay);
  }
  
  const rawScheduledTime = new Date(scheduledTime);
  console.log(`[5. SEQUÊNCIAS] Tempo inicial calculado: ${scheduledTime.toISOString()}`);
  
  // Schedule message
  console.log(`[5. SEQUÊNCIAS] Agendando mensagem para ${scheduledTime.toISOString()}`);
  const { data: scheduledMessage, error: scheduleError } = await supabase
    .from('scheduled_messages')
    .insert({
      contact_id: contactId,
      sequence_id: sequenceId,
      stage_id: stage.id,
      raw_scheduled_time: rawScheduledTime.toISOString(),
      scheduled_time: scheduledTime.toISOString(),
      status: 'pending'
    })
    .select('id')
    .single();
    
  if (scheduleError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao agendar mensagem: ${scheduleError.message}`);
    return { success: false };
  } else {
    console.log(`[5. SEQUÊNCIAS] Mensagem agendada com sucesso para ${scheduledTime.toISOString()}, ID: ${scheduledMessage.id}`);
    
    // Update stats
    await updateScheduledMessageStats(supabase, sequenceId);
    return { success: true };
  }
};

// Update stats for scheduled message
const updateScheduledMessageStats = async (supabase: any, sequenceId: string) => {
  // Get instance ID from sequence
  const { data: sequence } = await supabase
    .from('sequences')
    .select('instance_id')
    .eq('id', sequenceId)
    .single();
  
  if (!sequence) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  const { error: statsError } = await supabase.rpc('increment_daily_stats', {
    instance_id: sequence.instance_id,
    stat_date: today,
    completed_seqs: 0,
    msgs_sent: 0,
    msgs_failed: 0,
    msgs_scheduled: 1,
    new_contacts: 0
  });
  
  if (statsError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao atualizar estatísticas: ${statsError.message}`);
  } else {
    console.log(`[5. SEQUÊNCIAS] Estatísticas atualizadas com sucesso`);
  }
};
