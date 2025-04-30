
import { createServiceClient } from '../_shared/db.ts';
import { addMinutes, addHours, addDays } from 'https://esm.sh/date-fns@3.6.0';

interface SequenceStage {
  id: string;
  name: string;
  delay: number;
  delay_unit: string;
  type: string;
  content: string;
}

// Funções para processamento de sequências
export const findEligibleSequences = async (clientId: string, contactId: string, contactTags: string[]) => {
  const supabase = createServiceClient();
  
  console.log(`[5. SEQUÊNCIAS] Verificando sequências elegíveis para o contato ${contactId}`);
  console.log(`[5. SEQUÊNCIAS] Buscando instâncias ativas para cliente ${clientId}`);
  
  // Buscar instâncias ativas para o cliente
  const { data: instances, error: instancesError } = await supabase
    .from('instances')
    .select('*')
    .eq('client_id', clientId)
    .eq('active', true);
  
  if (instancesError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao buscar instâncias:`, instancesError);
    throw instancesError;
  }
  
  console.log(`[5. SEQUÊNCIAS] Encontradas ${instances?.length || 0} instâncias ativas para cliente ${clientId}`);
  
  // Log para debug
  console.log(`[5. SEQUÊNCIAS] DEBUG: Total de instâncias no banco: ${instances?.length || 0}`);
  if (instances && instances.length > 0) {
    console.log(`[5. SEQUÊNCIAS] DEBUG: Primeiras 3 instâncias:`);
    instances.slice(0, 3).forEach((instance, idx) => {
      console.log(`  [${idx + 1}] ID=${instance.id}, Nome=${instance.name}, Cliente=${instance.client_id}, Ativa=${instance.active}`);
    });
  }
  
  // Para cada instância, verificar sequências elegíveis
  const eligibleSequences = [];
  const addedToSequences = [];
  let sequencesAdded = 0;
  let sequencesRemoved = 0;
  
  if (instances && instances.length > 0) {
    for (const instance of instances) {
      console.log(`[5. SEQUÊNCIAS] Processando instância ${instance.id} (${instance.name})`);
      
      // Aplicar filtro para log
      console.log(`[5. SEQUÊNCIAS] DEBUG: Filtro aplicado: { client_id: ${clientId}, active: true }`);
      
      // Buscar sequências ativas para a instância
      const { data: sequences, error: sequencesError } = await supabase
        .from('sequences')
        .select('*')
        .eq('instance_id', instance.id)
        .eq('status', 'active');
      
      if (sequencesError) {
        console.error(`[5. SEQUÊNCIAS] Erro ao buscar sequências:`, sequencesError);
        continue;
      }
      
      console.log(`[5. SEQUÊNCIAS] Encontradas ${sequences?.length || 0} sequências ativas para instância ${instance.name}`);
      
      // Para cada sequência, verificar condições
      if (sequences && sequences.length > 0) {
        for (const sequence of sequences) {
          console.log(`[5. SEQUÊNCIAS] Verificando elegibilidade para sequência ${sequence.id} (${sequence.name})`);
          
          // Verificar condições de início
          console.log(`[5. SEQUÊNCIAS] Condição de início: ${sequence.start_condition_type}, tags: ${JSON.stringify(sequence.start_condition_tags)}`);
          
          let isEligible = false;
          
          if (sequence.start_condition_type === 'AND') {
            // Todas as tags precisam estar presentes
            isEligible = sequence.start_condition_tags.every((tag: string) => 
              contactTags.includes(tag)
            );
            console.log(`[5. SEQUÊNCIAS] Verificação AND - ${isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}`);
          } else {
            // Pelo menos uma tag precisa estar presente
            isEligible = sequence.start_condition_tags.some((tag: string) => 
              contactTags.includes(tag)
            );
            console.log(`[5. SEQUÊNCIAS] Verificação OR - ${isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}`);
          }
          
          if (isEligible) {
            console.log(`[5. SEQUÊNCIAS] Contato ${contactId} é elegível para sequência ${sequence.name}`);
            
            // Verificar se o contato já está na sequência
            console.log(`[5. SEQUÊNCIAS] Verificando se contato já está na sequência ${sequence.name}`);
            
            const { data: existingSequence, error: existingSeqError } = await supabase
              .from('contact_sequences')
              .select('*')
              .eq('contact_id', contactId)
              .eq('sequence_id', sequence.id)
              .is('removed_at', null);
            
            if (existingSeqError) {
              console.error(`[5. SEQUÊNCIAS] Erro ao verificar sequência existente:`, existingSeqError);
              continue;
            }
            
            if (existingSequence && existingSequence.length > 0) {
              console.log(`[5. SEQUÊNCIAS] Contato já está na sequência ${sequence.name}, pulando...`);
              continue;
            }
            
            // Verificar condições de parada
            console.log(`[5. SEQUÊNCIAS] Condição de parada: ${sequence.stop_condition_type}, tags: ${JSON.stringify(sequence.stop_condition_tags)}`);
            
            let shouldStop = false;
            
            if (sequence.stop_condition_tags && sequence.stop_condition_tags.length > 0) {
              if (sequence.stop_condition_type === 'AND') {
                // Todas as tags de parada estão presentes
                shouldStop = sequence.stop_condition_tags.every((tag: string) => 
                  contactTags.includes(tag)
                );
              } else {
                // Pelo menos uma tag de parada está presente
                shouldStop = sequence.stop_condition_tags.some((tag: string) => 
                  contactTags.includes(tag)
                );
              }
            }
            
            if (shouldStop) {
              console.log(`[5. SEQUÊNCIAS] Condição de parada atingida para sequência ${sequence.name}, pulando...`);
              continue;
            }
            
            // Adicionar à lista de sequências elegíveis
            eligibleSequences.push(sequence);
            
            // Adicionar contato à sequência se for elegível
            try {
              await addContactToSequence(contactId, sequence, instance.name);
              addedToSequences.push(sequence.name);
              sequencesAdded++;
            } catch (error) {
              console.error(`[5. SEQUÊNCIAS] Erro ao adicionar contato à sequência ${sequence.name}:`, error);
            }
          }
        }
      }
    }
  }
  
  // Atualizar estatísticas diárias
  try {
    const today = new Date().toISOString().split('T')[0];
    
    for (const instance of instances || []) {
      const statData = {
        new_contacts: 0,
        msgs_scheduled: sequencesAdded > 0 ? 1 : 0,
        msgs_sent: 0,
        msgs_failed: 0,
        completed_seqs: 0,
        date: today,
        instance_id: instance.id
      };
      
      const { error: statsError } = await supabase.rpc('increment_daily_stats', statData);
      
      if (statsError) {
        console.error(`[5. SEQUÊNCIAS] Erro ao atualizar estatísticas: ${statsError.message}`);
      }
    }
  } catch (error) {
    console.error(`[5. SEQUÊNCIAS] Erro ao processar estatísticas:`, error);
  }
  
  return {
    eligibleCount: eligibleSequences.length,
    addedCount: sequencesAdded,
    removedCount: sequencesRemoved,
    addedToSequences
  };
};

// Adicionar contato a uma sequência
async function addContactToSequence(contactId: string, sequence: any, instanceName: string) {
  const supabase = createServiceClient();
  
  console.log(`[5. SEQUÊNCIAS] Adicionando contato ${contactId} à sequência ${sequence.name}`);
  
  // Buscar o primeiro estágio da sequência
  const { data: stages, error: stagesError } = await supabase
    .from('sequence_stages')
    .select('*')
    .eq('sequence_id', sequence.id)
    .order('order_index', { ascending: true })
    .limit(1);
  
  if (stagesError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao buscar estágios da sequência:`, stagesError);
    throw stagesError;
  }
  
  if (!stages || stages.length === 0) {
    console.error(`[5. SEQUÊNCIAS] Nenhum estágio encontrado para a sequência ${sequence.name}`);
    throw new Error(`Nenhum estágio encontrado para a sequência ${sequence.name}`);
  }
  
  const firstStage = stages[0];
  console.log(`[5. SEQUÊNCIAS] Primeiro estágio encontrado: ${firstStage.id} (${firstStage.name})`);
  
  // Usar o usuário que criou a sequência para as operações
  console.log(`[5. SEQUÊNCIAS] Utilizando usuário proprietário da sequência para inserções: ${sequence.created_by}`);
  
  // Para operações que requerem bypass de RLS, usar service role
  console.log(`[5. SEQUÊNCIAS] Usando service role para inserir registro de contact_sequences`);
  
  // Adicionar contato à sequência
  const { data: contactSequence, error: sequenceError } = await supabase
    .from('contact_sequences')
    .insert([
      {
        contact_id: contactId,
        sequence_id: sequence.id,
        current_stage_id: firstStage.id,
        current_stage_index: 0,
        status: 'active'
      }
    ])
    .select();
  
  if (sequenceError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao adicionar contato à sequência:`, sequenceError);
    throw sequenceError;
  }
  
  console.log(`[5. SEQUÊNCIAS] Contato ${contactId} adicionado à sequência ${sequence.name} com ID ${contactSequence[0].id}`);
  
  // Criar registro de progresso do estágio
  const { data: progress, error: progressError } = await supabase
    .from('stage_progress')
    .insert([
      {
        contact_sequence_id: contactSequence[0].id,
        stage_id: firstStage.id,
        status: 'pending'
      }
    ])
    .select();
  
  if (progressError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao criar registro de progresso:`, progressError);
    throw progressError;
  }
  
  console.log(`[5. SEQUÊNCIAS] Registro de progresso criado com sucesso para estágio ${firstStage.name}`);
  
  // Calcular o tempo de envio com base no delay
  await scheduleMessage(contactId, sequence, firstStage, instanceName);
  
  return contactSequence[0];
}

// Agendar mensagem com base nos parâmetros de delay
async function scheduleMessage(contactId: string, sequence: any, stage: SequenceStage, instanceName: string) {
  const supabase = createServiceClient();
  
  console.log(`[5. SEQUÊNCIAS] Calculando tempo para primeiro envio do estágio ${stage.name}`);
  
  // Calcular o tempo de delay
  const now = new Date();
  console.log(`[5. SEQUÊNCIAS] Aplicando delay: ${stage.delay} ${stage.delay_unit}`);
  
  let scheduledTime;
  
  switch (stage.delay_unit) {
    case 'minutes':
      scheduledTime = addMinutes(now, stage.delay);
      break;
    case 'hours':
      scheduledTime = addHours(now, stage.delay);
      break;
    case 'days':
      scheduledTime = addDays(now, stage.delay);
      break;
    default:
      scheduledTime = addMinutes(now, stage.delay); // Default para minutos
  }
  
  console.log(`[5. SEQUÊNCIAS] Tempo inicial calculado: ${scheduledTime.toISOString()}`);
  
  // TODO: Aplicar restrições de tempo aqui, se necessário
  
  console.log(`[5. SEQUÊNCIAS] Agendando mensagem para ${scheduledTime.toISOString()}`);
  
  // Criar registro de mensagem agendada
  const { data: scheduledMsg, error: scheduleError } = await supabase
    .from('scheduled_messages')
    .insert([
      {
        contact_id: contactId,
        sequence_id: sequence.id,
        stage_id: stage.id,
        raw_scheduled_time: scheduledTime.toISOString(),
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending'
      }
    ])
    .select();
  
  if (scheduleError) {
    console.error(`[5. SEQUÊNCIAS] Erro ao agendar mensagem:`, scheduleError);
    throw scheduleError;
  }
  
  console.log(`[5. SEQUÊNCIAS] Mensagem agendada com sucesso para ${scheduledTime.toISOString()}, ID: ${scheduledMsg[0].id}`);
  
  return scheduledMsg[0];
}
