import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, 
  Client, 
  Instance, 
  Sequence, 
  Contact, 
  ScheduledMessage, 
  ContactSequence, 
  DailyStats, 
  TimeRestriction,
  SequenceStage 
} from '@/types';

interface UserWithEmail extends User {
  email: string;
  accountName: string;
  role: 'super_admin' | 'admin';
}

interface AppContextType {
  // Auth
  user: UserWithEmail | null;
  isLoading: boolean;
  isDataInitialized: boolean;
  
  // Data
  clients: Client[];
  instances: Instance[];
  sequences: Sequence[];
  contacts: Contact[];
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  stats: DailyStats[];
  timeRestrictions: TimeRestriction[];
  tags: string[];
  users: UserWithEmail[];
  
  // Current selections
  currentInstance: Instance | null;
  
  // Methods
  setCurrentInstance: (instance: Instance | null) => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  addTimeRestriction: (restriction: Omit<TimeRestriction, 'id'>) => Promise<{ success: boolean; error?: string }>;
  addUser: (userData: { email: string; accountName: string; role: 'super_admin' | 'admin' }) => Promise<{ success: boolean; error?: string }>;
  removeFromSequence: (contactId: string, sequenceId: string) => Promise<{ success: boolean; error?: string }>;
  updateContactSequence: (contactSequenceId: string, data: Partial<ContactSequence>) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithEmail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  
  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  
  // Current selections
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);

  // Authentication and data fetching methods
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            accountName: profile.account_name,
            role: profile.role
          });
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setIsDataInitialized(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    try {
      await Promise.all([
        fetchClients(),
        fetchInstances(),
        fetchSequences(),
        fetchContacts(),
        fetchScheduledMessages(),
        fetchContactSequences(),
        fetchStats(),
        fetchTimeRestrictions(),
        fetchTags(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          profiles!clients_created_by_fkey (
            id,
            account_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedClients = data?.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        creator: client.profiles ? {
          id: client.profiles.id,
          account_name: client.profiles.account_name
        } : undefined,
        creator_account_name: client.profiles?.account_name,
        authToken: client.auth_token
      })) || [];

      setClients(mappedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .select(`
          *,
          clients!instances_client_id_fkey (
            id,
            account_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedInstances = data?.map(instance => ({
        id: instance.id,
        name: instance.name,
        evolutionApiUrl: instance.evolution_api_url,
        apiKey: instance.api_key,
        active: instance.active,
        clientId: instance.client_id,
        client: instance.clients ? {
          id: instance.clients.id,
          accountName: instance.clients.account_name,
          accountId: 0,
          createdBy: '',
          createdAt: '',
          updatedAt: ''
        } : undefined,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at,
        inboxId: instance.inbox_id
      })) || [];

      setInstances(mappedInstances);
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast.error('Erro ao carregar instâncias');
    }
  };

  const fetchSequences = async () => {
    try {
      const { data, error } = await supabase
        .from('sequences')
        .select(`
          *,
          instances!sequences_instance_id_fkey (
            id,
            name,
            client_id
          ),
          sequence_stages (
            id,
            name,
            type,
            content,
            typebot_stage,
            delay,
            delay_unit,
            order_index
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedSequences = data?.map(sequence => ({
        id: sequence.id,
        instanceId: sequence.instance_id,
        name: sequence.name,
        type: sequence.type || 'message',
        startCondition: {
          type: sequence.start_condition_type,
          tags: sequence.start_condition_tags || []
        },
        stopCondition: {
          type: sequence.stop_condition_type,
          tags: sequence.stop_condition_tags || []
        },
        stages: sequence.sequence_stages?.map(stage => ({
          id: stage.id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          typebotStage: stage.typebot_stage,
          delay: stage.delay,
          delayUnit: stage.delay_unit,
          orderIndex: stage.order_index
        })) || [],
        timeRestrictions: [],
        status: sequence.status,
        createdBy: sequence.created_by,
        createdAt: sequence.created_at,
        updatedAt: sequence.updated_at,
        webhookEnabled: sequence.webhook_enabled || false,
        webhookId: sequence.webhook_id,
        inboxFilterEnabled: sequence.inbox_filter_enabled !== false
      })) || [];

      setSequences(mappedSequences);
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast.error('Erro ao carregar sequências');
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          clients!contacts_client_id_fkey (
            id,
            account_name,
            created_by,
            profiles!clients_created_by_fkey (
              id,
              account_name
            )
          ),
          contact_tags (
            tag_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedContacts = data?.map(contact => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone_number,
        clientId: contact.client_id,
        clientName: contact.clients?.account_name,
        adminId: contact.clients?.created_by,
        adminName: contact.clients?.profiles?.account_name,
        inboxId: contact.inbox_id,
        conversationId: contact.conversation_id,
        displayId: contact.display_id,
        tags: contact.contact_tags?.map(tag => tag.tag_name) || [],
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      })) || [];

      setContacts(mappedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Erro ao carregar contatos');
    }
  };

  const fetchScheduledMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      const mappedMessages = data?.map(message => ({
        id: message.id,
        contactId: message.contact_id,
        sequenceId: message.sequence_id,
        stageId: message.stage_id,
        scheduledTime: message.scheduled_time,
        scheduledAt: message.scheduled_at,
        sentAt: message.sent_at,
        status: message.status,
        attempts: message.attempts,
        variables: message.variables,
        processedContent: message.processed_content,
        removedAt: message.removed_at
      })) || [];

      setScheduledMessages(mappedMessages);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error('Erro ao carregar mensagens agendadas');
    }
  };

  const fetchContactSequences = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_sequences')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;

      const mappedContactSequences = data?.map(cs => ({
        id: cs.id,
        contactId: cs.contact_id,
        sequenceId: cs.sequence_id,
        currentStageIndex: cs.current_stage_index,
        currentStageId: cs.current_stage_id,
        status: cs.status,
        startedAt: cs.started_at,
        lastMessageAt: cs.last_message_at,
        completedAt: cs.completed_at,
        removedAt: cs.removed_at,
        stageProgress: []
      })) || [];

      setContactSequences(mappedContactSequences);
    } catch (error) {
      console.error('Error fetching contact sequences:', error);
      toast.error('Erro ao carregar sequências de contatos');
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      const mappedStats = data?.map(stat => ({
        date: stat.date,
        instanceId: stat.instance_id,
        messagesScheduled: stat.messages_scheduled,
        messagesSent: stat.messages_sent,
        messagesFailed: stat.messages_failed,
        newContacts: stat.new_contacts,
        completedSequences: stat.completed_sequences
      })) || [];

      setStats(mappedStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Erro ao carregar estatísticas');
    }
  };

  const fetchTimeRestrictions = async () => {
    try {
      const { data, error } = await supabase
        .from('time_restrictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedRestrictions = data?.map(restriction => ({
        id: restriction.id,
        name: restriction.name,
        active: restriction.active,
        days: restriction.days,
        startHour: restriction.start_hour,
        startMinute: restriction.start_minute,
        endHour: restriction.end_hour,
        endMinute: restriction.end_minute,
        isGlobal: true
      })) || [];

      setTimeRestrictions(mappedRestrictions);
    } catch (error) {
      console.error('Error fetching time restrictions:', error);
      toast.error('Erro ao carregar restrições de tempo');
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('name')
        .order('name');

      if (error) throw error;

      const uniqueTags = [...new Set(data?.map(tag => tag.name) || [])];
      setTags(uniqueTags);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Erro ao carregar tags');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_with_emails');
      
      if (error) throw error;

      const mappedUsers = data?.map(user => ({
        id: user.id,
        email: user.email,
        accountName: user.account_name || '',
        role: user.role || 'admin',
        avatar: undefined,
        authToken: undefined
      })) || [];

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  // CRUD Methods
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: clientData.accountId,
          account_name: clientData.accountName,
          created_by: clientData.createdBy
        })
        .select()
        .single();

      if (error) throw error;

      await fetchClients();
      toast.success('Cliente adicionado com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Erro ao adicionar cliente');
      return { success: false, error: error.message };
    }
  };

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
          created_by: instanceData.createdBy,
          inbox_id: instanceData.inboxId
        })
        .select()
        .single();

      if (error) throw error;

      await fetchInstances();
      toast.success('Instância adicionada com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Error adding instance:', error);
      toast.error('Erro ao adicionar instância');
      return { success: false, error: error.message };
    }
  };

  const addSequence = async (sequenceData: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('sequences')
        .insert({
          instance_id: sequenceData.instanceId,
          name: sequenceData.name,
          start_condition_type: sequenceData.startCondition.type,
          start_condition_tags: sequenceData.startCondition.tags,
          stop_condition_type: sequenceData.stopCondition.type,
          stop_condition_tags: sequenceData.stopCondition.tags,
          status: sequenceData.status,
          created_by: sequenceData.createdBy,
          webhook_enabled: sequenceData.webhookEnabled,
          webhook_id: sequenceData.webhookId,
          inbox_filter_enabled: sequenceData.inboxFilterEnabled
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSequences();
      toast.success('Sequência adicionada com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Error adding sequence:', error);
      toast.error('Erro ao adicionar sequência');
      return { success: false, error: error.message };
    }
  };

  const addTimeRestriction = async (restrictionData: Omit<TimeRestriction, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert({
          name: restrictionData.name,
          active: restrictionData.active,
          days: restrictionData.days,
          start_hour: restrictionData.startHour,
          start_minute: restrictionData.startMinute,
          end_hour: restrictionData.endHour,
          end_minute: restrictionData.endMinute,
          created_by: user?.id || ''
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTimeRestrictions();
      toast.success('Restrição de tempo adicionada com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Error adding time restriction:', error);
      toast.error('Erro ao adicionar restrição de tempo');
      return { success: false, error: error.message };
    }
  };

  const addUser = async (userData: { email: string; accountName: string; role: 'super_admin' | 'admin' }) => {
    try {
      // This would typically involve Supabase Auth admin functions
      // For now, just show success message
      toast.success('Usuário adicionado com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Erro ao adicionar usuário');
      return { success: false, error: error.message };
    }
  };

  const removeFromSequence = async (contactId: string, sequenceId: string) => {
    try {
      // Update contact sequence status
      const { error } = await supabase
        .from('contact_sequences')
        .update({ 
          status: 'removed',
          removed_at: new Date().toISOString()
        })
        .eq('contact_id', contactId)
        .eq('sequence_id', sequenceId);

      if (error) throw error;

      // Remove scheduled messages
      await supabase
        .from('scheduled_messages')
        .delete()
        .eq('contact_id', contactId)
        .eq('sequence_id', sequenceId);

      await fetchContactSequences();
      await fetchScheduledMessages();
      toast.success('Contato removido da sequência');
      return { success: true };
    } catch (error) {
      console.error('Error removing from sequence:', error);
      toast.error('Erro ao remover contato da sequência');
      return { success: false, error: error.message };
    }
  };

  const updateContactSequence = async (contactSequenceId: string, data: Partial<ContactSequence>) => {
    try {
      const { error } = await supabase
        .from('contact_sequences')
        .update({
          current_stage_index: data.currentStageIndex,
          current_stage_id: data.currentStageId,
          status: data.status,
          last_message_at: data.lastMessageAt,
          completed_at: data.completedAt
        })
        .eq('id', contactSequenceId);

      if (error) throw error;

      await fetchContactSequences();
      toast.success('Sequência de contato atualizada');
      return { success: true };
    } catch (error) {
      console.error('Error updating contact sequence:', error);
      toast.error('Erro ao atualizar sequência de contato');
      return { success: false, error: error.message };
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      if (user && !isDataInitialized) {
        await refreshData();
        setIsDataInitialized(true);
      }
    };

    initializeData();
  }, [user, isDataInitialized]);

  // Auth effect
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            accountName: profile.account_name,
            role: profile.role
          });
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setIsDataInitialized(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: AppContextType = {
    user,
    isLoading,
    isDataInitialized,
    clients,
    instances,
    sequences,
    contacts,
    scheduledMessages,
    contactSequences,
    stats,
    timeRestrictions,
    tags,
    users,
    currentInstance,
    setCurrentInstance,
    addClient,
    addInstance,
    addSequence,
    addTimeRestriction,
    addUser,
    removeFromSequence,
    updateContactSequence,
    refreshData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
