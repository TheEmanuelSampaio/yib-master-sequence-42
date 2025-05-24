
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Contact, Sequence, Tag, TimeRestriction, Client, User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from './AppContext';
import { toast } from 'sonner';

interface OptimizedDataContextType {
  // Data state
  contacts: Contact[];
  sequences: Sequence[];
  tags: Tag[];
  timeRestrictions: TimeRestriction[];
  clients: Client[];
  users: User[];
  
  // Loading states
  contactsLoading: boolean;
  sequencesLoading: boolean;
  configLoading: boolean;
  
  // Refresh functions
  refreshContacts: () => Promise<void>;
  refreshSequences: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  
  // Management functions
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
}

const OptimizedDataContext = createContext<OptimizedDataContextType | undefined>(undefined);

export const useOptimizedData = () => {
  const context = useContext(OptimizedDataContext);
  if (context === undefined) {
    throw new Error('useOptimizedData must be used within an OptimizedDataProvider');
  }
  return context;
};

export const OptimizedDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentInstance, instancesLoaded } = useApp();
  
  // Data state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Loading states
  const [contactsLoading, setContactsLoading] = useState(false);
  const [sequencesLoading, setSequencesLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  // PARTE 1: Carregar contatos apenas da instância atual
  const loadContacts = async (instanceId: string) => {
    setContactsLoading(true);
    try {
      console.log(`[PART 1] Carregando contatos para instância: ${instanceId}`);
      
      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_tags(tag_name)
        `)
        .eq('client_id', instanceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedContacts: Contact[] = contactsData?.map(contact => ({
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
      })) || [];

      setContacts(formattedContacts);
      console.log(`[PART 1] Contatos carregados: ${formattedContacts.length}`);
      
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setContactsLoading(false);
    }
  };

  // PARTE 1: Carregar sequências apenas da instância atual
  const loadSequences = async (instanceId: string) => {
    setSequencesLoading(true);
    try {
      console.log(`[PART 1] Carregando sequências para instância: ${instanceId}`);
      
      const { data: sequencesData, error } = await supabase
        .from('sequences')
        .select(`
          *,
          sequence_stages(*),
          sequence_time_restrictions(
            time_restrictions(*)
          )
        `)
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSequences: Sequence[] = sequencesData?.map(sequence => ({
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
      })) || [];

      setSequences(formattedSequences);
      console.log(`[PART 1] Sequências carregadas: ${formattedSequences.length}`);
      
    } catch (error) {
      console.error('Erro ao carregar sequências:', error);
      toast.error('Erro ao carregar sequências');
    } finally {
      setSequencesLoading(false);
    }
  };

  // Carregar configurações globais (não dependem da instância)
  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      console.log('[PART 1] Carregando configurações globais...');
      
      // Carregar tags, restrições de tempo, clientes e usuários em paralelo
      const [tagsResult, timeRestrictionsResult, clientsResult, usersResult] = await Promise.allSettled([
        supabase.from('tags').select('*').order('created_at', { ascending: false }),
        supabase.from('time_restrictions').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ]);

      // Processar tags
      if (tagsResult.status === 'fulfilled' && tagsResult.value.data) {
        const formattedTags: Tag[] = tagsResult.value.data.map(tag => ({
          id: tag.id,
          name: tag.name,
          createdAt: tag.created_at,
          createdBy: tag.created_by
        }));
        setTags(formattedTags);
      }

      // Processar restrições de tempo
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

      // Processar clientes
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

      // Processar usuários
      if (usersResult.status === 'fulfilled' && usersResult.value.data) {
        const formattedUsers: User[] = usersResult.value.data.map(user => ({
          id: user.id,
          accountName: user.account_name,
          email: '', // Email será carregado separadamente se necessário
          role: user.role
        }));
        setUsers(formattedUsers);
      }

      console.log('[PART 1] Configurações globais carregadas');
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setConfigLoading(false);
    }
  };

  // PARTE 1: Efeito para carregar dados quando instância atual mudar
  useEffect(() => {
    if (currentInstance?.id && instancesLoaded) {
      console.log(`[PART 1] Carregando dados para nova instância: ${currentInstance.name}`);
      
      // Carregar dados específicos da instância
      loadContacts(currentInstance.id);
      loadSequences(currentInstance.id);
    }
  }, [currentInstance?.id, instancesLoaded]);

  // Carregar configurações globais uma vez
  useEffect(() => {
    if (instancesLoaded) {
      loadConfig();
    }
  }, [instancesLoaded]);

  // Refresh functions
  const refreshContacts = async () => {
    if (currentInstance?.id) {
      await loadContacts(currentInstance.id);
    }
  };

  const refreshSequences = async () => {
    if (currentInstance?.id) {
      await loadSequences(currentInstance.id);
    }
  };

  const refreshConfig = async () => {
    await loadConfig();
  };

  // Management functions (placeholder implementations)
  const addTag = async (tag: Omit<Tag, 'id' | 'createdAt'>) => {
    // Implementation here
  };

  const deleteTag = async (id: string) => {
    // Implementation here
  };

  const addTimeRestriction = async (restriction: Omit<TimeRestriction, 'id' | 'createdAt'>) => {
    // Implementation here
  };

  const updateTimeRestriction = async (id: string, updates: Partial<TimeRestriction>) => {
    // Implementation here
  };

  const deleteTimeRestriction = async (id: string) => {
    // Implementation here
  };

  const addClient = async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Implementation here
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    // Implementation here
  };

  const deleteClient = async (id: string) => {
    // Implementation here
  };

  const addUser = async (user: Omit<User, 'id'>) => {
    // Implementation here
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    // Implementation here
  };

  const deleteUser = async (id: string) => {
    // Implementation here
  };

  const contextValue: OptimizedDataContextType = {
    // Data state
    contacts,
    sequences,
    tags,
    timeRestrictions,
    clients,
    users,
    
    // Loading states
    contactsLoading,
    sequencesLoading,
    configLoading,
    
    // Refresh functions
    refreshContacts,
    refreshSequences,
    refreshConfig,
    
    // Management functions
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
    deleteUser
  };

  return (
    <OptimizedDataContext.Provider value={contextValue}>
      {children}
    </OptimizedDataContext.Provider>
  );
};
