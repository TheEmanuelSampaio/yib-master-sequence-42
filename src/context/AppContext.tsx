import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, setupRealtimeSubscription } from '@/integrations/supabase/client';
import { 
  User, Client, Instance, Sequence, Contact, 
  ContactSequence, ScheduledMessage, TagCondition, 
  SequenceStage, TimeRestriction, StageProgress
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";

// Define daily stats interface
interface DailyStat {
  date: string;
  messagesSent: number;
  messagesScheduled: number;
  messagesFailed: number;
  newContacts: number;
  completedSequences: number;
}

interface AppContextType {
  user: User | null;
  users: User[];
  clients: Client[];
  instances: Instance[];
  currentInstanceId: string | null;
  currentInstance: Instance | null;
  sequences: Sequence[];
  contacts: Contact[];
  contactSequences: ContactSequence[];
  scheduledMessages: ScheduledMessage[];
  tags: string[];
  stats: DailyStat[];
  timeRestrictions: TimeRestriction[];
  isDataInitialized: boolean;
  refreshData: () => Promise<void>;
  setCurrentInstanceId: (id: string | null) => void;
  setCurrentInstance: (instance: Instance | null) => void;
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInstance: (id: string, updatedFields: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSequence: (id: string, updatedFields: Partial<Sequence>) => Promise<void>;
  deleteSequence: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updatedFields: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (id: string, updatedFields: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addTag: (tag: string) => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;
  addTimeRestriction: (restriction: Omit<TimeRestriction, 'id' | 'createdAt'>) => Promise<void>;
  updateTimeRestriction: (id: string, updatedFields: Partial<TimeRestriction>) => Promise<void>;
  deleteTimeRestriction: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  user: null,
  users: [],
  clients: [],
  instances: [],
  currentInstanceId: null,
  currentInstance: null,
  sequences: [],
  contacts: [],
  contactSequences: [],
  scheduledMessages: [],
  tags: [],
  stats: [],
  timeRestrictions: [],
  isDataInitialized: false,
  refreshData: async () => {},
  setCurrentInstanceId: () => {},
  setCurrentInstance: () => {},
  addInstance: async () => {},
  updateInstance: async () => {},
  deleteInstance: async () => {},
  addSequence: async () => {},
  updateSequence: async () => {},
  deleteSequence: async () => {},
  addUser: async () => {},
  updateUser: async () => {},
  deleteUser: async () => {},
  addClient: async () => {},
  updateClient: async () => {},
  deleteClient: async () => {},
  addTag: async () => {},
  deleteTag: async () => {},
  addTimeRestriction: async () => {},
  updateTimeRestriction: async () => {},
  deleteTimeRestriction: async () => {},
});

export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  
  // Handle instance change
  useEffect(() => {
    if (currentInstanceId && instances.length > 0) {
      const instance = instances.find(i => i.id === currentInstanceId);
      setCurrentInstance(instance || null);
    } else {
      setCurrentInstance(null);
    }
  }, [currentInstanceId, instances]);
  
  // Generate mock stats for the dashboard if needed
  useEffect(() => {
    if (stats.length === 0) {
      // Generate some sample stats for the last 7 days
      const mockStats: DailyStat[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockStats.push({
          date: date.toISOString().split('T')[0],
          messagesSent: Math.floor(Math.random() * 100),
          messagesScheduled: Math.floor(Math.random() * 150),
          messagesFailed: Math.floor(Math.random() * 10),
          newContacts: Math.floor(Math.random() * 20),
          completedSequences: Math.floor(Math.random() * 15),
        });
      }
      setStats(mockStats);
    }
  }, [stats]);

  // Instance management functions
  const addInstance = async (instanceData: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newInstance = {
        ...instanceData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setInstances([...instances, newInstance]);
      toast.success(`Instância "${newInstance.name}" criada com sucesso`);
    } catch (error: any) {
      console.error('Error adding instance:', error);
      toast.error(`Erro ao adicionar instância: ${error.message}`);
    }
  };

  const updateInstance = async (id: string, updatedFields: Partial<Instance>) => {
    try {
      setInstances(instances.map(instance => 
        instance.id === id 
          ? { ...instance, ...updatedFields, updatedAt: new Date().toISOString() } 
          : instance
      ));
    } catch (error: any) {
      console.error('Error updating instance:', error);
      toast.error(`Erro ao atualizar instância: ${error.message}`);
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      setInstances(instances.filter(instance => instance.id !== id));
      
      if (currentInstanceId === id) {
        const remainingActiveInstances = instances.filter(i => i.id !== id && i.active);
        if (remainingActiveInstances.length > 0) {
          setCurrentInstanceId(remainingActiveInstances[0].id);
        } else {
          setCurrentInstanceId(null);
        }
      }
      
      toast.success('Instância excluída com sucesso');
    } catch (error: any) {
      console.error('Error deleting instance:', error);
      toast.error(`Erro ao excluir instância: ${error.message}`);
    }
  };

  // Sequence management functions
  const addSequence = async (sequenceData: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newSequence = {
        ...sequenceData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.id || '',
      };
      setSequences([...sequences, newSequence]);
      toast.success(`Sequência "${newSequence.name}" criada com sucesso`);
    } catch (error: any) {
      console.error('Error adding sequence:', error);
      toast.error(`Erro ao adicionar sequência: ${error.message}`);
    }
  };

  const updateSequence = async (id: string, updatedFields: Partial<Sequence>) => {
    try {
      setSequences(sequences.map(sequence => 
        sequence.id === id 
          ? { ...sequence, ...updatedFields, updatedAt: new Date().toISOString() } 
          : sequence
      ));
    } catch (error: any) {
      console.error('Error updating sequence:', error);
      toast.error(`Erro ao atualizar sequência: ${error.message}`);
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      setSequences(sequences.filter(sequence => sequence.id !== id));
      toast.success('Sequência excluída com sucesso');
    } catch (error: any) {
      console.error('Error deleting sequence:', error);
      toast.error(`Erro ao excluir sequência: ${error.message}`);
    }
  };

  // User management functions
  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      const newUser = {
        ...userData,
        id: uuidv4(),
      };
      setUsers([...users, newUser]);
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
    }
  };

  const updateUser = async (id: string, updatedFields: Partial<User>) => {
    try {
      setUsers(users.map(u => 
        u.id === id 
          ? { ...u, ...updatedFields } 
          : u
      ));
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setUsers(users.filter(u => u.id !== id));
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    }
  };

  // Client management functions
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newClient = {
        ...clientData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setClients([...clients, newClient]);
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
    }
  };

  const updateClient = async (id: string, updatedFields: Partial<Client>) => {
    try {
      setClients(clients.map(client => 
        client.id === id 
          ? { ...client, ...updatedFields, updatedAt: new Date().toISOString() } 
          : client
      ));
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      setClients(clients.filter(client => client.id !== id));
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  // Tag management functions
  const addTag = async (tag: string) => {
    try {
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
    } catch (error: any) {
      console.error('Error adding tag:', error);
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  };

  const deleteTag = async (tag: string) => {
    try {
      setTags(tags.filter(t => t !== tag));
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      toast.error(`Erro ao excluir tag: ${error.message}`);
    }
  };

  // Time restriction management functions
  const addTimeRestriction = async (restriction: Omit<TimeRestriction, 'id' | 'createdAt'>) => {
    try {
      const newRestriction = {
        ...restriction,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      setTimeRestrictions([...timeRestrictions, newRestriction]);
    } catch (error: any) {
      console.error('Error adding time restriction:', error);
      toast.error(`Erro ao adicionar restrição de tempo: ${error.message}`);
    }
  };

  const updateTimeRestriction = async (id: string, updatedFields: Partial<TimeRestriction>) => {
    try {
      setTimeRestrictions(timeRestrictions.map(restriction => 
        restriction.id === id 
          ? { ...restriction, ...updatedFields } 
          : restriction
      ));
    } catch (error: any) {
      console.error('Error updating time restriction:', error);
      toast.error(`Erro ao atualizar restrição de tempo: ${error.message}`);
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      setTimeRestrictions(timeRestrictions.filter(restriction => restriction.id !== id));
    } catch (error: any) {
      console.error('Error deleting time restriction:', error);
      toast.error(`Erro ao excluir restrição de tempo: ${error.message}`);
    }
  };
  
  // Lista para atualização de todos os dados
  const refreshData = async () => {
    console.info("Refreshing data...");
    
    try {
      setIsDataInitialized(false);
      // 1. Buscar dados do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setUser({
            id: user.id,
            email: user.email || '',
            accountName: profile.account_name,
            role: profile.role,
            avatar: user.user_metadata?.avatar_url,
          });
          
          // 2. Buscar clientes
          const { data: clientsData } = await supabase
            .from('clients')
            .select('*');
            
          if (clientsData) {
            setClients(clientsData.map(client => ({
              id: client.id,
              accountId: client.account_id,
              accountName: client.account_name,
              createdBy: client.created_by,
              createdAt: client.created_at,
              updatedAt: client.updated_at,
            })));
            
            // 3. Buscar instâncias
            const { data: instancesData } = await supabase
              .from('instances')
              .select('*, client:clients(*)');
              
            if (instancesData) {
              const mappedInstances = instancesData.map(instance => ({
                id: instance.id,
                name: instance.name,
                evolutionApiUrl: instance.evolution_api_url,
                apiKey: instance.api_key,
                active: instance.active,
                clientId: instance.client_id,
                client: instance.client ? {
                  id: instance.client.id,
                  accountId: instance.client.account_id,
                  accountName: instance.client.account_name,
                  createdBy: instance.client.created_by,
                  createdAt: instance.client.created_at,
                  updatedAt: instance.client.updated_at,
                } : undefined,
                createdBy: instance.created_by,
                createdAt: instance.created_at,
                updatedAt: instance.updated_at,
              }));
              
              setInstances(mappedInstances);
              
              // Se não houver instância selecionada, selecione a primeira ativa
              if (!currentInstanceId && mappedInstances.length > 0) {
                const activeInstance = mappedInstances.find(i => i.active);
                if (activeInstance) {
                  setCurrentInstanceId(activeInstance.id);
                }
              }
              
              // 4. Buscar sequências com seus estágios e restrições
              const { data: sequencesData, error } = await supabase
                .from('sequences')
                .select(`
                  *,
                  stages:sequence_stages(*)
                `);
                
              if (sequencesData) {
                console.info(`Sequences fetched: ${sequencesData.length}`);
                
                const mappedSequences: Sequence[] = sequencesData.map(seq => ({
                  id: seq.id,
                  instanceId: seq.instance_id,
                  name: seq.name,
                  startCondition: {
                    type: seq.start_condition_type as "AND" | "OR",
                    tags: seq.start_condition_tags || [],
                  },
                  stopCondition: {
                    type: seq.stop_condition_type as "AND" | "OR",
                    tags: seq.stop_condition_tags || [],
                  },
                  stages: (seq.stages || []).map((stage: any) => ({
                    id: stage.id,
                    name: stage.name,
                    type: stage.type as "message" | "pattern" | "typebot",
                    content: stage.content,
                    typebotStage: stage.typebot_stage,
                    delay: stage.delay,
                    delayUnit: stage.delay_unit as "minutes" | "hours" | "days",
                    orderIndex: stage.order_index,
                  })),
                  timeRestrictions: [], // Preenchido mais tarde
                  status: seq.status as "active" | "inactive",
                  createdAt: seq.created_at,
                  updatedAt: seq.updated_at,
                }));
                
                // Para cada sequência, busque as restrições de tempo
                for (const sequence of mappedSequences) {
                  const { data: restrictionsData } = await supabase
                    .rpc('get_sequence_time_restrictions', { seq_id: sequence.id });
                    
                  if (restrictionsData) {
                    sequence.timeRestrictions = restrictionsData.map((restriction: any) => ({
                      id: restriction.id,
                      name: restriction.name,
                      active: restriction.active,
                      days: restriction.days,
                      startHour: restriction.start_hour,
                      startMinute: restriction.start_minute,
                      endHour: restriction.end_hour,
                      endMinute: restriction.end_minute,
                      isGlobal: restriction.is_global,
                    }));
                  }
                }
                
                setSequences(mappedSequences);
              } else if (error) {
                console.error("Error fetching sequences:", error);
              }
              
              // 5. Buscar contatos e suas tags
              const { data: contactsData } = await supabase
                .from('contacts')
                .select('*');

              // Buscar todas as tags dos contatos
              const { data: contactTagsData } = await supabase
                .from('contact_tags')
                .select('*');
                
              if (contactsData && contactTagsData) {
                // Criar mapeamento de tags por contactId
                const tagsByContactId: Record<string, string[]> = {};
                
                contactTagsData.forEach(ct => {
                  if (!tagsByContactId[ct.contact_id]) {
                    tagsByContactId[ct.contact_id] = [];
                  }
                  tagsByContactId[ct.contact_id].push(ct.tag_name);
                });
                
                const mappedContacts = contactsData.map(contact => ({
                  id: contact.id,
                  name: contact.name,
                  phoneNumber: contact.phone_number,
                  clientId: contact.client_id,
                  inboxId: contact.inbox_id,
                  conversationId: contact.conversation_id,
                  displayId: contact.display_id,
                  tags: tagsByContactId[contact.id] || [],
                  createdAt: contact.created_at,
                  updatedAt: contact.updated_at,
                }));
                
                setContacts(mappedContacts);
              }
              
              // 6. Buscar todas as sequências de contatos e progresso
              const { data: contactSequencesData } = await supabase
                .from('contact_sequences')
                .select('*');
                
              const { data: stageProgressData } = await supabase
                .from('stage_progress')
                .select('*');
                
              if (contactSequencesData && stageProgressData) {
                // Criar mapeamento de progresso por contactSequenceId
                const progressByContactSequenceId: Record<string, StageProgress[]> = {};
                
                stageProgressData.forEach(sp => {
                  if (!progressByContactSequenceId[sp.contact_sequence_id]) {
                    progressByContactSequenceId[sp.contact_sequence_id] = [];
                  }
                  
                  progressByContactSequenceId[sp.contact_sequence_id].push({
                    stageId: sp.stage_id,
                    status: sp.status as "pending" | "completed" | "skipped",
                    completedAt: sp.completed_at,
                  });
                });
                
                const mappedContactSequences = contactSequencesData.map(cs => ({
                  id: cs.id,
                  contactId: cs.contact_id,
                  sequenceId: cs.sequence_id,
                  currentStageIndex: cs.current_stage_index,
                  currentStageId: cs.current_stage_id,
                  status: cs.status as "active" | "completed" | "paused" | "removed",
                  startedAt: cs.started_at,
                  lastMessageAt: cs.last_message_at,
                  completedAt: cs.completed_at,
                  removedAt: cs.removed_at,
                  stageProgress: progressByContactSequenceId[cs.id] || [],
                }));
                
                setContactSequences(mappedContactSequences);
              }
              
              // 7. Buscar mensagens agendadas
              const { data: scheduledMessagesData } = await supabase
                .from('scheduled_messages')
                .select('*');
                
              if (scheduledMessagesData) {
                const mappedScheduledMessages = scheduledMessagesData.map(sm => ({
                  id: sm.id,
                  contactId: sm.contact_id,
                  sequenceId: sm.sequence_id,
                  stageId: sm.stage_id,
                  scheduledTime: sm.scheduled_time,
                  scheduledAt: sm.scheduled_at,
                  sentAt: sm.sent_at,
                  status: sm.status as "pending" | "processing" | "sent" | "failed" | "persistent_error",
                  attempts: sm.attempts,
                }));
                
                setScheduledMessages(mappedScheduledMessages);
              }
              
              // 8. Buscar todas as tags disponíveis
              const { data: tagsData } = await supabase
                .from('tags')
                .select('name');
                
              if (tagsData) {
                setTags(tagsData.map(t => t.name));
              }
              
              // 9. Buscar restrições de tempo
              const { data: timeRestrictionsData } = await supabase
                .from('time_restrictions')
                .select('*');
                
              if (timeRestrictionsData) {
                const mappedRestrictions = timeRestrictionsData.map(tr => ({
                  id: tr.id,
                  name: tr.name,
                  active: tr.active,
                  days: tr.days,
                  startHour: tr.start_hour,
                  startMinute: tr.start_minute,
                  endHour: tr.end_hour,
                  endMinute: tr.end_minute,
                  isGlobal: true,
                  createdBy: tr.created_by,
                  createdAt: tr.created_at,
                }));
                
                setTimeRestrictions(mappedRestrictions);
              }
              
              // 10. Buscar estatísticas diárias
              const { data: dailyStatsData } = await supabase
                .from('daily_stats')
                .select('*')
                .order('date', { ascending: false })
                .limit(7);
                
              if (dailyStatsData && dailyStatsData.length > 0) {
                const mappedStats = dailyStatsData.map(ds => ({
                  date: ds.date,
                  messagesSent: ds.messages_sent,
                  messagesScheduled: ds.messages_scheduled,
                  messagesFailed: ds.messages_failed, 
                  newContacts: ds.new_contacts,
                  completedSequences: ds.completed_sequences,
                }));
                
                setStats(mappedStats);
              }
            }
          }
        }
      }
      
      // Setup realtime subscription
      setupRealtimeSubscription();
      
      setIsDataInitialized(true);
      console.info("Data refresh completed successfully");
    } catch (error: any) {
      console.error("Error refreshing data:", error);
      toast.error(`Erro ao carregar dados: ${error.message}`);
      setIsDataInitialized(true);
    }
  };

  // Efeito para carregar dados iniciais após autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.info(`Auth state changed: ${event}${session?.user?.id ? ' ' + session.user.id : ''}`);
        
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          console.info("Initial data load after authentication");
          refreshData();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setClients([]);
          setInstances([]);
          setCurrentInstanceId(null);
          setCurrentInstance(null);
          setSequences([]);
          setContacts([]);
          setContactSequences([]);
          setScheduledMessages([]);
          setTags([]);
          setStats([]);
          setTimeRestrictions([]);
          setIsDataInitialized(false);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Efeito para recarregar dados quando a instância atual mudar
  useEffect(() => {
    if (currentInstanceId && isDataInitialized) {
      refreshData();
    }
  }, [currentInstanceId]);
  
  return (
    <AppContext.Provider
      value={{
        user,
        users,
        clients,
        instances,
        currentInstanceId,
        currentInstance,
        sequences,
        contacts,
        contactSequences,
        scheduledMessages,
        tags,
        stats,
        timeRestrictions,
        isDataInitialized,
        refreshData,
        setCurrentInstanceId,
        setCurrentInstance,
        addInstance,
        updateInstance,
        deleteInstance,
        addSequence,
        updateSequence,
        deleteSequence,
        addUser,
        updateUser,
        deleteUser,
        addClient,
        updateClient,
        deleteClient,
        addTag,
        deleteTag,
        addTimeRestriction,
        updateTimeRestriction,
        deleteTimeRestriction
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
