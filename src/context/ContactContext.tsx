
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Contact, ContactSequence, DailyStats, ScheduledMessage } from "@/types";
import { ContactContextType } from "@/types/context";
import { toast } from "sonner";

const defaultContextValue: ContactContextType = {
  contacts: [],
  contactSequences: [],
  stats: [],
  scheduledMessages: [],
  isLoading: false,
  lastError: null,
  loadContacts: async () => {},
  loadContactSequences: async () => {},
  loadStats: async () => {},
  loadScheduledMessages: async () => {},
  addContact: async () => ({ success: false }),
  updateContact: async () => ({ success: false }),
  deleteContact: async () => ({ success: false }),
  updateContactSequence: async () => ({ success: false }),
  removeFromSequence: async () => ({ success: false }),
  refreshContactData: async () => {},
};

export const ContactContext = createContext<ContactContextType>(defaultContextValue);

export const ContactProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { currentInstance } = useApp();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadContacts = async () => {
    if (!user || !currentInstance) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_tags(tag_name)
        `)
        .eq('client_id', currentInstance.clientId);
      
      if (error) throw error;
      
      // Transform data to match our Contact interface
      const transformedContacts: Contact[] = data.map((contact: any) => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone_number,
        clientId: contact.client_id,
        inboxId: contact.inbox_id,
        conversationId: contact.conversation_id,
        displayId: contact.display_id,
        tags: contact.contact_tags ? contact.contact_tags.map((tag: any) => tag.tag_name) : [],
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      }));
      
      setContacts(transformedContacts);
    } catch (error: any) {
      console.error("Error loading contacts:", error);
      setLastError(error.message);
      toast.error("Error loading contacts: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContactSequences = async () => {
    if (!user || !currentInstance) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('contact_sequences')
        .select(`
          *,
          sequences(instance_id)
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Filter sequences by current instance
      const filteredSequences = data.filter(
        (seq: any) => seq.sequences && seq.sequences.instance_id === currentInstance.id
      );
      
      const transformedSequences: ContactSequence[] = filteredSequences.map((seq: any) => ({
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
      
      setContactSequences(transformedSequences);
    } catch (error: any) {
      console.error("Error loading contact sequences:", error);
      setLastError(error.message);
      toast.error("Error loading sequences: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user || !currentInstance) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('instance_id', currentInstance.id)
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      
      const transformedStats: DailyStats[] = data.map((stat: any) => ({
        date: stat.date,
        instanceId: stat.instance_id,
        messagesScheduled: stat.messages_scheduled,
        messagesSent: stat.messages_sent,
        messagesFailed: stat.messages_failed,
        newContacts: stat.new_contacts,
        completedSequences: stat.completed_sequences
      }));
      
      setStats(transformedStats);
    } catch (error: any) {
      console.error("Error loading stats:", error);
      setLastError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScheduledMessages = async () => {
    if (!user || !currentInstance) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select(`
          *,
          sequences(instance_id)
        `)
        .in('status', ['waiting', 'pending', 'processing'])
        .order('scheduled_time', { ascending: true });
      
      if (error) throw error;
      
      // Filter messages by current instance
      const filteredMessages = data.filter(
        (msg: any) => msg.sequences && msg.sequences.instance_id === currentInstance.id
      );
      
      const transformedMessages: ScheduledMessage[] = filteredMessages.map((msg: any) => ({
        id: msg.id,
        contactId: msg.contact_id,
        sequenceId: msg.sequence_id,
        stageId: msg.stage_id,
        scheduledTime: msg.scheduled_time,
        scheduledAt: msg.scheduled_at,
        sentAt: msg.sent_at,
        status: msg.status,
        attempts: msg.attempts || 0,
        variables: msg.variables || {},
        processedContent: msg.processed_content
      }));
      
      setScheduledMessages(transformedMessages);
    } catch (error: any) {
      console.error("Error loading scheduled messages:", error);
      setLastError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for CRUD operations
  const addContact = async (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: contact.name,
          phone_number: contact.phoneNumber,
          client_id: contact.clientId,
          inbox_id: contact.inboxId,
          conversation_id: contact.conversationId,
          display_id: contact.displayId
        })
        .select();
      
      if (error) throw error;
      
      // Add tags if provided
      if (contact.tags && contact.tags.length > 0) {
        const tagInserts = contact.tags.map(tag => ({
          contact_id: data[0].id,
          tag_name: tag
        }));
        
        const { error: tagError } = await supabase
          .from('contact_tags')
          .insert(tagInserts);
        
        if (tagError) throw tagError;
      }
      
      // Refresh contacts
      await loadContacts();
      
      return { success: true };
    } catch (error: any) {
      console.error("Error adding contact:", error);
      return { success: false, error: error.message };
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.phoneNumber) updateData.phone_number = updates.phoneNumber;
      if (updates.clientId) updateData.client_id = updates.clientId;
      
      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Update tags if provided
      if (updates.tags) {
        // First delete existing tags
        const { error: deleteError } = await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', id);
        
        if (deleteError) throw deleteError;
        
        // Then add new tags
        if (updates.tags.length > 0) {
          const tagInserts = updates.tags.map(tag => ({
            contact_id: id,
            tag_name: tag
          }));
          
          const { error: tagError } = await supabase
            .from('contact_tags')
            .insert(tagInserts);
          
          if (tagError) throw tagError;
        }
      }
      
      // Refresh contacts after update
      await loadContacts();
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating contact:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteContact = async (id: string) => {
    try {
      // First delete contact tags
      const { error: tagError } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', id);
      
      if (tagError) throw tagError;
      
      // Then delete contact sequences
      const { error: seqError } = await supabase
        .from('contact_sequences')
        .delete()
        .eq('contact_id', id);
      
      if (seqError) throw seqError;
      
      // Finally delete the contact
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh contacts after deletion
      setContacts(prevContacts => prevContacts.filter(contact => contact.id !== id));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      return { success: false, error: error.message };
    }
  };

  const updateContactSequence = async (id: string, updates: Partial<ContactSequence>) => {
    try {
      const updateData: any = {};
      
      if (updates.status) updateData.status = updates.status;
      if (updates.currentStageIndex !== undefined) updateData.current_stage_index = updates.currentStageIndex;
      if (updates.currentStageId) updateData.current_stage_id = updates.currentStageId;
      
      const { error } = await supabase
        .from('contact_sequences')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh contact sequences
      await loadContactSequences();
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating contact sequence:", error);
      return { success: false, error: error.message };
    }
  };

  const removeFromSequence = async (contactSequenceId: string) => {
    try {
      const { error } = await supabase
        .from('contact_sequences')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString()
        })
        .eq('id', contactSequenceId);
      
      if (error) throw error;
      
      // Refresh contact sequences
      await loadContactSequences();
      
      return { success: true };
    } catch (error: any) {
      console.error("Error removing from sequence:", error);
      return { success: false, error: error.message };
    }
  };

  const refreshContactData = async () => {
    await Promise.all([
      loadContacts(),
      loadContactSequences(),
      loadStats(),
      loadScheduledMessages()
    ]);
  };

  // Initialize data when currentInstance changes
  useEffect(() => {
    if (currentInstance) {
      refreshContactData();
    }
  }, [currentInstance]);

  const value: ContactContextType = {
    contacts,
    contactSequences,
    stats,
    scheduledMessages,
    isLoading,
    lastError,
    loadContacts,
    loadContactSequences,
    loadStats,
    loadScheduledMessages,
    addContact,
    updateContact,
    deleteContact,
    updateContactSequence,
    removeFromSequence,
    refreshContactData
  };

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
};

export const useContact = () => {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error("useContact must be used within a ContactProvider");
  }
  return context;
};
