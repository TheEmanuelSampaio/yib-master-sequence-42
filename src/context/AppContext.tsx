import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  TagCondition,
  SequenceStage
} from "@/types";
import { toast } from "@/components/ui/use-toast";
import AppContactContext, { createContactFunctions, AppContactFunctions } from './AppContact';

interface AppContextType {
  clients: Client[];
  instances: Instance[];
  currentInstance: Instance | null;
  setCurrentInstance: (instance: Instance | null) => void;
  sequences: Sequence[];
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSequence: (id: string, updates: Partial<Sequence>) => Promise<{ success: boolean; error?: string }>;
  deleteSequence: (id: string) => Promise<void>;
  contacts: Contact[];
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  deleteContact: (id: string) => Promise<void>;
  timeRestrictions: TimeRestriction[];
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateTimeRestriction: (id: string, updates: Partial<TimeRestriction>) => Promise<{ success: boolean; error?: string }>;
  deleteTimeRestriction: (id: string) => Promise<void>;
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  tags: string[];
  users: User[];
  dailyStats: DailyStats[];
  isLoadingData: boolean;
  isDataInitialized: boolean;
  refreshData: (forceFullRefresh?: boolean) => Promise<void>;
  isLoadingContacts: boolean;
  loadContacts: () => Promise<void>;
  loadSequencesData: () => Promise<void>;
  isSequencesLoading: boolean;
}

const defaultContextValue: AppContextType = {
  clients: [],
  instances: [],
  currentInstance: null,
  setCurrentInstance: () => { },
  sequences: [],
  addSequence: async () => { },
  updateSequence: async () => ({ success: false }),
  deleteSequence: async () => { },
  contacts: [],
  addContact: async () => { },
  updateContact: async () => ({ success: false }),
  deleteContact: async () => { },
  timeRestrictions: [],
  addTimeRestriction: async () => { },
  updateTimeRestriction: async () => ({ success: false }),
  deleteTimeRestriction: async () => { },
  scheduledMessages: [],
  contactSequences: [],
  tags: [],
  users: [],
  dailyStats: [],
  isLoadingData: false,
  isDataInitialized: false,
  refreshData: async () => { },
  isLoadingContacts: false,
  loadContacts: async () => { },
  loadSequencesData: async () => {},
  isSequencesLoading: false,
};

export const AppContext = createContext<AppContextType>(defaultContextValue);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(() => {
    // Tentar obter o ID da instância do localStorage ao inicializar
    const storedInstanceId = localStorage.getItem('currentInstanceId');
    if (storedInstanceId) {
      // Se o ID estiver no localStorage, você precisará buscar a instância correspondente
      // Isso requer que 'instances' já esteja populado, o que pode não ser o caso na primeira renderização
      return null; // Temporariamente retorna null, o valor correto será definido no useEffect
    }
    return null;
  });
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [isSequencesLoading, setIsSequencesLoading] = useState(false);

  const contactFunctions: AppContactFunctions = createContactFunctions({
    contacts,
    setContacts,
    supabase,
    toast
  });

  const setCurrentInstanceWithStorage = (instance: Instance | null) => {
    setCurrentInstance(instance);
    if (instance) {
      localStorage.setItem('currentInstanceId', instance.id);
      console.log(`AppContext: Instância atual definida para ${instance.name} (ID: ${instance.id}). Salvando no localStorage.`);
    } else {
      localStorage.removeItem('currentInstanceId');
      console.log('AppContext: Instância atual removida. Removendo do localStorage.');
    }
  };

  // Nova função específica para carregar apenas dados de sequências
  const loadSequencesData = useCallback(async () => {
    if (!currentInstance || !user) return;

    setIsSequencesLoading(true);
    console.log(`AppContext: loadSequencesData - Carregando sequências para instância: ${currentInstance.name} (ID: ${currentInstance.id})`);

    try {
      // Carregar sequências da instância atual
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select('*, sequence_stages (*), sequence_time_restrictions (*, time_restrictions (*))')
        .eq('instance_id', currentInstance.id)
        .order('created_at', { ascending: false });
      
      if (sequencesError) throw sequencesError;

      // Carregar restrições de tempo globais se ainda não estiverem carregadas
      let globalRestrictionsForContext = timeRestrictions;
      if (globalRestrictionsForContext.length === 0) {
        const { data: restrictionsData, error: restrictionsError } = await supabase.from('time_restrictions').select('*');
        if (restrictionsError) throw restrictionsError;
        globalRestrictionsForContext = restrictionsData.map(r => ({ 
          ...r, 
          startHour: r.start_hour, 
          startMinute: r.start_minute, 
          endHour: r.end_hour, 
          endMinute: r.end_minute, 
          isGlobal: true 
        })) as TimeRestriction[];
        
        // Atualizar o estado global se necessário
        if (timeRestrictions.length === 0) {
          setTimeRestrictions(globalRestrictionsForContext);
        }
      }

      // Transformar e definir sequências
      const processedSequences = (sequencesData as ExtendedSequence[] || []).map(s => transformSequence(s, globalRestrictionsForContext));
      setSequences(processedSequences);
      console.log(`AppContext: ${processedSequences.length} sequências carregadas para ${currentInstance.name} via loadSequencesData.`);

    } catch (error: any) {
      console.error(`AppContext: Erro ao carregar sequências para instância ${currentInstance.name}:`, error);
      toast({ 
        title: "Erro ao carregar sequências", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSequencesLoading(false);
    }
  }, [currentInstance, user, timeRestrictions]);

  // Modificando refreshData para não carregar sequências por padrão
  const refreshData = useCallback(async (forceFullRefresh = false) => {
    if (!user || (isLoadingData && !forceFullRefresh)) return;

    setIsLoadingData(true);
    console.log(`AppContext: Iniciando refreshData. Usuário: ${user?.id}, Forçar recarga: ${forceFullRefresh}, Já inicializado: ${isDataInitialized}`);

    try {
      console.log("AppContext: Carregando dados essenciais (clients, instances, tags, global time restrictions, users)...");
      // PARTE 1: Carregar dados que não dependem da currentInstance ou são globais
      const [
        clientsRes,
        instancesRes,
        tagsRes,
        timeRestrictionsRes,
        profilesRes,
        authUsersRes,
        statsRes
      ] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('instances').select('*, clients(*)'),
        supabase.from('tags').select('name'),
        supabase.from('time_restrictions').select('*'), // Globais
        supabase.from('profiles').select('*'),
        supabase.rpc('get_users_with_emails'),
        supabase.from('daily_stats').select('*').order('date', { ascending: false }).limit(30)
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (instancesRes.error) throw instancesRes.error;
      if (tagsRes.error) throw tagsRes.error;
      if (timeRestrictionsRes.error) throw timeRestrictionsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (authUsersRes.error) throw authUsersRes.error;
      if (statsRes.error) throw statsRes.error;

      const clientsData = clientsRes.data as Client[];
      setClients(clientsData);
      console.log(`AppContext: ${clientsData.length} clients carregados.`);

      const instancesData = (instancesRes.data as any[]).map(i => ({
        ...i,
        clientId: i.clients?.id,
        client: i.clients,
      })) as Instance[];
      setInstances(instancesData);
      console.log(`AppContext: ${instancesData.length} instâncias carregadas.`);

      const tagsData = tagsRes.data?.map(t => t.name) as string[];
      setTags(tagsData);
      console.log(`AppContext: ${tagsData.length} tags carregadas.`);

      const timeRestrictionsData = timeRestrictionsRes.data?.map(r => ({
        ...r,
        startHour: r.start_hour,
        startMinute: r.start_minute,
        endHour: r.end_hour,
        endMinute: r.end_minute,
        isGlobal: true
      })) as TimeRestriction[];
      setTimeRestrictions(timeRestrictionsData);
      console.log(`AppContext: ${timeRestrictionsData.length} restrições de tempo globais carregadas.`);

      const usersData = authUsersRes.data as User[];
      setUsers(usersData);
      console.log(`AppContext: ${usersData.length} usuários carregados.`);

      const dailyStatsData = statsRes.data as DailyStats[];
      setDailyStats(dailyStatsData);
      console.log(`AppContext: ${dailyStatsData.length} daily stats carregados.`);

      // IMPORTANTE: Marcar como inicializado AQUI, ANTES de tentar restaurar currentInstance no useEffect
      setIsDataInitialized(true);
      console.log("AppContext: Dados essenciais carregados. isDataInitialized definido como true.");

      // O carregamento de 'sequences' não faz mais parte do carregamento inicial

      if (forceFullRefresh) {
        console.log("AppContext: forceFullRefresh é true, recarregando todos os dados dependentes...");
        
        // Mesmo com forceFullRefresh não carregamos mais as sequências aqui
        // Em vez disso, carregaremos apenas quando a página de sequências for acessada
        
        // Recarregar contatos (se necessário)
        if (currentInstance) {
          console.log("AppContext: Recarregando contatos para a instância atual...");
          const { data: contactsData, error: contactsError } = await supabase.from('contacts').select('*').eq('client_id', currentInstance.clientId);
          if (contactsError) throw contactsError;
          const contactsResult = contactsData as Contact[];
          setContacts(contactsResult);
          console.log(`AppContext: ${contactsResult.length} contatos carregados para a instância ${currentInstance.name}.`);
        }
      }

      console.log("AppContext: refreshData (parte principal) concluído.");
    } catch (error: any) {
      console.error("AppContext: Erro durante refreshData:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, isLoadingData, isDataInitialized]); // Removido currentInstance e setCurrentInstance

  useEffect(() => {
    // Após a inicialização dos dados, tentar restaurar a instância atual do localStorage
    if (isDataInitialized && instances.length > 0) {
      const storedInstanceId = localStorage.getItem('currentInstanceId');
      if (storedInstanceId) {
        const instance = instances.find(i => i.id === storedInstanceId);
        if (instance) {
          setCurrentInstanceWithStorage(instance);
          console.log(`AppContext: Instância restaurada do localStorage: ${instance.name} (ID: ${instance.id})`);
        } else {
          console.warn(`AppContext: Instância com ID ${storedInstanceId} não encontrada. Removendo do localStorage.`);
          localStorage.removeItem('currentInstanceId');
        }
      } else if (instances.length > 0 && !currentInstance) {
        // Se não houver instância no localStorage, definir a primeira instância como a atual
        setCurrentInstanceWithStorage(instances[0]);
        console.log(`AppContext: Nenhuma instância encontrada no localStorage. Definindo a primeira instância como a atual: ${instances[0].name} (ID: ${instances[0].id})`);
      }
    }
  }, [isDataInitialized, instances]);

  // Removendo o carregamento de sequências do useEffect que observa mudanças em currentInstance
  useEffect(() => {
    const loadInstanceSpecificData = async () => {
      if (currentInstance && isDataInitialized && user) {
        setIsLoadingData(true);
        console.log(`AppContext: useEffect[currentInstance,isDataInitialized,user] - Carregando dados para instância: ${currentInstance.name} (ID: ${currentInstance.id})`);
        try {
          // Removido o carregamento de sequências daqui
          // As sequências serão carregadas sob demanda na página de sequências

          // Contatos do cliente da instância atual
          const { data: contactsData, error: contactsError } = await supabase.from('contacts').select('*').eq('client_id', currentInstance.clientId);
          if (contactsError) throw contactsError;
          const contactsResult = contactsData as Contact[];
          setContacts(contactsResult);
          console.log(`AppContext: ${contactsResult.length} contatos carregados para a instância ${currentInstance.name}.`);
          
          // Para mensagens agendadas e sequências de contato, agora precisamos verificar se temos sequências carregadas
          if (sequences.length > 0) {
            const sequenceIdsOfCurrentInstance = sequences.map(s => s.id);

            // Mensagens agendadas para a instância atual
            const { data: scheduledMessagesData, error: scheduledMessagesError } = await supabase
              .from('scheduled_messages')
              .select('*')
              .eq('instance_id', currentInstance.id)
              .in('sequence_id', sequenceIdsOfCurrentInstance);
            if (scheduledMessagesError) throw scheduledMessagesError;
            const scheduledMessagesResult = scheduledMessagesData as ScheduledMessage[];
            setScheduledMessages(scheduledMessagesResult);
            console.log(`AppContext: ${scheduledMessagesResult.length} mensagens agendadas carregadas para a instância ${currentInstance.name}.`);

            // ContactSequences para a instância atual
            const { data: contactSequencesData, error: contactSequencesError } = await supabase
              .from('contact_sequences')
              .select('*')
              .eq('instance_id', currentInstance.id)
              .in('sequence_id', sequenceIdsOfCurrentInstance);
            if (contactSequencesError) throw contactSequencesError;
            const contactSequencesResult = contactSequencesData as ContactSequence[];
            setContactSequences(contactSequencesResult);
            console.log(`AppContext: ${contactSequencesResult.length} contact_sequences carregadas para a instância ${currentInstance.name}.`);
          } else {
            // Limpar mensagens e sequências de contato se não temos sequências carregadas
            setScheduledMessages([]);
            setContactSequences([]);
            console.log(`AppContext: Nenhuma sequência carregada para a instância ${currentInstance.name}, limpando mensagens e contact_sequences.`);
          }

        } catch (error: any) {
          console.error(`AppContext: Erro ao carregar dados da instância ${currentInstance.name}:`, error);
          toast({
            title: "Erro ao carregar dados da instância", 
            description: error.message,
            variant: "destructive"
          });
        } finally {
          setIsLoadingData(false);
        }
      } else if (!currentInstance && isDataInitialized) {
        // Limpar dados específicos da instância quando não houver instância selecionada
        setContacts([]);
        setScheduledMessages([]);
        setContactSequences([]);
        console.log('AppContext: Nenhuma instância selecionada. Limpando dados específicos da instância.');
      }
    };

    loadInstanceSpecificData();
  }, [currentInstance, isDataInitialized, user, clients, users, sequences]); // Adicionado sequences como dependência

  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!currentInstance) throw new Error("Nenhuma instância selecionada.");

      const { data, error } = await supabase
        .from('sequences')
        .insert([{
          ...sequence,
          instance_id: currentInstance.id,
          start_condition_tags: sequence.startCondition.tags,
          start_condition_type: sequence.startCondition.type,
          stop_condition_tags: sequence.stopCondition.tags,
          stop_condition_type: sequence.stopCondition.type,
          webhook_enabled: sequence.webhookEnabled || false,
          webhook_id: sequence.webhookId || null,
        }])
        .select('*')
        .single();

      if (error) throw error;

      const newSequence = transformSequence(data as any, timeRestrictions);
      setSequences(prevSequences => [...prevSequences, newSequence]);
      console.log(`AppContext: Sequência "${sequence.name}" criada com sucesso na instância ${currentInstance.name}.`);
    } catch (error: any) {
      console.error("AppContext: Erro ao criar sequência:", error);
      toast({
        title: "Erro ao criar sequência",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateSequence = async (id: string, updates: Partial<Sequence>) => {
    try {
      const sequenceToUpdate = sequences.find(seq => seq.id === id);
      if (!sequenceToUpdate) throw new Error("Sequência não encontrada.");

      const { data, error } = await supabase
        .from('sequences')
        .update({
          ...updates,
          start_condition_tags: updates.startCondition?.tags || sequenceToUpdate.startCondition.tags,
          start_condition_type: updates.startCondition?.type || sequenceToUpdate.startCondition.type,
          stop_condition_tags: updates.stopCondition?.tags || sequenceToUpdate.stopCondition.tags,
          stop_condition_type: updates.stopCondition?.type || sequenceToUpdate.stopCondition.type,
          webhook_enabled: updates.webhookEnabled !== undefined ? updates.webhookEnabled : sequenceToUpdate.webhookEnabled,
          webhook_id: updates.webhookId !== undefined ? updates.webhookId : sequenceToUpdate.webhookId,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error("Erro ao atualizar sequência:", error);
        return { success: false, error: error.message };
      }

      const updatedSequence = transformSequence(data as any, timeRestrictions);
      setSequences(prevSequences =>
        prevSequences.map(seq => (seq.id === id ? updatedSequence : seq))
      );
      console.log(`AppContext: Sequência "${updatedSequence.name}" (ID: ${id}) atualizada com sucesso.`);
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao atualizar sequência:", error);
      toast({
        title: "Erro ao atualizar sequência",
        description: error.message,
        variant: "destructive"
      });
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

      setSequences(prevSequences => prevSequences.filter(seq => seq.id !== id));
      console.log(`AppContext: Sequência com ID ${id} excluída com sucesso.`);
    } catch (error: any) {
      console.error("AppContext: Erro ao excluir sequência:", error);
      toast({
        title: "Erro ao excluir sequência",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addContact = async (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!currentInstance) throw new Error("Nenhuma instância selecionada.");

      const { data, error } = await supabase
        .from('contacts')
        .insert([{ ...contact, client_id: currentInstance.clientId }])
        .select('*')
        .single();

      if (error) throw error;

      setContacts(prevContacts => [...prevContacts, data as Contact]);
      console.log(`AppContext: Contato "${contact.name}" adicionado com sucesso.`);
    } catch (error: any) {
      console.error("AppContext: Erro ao adicionar contato:", error);
      toast({
        title: "Erro ao adicionar contato",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error("Erro ao atualizar contato:", error);
        return { success: false, error: error.message };
      }

      setContacts(prevContacts =>
        prevContacts.map(contact => (contact.id === id ? data as Contact : contact))
      );
      console.log(`AppContext: Contato com ID ${id} atualizado com sucesso.`);
      return { success: true };
    } catch (error: any) {
      console.error("AppContext: Erro ao atualizar contato:", error);
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error: error.message };
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContacts(prevContacts => prevContacts.filter(contact => contact.id !== id));
      console.log(`AppContext: Contato com ID ${id} excluído com sucesso.`);
    } catch (error: any) {
      console.error("AppContext: Erro ao excluir contato:", error);
      toast({
        title: "Erro ao excluir contato",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addTimeRestriction = async (restriction: Omit<TimeRestriction, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert([{
          ...restriction,
          start_hour: restriction.startHour,
          start_minute: restriction.startMinute,
          end_hour: restriction.endHour,
          end_minute: restriction.endMinute
        }])
        .select('*')
        .single();

      if (error) throw error;

      const newRestriction = {
        ...data,
        startHour: data.start_hour,
        startMinute: data.start_minute,
        endHour: data.end_hour,
        endMinute: data.end_minute
      } as TimeRestriction;

      setTimeRestrictions(prevRestrictions => [...prevRestrictions, newRestriction]);
      console.log(`AppContext: Restrição de tempo "${restriction.name}" adicionada com sucesso.`);
    } catch (error: any) {
      console.error("AppContext: Erro ao adicionar restrição de tempo:", error);
      toast({
        title: "Erro ao adicionar restrição de tempo",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateTimeRestriction = async (id: string, updates: Partial<TimeRestriction>) => {
    try {
      const { data, error } = await supabase
        .from('time_restrictions')
        .update({
          ...updates,
          start_hour: updates.startHour,
          start_minute: updates.startMinute,
          end_hour: updates.endHour,
          end_minute: updates.endMinute
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error("Erro ao atualizar restrição de tempo:", error);
        return { success: false, error: error.message };
      }

      const updatedRestriction = {
        ...data,
        startHour: data.start_hour,
        startMinute: data.start_minute,
        endHour: data.end_hour,
        endMinute: data.end_minute
      } as TimeRestriction;

      setTimeRestrictions(prevRestrictions =>
        prevRestrictions.map(restriction => (restriction.id === id ? updatedRestriction : restriction))
      );
      console.log(`AppContext: Restrição de tempo com ID ${id} atualizada com sucesso.`);
      return { success: true };
    } catch (error: any) {
      console.error("AppContext: Erro ao atualizar restrição de tempo:", error);
      toast({
        title: "Erro ao atualizar restrição de tempo",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error: error.message };
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTimeRestrictions(prevRestrictions => prevRestrictions.filter(restriction => restriction.id !== id));
      console.log(`AppContext: Restrição de tempo com ID ${id} excluída com sucesso.`);
    } catch (error: any) {
      console.error("AppContext: Erro ao excluir restrição de tempo:", error);
      toast({
        title: "Erro ao excluir restrição de tempo",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const value: AppContextType = {
    clients,
    instances,
    currentInstance,
    setCurrentInstance: setCurrentInstanceWithStorage,
    sequences,
    addSequence,
    updateSequence,
    deleteSequence,
    contacts,
    addContact,
    updateContact,
    deleteContact,
    timeRestrictions,
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction,
    scheduledMessages,
    contactSequences,
    tags,
    users,
    dailyStats,
    isLoadingData,
    isDataInitialized,
    refreshData,
    isLoadingContacts,
    loadContacts: contactFunctions.loadContacts,
    loadSequencesData,
    isSequencesLoading,
  };

  return (
    <AppContext.Provider value={value}>
      <AppContactContext.Provider value={contactFunctions}>
        {children}
      </AppContactContext.Provider>
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

interface ExtendedSequence extends Omit<Sequence, 'instanceId' | 'startCondition' | 'stopCondition' | 'status' | 'type' | 'webhookEnabled' | 'webhookId'> {
    sequence_stages: any[];
    sequence_time_restrictions: any[];
    localTimeRestrictions?: TimeRestriction[];
    instance_id: string;
    start_condition_type: string;
    start_condition_tags: string[];
    stop_condition_type: string;
    stop_condition_tags: string[];
    status: string;
    type?: "message" | "pattern" | "typebot";
    webhook_enabled?: boolean;
    webhook_id?: string;
}

const transformSequence = (sequence: ExtendedSequence, globalRestrictions: TimeRestriction[]): Sequence => {
  const localTimeRestrictions = sequence.sequence_time_restrictions?.map(str => {
    const restriction = str.time_restrictions;
    return {
      id: restriction.id,
      name: restriction.name,
      startHour: restriction.start_hour,
      startMinute: restriction.start_minute,
      endHour: restriction.end_hour,
      endMinute: restriction.end_minute,
      daysOfWeek: restriction.days_of_week,
      isGlobal: false,
      sequenceId: str.sequence_id,
    } as TimeRestriction
  }) || [];

  return {
    id: sequence.id,
    name: sequence.name,
    instanceId: sequence.instance_id,
    stages: sequence.sequence_stages?.map(s => ({
      id: s.id,
      sequenceId: s.sequence_id,
      type: s.type,
      content: s.content,
      order: s.order,
      delay: s.delay,
      delayUnit: s.delay_unit,
      timeRestrictionId: s.time_restriction_id,
    })) as SequenceStage[],
    startCondition: {
      type: sequence.start_condition_type,
      tags: sequence.start_condition_tags,
    } as TagCondition,
    stopCondition: {
      type: sequence.stop_condition_type,
      tags: sequence.stop_condition_tags,
    } as TagCondition,
    status: sequence.status,
    createdAt: sequence.created_at,
    updatedAt: sequence.updated_at,
    timeRestrictions: [...globalRestrictions, ...localTimeRestrictions],
    type: sequence.type,
    webhookEnabled: sequence.webhook_enabled,
    webhookId: sequence.webhook_id,
  } as Sequence;
};
