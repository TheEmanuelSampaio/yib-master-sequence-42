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
  TagCondition,
  ConditionStructure
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
  localTimeRestrictions?: TimeRestriction[]; // Add this property to the interface
  type?: "message" | "pattern" | "typebot"; // Make type optional since it might not exist in database response
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

export function AppProvider({ children }: { children: React.ReactNode }) {
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

  // Get contact sequences helper function
  const getContactSequences = (contactId: string): ContactSequence[] => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };

  // Criar funções de manipulação de contatos
  const contactFunctions = createContactFunctions();
  
  // Fetch data when auth user changes
  useEffect(() => {
    if (user && !isDataInitialized) {
      console.log("Initial data load after authentication");
      refreshData();
    } else if (!user) {
      // Clear data when user logs out
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
    }
  }, [user, isDataInitialized]);

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
      
      // Fetch clients
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
      
      // Fetch instances
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
      
      // Set current instance if not already set
      if (typedInstances.length > 0 && !currentInstance) {
        const activeInstance = typedInstances.find(i => i.active) || typedInstances[0];
        setCurrentInstance(activeInstance);
      }
      
      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('name');
      
      if (tagsError) throw tagsError;
      
      setTags(tagsData.map(tag => tag.name));
      
      // Fetch time restrictions
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
        isGlobal: true // Todas as restrições desta tabela são globais
      }));
      
      setTimeRestrictions(typedRestrictions);
      
      // Fetch sequences and their stages
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
      
      // Buscar também as restrições locais para cada sequência
      // Adicionar essas informações aos objetos de sequência
      const processedSequences = sequencesData as ExtendedSequence[];
      
      for (const sequence of processedSequences) {
        // Adicionar uma propriedade para restrições de tempo local
        sequence.localTimeRestrictions = [];
        
        const { data: localRestrictions, error: localRestError } = await supabase
          .from('sequence_local_restrictions')
          .select('*')
          .eq('sequence_id', sequence.id);
          
        if (localRestError) {
          console.error("Erro ao carregar restrições locais:", localRestError);
          continue;
        }
        
        // Adicionar restrições locais se existirem
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
            isGlobal: false // Marca explicitamente como restrição local
          }));
          
          sequence.localTimeRestrictions = typedLocalRestrictions;
        }
        
        // Only load advanced conditions if the flags are set
        if (sequence.use_advanced_start_condition) {
          sequence.advancedStartCondition = await loadAdvancedCondition(sequence.id, 'start');
        }
        
        if (sequence.use_advanced_stop_condition) {
          sequence.advancedStopCondition = await loadAdvancedCondition(sequence.id, 'stop');
        }
      }
      
      console.log(`Sequences fetched: ${sequencesData.length}`);
      
      const typedSequences: Sequence[] = processedSequences.map(sequence => {
        // Transformar os estágios no formato correto
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
          
        // Transformar as restrições de tempo globais
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
            isGlobal: true // Todas as restrições desta junção são globais
          }));
        
        // Combinar restrições globais e locais
        const allTimeRestrictions = [
          ...globalTimeRestrictions,
          ...(sequence.localTimeRestrictions || [])
        ];
        
        // Ensure startCondition.type and stopCondition.type are "AND" or "OR"
        const startType = sequence.start_condition_type === "AND" ? "AND" : "OR";
        const stopType = sequence.stop_condition_type === "AND" ? "AND" : "OR";
        
        // Ensure status is "active" or "inactive"
        const status = sequence.status === "active" ? "active" : "inactive";
        
        // Determinar o tipo de sequência com base nos estágios ou usar um valor padrão
        let sequenceType: "message" | "pattern" | "typebot" = "message";
        if (stages.length > 0) {
          // Se o último estágio for um typebot, consideramos que é uma sequência de typebot
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
          type: sequence.type || sequenceType, // Usar o tipo da sequência ou determinar pelo último estágio
          startCondition: {
            type: startType as "AND" | "OR",
            tags: sequence.start_condition_tags
          },
          stopCondition: {
            type: stopType as "AND" | "OR",
            tags: sequence.stop_condition_tags
          },
          // Add advanced conditions if they exist
          ...(sequence.advancedStartCondition && { advancedStartCondition: sequence.advancedStartCondition }),
          ...(sequence.advancedStopCondition && { advancedStopCondition: sequence.advancedStopCondition }),
          status: status as "active" | "inactive",
          stages,
          timeRestrictions: allTimeRestrictions,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at
        };
      });
      
      setSequences(typedSequences);
      
      // Fetch contacts and their tags
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*');
      
      if (contactsError) throw contactsError;
      
      // Iniciar a busca de dados de contato_tag
      const contactPromises = contactsData.map(async (contact) => {
        // Buscar tags deste contato
        const { data: contactTagsData, error: contactTagsError } = await supabase
          .from('contact_tags')
          .select('tag_name')
          .eq('contact_id', contact.id);
          
        if (contactTagsError) {
          console.error(`Erro ao buscar tags do contato ${contact.id}:`, contactTagsError);
          return null;
        }
        
        const contactTags = contactTagsData.map(ct => ct.tag_name);
        
        return {
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phone_number,
          clientId: contact.client_id,
          inboxId: contact.inbox_id,
          conversationId: contact.conversation_id,
          displayId: contact.display_id,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at,
          tags: contactTags
        };
      });
      
      // Resolver todas as promessas
      const typedContacts = (await Promise.all(contactPromises)).filter(Boolean) as Contact[];
      setContacts(typedContacts);
      
      console.log(`Contacts fetched: ${typedContacts.length}`);
      
      // Fetch scheduled messages
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
        // Ensure status is one of the valid types
        status: msg.status as "pending" | "processing" | "sent" | "failed" | "persistent_error",
        scheduledTime: msg.scheduled_time,
        rawScheduledTime: msg.raw_scheduled_time,
        sentAt: msg.sent_at,
        attempts: msg.attempts,
        scheduledAt: msg.scheduled_at,
        createdAt: msg.created_at
      }));
      
      setScheduledMessages(typedScheduledMsgs);
      
      // Fetch contact sequences and their progress
      const { data: contactSeqsData, error: contactSeqsError } = await supabase
        .from('contact_sequences')
        .select('*');
      
      if (contactSeqsError) throw contactSeqsError;
      
      // Iniciar a busca de progresso de estágios para cada sequência de contato
      const contactSeqPromises = contactSeqsData.map(async (contactSeq) => {
        // Buscar progresso de estágio para esta sequência de contato
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
      
      // Resolver todas as promessas de sequências de contato
      const typedContactSeqs = (await Promise.all(contactSeqPromises)).filter(Boolean) as ContactSequence[];
      setContactSequences(typedContactSeqs);
      
      // Fetch users (only for super_admin)
      if (user.role === 'super_admin') {
        // Get profiles data
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
        
        if (profilesError) throw profilesError;
        
        // Get user emails from auth.users through Supabase function or RPC
        // This is necessary because we cannot query auth.users directly from the client
        const { data: authUsersData, error: authUsersError } = await supabase
          .rpc('get_users_with_emails');
          
        if (authUsersError) {
          console.error("Error fetching user emails:", authUsersError);
          // Continue with what we have, but log the error
        }
        
        // Create a map of user IDs to emails for quick lookup
        const emailMap = new Map();
        if (authUsersData && Array.isArray(authUsersData)) {
          authUsersData.forEach(userData => {
            if (userData.id && userData.email) {
              emailMap.set(userData.id, userData.email);
            }
          });
        }
        
        // Now map profiles to users with emails from the emailMap
        const usersWithEmails = profilesData.map(profile => {
          // Try to get email from the map, fall back to current user email or a placeholder
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
        
        setUsers(usersWithEmails);
      }
      
      // Fetch daily stats
      const { data: statsData, error: statsError } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: false });
        
      if (statsError) throw statsError;
      
      const typedStats = statsData.map(stat => ({
        id: stat.id,
        instanceId: stat.instance_id,
        date: stat.date,
        messagesSent: stat.messages_sent,
        messagesScheduled: stat.messages_scheduled,
        messagesFailed: stat.messages_failed,
        newContacts: stat.new_contacts,
        completedSequences: stat.completed_sequences
      }));
      
      setStats(typedStats);
      
      // Set initialized state to true after successful data load
      setIsDataInitialized(true);
      console.log("Data refresh completed successfully");
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper function to load advanced condition data
  const loadAdvancedCondition = async (sequenceId: string, conditionType: 'start' | 'stop'): Promise<ConditionStructure | undefined> => {
    try {
      // Get condition groups for this sequence and condition type
      const { data: groups, error: groupsError } = await supabase
        .from('sequence_condition_groups')
        .select(`
          id,
          group_operator,
          condition_operator,
          group_index
        `)
        .eq('sequence_id', sequenceId)
        .eq('condition_type', conditionType)
        .order('group_index', { ascending: true });
        
      if (groupsError) throw groupsError;
      
      if (!groups || groups.length === 0) {
        return undefined;
      }
      
      // Get the main operator from the first group (all groups should have the same)
      const mainOperator = groups[0].condition_operator as "AND" | "OR";
      
      // Load tags for each group
      const processedGroups: ConditionGroup[] = [];
      
      for (const group of groups) {
        // Get tags for this group
        const { data: tags, error: tagsError } = await supabase
          .from('sequence_condition_tags')
          .select('tag_name')
          .eq('group_id', group.id);
          
        if (tagsError) throw tagsError;
        
        // Create the condition group object
        processedGroups.push({
          id: group.id,
          operator: group.group_operator as "AND" | "OR",
          tags: tags.map(tag => tag.tag_name)
        });
      }
      
      // Return the complete condition structure
      return {
        mainOperator,
        groups: processedGroups
      };
    } catch (error) {
      console.error(`Error loading advanced ${conditionType} condition:`, error);
      return undefined;
    }
  };

  const addInstance = async (instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
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
        setCurrentInstance(newInstance);
      }
      
      toast.success(`Instância "${data.name}" criada com sucesso`);
    } catch (error: any) {
      console.error("Error creating instance:", error);
      toast.error(`Erro ao criar instância: ${error.message}`);
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
      
      toast.success(`Instância atualizada com sucesso`);
      
      // Refresh instances to get updated client relationship
      refreshData();
    } catch (error: any) {
      console.error("Error updating instance:", error);
      toast.error(`Erro ao atualizar instância: ${error.message}`);
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
        setCurrentInstance(nextInstance || null);
      }
      
      toast.success("Instância excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      toast.error(`Erro ao excluir instância: ${error.message}`);
    }
  };

  // Ajustar função para formatação de sequências
  const formatSequence = (sequence: any): Sequence => {
    // Garantir que o tipo existe, se não, definir o padrão como 'message'
    const sequenceType = sequence.type || 'message';

    return {
      id: sequence.id,
      instanceId: sequence.instance_id,
      name: sequence.name,
      type: sequenceType,
      startCondition: {
        type: sequence.start_condition_type || 'AND',
        tags: sequence.start_condition_tags || [],
      },
      stopCondition: {
        type: sequence.stop_condition_type || 'OR',
        tags: sequence.stop_condition_tags || [],
      },
      // Dados de condições avançadas (se existirem)
      ...(sequence.advanced_start_condition && {
        advancedStartCondition: sequence.advanced_start_condition
      }),
      ...(sequence.advanced_stop_condition && {
        advancedStopCondition: sequence.advanced_stop_condition
      }),
      stages: Array.isArray(sequence.sequence_stages) 
        ? sequence.sequence_stages.map((stage: any) => ({
            id: stage.id,
            name: stage.name,
            type: stage.type || sequenceType,
            content: stage.content,
            typebotStage: stage.typebot_stage,
            delay: stage.delay,
            delayUnit: stage.delay_unit,
            orderIndex: stage.order_index
          })) 
        : [],
      timeRestrictions: sequence.time_restrictions || [],
      status: sequence.status || 'active',
      createdAt: sequence.created_at,
      updatedAt: sequence.updated_at
    };
  };

  // Ajustar função para adicionar/atualizar sequências
  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">): Promise<{success: boolean, error?: string}> => {
    try {
      if (!currentInstance) {
        throw new Error("Nenhuma instância selecionada");
      }

      // Preparar dados para inserção
      const sequenceData = {
        instance_id: sequence.instanceId,
        name: sequence.name,
        type: sequence.type,
        start_condition_type: sequence.startCondition.type,
        start_condition_tags: sequence.startCondition.tags,
        stop_condition_type: sequence.stopCondition.type,
        stop_condition_tags: sequence.stopCondition.tags,
        status: sequence.status,
        created_by: user?.id || 'system',
        // Adicionar campos para condições avançadas se presentes
        ...(sequence.advancedStartCondition && {
          advanced_start_condition: sequence.advancedStartCondition,
          use_advanced_start_condition: true
        }),
        ...(sequence.advancedStopCondition && {
          advanced_stop_condition: sequence.advancedStopCondition,
          use_advanced_stop_condition: true
        })
      };

      // First create the sequence
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert(sequenceData)
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      console.log("Sequence created:", seqData);
      
      // Handle advanced conditions if present
      if (sequence.advancedStartCondition) {
        await updateAdvancedCondition(seqData.id, 'start', sequence.advancedStartCondition);
      }
      
      if (sequence.advancedStopCondition) {
        await updateAdvancedCondition(seqData.id, 'stop', sequence.advancedStopCondition);
      }
      
      // Then create the stages
      for (let i = 0; i < sequence.stages.length; i++) {
        const stage = sequence.stages[i];
        
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
      
      // Add time restrictions - handle global restrictions
      if (sequence.timeRestrictions) {
        const globalRestrictions = sequence.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = sequence.timeRestrictions.filter(r => !r.isGlobal);
        
        if (globalRestrictions.length > 0) {
          for (const restriction of globalRestrictions) {
            // Verificar se a restrição global existe antes de tentar adicionar
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
        
        // Adicionar restrições locais à tabela sequence_local_restrictions
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
      }
      
      toast.success(`Sequência "${sequence.name}" criada com sucesso`);
      
      // Fazer um refresh completo dos dados para garantir que as novas sequências apareçam
      await refreshData();
      
      return { success: true };
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const updateSequence = async (id: string, partialSequence: Partial<Omit<Sequence, "id" | "createdAt" | "updatedAt">>): Promise<{success: boolean, error?: string}> => {
    try {
      console.log("Updating sequence with ID:", id);
      console.log("Update payload:", JSON.stringify(partialSequence, null, 2));
      
      if (!id || !isValidUUID(id)) {
        console.error("Invalid sequence ID:", id);
        return { success: false, error: "ID de sequência inválido" };
      }
      
      // Create the base update object
      const updateObj: any = {
        updated_at: new Date().toISOString()
      };
      
      // Add fields that are being updated
      if (partialSequence.name !== undefined) updateObj.name = partialSequence.name;
      if (partialSequence.status !== undefined) updateObj.status = partialSequence.status;
      if (partialSequence.type !== undefined) updateObj.type = partialSequence.type;
      
      // Handle basic conditions
      if (partialSequence.startCondition) {
        updateObj.start_condition_type = partialSequence.startCondition.type;
        updateObj.start_condition_tags = partialSequence.startCondition.tags;
      }
      
      if (partialSequence.stopCondition) {
        updateObj.stop_condition_type = partialSequence.stopCondition.type;
        updateObj.stop_condition_tags = partialSequence.stopCondition.tags;
      }
      
      // Handle advanced conditions flags
      if (partialSequence.advancedStartCondition !== undefined) {
        updateObj.use_advanced_start_condition = true;
      }
      
      if (partialSequence.advancedStopCondition !== undefined) {
        updateObj.use_advanced_stop_condition = true;
      }
      
      // Start by updating the main sequence record
      const { error: seqError } = await supabase
        .from('sequences')
        .update(updateObj)
        .eq('id', id);
      
      if (seqError) {
        console.error("Error updating sequence:", seqError);
        return { success: false, error: seqError.message };
      }
      
      // Handle advanced conditions if present
      if (partialSequence.advancedStartCondition) {
        await updateAdvancedCondition(id, 'start', partialSequence.advancedStartCondition);
      }
      
      if (partialSequence.advancedStopCondition) {
        await updateAdvancedCondition(id, 'stop', partialSequence.advancedStopCondition);
      }
      
      // Handle stages update if provided
      if (partialSequence.stages) {
        console.log("Processing stages update for sequence:", id);
        console.log("Total stages to process:", partialSequence.stages.length);
        
        // Get current stages from database to compare
        const { data: existingStages, error: stagesQueryError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', id);
        
        if (stagesQueryError) {
          console.error("Error fetching existing stages:", stagesQueryError);
          return { success: false, error: stagesQueryError.message };
        }
        
        console.log("Existing stages in DB:", existingStages?.length || 0);
        
        // Track stages to update, delete, and insert
        const stagesToUpdate = [];
        const stageIdsToDelete = [];
        const stagesToInsert = [];
        
        // Find existing stage IDs
        const existingStageIds = new Set(existingStages?.map(stage => stage.id) || []);
        const updatedStageIds = new Set(partialSequence.stages.map(stage => stage.id));
        
        // Determine stages to delete (exist in DB but not in the update)
        existingStages?.forEach(existingStage => {
          if (!updatedStageIds.has(existingStage.id)) {
            stageIdsToDelete.push(existingStage.id);
          }
        });
        
        // Process each stage in the update
        partialSequence.stages.forEach((stage, index) => {
          // Check if the stage already exists in the database
          if (existingStageIds.has(stage.id)) {
            // Update existing stage
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
            // Insert new stage
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
        
        // Process deletions
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
        
        // Process updates (one at a time to avoid conflicts)
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
        
        // Process inserts (in batch)
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
      
      // Handle time restrictions update if provided
      if (partialSequence.timeRestrictions) {
        // First remove all existing time restrictions
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
        
        // Add new local restrictions
        const localRestrictions = partialSequence.timeRestrictions.filter(r => !r.isGlobal);
        if (localRestrictions.length > 0 && user) {
          // Corrigido: precisamos passar cada restrição individual com o campo created_by
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
        
        // Add new global restrictions
        const globalRestrictions = partialSequence.timeRestrictions.filter(r => r.isGlobal);
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
      
      // Update the sequence in local state
      setSequences(prevSequences => prevSequences.map(seq => 
        seq.id === id ? { ...seq, ...partialSequence } : seq
      ));
      
      return { success: true };
      
    } catch (error: any) {
      console.error("Error in updateSequence:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Helper function to update advanced conditions
  const updateAdvancedCondition = async (
    sequenceId: string, 
    conditionType: 'start' | 'stop', 
    conditionStructure: ConditionStructure
  ) => {
    try {
      // First, delete existing condition groups and tags for this condition type
      const { data: existingGroups, error: groupsError } = await supabase
        .from('sequence_condition_groups')
        .select('id')
        .eq('sequence_id', sequenceId)
        .eq('condition_type', conditionType);
        
      if (groupsError) throw groupsError;
      
      // Delete existing groups
      if (existingGroups && existingGroups.length > 0) {
        const groupIds = existingGroups.map(g => g.id);
        
        // Delete associated tags first
        await supabase
          .from('sequence_condition_tags')
          .delete()
          .in('group_id', groupIds);
          
        // Then delete the groups
        await supabase
          .from('sequence_condition_groups')
          .delete()
          .in('id', groupIds);
      }
      
      // Insert new condition groups and tags
      for (let i = 0; i < conditionStructure.groups.length; i++) {
        const group = conditionStructure.groups[i];
        
        // Insert the group
        const { data: newGroup, error: insertGroupError } = await supabase
          .from('sequence_condition_groups')
          .insert({
            sequence_id: sequenceId,
            condition_type: conditionType,
            group_operator: group.operator,
            condition_operator: conditionStructure.mainOperator,
            group_index: i,
            type: conditionType
          })
          .select('id')
          .single();
          
        if (insertGroupError) throw insertGroupError;
        
        // Insert tags for this group
        if (group.tags.length > 0) {
          const tagsToInsert = group.tags.map(tagName => ({
            group_id: newGroup.id,
            tag_name: tagName
          }));
          
          const { error: insertTagsError } = await supabase
            .from('sequence_condition_tags')
            .insert(tagsToInsert);
            
          if (insertTagsError) throw insertTagsError;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating advanced ${conditionType} condition:`, error);
      throw error;
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
      toast.success("Sequência excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      toast.error(`Erro ao excluir sequência: ${error.message}`);
    }
  };

  const addTimeRestriction = async (restrictionData: Omit<TimeRestriction, "id">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
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
        isGlobal: true // Marcando como restrição global
      };
      
      setTimeRestrictions(prev => [...prev, newRestriction]);
      toast.success("Restrição de horário criada com sucesso");
    } catch (error: any) {
      console.error("Error creating time restriction:", error);
      toast.error(`Erro ao criar restrição de horário: ${error.message}`);
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
      
      toast.success("Restrição de horário atualizada com sucesso");
    } catch (error: any) {
      console.error("Error updating time restriction:", error);
      toast.error(`Erro ao atualizar restrição de horário: ${error.message}`);
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
      toast.success("Restrição de horário excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting time restriction:", error);
      toast.error(`Erro ao excluir restrição de horário: ${error.message}`);
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
      
      // Add tags
      if (contactData.tags && contactData.tags.length > 0) {
        for (const tag of contactData.tags) {
          // Verificar se a tag existe na tabela de tags
          const { data: existingTag } = await supabase
            .from('tags')
            .select('name')
            .eq('name', tag)
            .maybeSingle();
          
          // Se a tag não existe, adicioná-la
          if (!existingTag && user) {
            await supabase
              .from('tags')
              .insert({
                name: tag,
                created_by: user.id
              });
              
            // Atualizar o estado local de tags
            setTags(prev => [...prev, tag]);
          }
          
          // Adicionar a relação de tag para o contato
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
      toast.success("Contato adicionado com sucesso");
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error(`Erro ao adicionar contato: ${error.message}`);
    }
  };

  // Corrigir a função addClient para incluir creator_account_name
  const addClient = async (client: { 
    account_id: number;
    account_name: string;
    created_by: string;
  }) => {
    try {
      const user = supabase.auth.getUser();
      const creator_account_name = (await getProfile()).account_name;

      const clientData = {
        ...client,
        creator_account_name
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select();
    
      if (error) throw error;
      
      if (data && data.length > 0) {
        setClients([...clients, formatClient(data[0])]);
        return data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      throw error;
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
      
      toast.success("Cliente atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
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
      toast.success("Cliente excluído com sucesso");
      
      // Check if any instances were using this client and remove them from instances list
      const affectedInstances = instances.filter(instance => instance.clientId === id);
      if (affectedInstances.length > 0) {
        setInstances(prev => prev.filter(instance => instance.clientId !== id));
        
        // If current instance was using this client, set current instance to null
        if (currentInstance && currentInstance.clientId === id) {
          const nextInstance = instances.find(i => i.clientId !== id);
          setCurrentInstance(nextInstance || null);
        }
      }
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  const addUser = async (userData: { email: string; password: string; accountName: string, isAdmin?: boolean }) => {
    try {
      // Use Supabase auth to sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error("Erro ao criar usuário");
      }
      
      // Update the profile with the account name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          account_name: userData.accountName,
          role: userData.isAdmin ? 'admin' : 'admin' // Default to admin for now
        })
        .eq('id', data.user.id);
      
      if (updateError) throw updateError;
      
      toast.success("Usuário criado com sucesso");
      refreshData();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
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
      
      toast.success("Usuário atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // This requires admin privileges in Supabase
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("Usuário excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    }
  };

  const addTag = async (tagName: string) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
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
      toast.success("Tag adicionada com sucesso");
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(`Erro ao adicionar tag: ${error.message}`);
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
      toast.success("Tag removida com sucesso");
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(`Erro ao remover tag: ${error.message}`);
    }
  };

  const loadSequences = async () => {
    try {
      setLoading(true);
      
      // Buscar sequências
      const { data: sequencesData, error: sequencesError } = await supabase
        .from("sequences")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (sequencesError) throw sequencesError;
      
      // Para cada sequência, buscar seus estágios
      const sequencesWithStages: Sequence[] = [];
      
      for (const seq of sequencesData || []) {
        // Buscar estágios
        const { data: stagesData, error: stagesError } = await supabase
          .from("sequence_stages")
          .select("*")
          .eq("sequence_id", seq.id)
          .order("order_index", { ascending: true });
        
        if (stagesError) throw stagesError;
        
        // Buscar restrições locais
        const { data: localRestrictionsData, error: localRestrictionsError } = await supabase
          .from("sequence_local_restrictions")
          .select("*")
          .eq("sequence_id", seq.id);
        
        if (localRestrictionsError) throw localRestrictionsError;
        
        // Buscar restrições globais
        const { data: globalRestrictions, error: globalRestrictionsError } = await supabase
          .rpc("get_sequence_time_restrictions", { seq_id: seq.id });
        
        if (globalRestrictionsError) throw globalRestrictionsError;
        
        // Mapear estágios
        const stages = stagesData.map(stage => ({
          id: stage.id,
          name: stage.name,
          type: stage.type as "message" | "pattern" | "typebot",
          content: stage.content,
          typebotStage: stage.typebot_stage || undefined,
          delay: stage.delay,
          delayUnit: stage.delay_unit as "minutes" | "hours" | "days"
        }));
        
        // Mapear restrições locais
        const localRestrictions = localRestrictionsData.map(restriction => ({
          id: restriction.id,
          name: restriction.name,
          active: restriction.active,
          days: restriction.days,
          startHour: restriction.start_hour,
          startMinute: restriction.start_minute,
          endHour: restriction.end_hour,
          endMinute: restriction.end_minute,
          isGlobal: false
        }));
        
        // Mapear restrições globais
        const globalRestrictionsProcessed = (globalRestrictions || []).map(restriction => ({
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
        
        // Combinar todas as restrições
        const timeRestrictions = [...localRestrictions, ...globalRestrictionsProcessed];
        
        // Determinar o tipo de sequência com base nos estágios ou usar um valor padrão
        let sequenceType: "message" | "pattern" | "typebot" = "message";
        if (stages.length > 0) {
          // Se o último estágio for um typebot, consideramos que é uma sequência de typebot
          const lastStage = stages[stages.length - 1];
          if (lastStage.type === "typebot") {
            sequenceType = "typebot";
          } else if (lastStage.type === "pattern") {
            sequenceType = "pattern";
          }
        }
        
        // Adicionar sequência ao array
        sequencesWithStages.push({
          id: seq.id,
          name: seq.name,
          instanceId: seq.instance_id,
          // Fix here: Use optional chaining to safely access seq.type, or use sequenceType as fallback
          type: (seq as any).type || sequenceType,
          status: seq.status as "active" | "inactive",
          startCondition: {
            type: seq.start_condition_type as "AND" | "OR",
            tags: seq.start_condition_tags || []
          },
          stopCondition: {
            type: seq.stop_condition_type as "AND" | "OR",
            tags: seq.stop_condition_tags || []
          },
          stages,
          timeRestrictions,
          createdAt: seq.created_at,
          updatedAt: seq.updated_at
        });
      }
      
      setSequences(sequencesWithStages);
    } catch (error) {
      console.error("Erro ao carregar sequências:", error);
    } finally {
      setLoading(false);
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
    setCurrentInstance,
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
