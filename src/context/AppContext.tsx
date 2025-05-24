import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, UserWithEmail, isValidUUID, checkStagesInUse } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Instance,
  Sequence,
  Contact,
  TimeRestriction,
  ScheduledMessage,
  ContactSequence,
  Client,
  User,
  DailyStats,
  StageProgress,
  TagCondition
} from "@/types";
import { toast } from "@/components/ui/use-toast";
import AppContactContext, { createContactFunctions, AppContactFunctions } from './AppContact';

interface AppContextType {
  clients: Client[];
  instances: Instance[];
  currentInstance: Instance | null;
  sequences: Sequence[];
  contacts: Contact[];
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  tags: string[];
  timeRestrictions: TimeRestriction[];
  users: User[];
  stats: DailyStats[];
  setCurrentInstance: (instance: Instance) => void;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => void;
  updateInstance: (id: string, instance: Partial<Instance>) => void;
  deleteInstance: (id: string) => void;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => void;
  updateSequence: (id: string, updates: Partial<Sequence>) => Promise<{ success: boolean, error?: string }>;
  deleteSequence: (id: string) => void;
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id">) => void;
  updateTimeRestriction: (id: string, restriction: Partial<TimeRestriction>) => void;
  deleteTimeRestriction: (id: string) => void;
  addContact: (contact: Contact) => void;
  getContactSequences: (contactId: string) => ContactSequence[];
  addClient: (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addUser: (user: { email: string; password: string; accountName: string, isAdmin?: boolean }) => Promise<void>;
  updateUser: (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addTag: (tagName: string) => Promise<void>;
  deleteTag: (tagName: string) => Promise<void>;
  refreshData: () => Promise<void>;
  isDataInitialized: boolean;
  
  // Funções de manipulação de contatos
  deleteContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  updateContact: (contactId: string, data: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  removeFromSequence: (contactSequenceId: string) => Promise<{ success: boolean; error?: string }>;
  updateContactSequence: (contactSequenceId: string, data: {
    sequenceId?: string;
    currentStageId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

// Interface to extend the sequence data from the database with additional properties
interface ExtendedSequence {
  id: string;
  name: string;
  instance_id: string;
  start_condition_type: string;
  start_condition_tags: string[];
  stop_condition_type: string;
  stop_condition_tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  sequence_stages: any[];
  sequence_time_restrictions: any[];
  localTimeRestrictions?: TimeRestriction[];
  type?: "message" | "pattern" | "typebot";
  webhook_enabled?: boolean;
  webhook_id?: string;
}

// Create a default context value to prevent "undefined" errors
const defaultContextValue: AppContextType = {
  clients: [],
  instances: [],
  currentInstance: null,
  sequences: [],
  contacts: [],
  scheduledMessages: [],
  contactSequences: [],
  tags: [],
  timeRestrictions: [],
  users: [],
  stats: [],
  setCurrentInstance: () => {},
  addInstance: () => {},
  updateInstance: () => {},
  deleteInstance: () => {},
  addSequence: () => {},
  updateSequence: async () => ({ success: false }),
  deleteSequence: () => {},
  addTimeRestriction: () => {},
  updateTimeRestriction: () => {},
  deleteTimeRestriction: () => {},
  addContact: () => {},
  getContactSequences: () => [],
  addClient: () => {},
  updateClient: () => {},
  deleteClient: () => {},
  addUser: async () => {},
  updateUser: async () => {},
  deleteUser: async () => {},
  addTag: async () => {},
  deleteTag: async () => {},
  refreshData: async () => {},
  isDataInitialized: false,
  
  // Add the missing contact functions to the default context value
  deleteContact: async () => ({ success: false, error: 'Não implementado' }),
  updateContact: async () => ({ success: false, error: 'Não implementado' }),
  removeFromSequence: async () => ({ success: false, error: 'Não implementado' }),
  updateContactSequence: async () => ({ success: false, error: 'Não implementado' }),
};

export const AppContext = createContext<AppContextType>(defaultContextValue);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Estados para controle de carregamento por fases
  const [instancesLoaded, setInstancesLoaded] = useState(false);
  const [currentInstanceSet, setCurrentInstanceSet] = useState(false);

  // Get contact sequences helper function
  const getContactSequences = (contactId: string): ContactSequence[] => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };

  // Criar funções de manipulação de contatos
  const contactFunctions = createContactFunctions();
  
  // Fetch data when auth user changes - OTIMIZADO: Carregar por fases
  useEffect(() => {
    if (user && !isDataInitialized) {
      console.log("Initial data load after authentication - Phase 1: Loading instances");
      loadInstancesFirst();
    } else if (!user) {
      // Clear data when user logs out
      resetAllData();
    }
  }, [user, isDataInitialized]);
  
  // OTIMIZADO: Fase 1 - Carregar instâncias primeiro
  const loadInstancesFirst = async () => {
    if (!user || isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      console.log("Phase 1: Loading instances and clients...");
      
      // Carregar clientes primeiro (necessário para instâncias)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (clientsError) throw clientsError;
      
      const typedClients = clientsData.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at
      }));
      
      setClients(typedClients);
      
      // Carregar instâncias
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*, clients(*)');
      
      if (instancesError) throw instancesError;
      
      const typedInstances = instancesData.map(instance => ({
        id: instance.id,
        name: instance.name,
        evolutionApiUrl: instance.evolution_api_url,
        apiKey: instance.api_key,
        active: instance.active,
        clientId: instance.client_id,
        client: instance.clients ? {
          id: instance.clients.id,
          accountId: instance.clients.account_id,
          accountName: instance.clients.account_name,
          createdBy: instance.clients.created_by,
          createdAt: instance.clients.created_at,
          updatedAt: instance.clients.updated_at
        } : undefined,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at
      }));
      
      setInstances(typedInstances);
      setInstancesLoaded(true);
      
      // OTIMIZADO: Determinar instância atual imediatamente
      determineCurrentInstance(typedInstances);
      
    } catch (error) {
      console.error("Error loading instances:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar instâncias",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // OTIMIZADO: Determinar instância atual de forma inteligente
  const determineCurrentInstance = (instancesList: Instance[]) => {
    if (instancesList.length === 0) {
      setCurrentInstanceSet(true);
      return;
    }
    
    const savedInstanceId = localStorage.getItem('selectedInstanceId');
    console.log("Determining current instance with saved ID:", savedInstanceId);
    
    let selectedInstance: Instance | null = null;
    
    if (savedInstanceId) {
      // Tentar encontrar a instância salva
      selectedInstance = instancesList.find(i => i.id === savedInstanceId) || null;
      if (selectedInstance) {
        console.log("Restored saved instance:", selectedInstance.name);
      } else {
        console.log("Saved instance not found, selecting default");
        // Limpar localStorage se a instância não existe mais
        localStorage.removeItem('selectedInstanceId');
      }
    }
    
    // Se não encontrou a instância salva, usar a primeira ativa ou a primeira disponível
    if (!selectedInstance) {
      selectedInstance = instancesList.find(i => i.active) || instancesList[0];
      console.log("Selected default instance:", selectedInstance?.name);
    }
    
    setCurrentInstance(selectedInstance);
    setCurrentInstanceSet(true);
    
    // OTIMIZADO: Salvar imediatamente no localStorage
    if (selectedInstance) {
      localStorage.setItem('selectedInstanceId', selectedInstance.id);
    }
    
    // Carregar dados restantes após definir a instância atual
    loadRemainingData();
  };
  
  // OTIMIZADO: Carregar dados restantes após definir a instância atual
  const loadRemainingData = async () => {
    if (!user) return;
    
    try {
      console.log("Phase 2: Loading remaining data...");
      
      // Carregar dados em paralelo que não dependem da instância atual
      const [tagsResult, timeRestrictionsResult, usersResult, statsResult] = await Promise.allSettled([
        loadTags(),
        loadTimeRestrictions(),
        loadUsers(),
        loadStats()
      ]);
      
      // Log results
      if (tagsResult.status === 'rejected') console.error("Error loading tags:", tagsResult.reason);
      if (timeRestrictionsResult.status === 'rejected') console.error("Error loading time restrictions:", timeRestrictionsResult.reason);
      if (usersResult.status === 'rejected') console.error("Error loading users:", usersResult.reason);
      if (statsResult.status === 'rejected') console.error("Error loading stats:", statsResult.reason);
      
      // Carregar dados que dependem da instância atual
      await Promise.allSettled([
        loadSequences(),
        loadContacts(),
        loadScheduledMessages(),
        loadContactSequences()
      ]);
      
      setIsDataInitialized(true);
      console.log("Data initialization completed");
      
    } catch (error) {
      console.error("Error loading remaining data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da aplicação",
        variant: "destructive"
      });
    }
  };
  
  // Funções auxiliares para carregar dados específicos
  const loadTags = async () => {
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('name');
    
    if (tagsError) throw tagsError;
    setTags(tagsData.map(tag => tag.name));
  };
  
  const loadTimeRestrictions = async () => {
    const { data: restrictionsData, error: restrictionsError } = await supabase
      .from('time_restrictions')
      .select('*');
    
    if (restrictionsError) throw restrictionsError;
    
    const typedRestrictions = restrictionsData.map(restriction => ({
      id: restriction.id,
      name: restriction.name,
      active: restriction.active,
      days: restriction.days,
      startHour: restriction.start_hour,
      startMinute: restriction.start_minute,
      endHour: restriction.end_hour,
      endMinute: restriction.end_minute,
      isGlobal: true
    }));
    
    setTimeRestrictions(typedRestrictions);
  };
  
  const loadUsers = async () => {
    let usersList: User[] = [];
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) throw profilesError;
    
    const { data: authUsersData, error: authUsersError } = await supabase
      .rpc('get_users_with_emails');
        
    if (authUsersError) {
      console.error("Error fetching user emails:", authUsersError);
    }
    
    const emailMap = new Map();
    if (authUsersData && Array.isArray(authUsersData)) {
      authUsersData.forEach(userData => {
        if (userData.id && userData.email) {
          emailMap.set(userData.id, userData.email);
        }
      });
    }
    
    usersList = profilesData.map(profile => {
      const email = emailMap.get(profile.id) || 
                    (profile.id === user.id ? user.email : `user-${profile.id.substring(0, 4)}@example.com`);
      
      return {
        id: profile.id,
        accountName: profile.account_name,
        email,
        role: profile.role,
        avatar: ""
      };
    });
    
    setUsers(usersList);
  };
  
  const loadStats = async () => {
    const { data: statsData, error: statsError } = await supabase
      .from('daily_stats')
      .select('*')
      .order('date', { ascending: false });
    
    if (statsError) throw statsError;
    
    const typedStats = statsData.map(stat => ({
      id: stat.id,
      date: stat.date,
      instanceId: stat.instance_id,
      messagesSent: stat.messages_sent,
      messagesScheduled: stat.messages_scheduled,
      messagesFailed: stat.messages_failed,
      newContacts: stat.new_contacts,
      completedSequences: stat.completed_sequences
    }));
    
    setStats(typedStats);
  };
  
  const loadSequences = async () => {
    // ... keep existing code (sequence loading logic)
    const { data: sequencesData, error: sequencesError } = await supabase
      .from('sequences')
      .select(`
        *,
        sequence_stages (*),
        sequence_time_restrictions (
          *,
          time_restrictions (*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (sequencesError) throw sequencesError;
    
    const processedSequences = sequencesData as ExtendedSequence[];
    
    for (const sequence of processedSequences) {
      sequence.localTimeRestrictions = [];
      
      const { data: localRestrictions, error: localRestError } = await supabase
        .from('sequence_local_restrictions')
        .select('*')
        .eq('sequence_id', sequence.id);
        
      if (localRestError) {
        console.error("Erro ao carregar restrições locais:", localRestError);
        continue;
      }
      
      if (localRestrictions && localRestrictions.length > 0) {
        const typedLocalRestrictions = localRestrictions.map(lr => ({
          id: lr.id,
          name: lr.name,
          active: lr.active,
          days: lr.days,
          startHour: lr.start_hour,
          startMinute: lr.start_minute,
          endHour: lr.end_hour,
          endMinute: lr.end_minute,
          isGlobal: false
        }));
        
        sequence.localTimeRestrictions = typedLocalRestrictions;
      }
    }
    
    const typedSequences: Sequence[] = processedSequences.map(sequence => {
      const stages = sequence.sequence_stages
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          typebotStage: stage.typebot_stage,
          delay: stage.delay,
          delayUnit: stage.delay_unit
        }));
        
      const globalTimeRestrictions = sequence.sequence_time_restrictions
        .map((str: any) => str.time_restrictions)
        .filter(Boolean)
        .map((tr: any) => ({
          id: tr.id,
          name: tr.name,
          active: tr.active,
          days: tr.days,
          startHour: tr.start_hour,
          startMinute: tr.start_minute,
          endHour: tr.end_hour,
          endMinute: tr.end_minute,
          isGlobal: true
        }));
      
      const allTimeRestrictions = [
        ...globalTimeRestrictions,
        ...(sequence.localTimeRestrictions || [])
      ];

      const startType = sequence.start_condition_type === "AND" ? "AND" : "OR";
      const stopType = sequence.stop_condition_type === "AND" ? "AND" : "OR";
      const status = sequence.status === "active" ? "active" : "inactive";
      
      let sequenceType: "message" | "pattern" | "typebot" = "message";
      if (stages.length > 0) {
        const lastStage = stages[stages.length - 1];
        if (lastStage.type === "typebot") {
          sequenceType = "typebot";
        } else if (lastStage.type === "pattern") {
          sequenceType = "pattern";
        }
      }
      
      return {
        id: sequence.id,
        name: sequence.name,
        instanceId: sequence.instance_id,
        type: sequence.type || sequenceType,
        startCondition: {
          type: startType as "AND" | "OR",
          tags: sequence.start_condition_tags
        },
        stopCondition: {
          type: stopType as "AND" | "OR",
          tags: sequence.stop_condition_tags
        },
        status: status as "active" | "inactive",
        stages,
        timeRestrictions: allTimeRestrictions,
        createdAt: sequence.created_at,
        updatedAt: sequence.updated_at,
        createdBy: sequence.created_by,
        webhookEnabled: sequence.webhook_enabled || false,
        webhookId: sequence.webhook_id || undefined
      };
    });
    
    setSequences(typedSequences);
  };
  
  const loadContacts = async () => {
    // ... keep existing code (contacts loading logic)
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('*');
    
    if (contactsError) throw contactsError;
    
    const clientMap = new Map(clients.map(client => [client.id, client]));
    const userMap = new Map(users.map(user => [user.id, user]));
    
    const contactPromises = contactsData.map(async (contact) => {
      const { data: contactTagsData, error: contactTagsError } = await supabase
        .from('contact_tags')
        .select('tag_name')
        .eq('contact_id', contact.id);
        
      if (contactTagsError) {
        console.error(`Erro ao buscar tags do contato ${contact.id}:`, contactTagsError);
        return null;
      }
      
      const contactTags = contactTagsData.map(ct => ct.tag_name);
      
      const client = clientMap.get(contact.client_id);
      const clientName = client ? client.accountName : '';
      
      const adminId = client ? client.createdBy : undefined;
      const admin = adminId ? userMap.get(adminId) : undefined;
      const adminName = admin ? admin.accountName : '';
      
      return {
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone_number,
        clientId: contact.client_id,
        clientName: clientName,
        adminId: adminId,
        adminName: adminName,
        inboxId: contact.inbox_id,
        conversationId: contact.conversation_id,
        displayId: contact.display_id,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at,
        tags: contactTags
      };
    });
    
    const typedContacts = (await Promise.all(contactPromises)).filter(Boolean) as Contact[];
    setContacts(typedContacts);
  };
  
  const loadScheduledMessages = async () => {
    const { data: scheduledMsgsData, error: scheduledMsgsError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .order('scheduled_time', { ascending: true });
    
    if (scheduledMsgsError) throw scheduledMsgsError;
    
    const typedScheduledMsgs = scheduledMsgsData.map(msg => ({
      id: msg.id,
      contactId: msg.contact_id,
      sequenceId: msg.sequence_id,
      stageId: msg.stage_id,
      status: msg.status as "pending" | "processing" | "sent" | "failed" | "persistent_error",
      scheduledTime: msg.scheduled_time,
      rawScheduledTime: msg.raw_scheduled_time,
      sentAt: msg.sent_at,
      attempts: msg.attempts,
      scheduledAt: msg.scheduled_at,
      createdAt: msg.created_at
    }));
    
    setScheduledMessages(typedScheduledMsgs);
  };
  
  const loadContactSequences = async () => {
    const { data: contactSeqsData, error: contactSeqsError } = await supabase
      .from('contact_sequences')
      .select('*');
    
    if (contactSeqsError) throw contactSeqsError;
    
    const contactSeqPromises = contactSeqsData.map(async (contactSeq) => {
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
    
    const typedContactSeqs = (await Promise.all(contactSeqPromises)).filter(Boolean) as ContactSequence[];
    setContactSequences(typedContactSeqs);
  };
  
  // OTIMIZADO: Função para resetar todos os dados
  const resetAllData = () => {
    setClients([]);
    setInstances([]);
    setCurrentInstance(null);
    setSequences([]);
    setContacts([]);
    setScheduledMessages([]);
    setContactSequences([]);
    setTags([]);
    setTimeRestrictions([]);
    setUsers([]);
    setStats([]);
    setIsDataInitialized(false);
    setInstancesLoaded(false);
    setCurrentInstanceSet(false);
    localStorage.removeItem('selectedInstanceId');
  };

  // OTIMIZADO: Função setCurrentInstance melhorada
  const handleSetCurrentInstance = (instance: Instance) => {
    console.log("Setting current instance:", instance.name);
    setCurrentInstance(instance);
    
    // Salvar imediatamente no localStorage
    localStorage.setItem('selectedInstanceId', instance.id);
    
    // Se os dados já foram inicializados, pode ser necessário recarregar dados específicos da instância
    if (isDataInitialized) {
      console.log("Reloading instance-specific data for:", instance.name);
      // Aqui podemos adicionar lógica para recarregar apenas dados específicos da instância
    }
  };

  const refreshData = async () => {
    if (!user || isRefreshing) return;
    
    // Prevent rapid consecutive refreshes (throttle to once every 3 seconds)
    const now = Date.now();
    if (now - lastRefresh < 3000 && isDataInitialized) {
      console.log("Refresh throttled - too soon since last refresh");
      return;
    }
    
    try {
      setIsRefreshing(true);
      setLastRefresh(now);
      console.log("Refreshing data...");
      
      // Reset states
      setIsDataInitialized(false);
      setInstancesLoaded(false);
      setCurrentInstanceSet(false);
      
      // Start the optimized loading process
      await loadInstancesFirst();
      
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Erro",
        description: "Erro ao recarregar dados",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const addInstance = async (instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('instances')
        .insert({
          name: instanceData.name,
          evolution_api_url: instanceData.evolutionApiUrl,
          api_key: instanceData.apiKey,
          active: instanceData.active,
          client_id: instanceData.clientId,
          created_by: user.id
        })
        .select('*, clients(*)')
        .single();
      
      if (error) throw error;
      
      const newInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        active: data.active,
        clientId: data.client_id,
        client: data.clients ? {
          id: data.clients.id,
          accountId: data.clients.account_id,
          accountName: data.clients.account_name,
          createdBy: data.clients.created_by,
          createdAt: data.clients.created_at,
          updatedAt: data.clients.updated_at
        } : undefined,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setInstances(prev => [...prev, newInstance]);
      
      if (!currentInstance) {
        handleSetCurrentInstance(newInstance);
      }
      
      toast({
        title: "Sucesso",
        description: `Instância "${data.name}" criada com sucesso`
      });
    } catch (error: any) {
      console.error("Error creating instance:", error);
      toast({
        title: "Erro",
        description: `Erro ao criar instância: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateInstance = async (id: string, instanceData: Partial<Instance>) => {
    try {
      const { error } = await supabase
        .from('instances')
        .update({
          name: instanceData.name,
          evolution_api_url: instanceData.evolutionApiUrl,
          api_key: instanceData.apiKey,
          active: instanceData.active,
          client_id: instanceData.clientId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setInstances(prev => 
        prev.map(instance => 
          instance.id === id ? { ...instance, ...instanceData } : instance
        )
      );
      
      if (currentInstance && currentInstance.id === id) {
        setCurrentInstance(prev => prev ? { ...prev, ...instanceData } : null);
      }
      
      toast({
        title: "Sucesso",
        description: "Instância atualizada com sucesso"
      });
      
      refreshData();
    } catch (error: any) {
      console.error("Error updating instance:", error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar instância: ${error.message}`,
        variant: "destructive"
      });
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
      
      if (currentInstance && currentInstance.id === id) {
        const nextInstance = instances.find(i => i.id !== id);
        handleSetCurrentInstance(nextInstance || null);
      }
      
      toast({
        title: "Sucesso",
        description: "Instância excluída com sucesso"
      });
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      toast({
        title: "Erro",
        description: `Erro ao excluir instância: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const addSequence = async (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Adding sequence:", sequenceData);
      
      const globalRestrictions = sequenceData.timeRestrictions.filter(r => r.isGlobal);
      const localRestrictions = sequenceData.timeRestrictions.filter(r => !r.isGlobal);
      
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert({
          instance_id: sequenceData.instanceId,
          name: sequenceData.name,
          start_condition_type: sequenceData.startCondition.type,
          start_condition_tags: sequenceData.startCondition.tags,
          stop_condition_type: sequenceData.stopCondition.type,
          stop_condition_tags: sequenceData.stopCondition.tags,
          status: sequenceData.status,
          created_by: user.id,
          webhook_enabled: sequenceData.webhookEnabled,
          webhook_id: sequenceData.webhookId
        })
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      console.log("Sequence created:", seqData);
      
      for (let i = 0; i < sequenceData.stages.length; i++) {
        const stage = sequenceData.stages[i];
        
        const { data: stageData, error: stageError } = await supabase
          .from('sequence_stages')
          .insert({
            sequence_id: seqData.id,
            name: stage.name,
            type: stage.type,
            content: stage.content,
            typebot_stage: stage.typebotStage,
            delay: stage.delay,
            delay_unit: stage.delayUnit,
            order_index: i
          })
          .select();
        
        if (stageError) throw stageError;
        console.log("Stage created:", stageData);
      }
      
      if (globalRestrictions.length > 0) {
        for (const restriction of globalRestrictions) {
          const { data: checkRestriction } = await supabase
            .from('time_restrictions')
            .select('id')
            .eq('id', restriction.id)
            .single();
              
          if (!checkRestriction) {
            console.error(`Restrição global com ID ${restriction.id} não encontrada`);
            continue;
          }
          
          const { data: restrictionData, error: restrictionError } = await supabase
            .from('sequence_time_restrictions')
            .insert({
              sequence_id: seqData.id,
              time_restriction_id: restriction.id
            })
            .select();
          
          if (restrictionError) throw restrictionError;
          console.log("Global restriction added:", restrictionData);
        }
      }
      
      if (localRestrictions.length > 0) {
        for (const restriction of localRestrictions) {
          const { error: localRestError } = await supabase
            .from('sequence_local_restrictions')
            .insert({
              sequence_id: seqData.id,
              name: restriction.name,
              active: restriction.active,
              days: restriction.days,
              start_hour: restriction.startHour,
              start_minute: restriction.startMinute,
              end_hour: restriction.endHour,
              end_minute: restriction.endMinute,
              created_by: user.id
            });
            
          if (localRestError) throw localRestError;
          console.log("Local restriction added for sequence");
        }
      }
      
      toast({
        title: "Sucesso",
        description: `Sequência "${sequenceData.name}" criada com sucesso`
      });
      
      await refreshData();
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast({
        title: "Erro",
        description: `Erro ao criar sequência: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateSequence = async (id: string, updates: Partial<Sequence>): Promise<{ success: boolean, error?: string }> => {
    try {
      console.log("Updating sequence with ID:", id);
      console.log("Update payload:", JSON.stringify(updates, null, 2));
      
      if (!id || !isValidUUID(id)) {
        console.error("Invalid sequence ID:", id);
        return { success: false, error: "ID de sequência inválido" };
      }
      
      const { error: seqError } = await supabase
        .from('sequences')
        .update({
          name: updates.name,
          status: updates.status,
          start_condition_type: updates.startCondition?.type,
          start_condition_tags: updates.startCondition?.tags,
          stop_condition_type: updates.stopCondition?.type,
          stop_condition_tags: updates.stopCondition?.tags,
          updated_at: new Date().toISOString(),
          webhook_enabled: updates.webhookEnabled,
          webhook_id: updates.webhookId
        })
        .eq('id', id);
      
      if (seqError) {
        console.error("Error updating sequence:", seqError);
        return { success: false, error: seqError.message };
      }
      
      if (updates.stages) {
        console.log("Processing stages update for sequence:", id);
        console.log("Total stages to process:", updates.stages.length);
        
        const { data: existingStages, error: stagesQueryError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', id);
        
        if (stagesQueryError) {
          console.error("Error fetching existing stages:", stagesQueryError);
          return { success: false, error: stagesQueryError.message };
        }
        
        console.log("Existing stages in DB:", existingStages?.length || 0);
        
        const stagesToUpdate = [];
        const stageIdsToDelete = [];
        const stagesToInsert = [];
        
        const existingStageIds = new Set(existingStages?.map(stage => stage.id) || []);
        const updatedStageIds = new Set(updates.stages.map(stage => stage.id));
        
        existingStages?.forEach(existingStage => {
          if (!updatedStageIds.has(existingStage.id)) {
            stageIdsToDelete.push(existingStage.id);
          }
        });
        
        updates.stages.forEach((stage, index) => {
          if (existingStageIds.has(stage.id)) {
            stagesToUpdate.push({
              id: stage.id,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: index
            });
          } else {
            stagesToInsert.push({
              id: stage.id,
              sequence_id: id,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: index
            });
          }
        });
        
        console.log("Stages to update:", stagesToUpdate.length);
        console.log("Stages to insert:", stagesToInsert.length);
        console.log("Stage IDs to delete:", stageIdsToDelete.length);
        
        if (stageIdsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('sequence_stages')
            .delete()
            .in('id', stageIdsToDelete);
          
          if (deleteError) {
            console.error("Error deleting stages:", deleteError);
            return { success: false, error: deleteError.message };
          }
        }
        
        for (const stage of stagesToUpdate) {
          const { error: updateError } = await supabase
            .from('sequence_stages')
            .update(stage)
            .eq('id', stage.id);
          
          if (updateError) {
            console.error(`Error updating stage ${stage.id}:`, updateError);
            return { success: false, error: updateError.message };
          }
        }
        
        if (stagesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('sequence_stages')
            .insert(stagesToInsert);
          
          if (insertError) {
            console.error("Error inserting new stages:", insertError);
            return { success: false, error: insertError.message };
          }
        }
      }
      
      if (updates.timeRestrictions) {
        const { error: deleteLocalError } = await supabase
          .from("sequence_local_restrictions")
          .delete()
          .eq("sequence_id", id);
        
        if (deleteLocalError) throw deleteLocalError;
        
        const { error: deleteGlobalError } = await supabase
          .from("sequence_time_restrictions")
          .delete()
          .eq("sequence_id", id);
        
        if (deleteGlobalError) throw deleteGlobalError;
        
        const localRestrictions = updates.timeRestrictions.filter(r => !r.isGlobal);
        if (localRestrictions.length > 0 && user) {
          for (const restriction of localRestrictions) {
            const { error: localError } = await supabase
              .from("sequence_local_restrictions")
              .insert({
                sequence_id: id,
                name: restriction.name,
                active: restriction.active,
                days: restriction.days,
                start_hour: restriction.startHour,
                start_minute: restriction.startMinute,
                end_hour: restriction.endHour,
                end_minute: restriction.endMinute,
                created_by: user.id
              });
            
            if (localError) throw localError;
          }
        }
        
        const globalRestrictions = updates.timeRestrictions.filter(r => r.isGlobal);
        if (globalRestrictions.length > 0) {
          const globalRestrictionsData = globalRestrictions.map(r => ({
            sequence_id: id,
            time_restriction_id: r.id
          }));
          
          const { error: globalError } = await supabase
            .from("sequence_time_restrictions")
            .insert(globalRestrictionsData);
          
          if (globalError) throw globalError;
        }
      }
      
      setSequences(prevSequences => prevSequences.map(seq => 
        seq.id === id ? { ...seq, ...updates } : seq
      ));
      
      console.log("Sequence updated successfully");
      return { success: true };
    } catch (error) {
      console.error("Error in updateSequence:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSequences(prev => prev.filter(sequence => sequence.id !== id));
      toast({
        title: "Sucesso",
        description: "Sequência excluída com sucesso"
      });
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      toast({
        title: "Erro",
        description: `Erro ao excluir sequência: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const addTimeRestriction = async (restrictionData: Omit<TimeRestriction, "id">) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert({
          name: restrictionData.name,
          days: restrictionData.days,
          start_hour: restrictionData.startHour,
          start_minute: restrictionData.startMinute,
          end_hour: restrictionData.endHour,
          end_minute: restrictionData.endMinute,
          active: restrictionData.active,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newRestriction: TimeRestriction = {
        id: data.id,
        name: data.name,
        active: data.active,
        days: data.days,
        startHour: data.start_hour,
        startMinute: data.start_minute,
        endHour: data.end_hour,
        endMinute: data.end_minute,
        isGlobal: true
      };
      
      setTimeRestrictions(prev => [...prev, newRestriction]);
      toast({
        title: "Sucesso",
        description: "Restrição de horário criada com sucesso"
      });
    } catch (error: any) {
      console.error("Error creating time restriction:", error);
      toast({
        title: "Erro",
        description: `Erro ao criar restrição de horário: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateTimeRestriction = async (id: string, restrictionData: Partial<TimeRestriction>) => {
    try {
      const updateData: any = {};
      
      if (restrictionData.name !== undefined) updateData.name = restrictionData.name;
      if (restrictionData.active !== undefined) updateData.active = restrictionData.active;
      if (restrictionData.days !== undefined) updateData.days = restrictionData.days;
      if (restrictionData.startHour !== undefined) updateData.start_hour = restrictionData.startHour;
      if (restrictionData.startMinute !== undefined) updateData.start_minute = restrictionData.startMinute;
      if (restrictionData.endHour !== undefined) updateData.end_hour = restrictionData.endHour;
      if (restrictionData.endMinute !== undefined) updateData.end_minute = restrictionData.endMinute;
      
      const { error } = await supabase
        .from('time_restrictions')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => 
        prev.map(restriction => 
          restriction.id === id ? { ...restriction, ...restrictionData } : restriction
        )
      );
      
      toast({
        title: "Sucesso",
        description: "Restrição de horário atualizada com sucesso"
      });
    } catch (error: any) {
      console.error("Error updating time restriction:", error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar restrição de horário: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => prev.filter(restriction => restriction.id !== id));
      toast({
        title: "Sucesso",
        description: "Restrição de horário excluída com sucesso"
      });
    } catch (error: any) {
      console.error("Error deleting time restriction:", error);
      toast({
        title: "Erro",
        description: `Erro ao excluir restrição de horário: ${error.message}`,
        variant: "destructive"
      });
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
      
      if (contactData.tags && contactData.tags.length > 0) {
        for (const tag of contactData.tags) {
          const { data: existingTag } = await supabase
            .from('tags')
            .select('name')
            .eq('name', tag)
            .maybeSingle();
          
          if (!existingTag && user) {
            await supabase
              .from('tags')
              .insert({
                name: tag,
                created_by: user.id
              });
              
            setTags(prev => [...prev, tag]);
          }
          
          const { error: tagError } = await supabase
            .from('contact_tags')
            .insert({
              contact_id: contactData.id,
              tag_name: tag
            });
          
          if (tagError) console.error("Error adding tag:", tagError);
        }
      }
      
      await refreshData();
      toast({
        title: "Sucesso",
        description: "Contato adicionado com sucesso"
      });
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast({
        title: "Erro",
        description: `Erro ao adicionar contato: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const addClient = async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: clientData.accountId,
          account_name: clientData.accountName,
          created_by: user.id,
          creator_account_name: user.accountName || "Usuário"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newClient: Client = {
        id: data.id,
        accountId: data.account_id,
        accountName: data.account_name,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setClients(prev => [...prev, newClient]);
      toast({
        title: "Sucesso",
        description: `Cliente "${data.account_name}" adicionado com sucesso`
      });
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast({
        title: "Erro",
        description: `Erro ao adicionar cliente: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (clientData.accountId !== undefined) updateData.account_id = clientData.accountId;
      if (clientData.accountName !== undefined) updateData.account_name = clientData.accountName;
      
      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => 
        prev.map(client => 
          client.id === id ? { ...client, ...clientData } : client
        )
      );
      
      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso"
      });
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar cliente: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => prev.filter(client => client.id !== id));
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso"
      });
      
      const affectedInstances = instances.filter(instance => instance.clientId === id);
      if (affectedInstances.length > 0) {
        setInstances(prev => prev.filter(instance => instance.clientId !== id));
        
        if (currentInstance && currentInstance.clientId === id) {
          const nextInstance = instances.find(i => i.clientId !== id);
          handleSetCurrentInstance(nextInstance || null);
        }
      }
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({
        title: "Erro",
        description: `Erro ao excluir cliente: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const addUser = async (userData: { email: string; password: string; accountName: string, isAdmin?: boolean }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error("Erro ao criar usuário");
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          account_name: userData.accountName,
          role: userData.isAdmin ? 'admin' : 'admin'
        })
        .eq('id', data.user.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso"
      });
      refreshData();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Erro",
        description: `Erro ao adicionar usuário: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateUser = async (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => {
    try {
      const updateData: any = {};
      
      if (data.accountName !== undefined) updateData.account_name = data.accountName;
      if (data.role !== undefined) updateData.role = data.role;
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setUsers(prev => 
        prev.map(u => 
          u.id === id ? { ...u, accountName: data.accountName || u.accountName, role: data.role || u.role } : u
        )
      );
      
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso"
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar usuário: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== id));
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso"
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro",
        description: `Erro ao excluir usuário: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const addTag = async (tagName: string) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('tags')
        .insert({
          name: tagName,
          created_by: user.id
        });
      
      if (error) throw error;
      
      setTags(prev => [...prev, tagName]);
      toast({
        title: "Sucesso",
        description: "Tag adicionada com sucesso"
      });
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast({
        title: "Erro",
        description: `Erro ao adicionar tag: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const deleteTag = async (tagName: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('name', tagName);
      
      if (error) throw error;
      
      setTags(prev => prev.filter(tag => tag !== tagName));
      toast({
        title: "Sucesso",
        description: "Tag removida com sucesso"
      });
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast({
        title: "Erro",
        description: `Erro ao remover tag: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const value = {
    clients,
    instances,
    currentInstance,
    sequences,
    contacts,
    scheduledMessages,
    contactSequences,
    tags,
    timeRestrictions,
    users,
    stats,
    setCurrentInstance: handleSetCurrentInstance,
    addInstance,
    updateInstance,
    deleteInstance,
    addSequence,
    updateSequence,
    deleteSequence,
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction,
    addContact,
    getContactSequences,
    addClient,
    updateClient,
    deleteClient,
    addUser,
    updateUser,
    deleteUser,
    addTag,
    deleteTag,
    refreshData,
    isDataInitialized,
    
    // Funções de manipulação de contatos
    deleteContact: contactFunctions.deleteContact,
    updateContact: contactFunctions.updateContact,
    removeFromSequence: contactFunctions.removeFromSequence,
    updateContactSequence: contactFunctions.updateContactSequence,
  };

  return (
    <AppContext.Provider value={value}>
      <AppContactContext.Provider value={contactFunctions}>
        {children}
      </AppContactContext.Provider>
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
