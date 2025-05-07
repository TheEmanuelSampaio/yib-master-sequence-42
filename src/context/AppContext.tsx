import { createClient } from '@supabase/supabase-js';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { User, Client, Instance, Sequence, SequenceStage, TimeRestriction, Contact, ScheduledMessage, ContactSequence, StageProgressStatus, AppSetup } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID, checkStagesInUse } from '@/integrations/supabase/client';
import { AdvancedCondition, ConditionGroup } from '@/types/conditionTypes';

interface AppContextType {
  // Usuário
  user: User | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  
  // Dados gerais
  clients: Client[];
  instances: Instance[];
  sequences: Sequence[];
  tags: string[];
  timeRestrictions: TimeRestriction[];
  contacts: Contact[];
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  stageProgressStatus: StageProgressStatus[];
  appSetup: AppSetup | null;
  isDataInitialized: boolean;
  
  // Seleção atual
  currentClient: Client | null;
  setCurrentClient: (client: Client | null) => void;
  currentInstance: Instance | null;
  setCurrentInstance: (instance: Instance | null) => void;
  
  // Funções de clientes
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'creator'>) => Promise<{ success: boolean; error?: string; client?: Client }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<{ success: boolean; error?: string; }>;
  deleteClient: (id: string) => Promise<{ success: boolean; error?: string; }>;
  
  // Funções de instâncias
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt' | 'client'>) => Promise<{ success: boolean; error?: string; instance?: Instance }>;
  updateInstance: (id: string, updates: Partial<Instance>) => Promise<{ success: boolean; error?: string; }>;
  deleteInstance: (id: string) => Promise<{ success: boolean; error?: string; }>;
  
  // Funções de sequências
  sequences: Sequence[];
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string; }>;
  updateSequence: (id: string, updates: Partial<Sequence>) => Promise<{ success: boolean; error?: string; }>;
  deleteSequence: (id: string) => Promise<{ success: boolean; error?: string; }>;
  
  // Funções de tags
  addTag: (tag: string) => Promise<{ success: boolean; error?: string; }>;
  
  // Funções de restrições de tempo
  addTimeRestriction: (restriction: Omit<TimeRestriction, 'id'>) => Promise<{ success: boolean; error?: string; restriction?: TimeRestriction }>;
  updateTimeRestriction: (id: string, updates: Partial<TimeRestriction>) => Promise<{ success: boolean; error?: string; }>;
  deleteTimeRestriction: (id: string) => Promise<{ success: boolean; error?: string; }>;
  
  // Funções de contatos
  getContactById: (id: string) => Contact | undefined;
  getContactsByClientId: (clientId: string) => Contact[];
  
  // Funções de mensagens agendadas
  getScheduledMessagesByContactId: (contactId: string) => ScheduledMessage[];
  
  // Funções de sequências de contatos
  getContactSequencesByContactId: (contactId: string) => ContactSequence[];
  
  // Funções de configuração
  completeSetup: () => Promise<{ success: boolean; error?: string; }>;
  
  // Funções de atualização de dados
  refreshData: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp deve ser usado dentro de um AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: clerkUser, isLoaded: clerkIsLoaded } = useUser();
  
  // Estado do usuário
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Estado de dados
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [stageProgressStatus, setStageProgressStatus] = useState<StageProgressStatus[]>([]);
  const [appSetup, setAppSetup] = useState<AppSetup | null>(null);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  
  // Seleção atual
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  
  // Carregar dados do usuário quando o Clerk estiver pronto
  useEffect(() => {
    const loadUserData = async () => {
      if (!clerkIsLoaded) return;
      
      if (!clerkUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      try {
        // Buscar perfil do usuário no Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clerkUser.id)
          .single();
        
        if (error) {
          console.error('Erro ao carregar perfil:', error);
          setIsLoading(false);
          return;
        }
        
        // Verificar se é super admin
        const { data: superAdminCheck, error: superAdminError } = await supabase.rpc('is_super_admin');
        
        if (superAdminError) {
          console.error('Erro ao verificar super admin:', superAdminError);
        } else {
          setIsSuperAdmin(!!superAdminCheck);
        }
        
        // Criar objeto de usuário
        const userData: User = {
          id: clerkUser.id,
          accountName: profile?.account_name || clerkUser.username || 'Usuário',
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          role: profile?.role || 'admin',
          avatar: clerkUser.imageUrl
        };
        
        setUser(userData);
        
        // Carregar dados iniciais
        await loadInitialData();
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [clerkUser, clerkIsLoaded]);
  
  // Carregar dados iniciais
  const loadInitialData = async () => {
    try {
      // Verificar se o setup foi concluído
      await loadAppSetup();
      
      // Carregar dados básicos
      await Promise.all([
        loadClients(),
        loadTags(),
        loadTimeRestrictions()
      ]);
      
      setIsDataInitialized(true);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };
  
  // Recarregar todos os dados
  const refreshData = useCallback(async () => {
    try {
      if (!user) return;
      
      await Promise.all([
        loadClients(),
        loadTags(),
        loadTimeRestrictions()
      ]);
      
      if (currentClient) {
        await loadInstancesForClient(currentClient.id);
        await loadContactsForClient(currentClient.id);
      }
      
      if (currentInstance) {
        await loadSequences(currentInstance.id);
      }
      
      setIsDataInitialized(true);
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
    }
  }, [user, currentClient, currentInstance]);
  
  // Carregar configuração do app
  const loadAppSetup = async () => {
    try {
      const { data, error } = await supabase
        .from('app_setup')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao carregar configuração do app:', error);
        return;
      }
      
      if (data) {
        setAppSetup({
          id: data.id,
          setupCompleted: data.setup_completed,
          setupCompletedAt: data.setup_completed_at
        });
      } else {
        // Criar configuração inicial
        const { data: newSetup, error: createError } = await supabase
          .from('app_setup')
          .insert([{ setup_completed: false }])
          .select()
          .single();
        
        if (createError) {
          console.error('Erro ao criar configuração inicial:', createError);
          return;
        }
        
        setAppSetup({
          id: newSetup.id,
          setupCompleted: newSetup.setup_completed,
          setupCompletedAt: newSetup.setup_completed_at
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do app:', error);
    }
  };
  
  // Concluir setup inicial
  const completeSetup = async () => {
    try {
      if (!appSetup) {
        return { success: false, error: 'Configuração do app não encontrada' };
      }
      
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('app_setup')
        .update({
          setup_completed: true,
          setup_completed_at: now
        })
        .eq('id', appSetup.id);
      
      if (error) {
        console.error('Erro ao concluir setup:', error);
        return { success: false, error: error.message };
      }
      
      setAppSetup({
        ...appSetup,
        setupCompleted: true,
        setupCompletedAt: now
      });
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao concluir setup:', error);
      return { success: false, error: 'Erro interno ao concluir setup' };
    }
  };
  
  /**
   * Carrega todos os clientes do banco de dados
   */
  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*, creator:profiles!clients_created_by_fkey(id, account_name)')
        .order('account_name');
      
      if (error) {
        console.error('Erro ao carregar clientes:', error);
        return;
      }
      
      const processedClients: Client[] = data.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        creator: client.creator ? {
          id: client.creator.id,
          account_name: client.creator.account_name
        } : undefined,
        creator_account_name: client.creator_account_name
      }));
      
      setClients(processedClients);
      
      // Se não houver cliente selecionado e houver clientes disponíveis, selecionar o primeiro
      if (!currentClient && processedClients.length > 0) {
        setCurrentClient(processedClients[0]);
        await loadInstancesForClient(processedClients[0].id);
        await loadContactsForClient(processedClients[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };
  
  /**
   * Adiciona um novo cliente ao banco de dados
   */
  const addClient = async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'creator'>) => {
    try {
      if (!user) {
        toast.error('Você precisa estar logado para adicionar um cliente');
        return { success: false, error: 'Usuário não autenticado' };
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          account_id: client.accountId,
          account_name: client.accountName,
          created_by: user.id,
          creator_account_name: user.accountName
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar cliente:', error);
        return { success: false, error: error.message };
      }
      
      const newClient: Client = {
        id: data.id,
        accountId: data.account_id,
        accountName: data.account_name,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        creator_account_name: data.creator_account_name
      };
      
      setClients(prev => [...prev, newClient]);
      
      return { success: true, client: newClient };
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      return { success: false, error: 'Erro interno ao criar cliente' };
    }
  };
  
  /**
   * Atualiza um cliente existente
   */
  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      if (!isValidUUID(id)) {
        console.error('ID de cliente inválido:', id);
        return { success: false, error: 'ID de cliente inválido' };
      }
      
      const updateData: any = {};
      
      if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
      if (updates.accountName !== undefined) updateData.account_name = updates.accountName;
      
      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        return { success: false, error: error.message };
      }
      
      // Atualizar estado local
      setClients(prev => prev.map(client => 
        client.id === id ? { ...client, ...updates } : client
      ));
      
      // Se o cliente atual foi atualizado, atualizar também
      if (currentClient && currentClient.id === id) {
        setCurrentClient(prev => prev ? { ...prev, ...updates } : null);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      return { success: false, error: 'Erro interno ao atualizar cliente' };
    }
  };
  
  /**
   * Exclui um cliente existente
   */
  const deleteClient = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        console.error('ID de cliente inválido:', id);
        return { success: false, error: 'ID de cliente inválido' };
      }
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao excluir cliente:', error);
        return { success: false, error: error.message };
      }
      
      // Atualizar estado local
      setClients(prev => prev.filter(client => client.id !== id));
      
      // Se o cliente atual foi excluído, limpar seleção
      if (currentClient && currentClient.id === id) {
        setCurrentClient(null);
        setCurrentInstance(null);
        setInstances([]);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      return { success: false, error: 'Erro interno ao excluir cliente' };
    }
  };
  
  /**
   * Carrega instâncias para um cliente específico
   */
  const loadInstancesForClient = async (clientId: string) => {
    try {
      if (!isValidUUID(clientId)) {
        console.error('ID de cliente inválido:', clientId);
        return;
      }
      
      const { data, error } = await supabase
        .from('instances')
        .select('*, client:clients(*)')
        .eq('client_id', clientId)
        .order('name');
      
      if (error) {
        console.error('Erro ao carregar instâncias:', error);
        return;
      }
      
      const processedInstances: Instance[] = data.map(instance => ({
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
          updatedAt: instance.client.updated_at
        } : undefined,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at
      }));
      
      setInstances(processedInstances);
      
      // Se não houver instância selecionada e houver instâncias disponíveis, selecionar a primeira
      if (!currentInstance && processedInstances.length > 0) {
        setCurrentInstance(processedInstances[0]);
        await loadSequences(processedInstances[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    }
  };
  
  /**
   * Adiciona uma nova instância ao banco de dados
   */
  const addInstance = async (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt' | 'client'>) => {
    try {
      if (!user) {
        toast.error('Você precisa estar logado para adicionar uma instância');
        return { success: false, error: 'Usuário não autenticado' };
      }
      
      if (!isValidUUID(instance.clientId)) {
        console.error('ID de cliente inválido:', instance.clientId);
        return { success: false, error: 'ID de cliente inválido' };
      }
      
      const { data, error } = await supabase
        .from('instances')
        .insert([{
          name: instance.name,
          evolution_api_url: instance.evolutionApiUrl,
          api_key: instance.apiKey,
          active: instance.active,
          client_id: instance.clientId,
          created_by: user.id
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar instância:', error);
        return { success: false, error: error.message };
      }
      
      const client = clients.find(c => c.id === instance.clientId);
      
      const newInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        active: data.active,
        clientId: data.client_id,
        client: client,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setInstances(prev => [...prev, newInstance]);
      
      return { success: true, instance: newInstance };
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      return { success: false, error: 'Erro interno ao criar instância' };
    }
  };
  
  /**
   * Atualiza uma instância existente
   */
  const updateInstance = async (id: string, updates: Partial<Instance>) => {
    try {
      if (!isValidUUID(id)) {
        console.error('ID de instância inválido:', id);
        return { success: false, error: 'ID de instância inválido' };
      }
      
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.evolutionApiUrl !== undefined) updateData.evolution_api_url = updates.evolutionApiUrl;
      if (updates.apiKey !== undefined) updateData.api_key = updates.apiKey;
      if (updates.active !== undefined) updateData.active = updates.active;
      
      const { error } = await supabase
        .from('instances')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao atualizar instância:', error);
        return { success: false, error: error.message };
      }
      
      // Atualizar estado local
      setInstances(prev => prev.map(instance => 
        instance.id === id ? { ...instance, ...updates } : instance
      ));
      
      // Se a instância atual foi atualizada, atualizar também
      if (currentInstance && currentInstance.id === id) {
        setCurrentInstance(prev => prev ? { ...prev, ...updates } : null);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar instância:', error);
      return { success: false, error: 'Erro interno ao atualizar instância' };
    }
  };
  
  /**
   * Exclui uma instância existente
   */
  const deleteInstance = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        console.error('ID de instância inválido:', id);
        return { success: false, error: 'ID de instância inválido' };
      }
      
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao excluir instância:', error);
        return { success: false, error: error.message };
      }
      
      // Atualizar estado local
      setInstances(prev => prev.filter(instance => instance.id !== id));
      
      // Se a instância atual foi excluída, limpar seleção
      if (currentInstance && currentInstance.id === id) {
        setCurrentInstance(null);
        setSequences([]);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir instância:', error);
      return { success: false, error: 'Erro interno ao excluir instância' };
    }
  };
  
  /**
   * Salva grupos de condições avançadas para uma sequência
   */
  const saveAdvancedCondition = async (
    sequenceId: string,
    condition: AdvancedCondition,
    transaction: any
  ) => {
    try {
      // Limpar condições existentes primeiro
      await transaction.from('sequence_condition_groups')
        .delete()
        .eq('sequence_id', sequenceId)
        .eq('type', condition.type);
      
      if (!condition.groups || condition.groups.length === 0) {
        return { success: true };
      }
      
      // Inserir os novos grupos
      for (const group of condition.groups) {
        // Criar o grupo
        const { data: newGroup, error: groupError } = await transaction
          .from('sequence_condition_groups')
          .insert([{
            sequence_id: sequenceId,
            type: condition.type,
            group_index: group.groupIndex,
            group_operator: group.groupOperator,
            condition_operator: group.conditionOperator
          }])
          .select()
          .single();
        
        if (groupError) {
          console.error('Erro ao salvar grupo de condição:', groupError);
          return { success: false, error: groupError.message };
        }
        
        // Inserir as tags do grupo
        if (group.tags && group.tags.length > 0) {
          const tagInserts = group.tags.map(tag => ({
            group_id: newGroup.id,
            tag_name: tag
          }));
          
          const { error: tagError } = await transaction
            .from('sequence_condition_tags')
            .insert(tagInserts);
          
          if (tagError) {
            console.error('Erro ao salvar tags de condição:', tagError);
            return { success: false, error: tagError.message };
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar condição avançada:', error);
      return { success: false, error: 'Erro ao salvar condição avançada' };
    }
  };
  
  /**
   * Carrega grupos de condições avançadas para uma sequência
   */
  const loadAdvancedConditions = async (sequenceId: string): Promise<{
    startCondition?: AdvancedCondition;
    stopCondition?: AdvancedCondition;
  }> => {
    try {
      // Buscar todos os grupos de condições para esta sequência
      const { data: groups, error: groupsError } = await supabase
        .from('sequence_condition_groups')
        .select(`
          id, 
          type,
          group_index, 
          group_operator, 
          condition_operator
        `)
        .eq('sequence_id', sequenceId);
      
      if (groupsError) {
        console.error('Erro ao carregar grupos de condições:', groupsError);
        return {};
      }
      
      if (!groups || groups.length === 0) {
        return {};
      }
      
      // Buscar tags para cada grupo
      const startGroups: ConditionGroup[] = [];
      const stopGroups: ConditionGroup[] = [];
      
      for (const group of groups) {
        const { data: tags, error: tagsError } = await supabase
          .from('sequence_condition_tags')
          .select('tag_name')
          .eq('group_id', group.id);
        
        if (tagsError) {
          console.error('Erro ao carregar tags de condição:', tagsError);
          continue;
        }
        
        const conditionGroup: ConditionGroup = {
          id: group.id,
          groupIndex: group.group_index,
          groupOperator: group.group_operator as "AND" | "OR",
          conditionOperator: group.condition_operator as "AND" | "OR",
          tags: tags?.map(t => t.tag_name) || []
        };
        
        if (group.type === 'start') {
          startGroups.push(conditionGroup);
        } else if (group.type === 'stop') {
          stopGroups.push(conditionGroup);
        }
      }
      
      // Ordenar grupos por índice
      startGroups.sort((a, b) => a.groupIndex - b.groupIndex);
      stopGroups.sort((a, b) => a.groupIndex - b.groupIndex);
      
      const result: {
        startCondition?: AdvancedCondition;
        stopCondition?: AdvancedCondition;
      } = {};
      
      if (startGroups.length > 0) {
        result.startCondition = {
          type: 'start',
          groups: startGroups
        };
      }
      
      if (stopGroups.length > 0) {
        result.stopCondition = {
          type: 'stop',
          groups: stopGroups
        };
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao carregar condições avançadas:', error);
      return {};
    }
  };
  
  /**
   * Carrega restrições de tempo para uma sequência específica
   */
  const loadTimeRestrictionsForSequence = async (sequenceId: string): Promise<TimeRestriction[]> => {
    try {
      // Buscar restrições de tempo usando a função RPC
      const { data, error } = await supabase.rpc('get_sequence_time_restrictions', {
        seq_id: sequenceId
      });
      
      if (error) {
        console.error('Erro ao carregar restrições de tempo:', error);
        return [];
      }
      
      if (!data) {
        return [];
      }
      
      // Converter para o formato correto
      const restrictions: TimeRestriction[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        active: r.active,
        days: r.days,
        startHour: r.start_hour,
        startMinute: r.start_minute,
        endHour: r.end_hour,
        endMinute: r.end_minute,
        isGlobal: r.is_global
      }));
      
      return restrictions;
    } catch (error) {
      console.error('Erro ao carregar restrições de tempo:', error);
      return [];
    }
  };
  
  /**
   * Carrega todas as sequências do banco de dados
   */
  const loadSequences = useCallback(async (instanceId?: string) => {
    try {
      if (!instanceId) {
        if (!currentInstance?.id) {
          // Não há instância selecionada
          return;
        }
        
        instanceId = currentInstance.id;
      }
      
      // Buscar sequências para a instância selecionada
      const { data, error } = await supabase
        .from('sequences')
        .select('*, stages:sequence_stages(*)')
        .eq('instance_id', instanceId)
        .order('name');
      
      if (error) {
        console.error('Erro ao carregar sequências:', error);
        return;
      }
      
      if (!data) {
        setSequences([]);
        return;
      }
      
      const processedSequences: Sequence[] = [];
      
      for (const seqData of data) {
        // Ordenar estágios por order_index
        const stages = (seqData.stages || []).sort((a: any, b: any) => a.order_index - b.order_index);
        
        // Construir objeto de sequência com formato correto
        const sequence: Sequence = {
          id: seqData.id,
          instanceId: seqData.instance_id,
          name: seqData.name,
          type: seqData.type || "message",
          startCondition: {
            type: seqData.start_condition_type as "AND" | "OR",
            tags: seqData.start_condition_tags || []
          },
          stopCondition: {
            type: seqData.stop_condition_type as "AND" | "OR",
            tags: seqData.stop_condition_tags || []
          },
          stages: stages.map((stage: any) => ({
            id: stage.id,
            name: stage.name,
            type: stage.type,
            content: stage.content,
            delay: stage.delay,
            delayUnit: stage.delay_unit,
            typebotStage: stage.typebot_stage,
            orderIndex: stage.order_index
          })),
          status: seqData.status,
          createdAt: seqData.created_at,
          updatedAt: seqData.updated_at,
          useAdvancedStartCondition: seqData.use_advanced_start_condition || false,
          useAdvancedStopCondition: seqData.use_advanced_stop_condition || false
        };
        
        // Buscar restrições de tempo para esta sequência
        const timeRestrictions = await loadTimeRestrictionsForSequence(seqData.id);
        sequence.timeRestrictions = timeRestrictions;
        
        // Carregar condições avançadas se necessário
        if (sequence.useAdvancedStartCondition || sequence.useAdvancedStopCondition) {
          const advancedConditions = await loadAdvancedConditions(seqData.id);
          
          if (sequence.useAdvancedStartCondition && advancedConditions.startCondition) {
            sequence.advancedStartCondition = advancedConditions.startCondition;
          }
          
          if (sequence.useAdvancedStopCondition && advancedConditions.stopCondition) {
            sequence.advancedStopCondition = advancedConditions.stopCondition;
          }
        }
        
        processedSequences.push(sequence);
      }
      
      setSequences(processedSequences);
    } catch (error) {
      console.error('Erro ao carregar sequências:', error);
      toast.error('Erro ao carregar sequências');
    }
  }, [currentInstance?.id]);
  
  /**
   * Adiciona uma nova sequência ao banco de dados
   */
  const addSequence = async (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!user) {
        toast.error('Você precisa estar logado para adicionar uma sequência');
        return { success: false, error: 'Usuário não autenticado' };
      }
      
      // Iniciar uma transação
      const { data: newSequence, error: sequenceError } = await supabase
        .from('sequences')
        .insert([{
          instance_id: sequence.instanceId,
          name: sequence.name,
          type: sequence.type || "message",
          start_condition_type: sequence.startCondition.type,
          start_condition_tags: sequence.startCondition.tags,
          stop_condition_type: sequence.stopCondition.type,
          stop_condition_tags: sequence.stopCondition.tags,
          status: sequence.status,
          created_by: user.id,
          use_advanced_start_condition: sequence.useAdvancedStartCondition || false,
          use_advanced_stop_condition: sequence.useAdvancedStopCondition || false
        }])
        .select()
        .single();
      
      if (sequenceError) {
        console.error('Erro ao criar sequência:', sequenceError);
        return { success: false, error: sequenceError.message };
      }
      
      // Use o client da Supabase para transações
      const transaction = supabase.from('sequence_stages');
      
      // Inserir estágios
      for (let i = 0; i < sequence.stages.length; i++) {
        const stage = sequence.stages[i];
        
        const { error: stageError } = await transaction
          .insert([{
            sequence_id: newSequence.id,
            name: stage.name,
            type: stage.type,
            content: stage.content,
            delay: stage.delay,
            delay_unit: stage.delayUnit,
            order_index: i,
            typebot_stage: stage.typebotStage
          }]);
        
        if (stageError) {
          console.error('Erro ao criar estágio:', stageError);
          return { success: false, error: stageError.message };
        }
      }
      
      // Salvar restrições de tempo
      for (const restriction of sequence.timeRestrictions) {
        if (!restriction.isGlobal) {
          // Adicionar restrição local
          const { error: restrictionError } = await supabase
            .from('sequence_local_restrictions')
            .insert([{
              sequence_id: newSequence.id,
              name: restriction.name,
              active: restriction.active,
              days: restriction.days,
              start_hour: restriction.startHour,
              start_minute: restriction.startMinute,
              end_hour: restriction.endHour,
              end_minute: restriction.endMinute,
              created_by: user.id
            }]);
          
          if (restrictionError) {
            console.error('Erro ao criar restrição local:', restrictionError);
            return { success: false, error: restrictionError.message };
          }
        } else {
          // Vincular restrição global
          const { error: restrictionError } = await supabase
            .from('sequence_time_restrictions')
            .insert([{
              sequence_id: newSequence.id,
              time_restriction_id: restriction.id
            }]);
          
          if (restrictionError) {
            console.error('Erro ao vincular restrição global:', restrictionError);
            return { success: false, error: restrictionError.message };
          }
        }
      }
      
      // Salvar condições avançadas se necessário
      if (sequence.useAdvancedStartCondition && sequence.advancedStartCondition) {
        const result = await saveAdvancedCondition(
          newSequence.id,
          sequence.advancedStartCondition,
          supabase
        );
        
        if (!result.success) {
          console.error('Erro ao salvar condição avançada de início:', result.error);
          return { success: false, error: result.error };
        }
      }
      
      if (sequence.useAdvancedStopCondition && sequence.advancedStopCondition) {
        const result = await saveAdvancedCondition(
          newSequence.id,
          sequence.advancedStopCondition,
          supabase
        );
        
        if (!result.success) {
          console.error('Erro ao salvar condição avançada de parada:', result.error);
          return { success: false, error: result.error };
        }
      }
      
      // Atualizar estado
      loadSequences(sequence.instanceId);
      
      toast.success('Sequência criada com sucesso!');
      return { success: true };
    } catch (error) {
      console.error('Erro ao criar sequência:', error);
      return { success: false, error: 'Erro interno ao criar sequência' };
    }
  };
  
  /**
   * Atualiza uma sequência existente
   */
  const updateSequence = async (id: string, updates: Partial<Sequence>) => {
    try {
      if (!isValidUUID(id)) {
        console.error('ID de sequência inválido:', id);
        return { success: false, error: 'ID de sequência inválido' };
      }
      
      // Sequência existente
      const existingSequence = sequences.find(s => s.id === id);
      if (!existingSequence) {
        toast.error('Sequência não encontrada');
        return { success: false, error: 'Sequência não encontrada' };
      }
      
      // Preparar os dados para atualização
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.status !== undefined) updateData.status = updates.status;
      
      // Condições simples
      if (updates.startCondition) {
        updateData.start_condition_type = updates.startCondition.type;
        updateData.start_condition_tags = updates.startCondition.tags;
      }
      
      if (updates.stopCondition) {
        updateData.stop_condition_type = updates.stopCondition.type;
        updateData.stop_condition_tags = updates.stopCondition.tags;
      }
      
      // Condições avançadas
      if (updates.useAdvancedStartCondition !== undefined) {
        updateData.use_advanced_start_condition = updates.useAdvancedStartCondition;
      }
      
      if (updates.useAdvancedStopCondition !== undefined) {
        updateData.use_advanced_stop_condition = updates.useAdvancedStopCondition;
      }
      
      // Atualizar a sequência em si
      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();
        
        const { error: sequenceError } = await supabase
          .from('sequences')
          .update(updateData)
          .eq('id', id);
        
        if (sequenceError) {
          console.error('Erro ao atualizar sequência:', sequenceError);
          return { success: false, error: sequenceError.message };
        }
      }
      
      // Processar estágios
      if (updates.stages) {
        // Primeiro, excluir estágios existentes
        const { error: deleteError } = await supabase
          .from('sequence_stages')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteError) {
          console.error('Erro ao excluir estágios:', deleteError);
          return { success: false, error: deleteError.message };
        }
        
        // Depois, inserir novos estágios
        for (let i = 0; i < updates.stages.length; i++) {
          const stage = updates.stages[i];
          
          const { error: stageError } = await supabase
            .from('sequence_stages')
            .insert([{
              sequence_id: id,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: i,
              typebot_stage: stage.typebotStage
            }]);
          
          if (stageError) {
            console.error('Erro ao atualizar estágio:', stageError);
            return { success: false, error: stageError.message };
          }
        }
      }
      
      // Processar restrições de tempo
      if (updates.timeRestrictions) {
        // Excluir restrições locais existentes
        await supabase
          .from('sequence_local_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        // Excluir vínculos com restrições globais
        await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        // Inserir novas restrições
        for (const restriction of updates.timeRestrictions) {
          if (!restriction.isGlobal) {
            // Adicionar restrição local
            const { error: restrictionError } = await supabase
              .from('sequence_local_restrictions')
              .insert([{
                sequence_id: id,
                name: restriction.name,
                active: restriction.active,
                days: restriction.days,
                start_hour: restriction.startHour,
                start_minute: restriction.startMinute,
                end_hour: restriction.endHour,
                end_minute: restriction.endMinute,
                created_by: user?.id
              }]);
            
            if (restrictionError) {
              console.error('Erro ao atualizar restrição local:', restrictionError);
              return { success: false, error: restrictionError.message };
            }
          } else {
            // Vincular restrição global
            const { error: restrictionError } = await supabase
              .from('sequence_time_restrictions')
              .insert([{
                sequence_id: id,
                time_restriction_id: restriction.id
              }]);
            
            if (restrictionError) {
              console.error('Erro ao vincular restrição global:', restrictionError);
              return { success: false, error: restrictionError.message };
            }
          }
        }
      }
      
      // Atualizar condições avançadas
      if ((updates.useAdvancedStartCondition && updates.advancedStartCondition) || 
          (existingSequence.useAdvancedStartCondition && updates.useAdvancedStartCondition === false)) {
        
        if (updates.useAdvancedStartCondition && updates.advancedStartCondition) {
          // Salvar nova condição avançada
          const result = await saveAdvancedCondition(
            id,
            updates.advancedStartCondition,
            supabase
          );
          
          if (!result.success) {
            console.error('Erro ao atualizar condição avançada de início:', result.error);
            return { success: false, error: result.error };
          }
        } else if (updates.useAdvancedStartCondition === false) {
          // Remover condições avançadas se estamos desabilitando
          await supabase
            .from('sequence_condition_groups')
            .delete()
            .eq('sequence_id', id)
            .eq('type', 'start');
        }
      }
      
      if ((updates.useAdvancedStopCondition && updates.advancedStopCondition) || 
          (existingSequence.useAdvancedStopCondition && updates.useAdvancedStopCondition === false)) {
        
        if (updates.useAdvancedStopCondition && updates.advancedStopCondition) {
          // Salvar nova condição avançada
          const result = await saveAdvancedCondition(
            id,
            updates.advancedStopCondition,
            supabase
          );
          
          if (!result.success) {
            console.error('Erro ao atualizar condição avançada de parada:', result.error);
            return { success: false, error: result.error };
          }
        } else if (updates.useAdvancedStopCondition === false) {
          // Remover condições avançadas se estamos desabilitando
          await supabase
            .from('sequence_condition_groups')
            .delete()
            .eq('sequence_id', id)
            .eq('type', 'stop');
        }
      }
      
      // Atualizar estado local
      loadSequences(existingSequence.instanceId);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar sequência:', error);
      return { success: false, error: 'Erro interno ao atualizar sequência' };
    }
  };
  
  /**
   * Exclui uma sequência existente
   */
  const deleteSequence = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        console.error('ID de sequência inválido:', id);
        return { success: false, error: 'ID de sequência inválido' };
      }
      
      // Verificar se há contatos ativos usando esta sequência
      const { data: activeContacts, error: contactsError } = await supabase
        .from('contact_sequences')
        .select('id')
        .eq('sequence_id', id)
        .in('status', ['active', 'paused'])
        .limit(1);
      
      if (contactsError) {
        console.error('Erro ao verificar contatos ativos:', contactsError);
        return { success: false, error: contactsError.message };
      }
      
      if (activeContacts && activeContacts.length > 0) {
        return { 
          success: false, 
          error: 'Esta sequência possui contatos ativos. Remova os contatos primeiro.' 
        };
      }
      
      // Excluir a sequência
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao excluir sequência:', error);
        return { success: false, error: error.message };
      }
      
      // Atualizar estado local
      setSequences(prev => prev.filter(seq => seq.id !== id));
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir sequência:', error);
      return { success: false, error: 'Erro interno ao excluir sequência' };
    }
  };
  
  /**
   * Carrega todas as tags do banco de dados
   */
  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('name')
        .order('name');
      
      if (error) {
        console.error('Erro ao carregar tags:', error);
        return;
      }
      
      if (!data) {
        setTags([]);
        return;
      }
      
      const tagNames = data.map(tag => tag.name);
      setTags(tagNames);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };
  
  /**
   * Adiciona uma nova tag ao banco de dados
   */
  const addTag = async (tag: string) => {
    try {
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }
      
      if (!tag || tags.includes(tag)) {
        return { success: true }; // Tag já existe ou é vazia
      }
      
      // Usar a função RPC para inserir a tag se não existir
      const { error } = await supabase.rpc('insert_tag_if_not_exists_for_user', {
        p_name: tag,
        p_created_by: user.id
      });
      
      if (error) {
        console.error('Erro ao adicionar tag:', error);
        return { success: false, error: error.message };
      }
      
      // Atualizar estado local
      setTags(prev => [...prev, tag].sort());
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
      return { success: false, error: 'Erro interno ao adicionar tag' };
    }
  };
  
  /**
   * Carrega todas as restrições de tempo globais
   */
  const loadTimeRestrictions = async () => {
    try {
      const { data, error } = await supabase
        .from('time_restrictions')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Erro ao carregar restrições de tempo:', error);
        return;
      }
      
      if (!data) {
        setTimeRestrictions([]);
        return;
      }
      
      const restrictions: TimeRestriction[] = data.map(r => ({
        id: r.id,
        name: r.name,
        active: r.active,
        days: r.days,
        startHour: r.start_hour,
        startMinute: r.start_minute,
        endHour: r.end_hour,
        endMinute: r.end_minute,
        isGlobal: true // Todas as restrições carregadas aqui são globais
      }));
      
      setTimeRestrictions(restrictions);
    } catch (error) {
      console.error('Erro ao carregar restrições de tempo:', error);
    }
  };
  
  /**
   * Adiciona uma nova restrição de tempo global
   */
  const addTimeRestriction = async (restriction: Omit<TimeRestriction, 'id'>) => {
    try {
      if (!user) {
        toast.error('Você precisa estar logado para adicionar uma restrição de tempo');
        return { success: false, error: 'Usuário não autenticado' };
      }
      
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert([{
          name: restriction.name,
          active: restriction.active,
          days: restriction.days,
          start_hour: restriction.startHour,
          start_minute: restriction.startMinute,
          end_hour: restriction.endHour,
          end_minute: restriction.endMinute,
          created_by: user.id
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar restrição de tempo:', error);
        return { success: false, error: error.message };
      }
      
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
      
      return { success: true, restriction: newRestriction };
    } catch (error) {
      console.error('Erro ao criar restrição de tempo:', error);
      return { success: false, error: 'Erro interno ao criar restrição de tempo' };
    }
  };
  
  /**
   * Atualiza uma restrição de tempo global existente
   */
  const updateTimeRestriction = async (id: string, updates: Partial<TimeRestriction>) => {
    try {
      if (!isValidUUID(id)) {
        console.error('ID de restrição de tempo inválido:', id);
        return { success: false, error: 'ID de restrição de tempo inválido' };
      }
      
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.active !== undefined) updateData.active = updates.active;
      if (updates.days !== undefined) updateData.days = updates.days;
      if (updates.startHour !== undefined) updateData.start_hour = updates.startHour;
      if (updates.startMinute !== undefined) updateData.start_minute = updates.startMinute;
      if (updates.endHour !== undefined) updateData.end_hour = updates.endHour;
      if (updates.endMinute !== undefined) updateData.end_minute = updates.endMinute;
      
      const { error } = await supabase
        .from('time_restrictions')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao atualizar restrição de tempo:', error);
        return { success: false, error: error.message };
      }
      
      // Atualizar estado local
      setTimeRestrictions(prev => prev.map(r => 
        r.id === id ? { ...r, ...updates } : r
      ));
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar restrição de tempo:', error);
      return { success: false, error: 'Erro interno ao atualizar restrição de tempo' };
    }
  };
  
  /**
   * Exclui uma restrição de tempo global existente
   */
  const deleteTimeRestriction = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        console.error('ID de restrição de tempo inválido:', id);
        return { success: false, error: 'ID de restrição de tempo inválido' };
      }
      
      // Verificar se a restrição está sendo usada por alguma sequência
      const { data: usedRestrictions, error: checkError } = await supabase
        .from('sequence_time_restrictions')
        .select('sequence_id')
        .eq('time_restriction_id', id)
        .limit(1);
      
      if (checkError) {
        console.error('Erro ao verificar uso da restrição:', checkError);
        return { success: false, error: checkError.message };
      }
      
      if (usedRestrictions && usedRestrictions.length > 0) {
        return { 
          success: false, 
          error: 'Esta restrição está sendo usada por uma ou mais sequências. Remova-a das sequências primeiro.' 
        };
      }
      
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao excluir restrição de tempo:', error);
        return { success: false, error: error.message };
      }
      
      // Atualizar estado local
      setTimeRestrictions(prev => prev.filter(r => r.id !== id));
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir restrição de tempo:', error);
      return { success: false, error: 'Erro interno ao excluir restrição de tempo' };
    }
  };
  
  /**
   * Carrega contatos para um cliente específico
   */
  const loadContactsForClient = async (clientId: string) => {
    try {
      if (!isValidUUID(clientId)) {
        console.error('ID de cliente inválido:', clientId);
        return;
      }
      
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      
      if (contactsError) {
        console.error('Erro ao carregar contatos:', contactsError);
        return;
      }
      
      // Buscar tags para cada contato
      const processedContacts: Contact[] = [];
      
      for (const contact of contactsData || []) {
        const { data: tagsData, error: tagsError } = await supabase
          .from('contact_tags')
          .select('tag_name')
          .eq('contact_id', contact.id);
        
        if (tagsError) {
          console.error('Erro ao carregar tags do contato:', tagsError);
          continue;
        }
        
        processedContacts.push({
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phone_number,
          clientId: contact.client_id,
          inboxId: contact.inbox_id,
          conversationId: contact.conversation_id,
          displayId: contact.display_id,
          tags: tagsData?.map(t => t.tag_name) || [],
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        });
      }
      
      setContacts(processedContacts);
      
      // Carregar mensagens agendadas e sequências para estes contatos
      await loadScheduledMessagesForContacts(processedContacts.map(c => c.id));
      await loadContactSequencesForContacts(processedContacts.map(c => c.id));
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  };
  
  /**
   * Carrega mensagens agendadas para um conjunto de contatos
   */
  const loadScheduledMessagesForContacts = async (contactIds: string[]) => {
    try {
      if (!contactIds || contactIds.length === 0) {
        setScheduledMessages([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .in('contact_id', contactIds)
        .order('scheduled_time');
      
      if (error) {
        console.error('Erro ao carregar mensagens agendadas:', error);
        return;
      }
      
      const messages: ScheduledMessage[] = (data || []).map(msg => ({
        id: msg.id,
        contactId: msg.contact_id,
        sequenceId: msg.sequence_id,
        stageId: msg.stage_id,
        scheduledTime: msg.scheduled_time,
        scheduledAt: msg.scheduled_at || msg.created_at,
        sentAt: msg.sent_at,
        status: msg.status,
        attempts: msg.attempts
      }));
      
      setScheduledMessages(messages);
    } catch (error) {
      console.error('Erro ao carregar mensagens agendadas:', error);
    }
  };
  
  /**
   * Carrega sequências de contatos para um conjunto de contatos
   */
  const loadContactSequencesForContacts = async (contactIds: string[]) => {
    try {
      if (!contactIds || contactIds.length === 0) {
        setContactSequences([]);
        return;
      }
      
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('contact_sequences')
        .select('*')
        .in('contact_id', contactIds);
      
      if (sequencesError) {
        console.error('Erro ao carregar sequências de contatos:', sequencesError);
        return;
      }
      
      const contactSequencesList: ContactSequence[] = [];
      
      for (const seq of sequencesData || []) {
        // Buscar progresso dos estágios
        const { data: progressData, error: progressError } = await supabase
          .from('stage_progress')
          .select('*')
          .eq('contact_sequence_id', seq.id);
        
        if (progressError) {
          console.error('Erro ao carregar progresso dos estágios:', progressError);
          continue;
        }
        
        const stageProgress = progressData?.map(p => ({
          stageId: p.stage_id,
          status: p.status as "pending" | "completed" | "skipped" | "removed",
          completedAt: p.completed_at
        })) || [];
        
        contactSequencesList.push({
          id: seq.id,
          contactId: seq.contact_id,
          sequenceId: seq.sequence_id,
          currentStageIndex: seq.current_stage_index,
          currentStageId: seq.current_stage_id,
          status: seq.status as "active" | "completed" | "paused" | "removed",
          startedAt: seq.started_at,
          lastMessageAt: seq.last_message_at,
          completedAt: seq.completed_at,
          removedAt: seq.removed_at,
          stageProgress
        });
      }
      
      setContactSequences(contactSequencesList);
      
      // Carregar estatísticas de progresso dos estágios
      await loadStageProgressStatus();
    } catch (error) {
      console.error('Erro ao carregar sequências de contatos:', error);
    }
  };
  
  /**
   * Carrega estatísticas de progresso dos estágios
   */
  const loadStageProgressStatus = async () => {
    try {
      // Esta é uma implementação simplificada
      // Em um caso real, você pode querer buscar estas estatísticas do banco de dados
      setStageProgressStatus([]);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de progresso:', error);
    }
  };
  
  // Funções de acesso a dados
  const getContactById = (id: string) => {
    return contacts.find(c => c.id === id);
  };
  
  const getContactsByClientId = (clientId: string) => {
    return contacts.filter(c => c.clientId === clientId);
  };
  
  const getScheduledMessagesByContactId = (contactId: string) => {
    return scheduledMessages.filter(m => m.contactId === contactId);
  };
  
  const getContactSequencesByContactId = (contactId: string) => {
    return contactSequences.filter(s => s.contactId === contactId);
  };
  
  // Efeito para carregar instâncias quando o cliente atual muda
  useEffect(() => {
    if (currentClient) {
      loadInstancesForClient(currentClient.id);
      loadContactsForClient(currentClient.id);
    } else {
      setInstances([]);
      setCurrentInstance(null);
      setContacts([]);
    }
  }, [currentClient]);
  
  // Efeito para carregar sequências quando a instância atual muda
  useEffect(() => {
    if (currentInstance) {
      loadSequences(currentInstance.id);
    } else {
      setSequences([]);
    }
  }, [currentInstance, loadSequences]);
  
  // Provider value
  const value = {
    // Usuário
    user,
    isLoading,
    isSuperAdmin,
    
    // Dados gerais
    clients,
    instances,
    sequences,
    tags,
    timeRestrictions,
    contacts,
    scheduledMessages,
    contactSequences,
    stageProgressStatus,
    appSetup,
    isDataInitialized,
    
    // Seleção atual
    currentClient,
    setCurrentClient,
    currentInstance,
    setCurrentInstance,
    
    // Funções de clientes
    addClient,
    updateClient,
    deleteClient,
    
    // Funções de instâncias
    addInstance,
    updateInstance,
    deleteInstance,
    
    // Sequências
    sequences,
    addSequence,
    updateSequence,
    deleteSequence,
    
    // Funções de tags
    addTag,
    
    // Funções de restrições de tempo
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction,
    
    // Funções de contatos
    getContactById,
    getContactsByClientId,
    
    // Funções de mensagens agendadas
    getScheduledMessagesByContactId,
    
    // Funções de sequências de contatos
    getContactSequencesByContactId,
    
    // Funções de configuração
    completeSetup,
    
    // Funções de atualização de dados
    refreshData
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
