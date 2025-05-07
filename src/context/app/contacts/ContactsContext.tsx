
import { createContext, useContext, useState } from "react";
import { Contact, ContactSequence } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { createContactFunctions, AppContactFunctions } from '@/context/AppContact';

interface ContactsContextType {
  contacts: Contact[];
  contactSequences: ContactSequence[];
  setContacts: (contacts: Contact[]) => void;
  setContactSequences: (sequences: ContactSequence[]) => void;
  addContact: (contact: Contact) => Promise<void>;
  getContactSequences: (contactId: string) => ContactSequence[];
  refreshContacts: () => Promise<void>;
  deleteContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  updateContact: (contactId: string, data: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  removeFromSequence: (contactSequenceId: string) => Promise<{ success: boolean; error?: string }>;
  updateContactSequence: (contactSequenceId: string, data: {
    sequenceId?: string;
    currentStageId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const contactFunctions = createContactFunctions();

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
      
      // Start fetching contact_tag data
      const contactPromises = contactsData.map(async (contact) => {
        // Fetch contact tags
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
      
      // Resolve all promises
      const typedContacts = (await Promise.all(contactPromises)).filter(Boolean) as Contact[];
      setContacts(typedContacts);
      
      // Fetch contact sequences and their progress
      const { data: contactSeqsData, error: contactSeqsError } = await supabase
        .from('contact_sequences')
        .select('*');
      
      if (contactSeqsError) throw contactSeqsError;
      
      // Start fetching stage progress for each contact sequence
      const contactSeqPromises = contactSeqsData.map(async (contactSeq) => {
        // Fetch stage progress for this contact sequence
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
      
      // Resolve all contact sequence promises
      const typedContactSeqs = (await Promise.all(contactSeqPromises)).filter(Boolean) as ContactSequence[];
      setContactSequences(typedContactSeqs);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error(`Erro ao carregar contatos: ${error.message}`);
    }
  };

  const addContact = async (contactData: Contact) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          id: contactData.id,
          name: contactData.name,
          phone_number: contactData.phoneNumber,
          client_id: contactData.clientId,
          inbox_id: contactData.inboxId,
          conversation_id: contactData.conversationId,
          display_id: contactData.displayId
        });
      
      if (error) throw error;
      
      // Add tags
      if (contactData.tags && contactData.tags.length > 0) {
        for (const tag of contactData.tags) {
          // Check if tag exists
          const { data: existingTag } = await supabase
            .from('tags')
            .select('name')
            .eq('name', tag)
            .maybeSingle();
          
          // Add tag if it doesn't exist
          if (!existingTag && currentUser) {
            await supabase
              .from('tags')
              .insert({
                name: tag,
                created_by: currentUser.id
              });
          }
          
          // Add tag relation to contact
          const { error: tagError } = await supabase
            .from('contact_tags')
            .insert({
              contact_id: contactData.id,
              tag_name: tag
            });
          
          if (tagError) console.error("Error adding tag:", tagError);
        }
      }
      
      await refreshContacts();
      toast.success("Contato adicionado com sucesso");
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error(`Erro ao adicionar contato: ${error.message}`);
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
      refreshContacts,
      deleteContact: contactFunctions.deleteContact,
      updateContact: contactFunctions.updateContact,
      removeFromSequence: contactFunctions.removeFromSequence,
      updateContactSequence: contactFunctions.updateContactSequence
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
