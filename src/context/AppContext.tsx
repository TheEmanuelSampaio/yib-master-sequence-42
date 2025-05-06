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
  ConditionStructure,
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
      
      // Process sequences data and convert from legacy format to new format
      const processedSequences = sequencesData as ExtendedSequence[];
      
      for (const sequence of processedSequences) {
        // Add a property for local time restrictions
        sequence.localTimeRestrictions = [];
        
        const { data: localRestrictions, error: localRestError } = await supabase
          .from('sequence_local_restrictions')
          .select('*')
          .eq('sequence_id', sequence.id);
          
        if (localRestError) {
          console.error("Erro ao carregar restrições locais:", localRestError);
          continue;
        }
        
        // Add local restrictions if they exist
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
            isGlobal: false // Explicitly mark as local restriction
          }));
          
          sequence.localTimeRestrictions = typedLocalRestrictions;
        }
      }
      
      console.log(`Sequences fetched: ${sequencesData.length}`);
      
      const typedSequences: Sequence[] = processedSequences.map(sequence => {
        // Transform stages in the correct format
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
        
        // Transform global time restrictions
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
            isGlobal: true // All restrictions from this junction are global
          }));
        
        // Combine global and local restrictions
        const allTimeRestrictions = [
          ...globalTimeRestrictions,
          ...(sequence.localTimeRestrictions || [])
        ];
        
        // Convert legacy tag conditions to new ConditionStructure format
        const startCondition: ConditionStructure = {
          operator: (sequence.start_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR",
          groups: [
            {
              operator: (sequence.start_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR",
              tags: sequence.start_condition_tags || []
            }
          ]
        };
        
        const stopCondition: ConditionStructure = {
          operator: (sequence.stop_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR",
          groups: [
            {
              operator: (sequence.stop_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR",
              tags: sequence.stop_condition_tags || []
            }
          ]
        };
        
        // Ensure status is "active" or "inactive"
        const status = sequence.status === "active" ? "active" : "inactive";
        
        // Determine sequence type based on stages or use a default value
        let sequenceType: "message" | "pattern" | "typebot" = "message";
        if (stages.length > 0) {
          // If the last stage is a typebot, consider it a typebot sequence
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
          type: sequence.type || sequenceType, // Use sequence type or determine by last stage
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

  const addSequence = async (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      console.log("Adding sequence:", sequenceData);
      
      // Separate restrictions into global and local
      const globalRestrictions = sequenceData.timeRestrictions.filter(r => r.isGlobal);
      const localRestrictions = sequenceData.timeRestrictions.filter(r => !r.isGlobal);
      
      // Extract legacy format from new ConditionStructure for backward compatibility
      const startConditionType = sequenceData.startCondition.operator;
      // Flatten all tags from all groups for backward compatibility
      const startConditionTags = sequenceData.startCondition.groups.flatMap(group => group.tags);
      
      const stopConditionType = sequenceData.stopCondition.operator;
      // Flatten all tags from all groups for backward compatibility
      const stopConditionTags = sequenceData.stopCondition.groups.flatMap(group => group.tags);
      
      // First create the sequence
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert({
          instance_id: sequenceData.instanceId,
          name: sequenceData.name,
          start_condition_type: startConditionType,
          start_condition_tags: startConditionTags,
          stop_condition_type: stopConditionType,
          stop_condition_tags: stopConditionTags,
          status: sequenceData.status,
          created_by: user.id
        })
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      console.log("Sequence created:", seqData);
      
      // Then create the condition groups and tags
      // Add start condition groups
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
        if (group.tags.length > 0) {
          const tagInserts = group.tags.map(tag => ({
            group_id: groupData.id,
            tag_name: tag
          }));
          
          const { error: tagError } = await supabase
            .from('sequence_condition_tags')
            .insert(tagInserts);
            
          if (tagError) throw tagError;
        }
      }
      
      // Add stop condition groups
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
        if (group.tags.length > 0) {
          const tagInserts = group.tags.map(tag => ({
            group_id: groupData.id,
            tag_name: tag
          }));
          
          const { error: tagError } = await supabase
            .from('sequence_condition_tags')
            .insert(tagInserts);
            
          if (tagError) throw tagError;
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
          // Check if global restriction exists before trying to add
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
      
      // Add local restrictions to sequence_local_restrictions table
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
        }
      }
      
      // After creating the sequence and all its components, fetch the updated sequences list
      refreshData();
      
      toast.success(`Sequência "${seqData.name}" criada com sucesso`);
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
    }
  };

  const updateSequence = async (id: string, updates: Partial<Sequence>) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      setSequences(prev => 
        prev.map(sequence => 
          sequence.id === id ? { ...sequence, ...updates } : sequence
        )
      );
      
      toast.success(`Sequência atualizada com sucesso`);
      
      // Refresh sequences to get updated stages and time restrictions
      refreshData();
    } catch (error: any) {
      console.error("Error updating sequence:", error);
      toast.error(`Erro ao atualizar sequência: ${error.message}`);
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

  const addTimeRestriction = async (restriction: Omit<TimeRestriction, "id">) => {
    try {
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
          is_global: restriction.isGlobal
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
        isGlobal: data.is_global
      };
      
      setTimeRestrictions(prev => [...prev, newRestriction]);
      
      toast.success(`Restrição "${data.name}" adicionada com sucesso`);
    } catch (error: any) {
      console.error("Error adding time restriction:", error);
      toast.error(`Erro ao adicionar restrição: ${error.message}`);
    }
  };

  const updateTimeRestriction = async (id: string, restriction: Partial<TimeRestriction>) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .update(restriction)
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => 
        prev.map(restriction => 
          restriction.id === id ? { ...restriction, ...restriction } : restriction
        )
      );
      
      toast.success(`Restrição atualizada com sucesso`);
      
      // Refresh time restrictions to get updated information
      refreshData();
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
      const { data, error } = await supabase
        .from('contacts')
        .insert(contact)
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
      
      toast.success(`Contato "${data.name}" adicionado com sucesso`);
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error(`Erro ao adicionar contato: ${error.message}`);
    }
  };

  const getContactSequences = (contactId: string): ContactSequence[] => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };

  const addClient = async (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
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
      
      toast.success(`Cliente "${data.account_name}" adicionado com sucesso`);
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
    }
  };

  const updateClient = async (id: string, client: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(client)
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => 
        prev.map(client => 
          client.id === id ? { ...client, ...client } : client
        )
      );
      
      toast.success(`Cliente atualizado com sucesso`);
      
      // Refresh clients to get updated information
      refreshData();
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

  const addUser = async (user: { email: string; password: string; accountName: string, isAdmin?: boolean }) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          email: user.email,
          password: user.password,
          account_name: user.accountName,
          role: user.isAdmin ? 'super_admin' : 'admin'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`Usuário "${data.account_name}" adicionado com sucesso`);
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
    }
  };

  const updateUser = async (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      
      setUsers(prev => 
        prev.map(user => 
          user.id === id ? { ...user, ...data } : user
        )
      );
      
      toast.success(`Usuário atualizado com sucesso`);
      
      // Refresh users to get updated information
      refreshData();
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
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: tagName })
        .select()
        .single();
      
      if (error) throw error;
      
      const newTag: string = data.name;
      
      setTags(prev => [...prev, newTag]);
      
      toast.success(`Tag "${newTag}" adicionada com sucesso`);
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
      
      toast.success("Tag excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(`Erro ao excluir tag: ${error.message}`);
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
      
      // Process sequences data and convert from legacy format to new format
      const processedSequences = sequencesData as ExtendedSequence[];
      
      for (const sequence of processedSequences) {
        // Add a property for local time restrictions
        sequence.localTimeRestrictions = [];
        
        const { data: localRestrictions, error: localRestError } = await supabase
          .from('sequence_local_restrictions')
          .select('*')
          .eq('sequence_id', sequence.id);
          
        if (localRestError) {
          console.error("Erro ao carregar restrições locais:", localRestError);
          continue;
        }
        
        // Add local restrictions if they exist
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
            isGlobal: false // Explicitly mark as local restriction
          }));
          
          sequence.localTimeRestrictions = typedLocalRestrictions;
        }
      }
      
      console.log(`Sequences fetched: ${sequencesData.length}`);
      
      const typedSequences: Sequence[] = processedSequences.map(sequence => {
        // Transform stages in the correct format
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
        
        // Transform global time restrictions
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
            isGlobal: true // All restrictions from this junction are global
          }));
        
        // Combine global and local restrictions
        const allTimeRestrictions = [
          ...globalTimeRestrictions,
          ...(sequence.localTimeRestrictions || [])
        ];
        
        // Convert legacy tag conditions to new ConditionStructure format
        const startCondition: ConditionStructure = {
          operator: (sequence.start_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR",
          groups: [
            {
              operator: (sequence.start_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR",
              tags: sequence.start_condition_tags || []
            }
          ]
        };
        
        const stopCondition: ConditionStructure = {
          operator: (sequence.stop_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR",
          groups: [
            {
              operator: (sequence.stop_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR",
              tags: sequence.stop_condition_tags || []
            }
          ]
        };
        
        // Ensure status is "active" or "inactive"
        const status = sequence.status === "active" ? "active" : "inactive";
        
        // Determine sequence type based on stages or use a default value
        let sequenceType: "message" | "pattern" | "typebot" = "message";
        if (stages.length > 0) {
          // If the last stage is a typebot, consider it a typebot sequence
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
          type: sequence.type || sequenceType, // Use sequence type or determine by last stage
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

  const deleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);
      
      if (error) throw error;
      
      setContacts(prev => prev.filter(contact => contact.id !== contactId));
      
      toast.success("Contato excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error(`Erro ao excluir contato: ${error.message}`);
    }
  };

  const updateContact = async (contactId: string, data: Partial<Contact>) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update(data)
        .eq('id', contactId);
      
      if (error) throw error;
      
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId ? { ...contact, ...data } : contact
        )
      );
      
      toast.success(`Contato atualizado com sucesso`);
      
      // Refresh contacts to get updated information
      refreshData();
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast.error(`Erro ao atualizar contato: ${error.message}`);
    }
  };

  const removeFromSequence = async (contactSequenceId: string) => {
    try {
      const { error } = await supabase
        .from('contact_sequences')
        .delete()
        .eq('id', contactSequenceId);
      
      if (error) throw error;
      
      setContactSequences(prev => prev.filter(cs => cs.id !== contactSequenceId));
      
      toast.success("Contato removido da sequência com sucesso");
    } catch (error: any) {
      console.error("Error removing contact from sequence:", error);
      toast.error(`Erro ao remover contato da sequência: ${error.message}`);
    }
  };

  const updateContactSequence = async (contactSequenceId: string, data: {
    sequenceId?: string;
    currentStageId?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('contact_sequences')
        .update(data)
        .eq('id', contactSequenceId);
      
      if (error) throw error;
      
      setContactSequences(prev => 
        prev.map(cs => 
          cs.id === contactSequenceId ? { ...cs, ...data } : cs
        )
      );
      
      toast.success(`Contato sequência atualizado com sucesso`);
      
      // Refresh contact sequences to get updated information
      refreshData();
    } catch (error: any) {
      console.error("Error updating contact sequence:", error);
      toast.error(`Erro ao atualizar sequência de contato: ${error.message}`);
    }
  };

  return (
    <AppContext.Provider value={{
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
      
      // Contact manipulation functions
      deleteContact,
      updateContact,
      removeFromSequence,
      updateContactSequence,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
