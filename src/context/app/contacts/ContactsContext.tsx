
import { createContext, useContext, useState } from "react";
import { Contact, ContactSequence } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface ContactsContextType {
  contacts: Contact[];
  contactSequences: ContactSequence[];
  setContacts: (contacts: Contact[]) => void;
  setContactSequences: (contactSequences: ContactSequence[]) => void;
  addContact: (contact: Contact) => void;
  getContactSequences: (contactId: string) => ContactSequence[];
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
  refreshContacts: () => Promise<void>;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);

  // Get contact sequences helper function
  const getContactSequences = (contactId: string): ContactSequence[] => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };

  const refreshContacts = async () => {
    try {
      if (!currentUser) return;
      
      // Fetch contacts and their tags
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*');
      
      if (contactsError) throw contactsError;
      
      // Iniciar a busca de dados de contato_tag
      const contactPromises = contactsData.map(async (contact) => {
        // Buscar tags deste contato
        const { data: contactTagsData, error: contactTagsError } = await supabase
          .from('contact_tags')
          .select('tag_name')
          .eq('contact_id', contact.id);
          
        if (contactTagsError) {
          console.error(`Erro ao buscar tags do contato ${contact.id}:`, contactTagsError);
          return null;
        }
        
        const contactTags = contactTagsData.map(ct => ct.tag_name);
        
        return {
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phone_number,
          clientId: contact.client_id,
          inboxId: contact.inbox_id,
          conversationId: contact.conversation_id,
          displayId: contact.display_id,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at,
          tags: contactTags
        };
      });
      
      // Resolver todas as promessas
      const typedContacts = (await Promise.all(contactPromises)).filter(Boolean) as Contact[];
      setContacts(typedContacts);
      
      // Fetch contact sequences and their progress
      const { data: contactSeqsData, error: contactSeqsError } = await supabase
        .from('contact_sequences')
        .select('*');
      
      if (contactSeqsError) throw contactSeqsError;
      
      // Iniciar a busca de progresso de estágios para cada sequência de contato
      const contactSeqPromises = contactSeqsData.map(async (contactSeq) => {
        // Buscar progresso de estágio para esta sequência de contato
        const { data: progressData, error: progressError } = await supabase
          .from('stage_progress')
          .select('*')
          .eq('contact_sequence_id', contactSeq.id);
          
        if (progressError) {
          console.error(`Erro ao buscar progresso de estágios para sequência ${contactSeq.id}:`, progressError);
          return null;
        }
        
        const stageProgress = progressData.map(progress => ({
          id: progress.id,
          stageId: progress.stage_id,
          status: progress.status,
          completedAt: progress.completed_at
        }));
        
        return {
          id: contactSeq.id,
          contactId: contactSeq.contact_id,
          sequenceId: contactSeq.sequence_id,
          currentStageId: contactSeq.current_stage_id,
          currentStageIndex: contactSeq.current_stage_index,
          status: contactSeq.status,
          startedAt: contactSeq.started_at,
          completedAt: contactSeq.completed_at,
          lastMessageAt: contactSeq.last_message_at,
          removedAt: contactSeq.removed_at,
          stageProgress
        };
      });
      
      // Resolver todas as promessas de sequências de contato
      const typedContactSeqs = (await Promise.all(contactSeqPromises)).filter(Boolean) as ContactSequence[];
      setContactSequences(typedContactSeqs);
      
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error(`Erro ao carregar contatos: ${error.message}`);
    }
  };

  const addContact = (contact: Contact) => {
    setContacts(prev => [...prev, contact]);
  };

  // Contact manipulation functions
  const deleteContact = async (contactId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if contact exists
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) {
        return { success: false, error: "Contato não encontrado" };
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      // Update local state
      setContacts(prev => prev.filter(c => c.id !== contactId));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      return { success: false, error: error.message };
    }
  };

  const updateContact = async (contactId: string, data: Partial<Contact>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: data.name,
          phone_number: data.phoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (error) throw error;

      // Handle tags update if provided
      if (data.tags) {
        // First delete all existing tags
        const { error: deleteError } = await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', contactId);

        if (deleteError) throw deleteError;

        // Then add new tags
        if (data.tags.length > 0) {
          const tagInserts = data.tags.map(tag => ({
            contact_id: contactId,
            tag_name: tag
          }));

          const { error: insertError } = await supabase
            .from('contact_tags')
            .insert(tagInserts);

          if (insertError) throw insertError;
        }
      }

      // Update local state
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId ? { ...contact, ...data } : contact
        )
      );

      return { success: true };
    } catch (error: any) {
      console.error("Error updating contact:", error);
      return { success: false, error: error.message };
    }
  };

  const removeFromSequence = async (contactSequenceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('contact_sequences')
        .update({
          removed_at: new Date().toISOString(),
          status: 'removed'
        })
        .eq('id', contactSequenceId);

      if (error) throw error;

      // Update local state
      setContactSequences(prev => 
        prev.map(cs => 
          cs.id === contactSequenceId 
            ? { ...cs, removedAt: new Date().toISOString(), status: 'removed' } 
            : cs
        )
      );

      return { success: true };
    } catch (error: any) {
      console.error("Error removing contact from sequence:", error);
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
      const updates: any = {};
      if (data.sequenceId) updates.sequence_id = data.sequenceId;
      if (data.currentStageId) updates.current_stage_id = data.currentStageId;

      const { error } = await supabase
        .from('contact_sequences')
        .update(updates)
        .eq('id', contactSequenceId);

      if (error) throw error;

      // Update local state
      setContactSequences(prev => 
        prev.map(cs => 
          cs.id === contactSequenceId 
            ? { 
                ...cs, 
                sequenceId: data.sequenceId || cs.sequenceId,
                currentStageId: data.currentStageId || cs.currentStageId
              } 
            : cs
        )
      );

      return { success: true };
    } catch (error: any) {
      console.error("Error updating contact sequence:", error);
      return { success: false, error: error.message };
    }
  };

  return (
    <ContactsContext.Provider value={{
      contacts,
      contactSequences,
      setContacts,
      setContactSequences,
      addContact,
      getContactSequences,
      deleteContact,
      updateContact,
      removeFromSequence,
      updateContactSequence,
      refreshContacts
    }}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error("useContacts must be used within a ContactsProvider");
  }
  return context;
};
