import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Contact, ContactSequence, Instance, SequenceStage } from '@/types';

interface AppContextType {
  contacts: Contact[];
  sequences: Sequence[];
  instances: Instance[];
  contactSequences: ContactSequence[];
  currentInstance: Instance | null;
  setCurrentInstance: (instance: Instance | null) => void;
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean; error?: string }>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  deleteContact: (id: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean; error?: string }>;
  updateSequence: (id: string, sequence: Partial<Sequence>) => Promise<{ success: boolean; error?: string }>;
  deleteSequence: (id: string) => Promise<void>;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean; error?: string }>;
  updateInstance: (id: string, updates: Partial<Instance>) => Promise<{ success: boolean; error?: string }>;
  deleteInstance: (id: string) => Promise<void>;
  addContactSequence: (contactSequence: Omit<ContactSequence, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean; error?: string }>;
  updateContactSequence: (id: string, updates: Partial<ContactSequence>) => Promise<{ success: boolean; error?: string }>;
  deleteContactSequence: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  isDataInitialized: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  
  useEffect(() => {
    console.log("Initial data load triggered");
    refreshData();
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      console.log("Refreshing data...");
      
      // Fetch Instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*');
      
      if (instancesError) {
        console.error("Error fetching instances:", instancesError);
      } else {
        const typedInstances: Instance[] = instancesData ? instancesData.map(item => ({
          id: item.id,
          name: item.name,
          apiKey: item.api_key,
          phoneNumberId: item.phone_number_id,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          userId: item.user_id
        })) : [];
        setInstances(typedInstances);
        
        // Auto-select the first instance if available
        if (!currentInstance && typedInstances.length > 0) {
          setCurrentInstance(typedInstances[0]);
        }
      }

      // Fetch Contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*');
      
      if (contactsError) {
        console.error("Error fetching contacts:", contactsError);
      } else {
        const typedContacts: Contact[] = contactsData ? contactsData.map(item => ({
          id: item.id,
          instanceId: item.instance_id,
          name: item.name,
          phoneNumber: item.phone_number,
          tags: item.tags || [],
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })) : [];
        setContacts(typedContacts);
      }

      // Fetch Sequences
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select('*');
      
      if (sequencesError) {
        console.error("Error fetching sequences:", sequencesError);
      } else {
        const typedSequences: Sequence[] = sequencesData ? sequencesData.map(item => ({
          id: item.id,
          instanceId: item.instance_id,
          name: item.name,
          type: item.type,
          startCondition: {
            type: item.start_condition_type,
            tags: item.start_condition_tags
          },
          stopCondition: {
            type: item.stop_condition_type,
            tags: item.stop_condition_tags
          },
          stages: [],
          timeRestrictions: [],
          status: item.status,
          webhookEnabled: item.webhook_enabled,
          webhookId: item.webhook_id,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          createdBy: item.created_by
        })) : [];
        setSequences(typedSequences);
      }

      // Fetch Contact Sequences
      const { data: contactSequencesData, error: contactSequencesError } = await supabase
        .from('contact_sequences')
        .select('*');
      
      if (contactSequencesError) {
        console.error("Error fetching contact sequences:", contactSequencesError);
      } else {
        const typedContactSequences: ContactSequence[] = contactSequencesData ? contactSequencesData.map(item => ({
          id: item.id,
          contactId: item.contact_id,
          sequenceId: item.sequence_id,
          currentStageId: item.current_stage_id,
          stageProgress: item.stage_progress,
          status: item.status,
          startedAt: item.started_at,
          completedAt: item.completed_at,
          removedAt: item.removed_at,
          lastMessageAt: item.last_message_at,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })) : [];
        setContactSequences(typedContactSequences);
      }
      
      setIsDataInitialized(true);
      console.log("Data refresh complete.");
    } catch (error) {
      console.error("Error during data refresh:", error);
    }
  }, [currentInstance]);

  // Add a new contact
  const addContact = async (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">): Promise<{ success: boolean; error?: string }> => {
    try {
      // Convert from camelCase to snake_case for the database
      const dbContact = {
        id: uuidv4(),
        instance_id: contact.instanceId,
        name: contact.name,
        phone_number: contact.phoneNumber,
        tags: contact.tags
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert([dbContact]);

      if (error) {
        console.error("Error creating contact:", error);
        return { success: false, error: error.message };
      }

      // Add the new contact to the state using the application's camelCase format
      const newContact: Contact = {
        ...contact,
        id: dbContact.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setContacts(prevContacts => [...prevContacts, newContact]);

      return { success: true };
    } catch (error: any) {
      console.error("Erro ao adicionar contato:", error);
      return { success: false, error: error.message };
    }
  };

  // Update an existing contact
  const updateContact = async (id: string, updates: Partial<Contact>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Convert from camelCase to snake_case for the database
      const dbUpdates: any = {};
      if (updates.instanceId !== undefined) dbUpdates.instance_id = updates.instanceId;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

      const { data, error } = await supabase
        .from('contacts')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error("Error updating contact:", error);
        return { success: false, error: error.message };
      }

      // Update the contact in the state using the application's camelCase format
      setContacts(prevContacts =>
        prevContacts.map(contact => {
          if (contact.id === id) {
            return { ...contact, ...updates, updatedAt: new Date().toISOString() };
          }
          return contact;
        })
      );
      
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao atualizar contato:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete a contact
  const deleteContact = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting contact:", error);
        throw new Error(error.message);
      }

      setContacts(prevContacts => prevContacts.filter(contact => contact.id !== id));
    } catch (error: any) {
      console.error("Erro ao excluir contato:", error);
      throw new Error(error.message);
    }
  };

export interface Sequence {
  id: string;
  instanceId: string;
  name: string;
  type?: "message" | "pattern" | "typebot";
  startCondition: {
    type: "AND" | "OR";
    tags: string[];
  };
  stopCondition: {
    type: "AND" | "OR";
    tags: string[];
  };
  stages: SequenceStage[];
  timeRestrictions?: {
    id: string;
    name: string;
    active: boolean;
    days: number[];
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    isGlobal: boolean;
  }[];
  status: "active" | "inactive";
  webhookEnabled?: boolean;
  webhookId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

  // Add a new sequence
  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">): Promise<{ success: boolean; error?: string }> => {
    try {
      // Make sure the type is "AND" | "OR" for startCondition and stopCondition
      const validStartConditionType = sequence.startCondition.type === "AND" || sequence.startCondition.type === "OR" 
        ? sequence.startCondition.type 
        : "AND";
      
      const validStopConditionType = sequence.stopCondition.type === "AND" || sequence.stopCondition.type === "OR" 
        ? sequence.stopCondition.type 
        : "AND";

      // Convert from camelCase to snake_case for the database
      const dbSequence = {
        id: uuidv4(),
        instance_id: sequence.instanceId,
        name: sequence.name,
        type: sequence.type || "message",
        start_condition_type: validStartConditionType,
        start_condition_tags: sequence.startCondition.tags || [],
        stop_condition_type: validStopConditionType,
        stop_condition_tags: sequence.stopCondition.tags || [],
        status: sequence.status,
        created_by: sequence.createdBy,
        webhook_enabled: sequence.webhookEnabled || false,
        webhook_id: sequence.webhookId
      };

      // Additional logging for debugging
      console.log("Creating sequence with params:", dbSequence);

      const { data, error } = await supabase
        .from('sequences')
        .insert([dbSequence]);

      if (error) {
        console.error("Error creating sequence:", error);
        return { success: false, error: error.message };
      }

      // Add the new sequence to the state using the application's camelCase format
      const newSequence: Sequence = {
        ...sequence,
        id: dbSequence.id,
        startCondition: {
          type: validStartConditionType,
          tags: sequence.startCondition.tags || []
        },
        stopCondition: {
          type: validStopConditionType,
          tags: sequence.stopCondition.tags || []
        },
        stages: [],
        timeRestrictions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setSequences(prevSequences => [...prevSequences, newSequence]);

      return { success: true };
    } catch (error: any) {
      console.error("Erro ao adicionar sequência:", error);
      return { success: false, error: error.message };
    }
  };

  // Update an existing sequence
  const updateSequence = async (id: string, sequence: Partial<Sequence>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Convert from camelCase to snake_case for the database
      const dbSequence: any = {};
      if (sequence.instanceId !== undefined) dbSequence.instance_id = sequence.instanceId;
      if (sequence.name !== undefined) dbSequence.name = sequence.name;
      if (sequence.type !== undefined) dbSequence.type = sequence.type;
      if (sequence.startCondition !== undefined) {
        // Make sure the type is "AND" | "OR" for startCondition
        const validStartConditionType = sequence.startCondition.type === "AND" || sequence.startCondition.type === "OR" 
          ? sequence.startCondition.type 
          : "AND";
        
        dbSequence.start_condition_type = validStartConditionType;
        dbSequence.start_condition_tags = sequence.startCondition.tags;
      }
      if (sequence.stopCondition !== undefined) {
        // Make sure the type is "AND" | "OR" for stopCondition
        const validStopConditionType = sequence.stopCondition.type === "AND" || sequence.stopCondition.type === "OR" 
          ? sequence.stopCondition.type 
          : "AND";
        
        dbSequence.stop_condition_type = validStopConditionType;
        dbSequence.stop_condition_tags = sequence.stopCondition.tags;
      }
      if (sequence.status !== undefined) dbSequence.status = sequence.status;
      if (sequence.webhookEnabled !== undefined) dbSequence.webhook_enabled = sequence.webhookEnabled;
      if (sequence.webhookId !== undefined) dbSequence.webhook_id = sequence.webhookId;

      // Additional logging for debugging
      console.log("Updating sequence with id:", id);
      console.log("Update params:", dbSequence);

      const { data, error } = await supabase
        .from('sequences')
        .update(dbSequence)
        .eq('id', id);

      if (error) {
        console.error("Error updating sequence:", error);
        return { success: false, error: error.message };
      }

      // Update the sequence in the state using the application's camelCase format
      setSequences(prevSequences =>
        prevSequences.map(s => {
          if (s.id === id) {
            const updatedSequence = { ...s, ...sequence };
            
            // Ensure startCondition and stopCondition types are valid
            if (sequence.startCondition) {
              updatedSequence.startCondition = {
                ...updatedSequence.startCondition,
                type: updatedSequence.startCondition.type === "AND" || updatedSequence.startCondition.type === "OR" 
                  ? updatedSequence.startCondition.type 
                  : "AND" as "AND" | "OR"
              };
            }
            
            if (sequence.stopCondition) {
              updatedSequence.stopCondition = {
                ...updatedSequence.stopCondition,
                type: updatedSequence.stopCondition.type === "AND" || updatedSequence.stopCondition.type === "OR"
                  ? updatedSequence.stopCondition.type 
                  : "AND" as "AND" | "OR"
              };
            }
            
            updatedSequence.updatedAt = new Date().toISOString();
            return updatedSequence;
          }
          return s;
        })
      );
      
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao atualizar sequência:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete a sequence
  const deleteSequence = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting sequence:", error);
        throw new Error(error.message);
      }

      setSequences(prevSequences => prevSequences.filter(sequence => sequence.id !== id));
    } catch (error: any) {
      console.error("Erro ao excluir sequência:", error);
      throw new Error(error.message);
    }
  };

  // Add a new instance
  const addInstance = async (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">): Promise<{ success: boolean; error?: string }> => {
    try {
      // Convert from camelCase to snake_case for the database
      const dbInstance = {
        id: uuidv4(),
        name: instance.name,
        api_key: instance.apiKey,
        phone_number_id: instance.phoneNumberId,
        user_id: instance.userId
      };

      const { data, error } = await supabase
        .from('instances')
        .insert([dbInstance]);

      if (error) {
        console.error("Error creating instance:", error);
        return { success: false, error: error.message };
      }

      // Add the new instance to the state using the application's camelCase format
      const newInstance: Instance = {
        ...instance,
        id: dbInstance.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setInstances(prevInstances => [...prevInstances, newInstance]);

      return { success: true };
    } catch (error: any) {
      console.error("Erro ao adicionar instância:", error);
      return { success: false, error: error.message };
    }
  };

  // Update an existing instance
  const updateInstance = async (id: string, updates: Partial<Instance>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Convert from camelCase to snake_case for the database
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.apiKey !== undefined) dbUpdates.api_key = updates.apiKey;
      if (updates.phoneNumberId !== undefined) dbUpdates.phone_number_id = updates.phoneNumberId;
      if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;

      const { data, error } = await supabase
        .from('instances')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error("Error updating instance:", error);
        return { success: false, error: error.message };
      }

      // Update the instance in the state using the application's camelCase format
      setInstances(prevInstances =>
        prevInstances.map(instance => {
          if (instance.id === id) {
            return { ...instance, ...updates, updatedAt: new Date().toISOString() };
          }
          return instance;
        })
      );
      
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao atualizar instância:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete a instance
  const deleteInstance = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting instance:", error);
        throw new Error(error.message);
      }

      setInstances(prevInstances => prevInstances.filter(instance => instance.id !== id));
    } catch (error: any) {
      console.error("Erro ao excluir instância:", error);
      throw new Error(error.message);
    }
  };

  // Add a new contact sequence
  const addContactSequence = async (contactSequence: Omit<ContactSequence, "id" | "createdAt" | "updatedAt">): Promise<{ success: boolean; error?: string }> => {
    try {
      // Convert from camelCase to snake_case for the database
      const dbContactSequence = {
        id: uuidv4(),
        contact_id: contactSequence.contactId,
        sequence_id: contactSequence.sequenceId,
        current_stage_id: contactSequence.currentStageId,
        stage_progress: contactSequence.stageProgress,
        status: contactSequence.status,
        started_at: contactSequence.startedAt,
        completed_at: contactSequence.completedAt,
        removed_at: contactSequence.removedAt,
        last_message_at: contactSequence.lastMessageAt
      };

      const { data, error } = await supabase
        .from('contact_sequences')
        .insert([dbContactSequence]);

      if (error) {
        console.error("Error creating contact sequence:", error);
        return { success: false, error: error.message };
      }

      // Add the new contact sequence to the state using the application's camelCase format
      const newContactSequence: ContactSequence = {
        ...contactSequence,
        id: dbContactSequence.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setContactSequences(prevContactSequences => [...prevContactSequences, newContactSequence]);

      return { success: true };
    } catch (error: any) {
      console.error("Erro ao adicionar sequência do contato:", error);
      return { success: false, error: error.message };
    }
  };

  // Update an existing contact sequence
  const updateContactSequence = async (id: string, updates: Partial<ContactSequence>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Convert from camelCase to snake_case for the database
      const dbUpdates: any = {};
      if (updates.contactId !== undefined) dbUpdates.contact_id = updates.contactId;
      if (updates.sequenceId !== undefined) dbUpdates.sequence_id = updates.sequenceId;
      if (updates.currentStageId !== undefined) dbUpdates.current_stage_id = updates.currentStageId;
      if (updates.stageProgress !== undefined) dbUpdates.stage_progress = updates.stageProgress;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.startedAt !== undefined) dbUpdates.started_at = updates.startedAt;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
      if (updates.removedAt !== undefined) dbUpdates.removed_at = updates.removedAt;
      if (updates.lastMessageAt !== undefined) dbUpdates.last_message_at = updates.lastMessageAt;

      const { data, error } = await supabase
        .from('contact_sequences')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error("Error updating contact sequence:", error);
        return { success: false, error: error.message };
      }

      // Update the contact sequence in the state using the application's camelCase format
      setContactSequences(prevContactSequences =>
        prevContactSequences.map(contactSequence => {
          if (contactSequence.id === id) {
            return { ...contactSequence, ...updates, updatedAt: new Date().toISOString() };
          }
          return contactSequence;
        })
      );
      
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao atualizar sequência do contato:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete a contact sequence
  const deleteContactSequence = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('contact_sequences')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting contact sequence:", error);
        throw new Error(error.message);
      }

      setContactSequences(prevContactSequences => prevContactSequences.filter(contactSequence => contactSequence.id !== id));
    } catch (error: any) {
      console.error("Erro ao excluir sequência do contato:", error);
      throw new Error(error.message);
    }
  };

  const value: AppContextType = {
    contacts,
    sequences,
    instances,
    contactSequences,
    currentInstance,
    setCurrentInstance,
    addContact,
    updateContact,
    deleteContact,
    addSequence,
    updateSequence,
    deleteSequence,
    addInstance,
    updateInstance,
    deleteInstance,
    addContactSequence,
    updateContactSequence,
    deleteContactSequence,
    refreshData,
    isDataInitialized
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
