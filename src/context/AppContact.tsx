
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
      // Atualizar o status para "removed" e definir removed_at
      const { error } = await supabase
        .from('contact_sequences')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString()
        })
        .eq('id', contactSequenceId);

      if (error) throw new Error(`Erro ao remover contato da sequência: ${error.message}`);
      
      // Remover mensagens agendadas para esta sequência
      const { data: seqData, error: seqError } = await supabase
        .from('contact_sequences')
        .select('contact_id, sequence_id')
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
      
      if (data.currentStageId) {
        updateData.current_stage_id = data.currentStageId;
      }
      
      if (Object.keys(updateData).length === 0) {
        return { success: false, error: "Nenhum dado fornecido para atualização" };
      }

      const { error } = await supabase
        .from('contact_sequences')
        .update(updateData)
        .eq('id', contactSequenceId);

      if (error) throw new Error(`Erro ao atualizar sequência do contato: ${error.message}`);
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar sequência do contato:", error);
      return { success: false, error: error.message };
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
