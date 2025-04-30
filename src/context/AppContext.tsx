import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import {
  Client,
  Instance,
  Sequence,
  TagCondition,
  SequenceStage,
  TimeRestriction,
  Contact,
  ScheduledMessage,
  ContactSequence,
  StageProgress,
  DailyStats,
  StageProgressStatus,
  AppSetup
} from '@/types';

interface AppContextType {
  user: any;
  clients: Client[];
  instances: Instance[];
  sequences: Sequence[];
  contacts: Contact[];
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  dailyStats: DailyStats[];
  stats: DailyStats[]; // Adding the missing stats property
  stageProgressStatus: StageProgressStatus[];
  timeRestrictions: TimeRestriction[];
  tags: string[];
  appSetup: AppSetup | null;
  currentClient: Client | null;
  currentInstance: Instance | null;
  isDataInitialized: boolean;
  setCurrentClient: (client: Client | null) => void;
  setCurrentInstance: (instance: Instance | null) => void;
  addClient: (clientData: Omit<Client, "id" | "createdAt" | "updatedAt">) => Promise<Client | null>;
  updateClient: (id: string, clientData: Omit<Client, "id" | "createdAt" | "updatedAt">) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<void>;
  addInstance: (instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt">) => Promise<Instance | null>;
  updateInstance: (id: string, instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt">) => Promise<Instance | null>;
  deleteInstance: (id: string) => Promise<void>;
  addSequence: (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<Sequence | null>;
  updateSequence: (id: string, sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<Sequence | null>;
  deleteSequence: (id: string) => Promise<void>;
  addContact: (contactData: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<Contact | null>;
  updateContact: (id: string, contactData: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<Contact | null>;
  deleteContact: (id: string) => Promise<void>;
  addTimeRestriction: (timeRestrictionData: Omit<TimeRestriction, "id" | "createdAt" | "createdBy">) => Promise<TimeRestriction | null>;
  updateTimeRestriction: (id: string, timeRestrictionData: Omit<TimeRestriction, "id" | "createdAt" | "createdBy">) => Promise<TimeRestriction | null>;
  deleteTimeRestriction: (id: string) => Promise<void>;
  addTag: (tagData: Omit<{ name: string }, "id" | "createdAt" | "createdBy">) => Promise<string | null>;
  deleteTag: (name: string) => Promise<void>;
  updateAppSetup: (appSetupData: Omit<AppSetup, "id" | "createdAt">) => Promise<AppSetup | null>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Na função addSequence, verifique se há algum filtro hardcoded ou valor uuid inválido
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [stageProgressStatus, setStageProgressStatus] = useState<StageProgressStatus[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [appSetup, setAppSetup] = useState<AppSetup | null>(null);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [isDataInitialized, setIsDataInitialized] = useState(false);

  // Initialize user
  useEffect(() => {
    const getUserSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };
    
    getUserSession();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const addClient = async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Convert frontend model to database model
      const dbClient = {
        account_id: clientData.accountId,
        account_name: clientData.accountName,
        created_by: user?.id || clientData.createdBy,
        creator_account_name: user?.user_metadata?.account_name || "",
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(dbClient)
        .select()
        .single();

      if (error) {
        console.error("Client creation error:", error);
        throw error;
      }

      // Convert database model to frontend model
      const newClient: Client = {
        id: data.id,
        accountId: data.account_id,
        accountName: data.account_name,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        creator: data.creator,
        creator_account_name: data.creator_account_name
      };

      setClients(prevClients => [...prevClients, newClient]);
      return newClient;
    } catch (error) {
      console.error("Error adding client:", error);
      throw error;
    }
  };

  const updateClient = async (id: string, clientData: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Convert frontend model to database model
      const dbClient = {
        account_id: clientData.accountId,
        account_name: clientData.accountName,
      };
      
      const { data, error } = await supabase
        .from('clients')
        .update(dbClient)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Client update error:", error);
        throw error;
      }

      // Convert database model to frontend model
      const updatedClient: Client = {
        id: data.id,
        accountId: data.account_id,
        accountName: data.account_name,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        creator: data.creator,
        creator_account_name: data.creator_account_name
      };

      setClients(prevClients =>
        prevClients.map(client => (client.id === id ? updatedClient : client))
      );
      return updatedClient;
    } catch (error) {
      console.error("Error updating client:", error);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Client deletion error:", error);
        throw error;
      }

      setClients(prevClients => prevClients.filter(client => client.id !== id));
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  };

  const addInstance = async (instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Convert frontend model to database model
      const dbInstance = {
        name: instanceData.name,
        evolution_api_url: instanceData.evolutionApiUrl,
        api_key: instanceData.apiKey,
        client_id: instanceData.clientId,
        active: instanceData.active !== undefined ? instanceData.active : true,
        created_by: user?.id || instanceData.createdBy,
      };
      
      const { data, error } = await supabase
        .from('instances')
        .insert(dbInstance)
        .select()
        .single();

      if (error) {
        console.error("Instance creation error:", error);
        throw error;
      }

      // Convert database model to frontend model
      const newInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        active: data.active,
        clientId: data.client_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        client: instanceData.client
      };

      setInstances(prevInstances => [...prevInstances, newInstance]);
      return newInstance;
    } catch (error) {
      console.error("Error adding instance:", error);
      throw error;
    }
  };

  const updateInstance = async (id: string, instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Convert frontend model to database model
      const dbInstance = {
        name: instanceData.name,
        evolution_api_url: instanceData.evolutionApiUrl,
        api_key: instanceData.apiKey,
        client_id: instanceData.clientId,
        active: instanceData.active,
      };
      
      const { data, error } = await supabase
        .from('instances')
        .update(dbInstance)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Instance update error:", error);
        throw error;
      }

      // Convert database model to frontend model
      const updatedInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        active: data.active,
        clientId: data.client_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        client: instanceData.client
      };

      setInstances(prevInstances =>
        prevInstances.map(instance => (instance.id === id ? updatedInstance : instance))
      );
      return updatedInstance;
    } catch (error) {
      console.error("Error updating instance:", error);
      throw error;
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Instance deletion error:", error);
        throw error;
      }

      setInstances(prevInstances => prevInstances.filter(instance => instance.id !== id));
    } catch (error) {
      console.error("Error deleting instance:", error);
      throw error;
    }
  };

  const addSequence = async (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      console.log("Adding sequence:", sequenceData);
      
      // Convert frontend model to database model
      const dbSequence = {
        name: sequenceData.name,
        instance_id: sequenceData.instanceId,
        start_condition_type: sequenceData.startCondition.type,
        start_condition_tags: sequenceData.startCondition.tags,
        stop_condition_type: sequenceData.stopCondition.type,
        stop_condition_tags: sequenceData.stopCondition.tags,
        status: sequenceData.status,
        created_by: user?.id || "",
      };
      
      const { data, error } = await supabase
        .from('sequences')
        .insert(dbSequence)
        .select();
      
      if (error) {
        console.error("Sequence creation error:", error);
        throw new Error(`Erro ao criar sequência: ${error.message}`);
      }
      
      console.log("Sequence created:", data[0]);
      
      // Criar estágios
      if (sequenceData.stages.length > 0) {
        const stagesData = sequenceData.stages.map((stage, index) => ({
          sequence_id: data[0].id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          typebot_stage: stage.typebotStage,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: stage.orderIndex !== undefined ? stage.orderIndex : index,
        }));
        
        const { data: stagesResult, error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stagesData)
          .select();
        
        if (stagesError) {
          console.error("Stages creation error:", stagesError);
          throw new Error(`Erro ao criar estágios: ${stagesError.message}`);
        }
        
        console.log("Stage created:", stagesResult);
      }
      
      // Criar relação com restrições de tempo
      if (sequenceData.timeRestrictions && sequenceData.timeRestrictions.length > 0) {
        const restrictionsData = sequenceData.timeRestrictions.map(restriction => ({
          sequence_id: data[0].id,
          time_restriction_id: restriction.id
        }));
        
        const { error: restrictionsError } = await supabase
          .from('sequence_time_restrictions')
          .insert(restrictionsData);
        
        if (restrictionsError) {
          console.error("Time restrictions relation error:", restrictionsError);
          throw new Error(`Erro ao vincular restrições de tempo: ${restrictionsError.message}`);
        }
      }
      
      // Convert database model to frontend model and update state
      const newSequence: Sequence = {
        id: data[0].id,
        instanceId: data[0].instance_id,
        name: data[0].name,
        startCondition: {
          type: data[0].start_condition_type,
          tags: data[0].start_condition_tags
        },
        stopCondition: {
          type: data[0].stop_condition_type,
          tags: data[0].stop_condition_tags
        },
        stages: sequenceData.stages.map((stage, index) => ({
          ...stage,
          id: stage.id || `temp-${index}`,
          orderIndex: stage.orderIndex !== undefined ? stage.orderIndex : index
        })),
        timeRestrictions: sequenceData.timeRestrictions || [],
        status: data[0].status,
        createdAt: data[0].created_at,
        updatedAt: data[0].updated_at
      };
      
      setSequences(prev => [...prev, newSequence]);
      
      return newSequence;
    } catch (error) {
      console.error("Error adding sequence:", error);
      throw error;
    }
  };

  const updateSequence = async (id: string, sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('sequences')
        .update({
          name: sequenceData.name,
          instance_id: sequenceData.instanceId,
          start_condition_type: sequenceData.startCondition.type,
          start_condition_tags: sequenceData.startCondition.tags,
          stop_condition_type: sequenceData.stopCondition.type,
          stop_condition_tags: sequenceData.stopCondition.tags,
          status: sequenceData.status
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Sequence update error:", error);
        throw error;
      }

      setSequences(prevSequences =>
        prevSequences.map(sequence => (sequence.id === id ? data : sequence))
      );
      return data;
    } catch (error) {
      console.error("Error updating sequence:", error);
      throw error;
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Sequence deletion error:", error);
        throw error;
      }

      setSequences(prevSequences => prevSequences.filter(sequence => sequence.id !== id));
    } catch (error) {
      console.error("Error deleting sequence:", error);
      throw error;
    }
  };

  const addContact = async (contactData: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();

      if (error) {
        console.error("Contact creation error:", error);
        throw error;
      }

      setContacts(prevContacts => [...prevContacts, data]);
      return data;
    } catch (error) {
      console.error("Error adding contact:", error);
      throw error;
    }
  };

  const updateContact = async (id: string, contactData: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Contact update error:", error);
        throw error;
      }

      setContacts(prevContacts =>
        prevContacts.map(contact => (contact.id === id ? data : contact))
      );
      return data;
    } catch (error) {
      console.error("Error updating contact:", error);
      throw error;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Contact deletion error:", error);
        throw error;
      }

      setContacts(prevContacts => prevContacts.filter(contact => contact.id !== id));
    } catch (error) {
      console.error("Error deleting contact:", error);
      throw error;
    }
  };

  const addTimeRestriction = async (timeRestrictionData: Omit<TimeRestriction, "id" | "createdAt" | "createdBy">) => {
    try {
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert({
          ...timeRestrictionData,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error("Time restriction creation error:", error);
        throw error;
      }

      setTimeRestrictions(prevTimeRestrictions => [...prevTimeRestrictions, data]);
      return data;
    } catch (error) {
      console.error("Error adding time restriction:", error);
      throw error;
    }
  };

  const updateTimeRestriction = async (id: string, timeRestrictionData: Omit<TimeRestriction, "id" | "createdAt" | "createdBy">) => {
    try {
      const { data, error } = await supabase
        .from('time_restrictions')
        .update(timeRestrictionData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Time restriction update error:", error);
        throw error;
      }

      setTimeRestrictions(prevTimeRestrictions =>
        prevTimeRestrictions.map(timeRestriction => (timeRestriction.id === id ? data : timeRestriction))
      );
      return data;
    } catch (error) {
      console.error("Error updating time restriction:", error);
      throw error;
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Time restriction deletion error:", error);
        throw error;
      }

      setTimeRestrictions(prevTimeRestrictions => prevTimeRestrictions.filter(timeRestriction => timeRestriction.id !== id));
    } catch (error) {
      console.error("Error deleting time restriction:", error);
      throw error;
    }
  };

  const addTag = async (tagData: Omit<{ name: string }, "id" | "createdAt" | "createdBy">) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          ...tagData,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error("Tag creation error:", error);
        throw error;
      }

      setTags(prevTags => [...prevTags, data.name]);
      return data.name;
    } catch (error) {
      console.error("Error adding tag:", error);
      throw error;
    }
  };

  const deleteTag = async (name: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('name', name);

      if (error) {
        console.error("Tag deletion error:", error);
        throw error;
      }

      setTags(prevTags => prevTags.filter(tag => tag !== name));
    } catch (error) {
      console.error("Error deleting tag:", error);
      throw error;
    }
  };

  const updateAppSetup = async (appSetupData: Omit<AppSetup, "id" | "createdAt">) => {
    try {
      const { data, error } = await supabase
        .from('app_setup')
        .update(appSetupData)
        .eq('id', appSetup?.id)
        .select()
        .single();

      if (error) {
        console.error("App setup update error:", error);
        throw error;
      }

      setAppSetup(data);
      return data;
    } catch (error) {
      console.error("Error updating app setup:", error);
      throw error;
    }
  };

  const refreshData = useCallback(async () => {
    try {
      setIsDataInitialized(false);

      // Fetch all data
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*');
      if (instancesError) throw instancesError;
      setInstances(instancesData || []);

      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select('*');
      if (sequencesError) throw sequencesError;
      setSequences(sequencesData || []);

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*');
      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      const { data: scheduledMessagesData, error: scheduledMessagesError } = await supabase
        .from('scheduled_messages')
        .select('*');
      if (scheduledMessagesError) throw scheduledMessagesError;
      setScheduledMessages(scheduledMessagesData || []);

      const { data: contactSequencesData, error: contactSequencesError } = await supabase
        .from('contact_sequences')
        .select('*');
      if (contactSequencesError) throw contactSequencesError;
      setContactSequences(contactSequencesData || []);

      // Fetch daily stats and set it to both dailyStats and stats
      const { data: dailyStatsData, error: dailyStatsError } = await supabase
        .from('daily_stats')
        .select('*');
      if (dailyStatsError) throw dailyStatsError;
      setDailyStats(dailyStatsData || []);
      // Also set the stats property
      setStats(dailyStatsData || []);

      // Fetch stage progress status
      const { data: stageProgressStatusData, error: stageProgressStatusError } = await supabase
        .from('stage_progress')
        .select('*');
      if (stageProgressStatusError) throw stageProgressStatusError;
      setStageProgressStatus(stageProgressStatusData || []);

      // Fetch time restrictions
      const { data: timeRestrictionsData, error: timeRestrictionsError } = await supabase
        .from('time_restrictions')
        .select('*');
      if (timeRestrictionsError) throw timeRestrictionsError;
      setTimeRestrictions(timeRestrictionsData || []);

      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*');
      if (tagsError) throw tagsError;
      setTags(tagsData ? tagsData.map(tag => tag.name) : []);

      // Fetch app setup
      const { data: appSetupData, error: appSetupError } = await supabase
        .from('app_setup')
        .select('*')
        .limit(1)
        .single();
      if (appSetupError) {
        // If no record exists, create a new one
        if (appSetupError.message.includes('No rows found')) {
          const { data: newAppSetupData, error: newAppSetupError } = await supabase
            .from('app_setup')
            .insert({})
            .select('*')
            .single();

          if (newAppSetupError) {
            console.error("Error creating initial app setup:", newAppSetupError);
            throw newAppSetupError;
          }

          setAppSetup(newAppSetupData);
        } else {
          console.error("Error fetching app setup:", appSetupError);
          throw appSetupError;
        }
      } else {
        setAppSetup(appSetupData);
      }

      setIsDataInitialized(true);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  return (
    <AppContext.Provider value={{
      user,
      clients,
      instances,
      sequences,
      contacts,
      scheduledMessages,
      contactSequences,
      dailyStats,
      stats: dailyStats, // Add the stats property
      stageProgressStatus,
      timeRestrictions,
      tags,
      appSetup,
      currentClient,
      currentInstance,
      isDataInitialized,
      setCurrentClient,
      setCurrentInstance,
      addClient,
      updateClient,
      deleteClient,
      addInstance,
      updateInstance,
      deleteInstance,
      addSequence,
      updateSequence,
      deleteSequence,
      addContact,
      updateContact,
      deleteContact,
      addTimeRestriction,
      updateTimeRestriction,
      deleteTimeRestriction,
      addTag,
      deleteTag,
      updateAppSetup,
      refreshData,
    }}>
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
