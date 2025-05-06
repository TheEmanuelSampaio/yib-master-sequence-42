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
  ComplexCondition,
  ConditionGroup
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
        
        // Create the complex condition structure for start conditions
        const startCondition: ComplexCondition = {
          groups: [{
            operator: sequence.start_condition_type === "AND" ? "AND" : "OR",
            tags: sequence.start_condition_tags || []
          }],
          operator: "AND" // Default to AND for backward compatibility
        };
        
        // Create the complex condition structure for stop conditions
        const stopCondition: ComplexCondition = {
          groups: [{
            operator: sequence.stop_condition_type === "AND" ? "AND" : "OR",
            tags: sequence.stop_condition_tags || []
          }],
          operator: "AND" // Default to AND for backward compatibility
        };
        
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
          type: sequence.type || sequenceType,
          startCondition,
          stopCondition,
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

  // Update updateSequence to handle complex conditions
  const updateSequence = async (id: string, updates: Partial<Sequence>) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return { success: false, error: "Usuário não autenticado" };
      }
      
      console.log("Updating sequence:", id, updates);
      
      // Update the sequence basic info
      const { error: seqError } = await supabase
        .from('sequences')
        .update({
          name: updates.name,
          status: updates.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (seqError) throw seqError;
      
      // Update complex conditions if they were modified
      if (updates.startCondition || updates.stopCondition) {
        // If start condition was updated
        if (updates.startCondition) {
          // Delete existing start condition groups
          const { error: delGroupsError } = await supabase
            .from('sequence_condition_groups')
            .delete()
            .eq('sequence_id', id)
            .eq('condition_type', 'start');
            
          if (delGroupsError) throw delGroupsError;
          
          // Add new start condition groups
          if (updates.startCondition.groups && updates.startCondition.groups.length > 0) {
            for (const group of updates.startCondition.groups) {
              const { data: groupData, error: groupError } = await supabase
                .from('sequence_condition_groups')
                .insert({
                  sequence_id: id,
                  condition_type: 'start',
                  group_operator: group.operator
                })
                .select()
                .single();
                
              if (groupError) throw groupError;
              
              // Add tags for this group
              if (group.tags && group.tags.length > 0) {
                const tagsToInsert = group.tags.map(tag => ({
                  group_id: groupData.id,
                  tag_name: tag
                }));
                
                const { error: tagsError } = await supabase
                  .from('sequence_condition_tags')
                  .insert(tagsToInsert);
                  
                if (tagsError) throw tagsError;
              }
            }
          }
        }
        
        // If stop condition was updated
        if (updates.stopCondition) {
          // Delete existing stop condition groups
          const { error: delGroupsError } = await supabase
            .from('sequence_condition_groups')
            .delete()
            .eq('sequence_id', id)
            .eq('condition_type', 'stop');
            
          if (delGroupsError) throw delGroupsError;
          
          // Add new stop condition groups
          if (updates.stopCondition.groups && updates.stopCondition.groups.length > 0) {
            for (const group of updates.stopCondition.groups) {
              const { data: groupData, error: groupError } = await supabase
                .from('sequence_condition_groups')
                .insert({
                  sequence_id: id,
                  condition_type: 'stop',
                  group_operator: group.operator
                })
                .select()
                .single();
                
              if (groupError) throw groupError;
              
              // Add tags for this group
              if (group.tags && group.tags.length > 0) {
                const tagsToInsert = group.tags.map(tag => ({
                  group_id: groupData.id,
                  tag_name: tag
                }));
                
                const { error: tagsError } = await supabase
                  .from('sequence_condition_tags')
                  .insert(tagsToInsert);
                  
                if (tagsError) throw tagsError;
              }
            }
          }
        }
      }
      
      // Update stages if they were modified
      if (updates.stages) {
        // Get existing stages
        const { data: existingStages, error: stagesError } = await supabase
          .from('sequence_stages')
          .select('id')
          .eq('sequence_id', id)
          .order('order_index', { ascending: true });
        
        if (stagesError) throw stagesError;
        
        // Delete stages that are not in the updated stages array
        const updatedStageIds = updates.stages.map(stage => stage.id).filter(Boolean);
        const stagesToDelete = existingStages
          .filter(stage => !updatedStageIds.includes(stage.id))
          .map(stage => stage.id);
        
        if (stagesToDelete.length > 0) {
          // Check if stages are in use before deleting
          for (const stageId of stagesToDelete) {
            const isInUse = await checkStagesInUse(stageId);
            if (isInUse) {
              return {
                success: false,
                error: `Não foi possível excluir estágio porque está em uso por algum contato.`
              };
            }
          }
          
          const { error: deleteError } = await supabase
            .from('sequence_stages')
            .delete()
            .in('id', stagesToDelete);
          
          if (deleteError) throw deleteError;
        }
        
        // Update or insert stages
        for (let i = 0; i < updates.stages.length; i++) {
          const stage = updates.stages[i];
          
          if (stage.id && isValidUUID(stage.id)) {
            // Update existing stage
            const { error: updateError } = await supabase
              .from('sequence_stages')
              .update({
                name: stage.name,
                type: stage.type,
                content: stage.content,
                typebot_stage: stage.typebotStage,
                delay: stage.delay,
                delay_unit: stage.delayUnit,
                order_index: i
              })
              .eq('id', stage.id);
            
            if (updateError) throw updateError;
          } else {
            // Insert new stage
            const { error: insertError } = await supabase
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
            
            if (insertError) throw insertError;
          }
        }
      }
      
      // Update time restrictions
      if (updates.timeRestrictions) {
        // Handle global restrictions
        const globalRestrictions = updates.timeRestrictions.filter(r => r.isGlobal);
        
        // Get existing global restriction associations
        const { data: existingRestrictions, error: getRestrError } = await supabase
          .from('sequence_time_restrictions')
          .select('time_restriction_id')
          .eq('sequence_id', id);
        
        if (getRestrError) throw getRestrError;
        
        const existingIds = existingRestrictions.map(r => r.time_restriction_id);
        const updatedIds = globalRestrictions.map(r => r.id);
        
        // Remove restrictions that are not in the updated list
        const restrictionsToRemove = existingIds.filter(existId => !updatedIds.includes(existId));
        if (restrictionsToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('sequence_time_restrictions')
            .delete()
            .eq('sequence_id', id)
            .in('time_restriction_id', restrictionsToRemove);
          
          if (removeError) throw removeError;
        }
        
        // Add new restrictions
        const restrictionsToAdd = updatedIds.filter(newId => !existingIds.includes(newId));
        if (restrictionsToAdd.length > 0) {
          const newAssociations = restrictionsToAdd.map(restrictionId => ({
            sequence_id: id,
            time_restriction_id: restrictionId
          }));
          
          const { error: addError } = await supabase
            .from('sequence_time_restrictions')
            .insert(newAssociations);
          
          if (addError) throw addError;
        }
        
        // Handle local restrictions
        const localRestrictions = updates.timeRestrictions.filter(r => !r.isGlobal);
        
        // Get existing local restrictions
        const { data: existingLocal, error: getLocalError } = await supabase
          .from('sequence_local_restrictions')
          .select('id')
          .eq('sequence_id', id);
        
        if (getLocalError) throw getLocalError;
        
        // Delete existing local restrictions
        if (existingLocal && existingLocal.length > 0) {
          const { error: deleteLocalError } = await supabase
            .from('sequence_local_restrictions')
            .delete()
            .eq('sequence_id', id);
          
          if (deleteLocalError) throw deleteLocalError;
        }
        
        // Add new local restrictions
        for (const local of localRestrictions) {
          const { error: addLocalError } = await supabase
            .from('sequence_local_restrictions')
            .insert({
              sequence_id: id,
              name: local.name,
              active: local.active,
              days: local.days,
              start_hour: local.startHour,
              start_minute: local.startMinute,
              end_hour: local.endHour,
              end_minute: local.endMinute,
              created_by: user.id
            });
          
          if (addLocalError) throw addLocalError;
        }
      }
      
      toast.success("Sequência atualizada com sucesso");
      await refreshData();
      return { success: true };
    } catch (error: any) {
      console.error("Error updating sequence:", error);
      toast.error(`Erro ao atualizar sequência: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      // Check if sequence has active contacts
      const { data: activeContactSequences, error: checkError } = await supabase
        .from('contact_sequences')
        .select('id')
        .eq('sequence_id', id)
        .in('status', ['active', 'paused'])
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (activeContactSequences && activeContactSequences.length > 0) {
        toast.error("Não é possível excluir uma sequência com contatos ativos");
        return;
      }
      
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

  const addTimeRestriction = async (restriction: Omit<TimeRestriction, "id">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert({
          name: restriction.name,
          active: restriction.active,
          days: restriction.days,
          start_hour: restriction.startHour,
          start_minute: restriction.startMinute,
          end_hour: restriction.endHour,
          end_minute: restriction.endMinute,
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

  const updateTimeRestriction = async (id: string, restriction: Partial<TimeRestriction>) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .update({
          name: restriction.name,
          active: restriction.active,
          days: restriction.days,
          start_hour: restriction.startHour,
          start_minute: restriction.startMinute,
          end_hour: restriction.endHour,
          end_minute: restriction.endMinute
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev =>
        prev.map(r => r.id === id ? { ...r, ...restriction } : r)
      );
      
      toast.success("Restrição atualizada com sucesso");
    } catch (error: any) {
      console.error("Error updating time restriction:", error);
      toast.error(`Erro ao atualizar restrição: ${error.message}`);
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      // Check if restriction is used in any sequence
      const { data: usedIn, error: checkError } = await supabase
        .from('sequence_time_restrictions')
        .select('sequence_id')
        .eq('time_restriction_id', id);
      
      if (checkError) throw checkError;
      
      if (usedIn && usedIn.length > 0) {
        toast.error("Não é possível excluir uma restrição que está sendo usada por sequências");
        return;
      }
      
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => prev.filter(r => r.id !== id));
      toast.success("Restrição excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting time restriction:", error);
      toast.error(`Erro ao excluir restrição: ${error.message}`);
    }
  };

  const addContact = async (contact: Contact) => {
    try {
      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', contact.phoneNumber)
        .limit(1);
      
      if (existingContact && existingContact.length > 0) {
        toast.error("Este contato já existe");
        return;
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          id: contact.id,
          name: contact.name,
          phone_number: contact.phoneNumber,
          client_id: contact.clientId,
          inbox_id: contact.inboxId,
          conversation_id: contact.conversationId,
          display_id: contact.display_id
        })
        .select();
      
      if (error) throw error;
      
      // Add tags
      if (contact.tags && contact.tags.length > 0) {
        const tagsToInsert = contact.tags.map(tag => ({
          contact_id: contact.id,
          tag_name: tag
        }));
        
        const { error: tagsError } = await supabase
          .from('contact_tags')
          .insert(tagsToInsert);
          
        if (tagsError) throw tagsError;
      }
      
      setContacts(prev => [...prev, contact]);
      toast.success("Contato adicionado com sucesso");
      
      // Update daily stats
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // If this contact belongs to an instance
        if (contact.clientId) {
          // Find instance for this client
          const instance = instances.find(i => i.clientId === contact.clientId);
          if (instance) {
            // Check if stats exist for today
            const { data: existingStats } = await supabase
              .from('daily_stats')
              .select('*')
              .eq('instance_id', instance.id)
              .eq('date', today)
              .maybeSingle();
            
            if (existingStats) {
              // Update existing stats
              await supabase
                .from('daily_stats')
                .update({
                  new_contacts: existingStats.new_contacts + 1
                })
                .eq('id', existingStats.id);
            } else {
              // Create new stats
              await supabase
                .from('daily_stats')
                .insert([{
                  instance_id: instance.id,
                  date: today,
                  new_contacts: 1,
                  messages_sent: 0,
                  messages_scheduled: 0,
                  messages_failed: 0,
                  completed_sequences: 0
                }]);
            }
          }
        }
      } catch (statsError) {
        console.error("Error updating stats for new contact:", statsError);
      }
      
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error(`Erro ao adicionar contato: ${error.message}`);
    }
  };

  const addClient = async (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: client.accountId,
          account_name: client.accountName,
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

  const updateClient = async (id: string, client: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          account_id: client.accountId,
          account_name: client.accountName,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev =>
        prev.map(c => c.id === id ? { ...c, ...client } : c)
      );
      
      toast.success("Cliente atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      // Check if client is used in any instance
      const { data: usedIn, error: checkError } = await supabase
        .from('instances')
        .select('id')
        .eq('client_id', id);
      
      if (checkError) throw checkError;
      
      if (usedIn && usedIn.length > 0) {
        toast.error("Não é possível excluir um cliente que está associado a instâncias");
        return;
      }
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success("Cliente excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  const addUser = async (userData: { email: string; password: string; accountName: string, isAdmin?: boolean }) => {
    try {
      // Check if user is authorized to add users
      if (!user || user.role !== 'super_admin') {
        toast.error("Apenas super administradores podem adicionar usuários");
        return;
      }
      
      // Create user with auth admin API
      const { data, error } = await supabase.functions.invoke('add-user', {
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          account_name: userData.accountName,
          role: userData.isAdmin ? 'admin' : 'user'
        }),
      });
      
      if (error) throw error;
      
      toast.success(`Usuário ${userData.email} criado com sucesso`);
      await refreshData();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
    }
  };

  const updateUser = async (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => {
    try {
      // Check if user is authorized to update users
      if (!user || user.role !== 'super_admin') {
        toast.error("Apenas super administradores podem atualizar usuários");
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          account_name: data.accountName,
          role: data.role
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setUsers(prev =>
        prev.map(u => u.id === id ? { ...u, ...data } : u)
      );
      
      toast.success("Usuário atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Check if user is authorized to delete users
      if (!user || user.role !== 'super_admin') {
        toast.error("Apenas super administradores podem excluir usuários");
        return;
      }
      
      // Delete user with auth admin API
      const { error } = await supabase.functions.invoke('delete-user', {
        body: JSON.stringify({ id }),
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
      
      // Use RPC to insert tag only if it doesn't exist
      const { error } = await supabase.rpc(
        'insert_tag_if_not_exists_for_user',
        { p_name: tagName, p_created_by: user.id }
      );
      
      if (error) throw error;
      
      // Add to the local state only if it's not already there
      if (!tags.includes(tagName)) {
        setTags(prev => [...prev, tagName]);
      }
      
      toast.success(`Tag "${tagName}" adicionada com sucesso`);
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  };

  const deleteTag = async (tagName: string) => {
    try {
      // Check if tag is used in any contact
      const { data: usedInContacts, error: checkContactsError } = await supabase
        .from('contact_tags')
        .select('contact_id')
        .eq('tag_name', tagName)
        .limit(1);
      
      if (checkContactsError) throw checkContactsError;
      
      if (usedInContacts && usedInContacts.length > 0) {
        toast.error("Não é possível excluir uma tag que está associada a contatos");
        return;
      }
      
      // Check if tag is used in any sequence condition
      const { data: usedInConditions, error: checkConditionsError } = await supabase
        .from('sequence_condition_tags')
        .select('group_id')
        .eq('tag_name', tagName)
        .limit(1);
      
      if (checkConditionsError) throw checkConditionsError;
      
      if (usedInConditions && usedInConditions.length > 0) {
        toast.error("Não é possível excluir uma tag que está sendo usada em condições de sequências");
        return;
      }
      
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('name', tagName);
      
      if (error) throw error;
      
      setTags(prev => prev.filter(t => t !== tagName));
      toast.success(`Tag "${tagName}" excluída com sucesso`);
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(`Erro ao excluir tag: ${error.message}`);
    }
  };

  const addSequence = async (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      console.log("Adding sequence:", sequenceData);
      
      // Separar as restrições em globais e locais
      const globalRestrictions = sequenceData.timeRestrictions.filter(r => r.isGlobal);
      const localRestrictions = sequenceData.timeRestrictions.filter(r => !r.isGlobal);
      
      // First create the sequence
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert({
          instance_id: sequenceData.instanceId,
          name: sequenceData.name,
          // Use first group's operator and tags for backward compatibility
          start_condition_type: sequenceData.startCondition.groups[0]?.operator || 'OR',
          start_condition_tags: sequenceData.startCondition.groups[0]?.tags || [],
          stop_condition_type: sequenceData.stopCondition.groups[0]?.operator || 'OR',
          stop_condition_tags: sequenceData.stopCondition.groups[0]?.tags || [],
          status: sequenceData.status,
          created_by: user.id
        })
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      console.log("Sequence created:", seqData);
      
      // Add complex condition groups and tags for start condition
      if (sequenceData.startCondition.groups && sequenceData.startCondition.groups.length > 0) {
        for (const group of sequenceData.startCondition.groups) {
          const { data: groupData, error: groupError } = await supabase
            .from('sequence_condition_groups')
            .insert({
              sequence_id: seqData.id,
              condition_type: 'start',
              group_operator: group.operator
            })
            .select()
            .single();
            
          if (groupError) throw groupError;
          
          // Add tags for this group
          if (group.tags && group.tags.length > 0) {
            const tagsToInsert = group.tags.map(tag => ({
              group_id: groupData.id,
              tag_name: tag
            }));
            
            const { error: tagsError } = await supabase
              .from('sequence_condition_tags')
              .insert(tagsToInsert);
              
            if (tagsError) throw tagsError;
          }
        }
      }
      
      // Add complex condition groups and tags for stop condition
      if (sequenceData.stopCondition.groups && sequenceData.stopCondition.groups.length > 0) {
        for (const group of sequenceData.stopCondition.groups) {
          const { data: groupData, error: groupError } = await supabase
            .from('sequence_condition_groups')
            .insert({
              sequence_id: seqData.id,
              condition_type: 'stop',
              group_operator: group.operator
            })
            .select()
            .single();
            
          if (groupError) throw groupError;
          
          // Add tags for this group
          if (group.tags && group.tags.length > 0) {
            const tagsToInsert = group.tags.map(tag => ({
              group_id: groupData.id,
              tag_name: tag
            }));
            
            const { error: tagsError } = await supabase
              .from('sequence_condition_tags')
              .insert(tagsToInsert);
              
            if (tagsError) throw tagsError;
          }
        }
      }
      
      // Then create the stages
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
      
      // Add time restrictions - handle global restrictions
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
      
      toast.success(`Sequência "${sequenceData.name}" criada com sucesso`);
      
      // Refresh to get the newly created sequence
      await refreshData();
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message || error}`);
    }
  };

  const value: AppContextType = {
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
    
    // Contact functions
    deleteContact: contactFunctions.deleteContact,
    updateContact: contactFunctions.updateContact,
    removeFromSequence: contactFunctions.removeFromSequence,
    updateContactSequence: contactFunctions.updateContactSequence,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
