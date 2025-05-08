import { createContext, useContext } from 'react';
import { Contact, ContactSequence } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

// Interface para funções relacionadas a contatos
export interface AppContactFunctions {
  deleteContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  updateContact: (contactId: string, data: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  removeFromSequence: (contactSequenceId: string) => Promise<{ success: boolean; error?: string }>;
  updateContactSequence: (contactSequenceId: string, data: {
    sequenceId?: string;
    currentStageId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

// Implementação das funções de contato
export const createContactFunctions = (): AppContactFunctions => {
  // Deletar um contato
  const deleteContact = async (contactId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Primeiro, remover o contato de todas as sequências
      const { error: seqError } = await supabase
        .from('contact_sequences')
        .delete()
        .eq('contact_id', contactId);

      if (seqError) throw new Error(`Erro ao remover sequências: ${seqError.message}`);

      // Remover tags do contato
      const { error: tagError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId);
      
      if (tagError) throw new Error(`Erro ao remover tags: ${tagError.message}`);

      // Remover mensagens agendadas
      const { error: msgError } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('contact_id', contactId);
      
      if (msgError) throw new Error(`Erro ao remover mensagens: ${msgError.message}`);

      // Finalmente, remover o contato
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw new Error(`Erro ao deletar contato: ${error.message}`);
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao deletar contato:", error);
      return { success: false, error: error.message };
    }
  };

  // Atualizar um contato
  const updateContact = async (contactId: string, data: Partial<Contact>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: data.name,
          phone_number: data.phoneNumber
        })
        .eq('id', contactId);

      if (error) throw new Error(`Erro ao atualizar contato: ${error.message}`);
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar contato:", error);
      return { success: false, error: error.message };
    }
  };

  // Remover um contato de uma sequência
  const removeFromSequence = async (contactSequenceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Obter dados da sequência do contato para fazer operações relacionadas
      const { data: seqData, error: seqError } = await supabase
        .from('contact_sequences')
        .select('contact_id, sequence_id, current_stage_id')
        .eq('id', contactSequenceId)
        .single();
      
      if (seqError) throw new Error(`Erro ao obter dados da sequência: ${seqError.message}`);
      
      // Deletar mensagens agendadas para este contato nesta sequência
      const { error: msgError } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('contact_id', seqData.contact_id)
        .eq('sequence_id', seqData.sequence_id);
        
      if (msgError) throw new Error(`Erro ao remover mensagens agendadas: ${msgError.message}`);
      
      // Atualizar o status na tabela stage_progress para "removed" onde o status for "pending"
      const { error: progError } = await supabase
        .from('stage_progress')
        .update({ status: 'removed' })
        .eq('contact_sequence_id', contactSequenceId)
        .eq('status', 'pending');
        
      if (progError) throw new Error(`Erro ao atualizar progresso do estágio: ${progError.message}`);
      
      // Atualizar o status para "removed" e definir removed_at
      const { error } = await supabase
        .from('contact_sequences')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString()
        })
        .eq('id', contactSequenceId);

      if (error) throw new Error(`Erro ao remover contato da sequência: ${error.message}`);
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao remover contato da sequência:", error);
      return { success: false, error: error.message };
    }
  };

  // Atualizar a sequência ou estágio de um contato
  const updateContactSequence = async (contactSequenceId: string, data: {
    sequenceId?: string;
    currentStageId?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const updateData: any = {};
      let stageData: any = null; // Declare stageData at the function scope level
      
      if (data.currentStageId) {
        updateData.current_stage_id = data.currentStageId;
      }
      
      if (Object.keys(updateData).length === 0) {
        return { success: false, error: "Nenhum dado fornecido para atualização" };
      }

      // Obter contato_id e sequence_id para atualizar mensagens agendadas
      const { data: seqData, error: seqError } = await supabase
        .from('contact_sequences')
        .select('contact_id, sequence_id, current_stage_id, current_stage_index')
        .eq('id', contactSequenceId)
        .single();
      
      if (seqError) throw new Error(`Erro ao obter dados da sequência: ${seqError.message}`);

      // Obter informações sobre o estágio de destino
      if (data.currentStageId) {
        // Obter informações do estágio selecionado
        const { data: fetchedStageData, error: stageError } = await supabase
          .from('sequence_stages')
          .select('id, order_index, delay, delay_unit')
          .eq('id', data.currentStageId)
          .single();
        
        if (stageError) throw new Error(`Erro ao obter dados do estágio: ${stageError.message}`);
        
        // Assign the fetched data to our function-scoped variable
        stageData = fetchedStageData;
        
        // Agora atualizamos também o current_stage_index com base no estágio selecionado
        updateData.current_stage_index = stageData.order_index;
        
        // Verificar se estamos pulando estágios
        if (seqData.current_stage_id !== data.currentStageId) {
          // Obter todos os estágios da sequência para determinar quais foram pulados
          const { data: allStages, error: allStagesError } = await supabase
            .from('sequence_stages')
            .select('id, order_index')
            .eq('sequence_id', seqData.sequence_id)
            .order('order_index', { ascending: true });
          
          if (allStagesError) throw new Error(`Erro ao obter estágios da sequência: ${allStagesError.message}`);
          
          // Encontrar índices dos estágios atual e de destino
          const currentStageInfo = allStages.find(s => s.id === seqData.current_stage_id);
          const targetStageInfo = allStages.find(s => s.id === data.currentStageId);
          
          if (currentStageInfo && targetStageInfo && targetStageInfo.order_index > currentStageInfo.order_index) {
            // Identificar estágios que serão pulados (entre o atual e o destino)
            const skippedStages = allStages.filter(s => 
              s.order_index > currentStageInfo.order_index && 
              s.order_index < targetStageInfo.order_index
            );
            
            // Marcar os estágios pulados como "skipped" em stage_progress
            for (const stage of skippedStages) {
              // Verificar se já existe um registro para este estágio
              const { data: existingProgress } = await supabase
                .from('stage_progress')
                .select('id, status')
                .eq('contact_sequence_id', contactSequenceId)
                .eq('stage_id', stage.id)
                .maybeSingle();
              
              if (existingProgress) {
                // Atualizar para skipped se não estiver completed
                if (existingProgress.status !== 'completed') {
                  await supabase
                    .from('stage_progress')
                    .update({ status: 'skipped' })
                    .eq('id', existingProgress.id);
                }
              } else {
                // Inserir novo registro como skipped
                await supabase
                  .from('stage_progress')
                  .insert({
                    contact_sequence_id: contactSequenceId,
                    stage_id: stage.id,
                    status: 'skipped'
                  });
              }
            }
            
            // Também marcar o estágio atual como skipped se estamos movendo para um estágio posterior
            if (seqData.current_stage_id) {
              // Verificar se já existe um registro para o estágio atual
              const { data: currentProgress } = await supabase
                .from('stage_progress')
                .select('id, status')
                .eq('contact_sequence_id', contactSequenceId)
                .eq('stage_id', seqData.current_stage_id)
                .maybeSingle();
                
              if (currentProgress) {
                // Atualizar para skipped se não estiver completed
                if (currentProgress.status !== 'completed') {
                  await supabase
                    .from('stage_progress')
                    .update({ status: 'skipped' })
                    .eq('id', currentProgress.id);
                }
              } else {
                // Inserir novo registro como skipped
                await supabase
                  .from('stage_progress')
                  .insert({
                    contact_sequence_id: contactSequenceId,
                    stage_id: seqData.current_stage_id,
                    status: 'skipped'
                  });
              }
            }
          }
        }
      }

      // Atualizar o estágio na tabela contact_sequences
      const { error } = await supabase
        .from('contact_sequences')
        .update(updateData)
        .eq('id', contactSequenceId);

      if (error) throw new Error(`Erro ao atualizar sequência do contato: ${error.message}`);
      
      // Se estamos atualizando o estágio, também precisamos atualizar as mensagens agendadas
      if (data.currentStageId && stageData) { // Check if stageData exists
        // Deletar mensagens agendadas pendentes para este contato nesta sequência
        const { error: deleteError } = await supabase
          .from('scheduled_messages')
          .delete()
          .eq('contact_id', seqData.contact_id)
          .eq('sequence_id', seqData.sequence_id)
          .in('status', ['pending', 'processing']);
        
        if (deleteError) {
          console.error("Erro ao excluir mensagens agendadas antigas:", deleteError);
          // Continuamos mesmo com erro para tentar a atualização
        }

        // Adicionar registro de progresso do estágio
        const { error: progressError } = await supabase
          .from('stage_progress')
          .insert([{
            contact_sequence_id: contactSequenceId,
            stage_id: data.currentStageId,
            status: 'pending'
          }]);
        
        if (progressError) {
          console.error(`Erro ao adicionar progresso do estágio: ${progressError.message}`);
        }
        
        // Calcular o tempo de agendamento da mensagem usando os dados do estágio obtidos
        const delayMs = calculateDelayMs(stageData.delay, stageData.delay_unit);
        const scheduledTime = new Date(Date.now() + delayMs);
        
        // Agendar a mensagem para o estágio selecionado
        const { error: scheduleError } = await supabase
          .from('scheduled_messages')
          .insert([{
            contact_id: seqData.contact_id,
            sequence_id: seqData.sequence_id,
            stage_id: data.currentStageId,
            raw_scheduled_time: scheduledTime.toISOString(),
            scheduled_time: scheduledTime.toISOString(),
            status: 'pending'
          }]);
        
        if (scheduleError) throw new Error(`Erro ao agendar nova mensagem: ${scheduleError.message}`);
        
        console.log(`Mensagem agendada com sucesso para ${scheduledTime.toISOString()}`);
        
        // Obter o ID da instância a partir da sequência
        const { data: sequenceData, error: sequenceError } = await supabase
          .from('sequences')
          .select('instance_id')
          .eq('id', seqData.sequence_id)
          .single();
          
        if (sequenceError) {
          console.error(`Erro ao obter instância da sequência: ${sequenceError.message}`);
        } else {
          // Incrementar estatísticas diárias usando upsert
          try {
            // Verificar se já existe um registro para este dia e instância
            const today = new Date().toISOString().split('T')[0];
            const { data: existingStats } = await supabase
              .from('daily_stats')
              .select('*')
              .eq('instance_id', sequenceData.instance_id)
              .eq('date', today)
              .maybeSingle();
              
            if (existingStats) {
              // Se existe, fazer update
              const { error: updateError } = await supabase
                .from('daily_stats')
                .update({
                  messages_scheduled: existingStats.messages_scheduled + 1
                })
                .eq('id', existingStats.id);
                
              if (updateError) {
                console.error(`[ESTATÍSTICAS] Erro ao atualizar estatísticas: ${updateError.message}`);
              }
            } else {
              // Se não existe, criar um novo
              const { error: insertError } = await supabase
                .from('daily_stats')
                .insert([{
                  instance_id: sequenceData.instance_id,
                  date: today,
                  messages_scheduled: 1,
                  messages_sent: 0,
                  messages_failed: 0,
                  completed_sequences: 0,
                  new_contacts: 0
                }]);
                
              if (insertError) {
                console.error(`[ESTATÍSTICAS] Erro ao inserir estatísticas: ${insertError.message}`);
              }
            }
          } catch (statsError) {
            console.error(`[ESTATÍSTICAS] Erro ao incrementar estatísticas: ${statsError}`);
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar sequência do contato:", error);
      return { success: false, error: error.message };
    }
  };

  // Função auxiliar para calcular o atraso em milissegundos
  const calculateDelayMs = (delay: number, unit: string): number => {
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
  };

  return {
    deleteContact,
    updateContact,
    removeFromSequence,
    updateContactSequence
  };
};

// Criação do contexto com valores padrão
const AppContactContext = createContext<AppContactFunctions>({
  deleteContact: async () => ({ success: false, error: 'Não implementado' }),
  updateContact: async () => ({ success: false, error: 'Não implementado' }),
  removeFromSequence: async () => ({ success: false, error: 'Não implementado' }),
  updateContactSequence: async () => ({ success: false, error: 'Não implementado' })
});

// Hook para utilizar o contexto
export const useAppContact = () => useContext(AppContactContext);

export default AppContactContext;
