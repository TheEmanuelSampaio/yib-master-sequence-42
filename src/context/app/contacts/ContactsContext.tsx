
import { createContext, useContext, useState } from "react";
import { Contact, ContactSequence } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface ContactsContextType {
  contacts: Contact[];
  contactSequences: ContactSequence[];
  setContacts: (contacts: Contact[]) => void;
  setContactSequences: (sequences: ContactSequence[]) => void;
  getContactSequences: (contactId: string) => ContactSequence[];
  addContact: (contact: Contact) => void;
  deleteContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  updateContact: (contactId: string, data: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  removeFromSequence: (contactSequenceId: string) => Promise<{ success: boolean; error?: string }>;
  updateContactSequence: (
    contactSequenceId: string, 
    data: { sequenceId?: string; currentStageId?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  refreshContacts: () => Promise<void>;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: React.ReactNode }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  
  const getContactSequences = (contactId: string): ContactSequence[] => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };

  const refreshContacts = async () => {
    try {
      // Fetch contacts and their tags
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_tags (tag_name)
        `)
        .order('created_at', { ascending: false });
      
      if (contactsError) throw contactsError;
      
      // Process contacts data
      const processedContacts = contactsData.map((contact: any) => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone_number,
        clientId: contact.client_id,
        inboxId: contact.inbox_id,
        conversationId: contact.conversation_id,
        displayId: contact.display_id,
        // Ensure tags is always an array
        tags: contact.contact_tags ? contact.contact_tags.map((tag: any) => tag.tag_name) : [],
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      }));
      
      setContacts(processedContacts);
      
      // Fetch contact sequences
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('contact_sequences')
        .select('*')
        .order('started_at', { ascending: false });
      
      if (sequencesError) throw sequencesError;
      
      // Process contact sequences
      const processedSequences = sequencesData.map((seq: any) => ({
        id: seq.id,
        contactId: seq.contact_id,
        sequenceId: seq.sequence_id,
        currentStageIndex: seq.current_stage_index,
        currentStageId: seq.current_stage_id,
        status: seq.status,
        startedAt: seq.started_at,
        lastMessageAt: seq.last_message_at,
        completedAt: seq.completed_at,
        removedAt: seq.removed_at
      }));
      
      setContactSequences(processedSequences);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error(`Erro ao carregar contatos: ${error.message}`);
    }
  };
  
  const addContact = (contact: Contact) => {
    setContacts(prev => [...prev, contact]);
  };
  
  const deleteContact = async (contactId: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);
      
      if (error) throw error;
      
      setContacts(prev => prev.filter(contact => contact.id !== contactId));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      return { success: false, error: error.message };
    }
  };
  
  const updateContact = async (contactId: string, data: Partial<Contact>): Promise<{ success: boolean, error?: string }> => {
    try {
      // Update contact main data
      const updateData: any = {};
      
      if (data.name) updateData.name = data.name;
      if (data.phoneNumber) updateData.phone_number = data.phoneNumber;
      
      // Handle tags separately as they need special handling
      if (data.tags && Array.isArray(data.tags)) {
        // Delete existing tags
        await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', contactId);
        
        // Add new tags
        if (data.tags.length > 0) {
          const tagInserts = data.tags.map(tag => ({
            contact_id: contactId,
            tag_name: tag
          }));
          
          const { error: tagError } = await supabase
            .from('contact_tags')
            .insert(tagInserts);
          
          if (tagError) throw tagError;
        }
      }
      
      // Only update the contact record if there are fields to update
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', contactId);
        
        if (error) throw error;
      }
      
      // Update the contact in local state
      setContacts(prev => prev.map(contact => 
        contact.id === contactId ? { ...contact, ...data } : contact
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating contact:", error);
      return { success: false, error: error.message };
    }
  };
  
  const removeFromSequence = async (contactSequenceId: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const timestamp = new Date().toISOString();
      
      const { error } = await supabase
        .from('contact_sequences')
        .update({
          status: 'removed',
          removed_at: timestamp
        })
        .eq('id', contactSequenceId);
      
      if (error) throw error;
      
      // Update local state
      setContactSequences(prev => prev.map(seq => 
        seq.id === contactSequenceId ? { ...seq, status: 'removed', removedAt: timestamp } : seq
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error removing contact from sequence:", error);
      return { success: false, error: error.message };
    }
  };
  
  const updateContactSequence = async (
    contactSequenceId: string, 
    data: { sequenceId?: string; currentStageId?: string }
  ): Promise<{ success: boolean, error?: string }> => {
    try {
      const updateData: any = {};
      
      if (data.sequenceId) updateData.sequence_id = data.sequenceId;
      if (data.currentStageId) updateData.current_stage_id = data.currentStageId;
      
      const { error } = await supabase
        .from('contact_sequences')
        .update(updateData)
        .eq('id', contactSequenceId);
      
      if (error) throw error;
      
      // Update local state
      setContactSequences(prev => prev.map(seq => 
        seq.id === contactSequenceId 
          ? { 
              ...seq, 
              sequenceId: data.sequenceId || seq.sequenceId,
              currentStageId: data.currentStageId || seq.currentStageId
            } 
          : seq
      ));
      
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
      getContactSequences,
      addContact,
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
