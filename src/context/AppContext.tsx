
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Instance, DailyStats, Contact, Sequence, Tag, TimeRestriction, Client, User, ScheduledMessage, ContactSequence } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppContextType {
  // Core state
  currentInstance: Instance | null;
  instances: Instance[];
  stats: DailyStats[];
  contacts: Contact[];
  sequences: Sequence[];
  contactSequences: ContactSequence[];
  scheduledMessages: ScheduledMessage[];
  tags: Tag[];
  timeRestrictions: TimeRestriction[];
  clients: Client[];
  users: User[];
  
  // Instance management
  setCurrentInstance: (instance: Instance | null) => void;
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateInstance: (id: string, updates: Partial<Instance>) => void;
  deleteInstance: (id: string) => void;
  
  // Config management
  addTag: (tag: Omit<Tag, 'id' | 'createdAt'>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addTimeRestriction: (restriction: Omit<TimeRestriction, 'id' | 'createdAt'>) => Promise<void>;
  updateTimeRestriction: (id: string, updates: Partial<TimeRestriction>) => Promise<void>;
  deleteTimeRestriction: (id: string) => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  // Loading states
  loading: boolean;
  instancesLoaded: boolean;
  
  // Refresh functions
  refreshInstances: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Core state
  const [currentInstance, setCurrentInstanceState] = useState<Instance | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [instancesLoaded, setInstancesLoaded] = useState(false);

  // PARTE 1: Priorizar carregamento da instância atual
  const loadInstances = async () => {
    try {
      console.log('[PART 1] Iniciando carregamento prioritário de instâncias...');
      
      const { data: instancesData, error } = await supabase
        .from('instances')
        .select(`
          *,
          clients!inner(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar instâncias:', error);
        toast.error('Erro ao carregar instâncias');
        return;
      }

      const formattedInstances: Instance[] = instancesData?.map(instance => ({
        id: instance.id,
        name: instance.name,
        evolutionApiUrl: instance.evolution_api_url,
        apiKey: instance.api_key,
        active: instance.active,
        clientId: instance.client_id,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at,
        createdBy: instance.created_by
      })) || [];

      setInstances(formattedInstances);
      setInstancesLoaded(true);
      
      console.log(`[PART 1] Instâncias carregadas: ${formattedInstances.length}`);

      // PARTE 1: Determinar instância atual IMEDIATAMENTE após carregar instâncias
      await determineCurrentInstance(formattedInstances);
      
    } catch (error) {
      console.error('Erro inesperado ao carregar instâncias:', error);
      toast.error('Erro inesperado ao carregar instâncias');
    }
  };

  // PARTE 1: Função otimizada para determinar instância atual
  const determineCurrentInstance = async (availableInstances: Instance[]) => {
    console.log('[PART 1] Determinando instância atual...');
    
    if (availableInstances.length === 0) {
      console.log('[PART 1] Nenhuma instância disponível');
      setCurrentInstanceState(null);
      return;
    }

    // Verificar localStorage primeiro (mais rápido)
    const savedInstanceId = localStorage.getItem('selectedInstanceId');
    
    if (savedInstanceId) {
      const savedInstance = availableInstances.find(inst => inst.id === savedInstanceId);
      if (savedInstance && savedInstance.active) {
        console.log(`[PART 1] Instância restaurada do localStorage: ${savedInstance.name}`);
        setCurrentInstanceState(savedInstance);
        return;
      } else {
        console.log('[PART 1] Instância salva não encontrada ou inativa, removendo do localStorage');
        localStorage.removeItem('selectedInstanceId');
      }
    }

    // Fallback: primeira instância ativa
    const firstActiveInstance = availableInstances.find(inst => inst.active);
    if (firstActiveInstance) {
      console.log(`[PART 1] Selecionando primeira instância ativa: ${firstActiveInstance.name}`);
      setCurrentInstanceState(firstActiveInstance);
      localStorage.setItem('selectedInstanceId', firstActiveInstance.id);
    } else {
      console.log('[PART 1] Nenhuma instância ativa encontrada');
      setCurrentInstanceState(null);
    }
  };

  // Load all data for current instance
  const loadCurrentInstanceData = async (instanceId: string) => {
    try {
      console.log(`[PART 1] Carregando todos os dados para instância: ${instanceId}`);
      
      // Load all data in parallel
      const [
        statsResult,
        contactsResult,
        sequencesResult,
        contactSequencesResult,
        scheduledMessagesResult
      ] = await Promise.allSettled([
        // Stats
        supabase
          .from('daily_stats')
          .select('*')
          .eq('instance_id', instanceId)
          .order('date', { ascending: false })
          .limit(30),
        
        // Contacts
        supabase
          .from('contacts')
          .select(`
            *,
            contact_tags(tag_name)
          `)
          .eq('client_id', instanceId)
          .order('created_at', { ascending: false }),
        
        // Sequences
        supabase
          .from('sequences')
          .select(`
            *,
            sequence_stages(*),
            sequence_time_restrictions(
              time_restrictions(*)
            )
          `)
          .eq('instance_id', instanceId)
          .order('created_at', { ascending: false }),
        
        // Contact Sequences
        supabase
          .from('contact_sequences')
          .select('*')
          .order('started_at', { ascending: false }),
        
        // Scheduled Messages
        supabase
          .from('scheduled_messages')
          .select('*')
          .order('scheduled_time', { ascending: false })
      ]);

      // Process stats
      if (statsResult.status === 'fulfilled' && statsResult.value.data) {
        const formattedStats: DailyStats[] = statsResult.value.data.map(stat => ({
          id: stat.id,
          instanceId: stat.instance_id,
          date: stat.date,
          messagesSent: stat.messages_sent,
          messagesScheduled: stat.messages_scheduled,
          messagesFailed: stat.messages_failed,
          newContacts: stat.new_contacts,
          completedSequences: stat.completed_sequences
        }));
        setStats(formattedStats);
      }

      // Process contacts
      if (contactsResult.status === 'fulfilled' && contactsResult.value.data) {
        const formattedContacts: Contact[] = contactsResult.value.data.map(contact => ({
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phone_number,
          clientId: contact.client_id,
          conversationId: contact.conversation_id,
          inboxId: contact.inbox_id,
          displayId: contact.display_id,
          tags: contact.contact_tags?.map((ct: any) => ct.tag_name) || [],
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        }));
        setContacts(formattedContacts);
      }

      // Process sequences
      if (sequencesResult.status === 'fulfilled' && sequencesResult.value.data) {
        const formattedSequences: Sequence[] = sequencesResult.value.data.map(sequence => ({
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          status: sequence.status as 'active' | 'inactive' | 'completed',
          startConditionType: sequence.start_condition_type,
          startConditionTags: sequence.start_condition_tags,
          stopConditionType: sequence.stop_condition_type,
          stopConditionTags: sequence.stop_condition_tags,
          webhookEnabled: sequence.webhook_enabled,
          webhookId: sequence.webhook_id,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at,
          createdBy: sequence.created_by,
          stages: sequence.sequence_stages?.map((stage: any) => ({
            id: stage.id,
            name: stage.name,
            content: stage.content,
            type: stage.type,
            delay: stage.delay,
            delayUnit: stage.delay_unit,
            orderIndex: stage.order_index,
            sequenceId: stage.sequence_id,
            typebotStage: stage.typebot_stage,
            createdAt: stage.created_at
          })) || [],
          timeRestrictions: sequence.sequence_time_restrictions?.map((str: any) => ({
            id: str.time_restrictions.id,
            name: str.time_restrictions.name,
            active: str.time_restrictions.active,
            days: str.time_restrictions.days,
            startHour: str.time_restrictions.start_hour,
            startMinute: str.time_restrictions.start_minute,
            endHour: str.time_restrictions.end_hour,
            endMinute: str.time_restrictions.end_minute,
            createdAt: str.time_restrictions.created_at,
            createdBy: str.time_restrictions.created_by
          })) || []
        }));
        setSequences(formattedSequences);
      }

      // Process contact sequences
      if (contactSequencesResult.status === 'fulfilled' && contactSequencesResult.value.data) {
        const formattedContactSequences: ContactSequence[] = contactSequencesResult.value.data.map(cs => ({
          id: cs.id,
          contactId: cs.contact_id,
          sequenceId: cs.sequence_id,
          status: cs.status,
          currentStageIndex: cs.current_stage_index,
          currentStageId: cs.current_stage_id,
          startedAt: cs.started_at,
          completedAt: cs.completed_at,
          removedAt: cs.removed_at,
          lastMessageAt: cs.last_message_at
        }));
        setContactSequences(formattedContactSequences);
      }

      // Process scheduled messages
      if (scheduledMessagesResult.status === 'fulfilled' && scheduledMessagesResult.value.data) {
        const formattedMessages: ScheduledMessage[] = scheduledMessagesResult.value.data.map(msg => ({
          id: msg.id,
          contactId: msg.contact_id,
          sequenceId: msg.sequence_id,
          stageId: msg.stage_id,
          scheduledTime: msg.scheduled_time,
          status: msg.status,
          sentAt: msg.sent_at,
          attempts: msg.attempts,
          variables: msg.variables,
          processedContent: msg.processed_content,
          createdAt: msg.created_at,
          removedAt: msg.removed_at,
          rawScheduledTime: msg.raw_scheduled_time,
          scheduledAt: msg.scheduled_at
        }));
        setScheduledMessages(formattedMessages);
      }

      console.log(`[PART 1] Todos os dados carregados para instância: ${instanceId}`);
      
    } catch (error) {
      console.error('Erro ao carregar dados da instância:', error);
    }
  };

  // Load global config data
  const loadGlobalConfig = async () => {
    try {
      console.log('[PART 1] Carregando configurações globais...');
      
      const [tagsResult, timeRestrictionsResult, clientsResult, usersResult] = await Promise.allSettled([
        supabase.from('tags').select('*').order('created_at', { ascending: false }),
        supabase.from('time_restrictions').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ]);

      // Process tags
      if (tagsResult.status === 'fulfilled' && tagsResult.value.data) {
        const formattedTags: Tag[] = tagsResult.value.data.map(tag => ({
          id: tag.id,
          name: tag.name,
          createdAt: tag.created_at,
          createdBy: tag.created_by
        }));
        setTags(formattedTags);
      }

      // Process time restrictions
      if (timeRestrictionsResult.status === 'fulfilled' && timeRestrictionsResult.value.data) {
        const formattedTimeRestrictions: TimeRestriction[] = timeRestrictionsResult.value.data.map(tr => ({
          id: tr.id,
          name: tr.name,
          active: tr.active,
          days: tr.days,
          startHour: tr.start_hour,
          startMinute: tr.start_minute,
          endHour: tr.end_hour,
          endMinute: tr.end_minute,
          createdAt: tr.created_at,
          createdBy: tr.created_by
        }));
        setTimeRestrictions(formattedTimeRestrictions);
      }

      // Process clients
      if (clientsResult.status === 'fulfilled' && clientsResult.value.data) {
        const formattedClients: Client[] = clientsResult.value.data.map(client => ({
          id: client.id,
          accountId: client.account_id,
          accountName: client.account_name,
          authToken: client.auth_token,
          createdBy: client.created_by,
          creatorAccountName: client.creator_account_name,
          createdAt: client.created_at,
          updatedAt: client.updated_at
        }));
        setClients(formattedClients);
      }

      // Process users
      if (usersResult.status === 'fulfilled' && usersResult.value.data) {
        const formattedUsers: User[] = usersResult.value.data.map(user => ({
          id: user.id,
          accountName: user.account_name,
          email: '',
          role: user.role
        }));
        setUsers(formattedUsers);
      }

      console.log('[PART 1] Configurações globais carregadas');
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  // PARTE 1: Efeito principal reorganizado
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      console.log('[PART 1] Iniciando inicialização otimizada do app...');
      
      // PRIORIDADE 1: Carregar instâncias primeiro
      await loadInstances();
      
      // PRIORIDADE 2: Carregar configurações globais
      await loadGlobalConfig();
      
      setLoading(false);
      console.log('[PART 1] Inicialização principal concluída');
    };

    initializeApp();
  }, []);

  // PARTE 1: Carregar dados da instância atual quando ela mudar
  useEffect(() => {
    if (currentInstance?.id) {
      console.log(`[PART 1] Instância atual mudou para: ${currentInstance.name}`);
      loadCurrentInstanceData(currentInstance.id);
    }
  }, [currentInstance?.id]);

  // Função para definir instância atual
  const setCurrentInstance = (instance: Instance | null) => {
    setCurrentInstanceState(instance);
    if (instance) {
      localStorage.setItem('selectedInstanceId', instance.id);
      console.log(`[PART 1] Instância atual definida: ${instance.name}`);
    } else {
      localStorage.removeItem('selectedInstanceId');
      console.log('[PART 1] Instância atual removida');
    }
  };

  // Instance management functions
  const addInstance = async (instanceData: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .insert({
          name: instanceData.name,
          evolution_api_url: instanceData.evolutionApiUrl,
          api_key: instanceData.apiKey,
          active: instanceData.active,
          client_id: instanceData.clientId,
          created_by: instanceData.createdBy
        })
        .select()
        .single();

      if (error) throw error;

      const newInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        active: data.active,
        clientId: data.client_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by
      };

      setInstances(prev => [newInstance, ...prev]);
      toast.success(`Instância "${instanceData.name}" criada com sucesso`);
      
      // Se é a primeira instância ativa, definir como atual
      if (newInstance.active && !currentInstance) {
        setCurrentInstance(newInstance);
      }
      
    } catch (error) {
      console.error('Erro ao adicionar instância:', error);
      toast.error('Erro ao criar instância');
    }
  };

  const updateInstance = async (id: string, updates: Partial<Instance>) => {
    try {
      const { error } = await supabase
        .from('instances')
        .update({
          name: updates.name,
          evolution_api_url: updates.evolutionApiUrl,
          api_key: updates.apiKey,
          active: updates.active,
          client_id: updates.clientId
        })
        .eq('id', id);

      if (error) throw error;

      setInstances(prev => prev.map(instance => 
        instance.id === id 
          ? { ...instance, ...updates, updatedAt: new Date().toISOString() }
          : instance
      ));

      // Atualizar instância atual se necessário
      if (currentInstance?.id === id) {
        setCurrentInstanceState(prev => prev ? { ...prev, ...updates } : null);
      }

      toast.success('Instância atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar instância:', error);
      toast.error('Erro ao atualizar instância');
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInstances(prev => prev.filter(instance => instance.id !== id));
      
      // Se a instância deletada era a atual, limpar
      if (currentInstance?.id === id) {
        setCurrentInstance(null);
        // Selecionar nova instância ativa se houver
        const remainingInstances = instances.filter(i => i.id !== id);
        const newActiveInstance = remainingInstances.find(i => i.active);
        if (newActiveInstance) {
          setCurrentInstance(newActiveInstance);
        }
      }

      toast.success('Instância deletada com sucesso');
    } catch (error) {
      console.error('Erro ao deletar instância:', error);
      toast.error('Erro ao deletar instância');
    }
  };

  const refreshInstances = async () => {
    await loadInstances();
  };

  const refreshStats = async () => {
    if (currentInstance?.id) {
      await loadCurrentInstanceData(currentInstance.id);
    }
  };

  const refreshData = async () => {
    if (currentInstance?.id) {
      await loadCurrentInstanceData(currentInstance.id);
    }
    await loadGlobalConfig();
  };

  // Placeholder management functions
  const addTag = async (tag: Omit<Tag, 'id' | 'createdAt'>) => {};
  const deleteTag = async (id: string) => {};
  const addTimeRestriction = async (restriction: Omit<TimeRestriction, 'id' | 'createdAt'>) => {};
  const updateTimeRestriction = async (id: string, updates: Partial<TimeRestriction>) => {};
  const deleteTimeRestriction = async (id: string) => {};
  const addClient = async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {};
  const updateClient = async (id: string, updates: Partial<Client>) => {};
  const deleteClient = async (id: string) => {};
  const addUser = async (user: Omit<User, 'id'>) => {};
  const updateUser = async (id: string, updates: Partial<User>) => {};
  const deleteUser = async (id: string) => {};

  const contextValue: AppContextType = {
    // Core state
    currentInstance,
    instances,
    stats,
    contacts,
    sequences,
    contactSequences,
    scheduledMessages,
    tags,
    timeRestrictions,
    clients,
    users,
    
    // Instance management
    setCurrentInstance,
    addInstance,
    updateInstance,
    deleteInstance,
    
    // Config management
    addTag,
    deleteTag,
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction,
    addClient,
    updateClient,
    deleteClient,
    addUser,
    updateUser,
    deleteUser,
    
    // Loading states
    loading,
    instancesLoaded,
    
    // Refresh functions
    refreshInstances,
    refreshStats,
    refreshData
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
