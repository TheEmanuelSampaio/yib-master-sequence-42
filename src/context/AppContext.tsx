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
import { AdvancedCondition, TagGroup } from "@/types/conditionTypes";
import { v4 as uuidv4 } from 'uuid';

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
  use_advanced_start_condition?: boolean;
  use_advanced_stop_condition?: boolean;
  sequence_condition_groups?: any[];
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

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
  
  // Add the helper function to process advanced condition data from the database
  const processAdvancedCondition = (sequence: ExtendedSequence, conditionType: 'start' | 'stop'): AdvancedCondition => {
    // Default empty condition structure
    const defaultCondition: AdvancedCondition = {
      operator: "OR",
      groups: []
    };
    
    // If no sequence_condition_groups, return default
    if (!sequence.sequence_condition_groups || sequence.sequence_condition_groups.length === 0) {
      return defaultCondition;
    }
    
    // Filter groups for this condition type
    const groups = sequence.sequence_condition_groups.filter(
      group => group.type === conditionType
    );
    
    if (groups.length === 0) {
      return defaultCondition;
    }
    
    // Get the operator from the first group (they should all have the same condition_operator)
    const operator = groups[0].condition_operator === "AND" ? "AND" : "OR";
    
    // Process each group
    const processedGroups: TagGroup[] = groups.map(group => {
      // Get tags from this group
      const tags = group.sequence_condition_tags 
        ? group.sequence_condition_tags.map((tag: any) => tag.tag_name)
        : [];
      
      return {
        id: group.id,
        operator: group.group_operator === "AND" ? "AND" : "OR",
        tags
      };
    });
    
    return {
      operator: operator as "AND" | "OR",
      groups: processedGroups
    };
  };

  // Add the helper function to save condition groups to the database
  const saveConditionGroups = async (
    sequenceId: string, 
    conditionType: 'start' | 'stop',
    condition: AdvancedCondition
  ): Promise<{ success: boolean, error?: string }> => {
    try {
      if (!user || !sequenceId) {
        return { success: false, error: "Usuário não autenticado ou ID de sequência inválido" };
      }
      
      if (!condition || !condition.groups || condition.groups.length === 0) {
        return { success: true }; // Nothing to save
      }
      
      // Insert each group
      for (let groupIndex = 0; groupIndex < condition.groups.length; groupIndex++) {
        const group = condition.groups[groupIndex];
        
        // Insert group
        const { data: groupData, error: groupError } = await supabase
          .from('sequence_condition_groups')
          .insert({
            sequence_id: sequenceId,
            type: conditionType,
            group_operator: group.operator,
            condition_operator: condition.operator,
            group_index: groupIndex
          })
          .select()
          .single();
        
        if (groupError) {
          console.error(`Erro ao inserir grupo de condição ${conditionType}:`, groupError);
          return { success: false, error: `Erro ao inserir grupo de condição: ${groupError.message}` };
        }
        
        const groupId = groupData.id;
        
        // Insert tags for this group
        for (const tag of group.tags) {
          const { error: tagError } = await supabase
            .from('sequence_condition_tags')
            .insert({
              group_id: groupId,
              tag_name: tag
            });
          
          if (tagError) {
            console.error(`Erro ao inserir tag ${tag} no grupo:`, tagError);
            return { success: false, error: `Erro ao inserir tag: ${tagError.message}` };
          }
        }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao salvar grupos de condição:", error);
      return { success: false, error: `Erro ao salvar grupos de condição: ${error.message}` };
    }
  };
  
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
          ),
          sequence_condition_groups (
            *,
            sequence_condition_tags (*)
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
        
        // Processar condições avançadas
        const advancedStartCondition = processAdvancedCondition(sequence, 'start');
        const advancedStopCondition = processAdvancedCondition(sequence, 'stop');
      
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
          status: status as "active" | "inactive",
          stages,
          timeRestrictions: allTimeRestrictions,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at,
          useAdvancedStartCondition: !!sequence.use_advanced_start_condition,
          useAdvancedStopCondition: !!sequence.use_advanced_stop_condition,
          advancedStartCondition,
          advancedStopCondition
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

  // Update the updateSequence function to handle advanced conditions
  const updateSequence = async (id: string, partialSequence: Partial<Omit<Sequence, "id" | "createdAt" | "updatedAt">>) => {
    try {
      if (!user || !id) {
        return { success: false, error: "Usuário não autenticado ou ID inválido" };
      }
      
      console.log("Updating sequence:", id, partialSequence);
      
      // Clonar o objeto para não modificar o original
      const updates: any = { ...partialSequence };
      
      // Transforme os dados para o formato do banco de dados
      if (updates.name !== undefined) updates.name = updates.name;
      if (updates.instanceId !== undefined) updates.instance_id = updates.instanceId;
      if (updates.status !== undefined) updates.status = updates.status;
      if (updates.type !== undefined) updates.type = updates.type;
      
      // Transforme as condições simples para o formato do banco de dados
      if (updates.startCondition) {
        updates.start_condition_type = updates.startCondition.type;
        updates.start_condition_tags = updates.startCondition.tags;
        delete updates.startCondition;
      }
      
      if (updates.stopCondition) {
        updates.stop_condition_type = updates.stopCondition.type;
        updates.stop_condition_tags = updates.stopCondition.tags;
        delete updates.stopCondition;
      }
      
      // Transforme as flags de condições avançadas
      if (updates.useAdvancedStartCondition !== undefined) {
        updates.use_advanced_start_condition = updates.useAdvancedStartCondition;
        delete updates.useAdvancedStartCondition;
      }
      
      if (updates.useAdvancedStopCondition !== undefined) {
        updates.use_advanced_stop_condition = updates.useAdvancedStopCondition;
        delete updates.useAdvancedStopCondition;
      }
      
      // Remova campos que não são colunas da tabela
      delete updates.advancedStartCondition;
      delete updates.advancedStopCondition;
      delete updates.stages;
      delete updates.timeRestrictions;
      
      // Primeiro, atualize a tabela de sequências
      const { error: seqError } = await supabase
        .from('sequences')
        .update(updates)
        .eq('id', id);
      
      if (seqError) throw seqError;
      
      // Se houver dados de estágios, atualize-os
      if (partialSequence.stages) {
        // Primeiro, remova todos os estágios existentes
        const { error: delStagesError } = await supabase
          .from('sequence_stages')
          .delete()
          .eq('sequence_id', id);
        
        if (delStagesError) throw delStagesError;
        
        // Depois, insira os novos estágios
        for (let i = 0; i < partialSequence.stages.length; i++) {
          const stage = partialSequence.stages[i];
          
          const { error: stageError } = await supabase
            .from('sequence_stages')
            .insert({
              sequence_id: id,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: i
            });
          
          if (stageError) throw stageError;
        }
      }
      
      // Se houver restrições de tempo, atualize-as
      if (partialSequence.timeRestrictions) {
        // Primeiro, remova todas as restrições existentes
        const { error: delTimeRestErr } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        if (delTimeRestErr) throw delTimeRestErr;
        
        const { error: delLocalRestErr } = await supabase
          .from('sequence_local_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        if (delLocalRestErr) throw delLocalRestErr;
        
        // Separar em globais e locais
        const globalRestrictions = partialSequence.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = partialSequence.timeRestrictions.filter(r => !r.isGlobal);
        
        // Inserir restrições globais
        for (const restriction of globalRestrictions) {
          const { error: restError } = await supabase
            .from('sequence_time_restrictions')
            .insert({
              sequence_id: id,
              time_restriction_id: restriction.id
            });
          
          if (restError) throw restError;
        }
        
        // Inserir restrições locais
        for (const restriction of localRestrictions) {
          const { error: localRestError } = await supabase
            .from('sequence_local_restrictions')
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
        
          if (localRestError) throw localRestError;
        }
      }
      
      // Gerenciar condições avançadas
      if (partialSequence.useAdvancedStartCondition !== undefined || 
          partialSequence.useAdvancedStopCondition !== undefined ||
          partialSequence.advancedStartCondition ||
          partialSequence.advancedStopCondition) {
        
        // Deletar grupos de condição existentes
        const { error: delGroupsError } = await supabase
          .from('sequence_condition_groups')
          .delete()
          .eq('sequence_id', id);
        
        if (delGroupsError) throw delGroupsError;
        
        // Salvar novos grupos de condição para iniciar (se estiver usando condições avançadas)
        if (partialSequence.useAdvancedStartCondition && partialSequence.advancedStartCondition) {
          const startResult = await saveConditionGroups(
            id, 
            'start',
            partialSequence.advancedStartCondition
          );
          
          if (!startResult.success) {
            throw new Error(`Erro ao salvar condições de início: ${startResult.error}`);
          }
        }
        
        // Salvar novos grupos de condição para parar (se estiver usando condições avançadas)
        if (partialSequence.useAdvancedStopCondition && partialSequence.advancedStopCondition) {
          const stopResult = await saveConditionGroups(
            id,
            'stop',
            partialSequence.advancedStopCondition
          );
          
          if (!stopResult.success) {
            throw new Error(`Erro ao salvar condições de parada: ${stopResult.error}`);
          }
        }
      }
      
      // Atualizar a sequência em memória
      const updatedSequences = sequences.map(seq => {
        if (seq.id === id) {
          // Criar uma nova sequência combinando a existente com as atualizações
          return {
            ...seq,
            ...partialSequence
          };
        }
        return seq;
      });
      
      setSequences(updatedSequences);
      
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao atualizar sequência:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Add the missing functions and fix the existing ones
  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      // Prepare sequence data for database format
      const sequenceData = {
        name: sequence.name,
        instance_id: sequence.instanceId,
        status: sequence.status,
        type: sequence.type,
        start_condition_type: sequence.startCondition.type,
        start_condition_tags: sequence.startCondition.tags,
        stop_condition_type: sequence.stopCondition.type,
        stop_condition_tags: sequence.stopCondition.tags,
        use_advanced_start_condition: sequence.useAdvancedStartCondition || false,
        use_advanced_stop_condition: sequence.useAdvancedStopCondition || false,
        created_by: user.id
      };
      
      // Insert the sequence
      const { data: newSeq, error: insertError } = await supabase
        .from('sequences')
        .insert(sequenceData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      const sequenceId = newSeq.id;
      
      // Insert sequence stages
      if (sequence.stages && sequence.stages.length > 0) {
        for (let i = 0; i < sequence.stages.length; i++) {
          const stage = sequence.stages[i];
          
          const { error: stageError } = await supabase
            .from('sequence_stages')
            .insert({
              sequence_id: sequenceId,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: i
            });
          
          if (stageError) throw stageError;
        }
      }
      
      // Handle time restrictions
      if (sequence.timeRestrictions && sequence.timeRestrictions.length > 0) {
        const globalRestrictions = sequence.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = sequence.timeRestrictions.filter(r => !r.isGlobal);
        
        // Insert global restrictions
        for (const restriction of globalRestrictions) {
          const { error: restError } = await supabase
            .from('sequence_time_restrictions')
            .insert({
              sequence_id: sequenceId,
              time_restriction_id: restriction.id
            });
          
          if (restError) throw restError;
        }
        
        // Insert local restrictions
        for (const restriction of localRestrictions) {
          const { error: localRestError } = await supabase
            .from('sequence_local_restrictions')
            .insert({
              sequence_id: sequenceId,
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
        }
      }
      
      // Handle advanced conditions
      if (sequence.useAdvancedStartCondition && sequence.advancedStartCondition) {
        await saveConditionGroups(sequenceId, 'start', sequence.advancedStartCondition);
      }
      
      if (sequence.useAdvancedStopCondition && sequence.advancedStopCondition) {
        await saveConditionGroups(sequenceId, 'stop', sequence.advancedStopCondition);
      }
      
      // Add to state
      const newSequence: Sequence = {
        id: sequenceId,
        name: sequence.name,
        instanceId: sequence.instanceId,
        type: sequence.type,
        startCondition: sequence.startCondition,
        stopCondition: sequence.stopCondition,
        stages: sequence.stages,
        timeRestrictions: sequence.timeRestrictions,
        status: sequence.status,
        createdAt: newSeq.created_at,
        updatedAt: newSeq.updated_at,
        useAdvancedStartCondition: sequence.useAdvancedStartCondition || false,
        useAdvancedStopCondition: sequence.useAdvancedStopCondition || false,
        advancedStartCondition: sequence.advancedStartCondition,
        advancedStopCondition: sequence.advancedStopCondition
      };
      
      setSequences(prev => [newSequence, ...prev]);
      
      toast.success(`Sequência "${sequence.name}" criada com sucesso`);
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
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
          active: restrictionData.active,
          days: restrictionData.days,
          start_hour: restrictionData.startHour,
          start_minute: restrictionData.startMinute,
          end_hour: restrictionData.endHour,
          end_minute: restrictionData.endMinute,
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
      
      toast.success(`Restrição "${data.name}" criada com sucesso`);
    } catch (error: any) {
      console.error("Error creating time restriction:", error);
      toast.error(`Erro ao criar restrição: ${error.message}`);
    }
  };

  const updateTimeRestriction = async (id: string, restrictionData: Partial<TimeRestriction>) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .update({
          name: restrictionData.name,
          active: restrictionData.active,
          days: restrictionData.days,
          start_hour: restrictionData.startHour,
          start_minute: restrictionData.startMinute,
          end_hour: restrictionData.endHour,
          end_minute: restrictionData.endMinute,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => 
        prev.map(restriction => 
          restriction.id === id ? { ...restriction, ...restrictionData } : restriction
        )
      );
      
      toast.success(`Restrição atualizada com sucesso`);
    } catch (error: any) {
      console.error("Error updating time restriction:", error);
      toast.error(`Erro ao atualizar restrição: ${error.message}`);
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
      
      toast.success("Restrição excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting time restriction:", error);
      toast.error(`Erro ao excluir restrição: ${error.message}`);
    }
  };

  const addContact = async (contact: Contact) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: contact.name,
          phone_number: contact.phoneNumber,
          client_id: contact.clientId,
          inbox_id: contact.inboxId,
          conversation_id: contact.conversationId,
          display_id: contact.displayId,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newContact: Contact = {
        id: data.id,
        name: data.name,
        phoneNumber: data.phone_number,
        clientId: data.client_id,
        inboxId: data.inbox_id,
        conversationId: data.conversation_id,
        displayId: data.display_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setContacts(prev => [...prev, newContact]);
      
      toast.success(`Contato "${data.name}" criado com sucesso`);
    } catch (error: any) {
      console.error("Error creating contact:", error);
      toast.error(`Erro ao criar contato: ${error.message}`);
    }
  };

  const addClient = async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: clientData.accountId,
          account_name: clientData.accountName,
          created_by: user.id
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
      
      toast.success(`Cliente "${data.account_name}" criado com sucesso`);
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast.error(`Erro ao criar cliente: ${error.message}`);
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          account_name: clientData.accountName,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => 
        prev.map(client => 
          client.id === id ? { ...client, ...clientData } : client
        )
      );
      
      toast.success(`Cliente atualizado com sucesso`);
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
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  const addUser = async (userData: { email: string; password: string; accountName: string, isAdmin?: boolean }) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          email: userData.email,
          account_name: userData.accountName,
          role: userData.role || "user",
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newUser: User = {
        id: data.id,
        accountName: data.account_name,
        email: data.email,
        role: data.role,
        avatar: ""
      };
      
      setUsers(prev => [...prev, newUser]);
      
      toast.success(`Usuário "${data.account_name}" criado com sucesso`);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(`Erro ao criar usuário: ${error.message}`);
    }
  };

  const updateUser = async (id: string, userData: { accountName?: string; role?: "super_admin" | "admin" }) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          account_name: userData.accountName,
          role: userData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setUsers(prev => 
        prev.map(user => 
          user.id === id ? { ...user, ...userData } : user
        )
      );
      
      toast.success(`Usuário atualizado com sucesso`);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(user => user.id !== id));
      
      toast.success("Usuário excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    }
  };

  const addTag = async (tagName: string) => {
    try {
      if (!user || !tagName) {
        return;
      }
      
      // Check if tag already exists
      if (tags.includes(tagName)) {
        return;
      }
      
      // Add tag using RPC function
      const { error } = await supabase
        .rpc('insert_tag_if_not_exists_for_user', {
          p_name: tagName,
          p_created_by: user.id
        });
      
      if (error) throw error;
      
      // Update local state
      setTags(prev => [...prev, tagName]);
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  };

  const deleteTag = async (tagName: string) => {
    try {
      if (!user || !tagName) {
        return;
      }
      
      // Delete tag using RPC function
      const { error } = await supabase
        .rpc('delete_tag_for_user', {
          p_name: tagName,
          p_created_by: user.id
        });
      
      if (error) throw error;
      
      // Update local state
      setTags(prev => prev.filter(tag => tag !== tagName));
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(`Erro ao excluir tag: ${error.message}`);
    }
  };

  // Add the contact manipulation functions from contactFunctions
  const deleteContact = async (contactId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verify contactId
      if (!contactId) {
        return { success: false, error: "ID de contato inválido" };
      }
      
      // Delete contact from database
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);
      
      if (error) {
        console.error("Error deleting contact:", error);
        return { success: false, error: `Erro ao excluir contato: ${error.message}` };
      }
      
      // Update local state
      setContacts(prev => prev.filter(c => c.id !== contactId));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error in deleteContact:", error);
      return { success: false, error: `Erro ao excluir contato: ${error.message}` };
    }
  };

  const updateContact = async (contactId: string, data: Partial<Contact>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verify contactId
      if (!contactId) {
        return { success: false, error: "ID de contato inválido" };
      }
      
      // Prepare data for database format
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.phoneNumber !== undefined) updates.phone_number = data.phoneNumber;
      if (data.inboxId !== undefined) updates.inbox_id = data.inboxId;
      if (data.conversationId !== undefined) updates.conversation_id = data.conversationId;
      if (data.displayId !== undefined) updates.display_id = data.displayId;
      
      // Update contact in database
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contactId);
      
      if (error) {
        console.error("Error updating contact:", error);
        return { success: false, error: `Erro ao atualizar contato: ${error.message}` };
      }
      
      // Update local state
      setContacts(prev => prev.map(c => 
        c.id === contactId ? { ...c, ...data } : c
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error in updateContact:", error);
      return { success: false, error: `Erro ao atualizar contato: ${error.message}` };
    }
  };

  const removeFromSequence = async (contactSequenceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verify ID
      if (!contactSequenceId || !isValidUUID(contactSequenceId)) {
        return { success: false, error: "ID de sequência de contato inválido" };
      }
      
      // First, get the sequence to check if it actually exists
      const { data: existingSeq, error: fetchError } = await supabase
        .from('contact_sequences')
        .select('*')
        .eq('id', contactSequenceId)
        .single();
      
      if (fetchError) {
        console.error("Error fetching contact sequence:", fetchError);
        return { success: false, error: `Sequência não encontrada: ${fetchError.message}` };
      }
      
      // Update sequence status and removal date
      const { error: updateError } = await supabase
        .from('contact_sequences')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString()
        })
        .eq('id', contactSequenceId);
      
      if (updateError) {
        console.error("Error removing from sequence:", updateError);
        return { success: false, error: `Erro ao remover da sequência: ${updateError.message}` };
      }
      
      // Update local state
      setContactSequences(prev => prev.map(cs => 
        cs.id === contactSequenceId 
          ? { 
            ...cs, 
            status: 'removed',
            removedAt: new Date().toISOString() 
          } 
          : cs
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error in removeFromSequence:", error);
      return { success: false, error: `Erro ao remover da sequência: ${error.message}` };
    }
  };

  const updateContactSequence = async (
    contactSequenceId: string, 
    data: { sequenceId?: string; currentStageId?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verify ID
      if (!contactSequenceId || !isValidUUID(contactSequenceId)) {
        return { success: false, error: "ID de sequência de contato inválido" };
      }
      
      // Prepare data for database format
      const updates: any = {};
      if (data.sequenceId) updates.sequence_id = data.sequenceId;
      if (data.currentStageId) updates.current_stage_id = data.currentStageId;
      
      // Update in database
      const { error } = await supabase
        .from('contact_sequences')
        .update(updates)
        .eq('id', contactSequenceId);
      
      if (error) {
        console.error("Error updating contact sequence:", error);
        return { success: false, error: `Erro ao atualizar sequência de contato: ${error.message}` };
      }
      
      // Update local state
      setContactSequences(prev => prev.map(cs => 
        cs.id === contactSequenceId 
          ? { 
            ...cs,
            sequenceId: data.sequenceId || cs.sequenceId,
            currentStageId: data.currentStageId || cs.currentStageId
          } 
          : cs
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error in updateContactSequence:", error);
      return { success: false, error: `Erro ao atualizar sequência de contato: ${error.message}` };
    }
  };

  return (
    <AppContext.Provider
      value={{
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
        deleteContact,
        updateContact,
        removeFromSequence,
        updateContactSequence
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
