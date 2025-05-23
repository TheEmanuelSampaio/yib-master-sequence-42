
import { createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Contact, ContactSequence } from "@/types";
import { toast } from "@/hooks/use-toast";
import { usePagedData } from "@/hooks/use-paged-data";
import { queryClient } from "@/lib/queryClient";

interface ContactContextType {
  contacts: Contact[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  refreshContacts: () => void;
  deleteContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  updateContact: (contactId: string, data: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  removeFromSequence: (contactSequenceId: string) => Promise<{ success: boolean; error?: string }>;
  updateContactSequence: (
    contactSequenceId: string,
    data: {
      sequenceId?: string;
      currentStageId?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  getContactSequences: (contactId: string) => Promise<ContactSequence[]>;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export function ContactProvider({ children, pageSize = 10 }: { children: ReactNode, pageSize?: number }) {
  const {
    data: contacts,
    isLoading,
    page,
    totalPages,
    nextPage,
    previousPage,
    goToPage,
    refetch
  } = usePagedData<Contact>({
    pageSize,
    queryKey: ["contacts"],
    tableName: "contacts",
    orderBy: { column: "created_at", ascending: false },
    select: "*",
  });

  const refreshContacts = () => {
    refetch();
  };

  const deleteContact = async (contactId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      // Invalidate the query cache to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato excluído com sucesso");
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error(`Erro ao excluir contato: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const updateContact = async (contactId: string, data: Partial<Contact>): Promise<{ success: boolean; error?: string }> => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
      if (data.clientId !== undefined) updateData.client_id = data.clientId;

      const { error } = await supabase
        .from("contacts")
        .update(updateData)
        .eq("id", contactId);

      if (error) throw error;

      // Update tags if provided
      if (data.tags) {
        // First delete existing tags
        const { error: tagDeleteError } = await supabase
          .from("contact_tags")
          .delete()
          .eq("contact_id", contactId);

        if (tagDeleteError) throw tagDeleteError;

        // Then add new tags
        if (data.tags.length > 0) {
          const tagInserts = data.tags.map(tag => ({
            contact_id: contactId,
            tag_name: tag,
          }));

          const { error: tagInsertError } = await supabase
            .from("contact_tags")
            .insert(tagInserts);

          if (tagInsertError) throw tagInsertError;
        }
      }

      // Invalidate the query cache to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato atualizado com sucesso");
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast.error(`Erro ao atualizar contato: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const removeFromSequence = async (contactSequenceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("contact_sequences")
        .update({
          removed_at: new Date().toISOString(),
          status: "removed",
        })
        .eq("id", contactSequenceId);

      if (error) throw error;

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contactSequences"] });
      toast.success("Contato removido da sequência");
      
      return { success: true };
    } catch (error: any) {
      console.error("Error removing contact from sequence:", error);
      toast.error(`Erro ao remover contato da sequência: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const updateContactSequence = async (
    contactSequenceId: string,
    data: {
      sequenceId?: string;
      currentStageId?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("contact_sequences")
        .update(data)
        .eq("id", contactSequenceId);

      if (error) throw error;

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contactSequences"] });
      toast.success("Sequência do contato atualizada");
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating contact sequence:", error);
      toast.error(`Erro ao atualizar sequência do contato: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const getContactSequences = async (contactId: string): Promise<ContactSequence[]> => {
    try {
      const { data, error } = await supabase
        .from("contact_sequences")
        .select("*")
        .eq("contact_id", contactId);

      if (error) throw error;

      // Fetch stage progress for each sequence
      const result = await Promise.all(
        data.map(async (seq) => {
          const { data: progressData, error: progressError } = await supabase
            .from("stage_progress")
            .select("*")
            .eq("contact_sequence_id", seq.id);

          if (progressError) throw progressError;

          // Transform to the expected format
          return {
            id: seq.id,
            contactId: seq.contact_id,
            sequenceId: seq.sequence_id,
            currentStageId: seq.current_stage_id,
            currentStageIndex: seq.current_stage_index,
            status: seq.status,
            startedAt: seq.started_at,
            completedAt: seq.completed_at,
            lastMessageAt: seq.last_message_at,
            removedAt: seq.removed_at,
            stageProgress: (progressData || []).map(progress => ({
              id: progress.id,
              stageId: progress.stage_id,
              status: progress.status,
              completedAt: progress.completed_at,
            })),
          };
        })
      );

      return result;
    } catch (error) {
      console.error("Error fetching contact sequences:", error);
      return [];
    }
  };

  return (
    <ContactContext.Provider
      value={{
        contacts,
        isLoading,
        page,
        totalPages,
        nextPage,
        previousPage,
        goToPage,
        refreshContacts,
        deleteContact,
        updateContact,
        removeFromSequence,
        updateContactSequence,
        getContactSequences,
      }}
    >
      {children}
    </ContactContext.Provider>
  );
}

export const useContacts = (): ContactContextType => {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error("useContacts must be used within a ContactProvider");
  }
  return context;
};
