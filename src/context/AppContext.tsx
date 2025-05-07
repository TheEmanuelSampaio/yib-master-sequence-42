import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt' | 'client' | 'createdBy'>) => Promise<{ success: boolean; error?: string; instance?: Instance }>;
  updateInstance: (id: string, updates: Partial<Instance>) => Promise<{ success: boolean; error?: string; }>;
  deleteInstance: (id: string) => Promise<{ success: boolean; error?: string; }>;
  
  // Funções de sequências
  sequences: Sequence[];
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string; }>;
  updateSequence: (id: string, updates: Partial<Sequence>) => Promise<{ success: boolean; error?: string; }>;
  deleteSequence: (id: string) => Promise<{ success: boolean; error?: string; }>;
  
  // Funções de tags
  tags: string[];
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
  
  // Adicionando funções que estão faltando para Contacts.tsx
  deleteContact?: (id: string) => Promise<{ success: boolean; error?: string; }>;
  updateContact?: (id: string, updates: Partial<Contact>) => Promise<{ success: boolean; error?: string; }>;
  removeFromSequence?: (contactId: string, sequenceId: string) => Promise<{ success: boolean; error?: string; }>;
  updateContactSequence?: (id: string, updates: Partial<ContactSequence>) => Promise<{ success: boolean; error?: string; }>;
  
  // Adicionando propriedade stats para Dashboard.tsx
  stats?: any;
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
  
  // Carregar dados do usuário ao inicializar
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Verificar se há um usuário autenticado
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao carregar sessão:', sessionError);
          setIsLoading(false);
          return;
        }
        
        if (!session?.user) {
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // Buscar perfil do usuário no Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
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
          id: session.user.id,
          accountName: profile?.account_name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          role: profile?.role || 'admin',
          avatar: profile?.avatar_url
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
    
    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Buscar perfil do usuário
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          const userData: User = {
            id: session.user.id,
            accountName: profile?.account_name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            role: profile?.role || 'admin',
            avatar: profile?.avatar_url
          };
          
          setUser(userData);
          await loadInitialData();
        }
      }
    );
    
    loadUserData();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
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
  const addInstance = async (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt' | 'client' | 'createdBy'>) => {
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
          type: seqData.type as "message" | "pattern" | "typebot" || "message",
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
            type: stage.type as "message" | "pattern" | "typebot",
            content: stage.content,
            delay: stage.delay,
            delayUnit: stage.delay_unit as "minutes" | "hours" | "days",
            typebotStage: stage.typebot_stage,
            orderIndex: stage.order_index
          })),
          status: seqData.status as "active" | "inactive",
          createdAt: seqData.created_at,
          updatedAt: seqData.updated
