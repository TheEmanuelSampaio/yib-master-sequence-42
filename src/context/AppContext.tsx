import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, 
  Client, 
  Instance, 
  Sequence, 
  Contact, 
  ContactSequence, 
  SequenceStage, 
  TimeRestriction, 
  DailyStats, 
  TagCondition,
  ConditionStructure,
  TagGroup,
  ScheduledMessage
} from '@/types';
import { toast } from 'sonner';
import { isValidUUID } from '@/integrations/supabase/client';

interface AppContextType {
  user: User | null;
  clients: Client[];
  instances: Instance[];
  currentInstance: Instance | null;
  contacts: Contact[];
  sequences: Sequence[];
  contactSequences: ContactSequence[];
  tags: string[];
  timeRestrictions: TimeRestriction[];
  dailyStats: DailyStats[];
  scheduledMessages: ScheduledMessage[];
  addTag: (tag: string) => void;
  setCurrentInstance: (instance: Instance | null) => void;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<{ success: boolean, error?: string }>;
  updateInstance: (id: string, updates: Partial<Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">>) => Promise<{ success: boolean, error?: string }>;
  deleteInstance: (id: string) => Promise<{ success: boolean, error?: string }>;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean, error?: string }>;
  updateSequence: (id: string, updates: Partial<Omit<Sequence, "id" | "createdAt" | "updatedAt">>) => Promise<{ success: boolean, error?: string }>;
  deleteSequence: (id: string) => Promise<{ success: boolean, error?: string }>;
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id" | "createdAt" | "createdBy">) => Promise<{ success: boolean, error?: string }>;
  updateTimeRestriction: (id: string, updates: Partial<Omit<TimeRestriction, "id" | "createdAt" | "createdBy">>) => Promise<{ success: boolean, error?: string }>;
  deleteTimeRestriction: (id: string) => Promise<{ success: boolean, error?: string }>;
  getContactSequences: (contactId: string) => ContactSequence[];
  // Add missing methods for Contacts page
  deleteContact: (id: string) => Promise<{ success: boolean, error?: string }>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<{ success: boolean, error?: string }>;
  removeFromSequence: (contactSequenceId: string) => Promise<{ success: boolean, error?: string }>;
  updateContactSequence: (id: string, updates: Partial<ContactSequence>) => Promise<{ success: boolean, error?: string }>;
  // Users management
  users: User[];
  addUser: (user: Partial<User>) => Promise<{ success: boolean, error?: string }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean, error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean, error?: string }>;
  // Client management
  addClient: (client: Partial<Client>) => Promise<{ success: boolean, error?: string }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<{ success: boolean, error?: string }>;
  deleteClient: (id: string) => Promise<{ success: boolean, error?: string }>;
  // Tag management
  deleteTag: (tag: string) => Promise<{ success: boolean, error?: string }>;
  // Refresh data
  refreshData: () => Promise<void>;
  isDataInitialized: boolean;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType>({
  user: null,
  clients: [],
  instances: [],
  currentInstance: null,
  contacts: [],
  sequences: [],
  contactSequences: [],
  tags: [],
  timeRestrictions: [],
  dailyStats: [],
  scheduledMessages: [],
  users: [],
  addTag: () => {},
  setCurrentInstance: () => {},
  addInstance: async () => ({ success: false, error: 'Context not initialized' }),
  updateInstance: async () => ({ success: false, error: 'Context not initialized' }),
  deleteInstance: async () => ({ success: false, error: 'Context not initialized' }),
  addSequence: async () => ({ success: false, error: 'Context not initialized' }),
  updateSequence: async () => ({ success: false, error: 'Context not initialized' }),
  deleteSequence: async () => ({ success: false, error: 'Context not initialized' }),
  addTimeRestriction: async () => ({ success: false, error: 'Context not initialized' }),
  updateTimeRestriction: async () => ({ success: false, error: 'Context not initialized' }),
  deleteTimeRestriction: async () => ({ success: false, error: 'Context not initialized' }),
  getContactSequences: () => [],
  deleteContact: async () => ({ success: false, error: 'Context not initialized' }),
  updateContact: async () => ({ success: false, error: 'Context not initialized' }),
  removeFromSequence: async () => ({ success: false, error: 'Context not initialized' }),
  updateContactSequence: async () => ({ success: false, error: 'Context not initialized' }),
  addUser: async () => ({ success: false, error: 'Context not initialized' }),
  updateUser: async () => ({ success: false, error: 'Context not initialized' }),
  deleteUser: async () => ({ success: false, error: 'Context not initialized' }),
  addClient: async () => ({ success: false, error: 'Context not initialized' }),
  updateClient: async () => ({ success: false, error: 'Context not initialized' }),
  deleteClient: async () => ({ success: false, error: 'Context not initialized' }),
  deleteTag: async () => ({ success: false, error: 'Context not initialized' }),
  refreshData: async () => {},
  isDataInitialized: false,
  isLoading: true,
});

// Helper function to convert legacy TagCondition to new ConditionStructure
const convertToConditionStructure = (type: string, tags: string[]): ConditionStructure => {
  return {
    operator: "OR", // Default top-level operator
    groups: [{
      id: uuidv4(),
      operator: type as "AND" | "OR",
      tags: [...tags]
    }]
  };
};

// Helper function to convert ConditionStructure to legacy format for DB
const convertToLegacyFormat = (condition: ConditionStructure): { type: string, tags: string[] } => {
  // For simple case with one group, use its operator and tags directly
  if (condition.groups.length === 1) {
    return {
      type: condition.groups[0].operator,
      tags: condition.groups[0].tags
    };
  }
  
  // For multiple groups, we will use the top-level operator and combine all tags
  // This is a simplification that will work for the transition period
  let allTags: string[] = [];
  condition.groups.forEach(group => {
    allTags = [...allTags, ...group.tags];
  });
  
  // Remove duplicates
  allTags = [...new Set(allTags)];
  
  return {
    type: condition.operator,
    tags: allTags
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Inicializar usuário na montagem do componente
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error fetching session:', error);
          return;
        }
        
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return;
          }
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            accountName: profile.account_name || '',
            role: profile.role,
          });
          
          // Carregar dados iniciais após o login
          refreshData();
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeUser();
    
    // Setup auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return;
          }
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            accountName: profile.account_name || '',
            role: profile.role,
          });
          
          refreshData();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setClients([]);
          setInstances([]);
          setCurrentInstance(null);
          setContacts([]);
          setSequences([]);
          setContactSequences([]);
          setTags([]);
          setTimeRestrictions([]);
          setIsDataInitialized(false);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Update current instance from localStorage when available
  useEffect(() => {
    if (instances.length > 0) {
      const savedInstanceId = localStorage.getItem('currentInstanceId');
      if (savedInstanceId) {
        const instance = instances.find(i => i.id === savedInstanceId);
        if (instance) {
          setCurrentInstance(instance);
        } else if (instances.length > 0) {
          setCurrentInstance(instances[0]);
        }
      } else if (instances.length > 0) {
        setCurrentInstance(instances[0]);
      }
    }
  }, [instances]);
  
  // Salvar instância atual no localStorage
  useEffect(() => {
    if (currentInstance) {
      localStorage.setItem('currentInstanceId', currentInstance.id);
    }
  }, [currentInstance]);
  
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };
  
  const refreshData = async () => {
    if (!user || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return;
      }
      
      const mappedClients: Client[] = clientsData.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        creator_account_name: client.creator_account_name
      }));
      
      setClients(mappedClients);
      
      // Fetch instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*, client:clients(*)');
      
      if (instancesError) {
        console.error('Error fetching instances:', instancesError);
        return;
      }
      
      const mappedInstances: Instance[] = instancesData.map(instance => ({
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
          updatedAt: instance.client.updated_at,
          creator_account_name: instance.client.creator_account_name
        } : undefined,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at,
      }));
      
      setInstances(mappedInstances);
      
      // Fetch contacts (for all instances)
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_tags!inner (
            tag_name
          )
        `);
      
      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
        return;
      }
      
      // Process contacts with tags
      const contactMap = new Map<string, Contact>();
      
      contactsData.forEach(contact => {
        const contactId = contact.id;
        const tagName = contact.contact_tags[0].tag_name;
        
        if (contactMap.has(contactId)) {
          const existingContact = contactMap.get(contactId)!;
          if (!existingContact.tags.includes(tagName)) {
            existingContact.tags.push(tagName);
          }
        } else {
          contactMap.set(contactId, {
            id: contact.id,
            name: contact.name,
            phoneNumber: contact.phone_number,
            clientId: contact.client_id,
            inboxId: contact.inbox_id,
            conversationId: contact.conversation_id,
            displayId: contact.display_id,
            tags: [tagName],
            createdAt: contact.created_at,
            updatedAt: contact.updated_at,
          });
        }
      });
      
      setContacts(Array.from(contactMap.values()));
      
      // Collect all unique tags
      const allTags = new Set<string>();
      contactMap.forEach(contact => {
        contact.tags.forEach(tag => allTags.add(tag));
      });
      
      setTags(Array.from(allTags));
      
      // Fetch all sequences
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select(`
          *,
          sequence_stages(*)
        `);
      
      if (sequencesError) {
        console.error('Error fetching sequences:', sequencesError);
        return;
      }
      
      // Fetch the new sequence condition groups and tags
      const { data: conditionGroupsData, error: conditionGroupsError } = await supabase
        .from('sequence_condition_groups')
        .select(`
          *,
          sequence_condition_tags(*)
        `);
      
      if (conditionGroupsError) {
        console.error('Error fetching condition groups:', conditionGroupsError);
      }
      
      // Create a mapping of sequence ID to its condition groups
      const sequenceConditionsMap = new Map<string, { start: any[], stop: any[] }>();
      if (conditionGroupsData) {
        conditionGroupsData.forEach(group => {
          const sequenceId = group.sequence_id;
          const conditionType = group.condition_type;
          const tags = group.sequence_condition_tags.map(tag => tag.tag_name);
          
          if (!sequenceConditionsMap.has(sequenceId)) {
            sequenceConditionsMap.set(sequenceId, { start: [], stop: [] });
          }
          
          const entry = sequenceConditionsMap.get(sequenceId)!;
          if (conditionType === 'start') {
            entry.start.push({
              id: group.id,
              operator: group.group_operator,
              tags
            });
          } else if (conditionType === 'stop') {
            entry.stop.push({
              id: group.id,
              operator: group.group_operator,
              tags
            });
          }
        });
      }
      
      // Fetch time restrictions for sequences
      const { data: timeRestrictionsData, error: timeRestrictionsError } = await supabase
        .from('sequence_local_restrictions')
        .select('*');
      
      const sequenceTimeRestrictions = new Map<string, TimeRestriction[]>();
      
      if (!timeRestrictionsError && timeRestrictionsData) {
        timeRestrictionsData.forEach((restriction: any) => {
          const sequenceId = restriction.sequence_id;
          
          if (!sequenceTimeRestrictions.has(sequenceId)) {
            sequenceTimeRestrictions.set(sequenceId, []);
          }
          
          sequenceTimeRestrictions.get(sequenceId)!.push({
            id: restriction.id,
            name: restriction.name,
            active: restriction.active,
            days: restriction.days,
            startHour: restriction.start_hour,
            startMinute: restriction.start_minute,
            endHour: restriction.end_hour,
            endMinute: restriction.end_minute,
            isGlobal: restriction.is_global
          });
        });
      } else if (timeRestrictionsError) {
        console.error('Error fetching sequence time restrictions:', timeRestrictionsError);
      }
      
      // Global time restrictions (for reuse)
      const { data: globalRestrictionsData, error: globalRestrictionsError } = await supabase
        .from('time_restrictions')
        .select('*');
      
      if (globalRestrictionsError) {
        console.error('Error fetching global time restrictions:', globalRestrictionsError);
      }
      
      if (globalRestrictionsData) {
        const mappedGlobalRestrictions: TimeRestriction[] = globalRestrictionsData.map(restriction => ({
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
        
        setTimeRestrictions(mappedGlobalRestrictions);
      }
      
      // Map sequences with their stages and condition info
      const mappedSequences: Sequence[] = sequencesData.map(sequence => {
        const stages = sequence.sequence_stages.map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          delay: stage.delay,
          delayUnit: stage.delay_unit,
          orderIndex: stage.order_index,
          typebotStage: stage.typebot_stage,
          sequenceId: stage.sequence_id
        })).sort((a: SequenceStage, b: SequenceStage) => (a.orderIndex || 0) - (b.orderIndex || 0));
        
        // Get time restrictions for this sequence
        const restrictions = sequenceTimeRestrictions.get(sequence.id) || [];
        
        // Check if we have new format condition groups
        const hasNewConditions = sequenceConditionsMap.has(sequence.id);
        
        let startCondition: ConditionStructure;
        let stopCondition: ConditionStructure;
        
        if (hasNewConditions) {
          // Use the new format
          const conditions = sequenceConditionsMap.get(sequence.id)!;
          
          startCondition = {
            operator: 'OR', // Default top level operator
            groups: conditions.start
          };
          
          stopCondition = {
            operator: 'OR', // Default top level operator
            groups: conditions.stop
          };
        } else {
          // Use the old format but convert to new structure
          startCondition = convertToConditionStructure(
            sequence.start_condition_type, 
            sequence.start_condition_tags || []
          );
          
          stopCondition = convertToConditionStructure(
            sequence.stop_condition_type, 
            sequence.stop_condition_tags || []
          );
        }
        
        return {
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          type: sequence.type || "message", // Default to message if not specified
          startCondition,
          stopCondition,
          stages,
          timeRestrictions: restrictions,
          status: sequence.status as "active" | "inactive",
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at,
        };
      });
      
      setSequences(mappedSequences);
      
      // Fetch contact sequences
      const { data: contactSequencesData, error: contactSequencesError } = await supabase
        .from('contact_sequences')
        .select(`
          *,
          stage_progress(*)
        `);
      
      if (contactSequencesError) {
        console.error('Error fetching contact sequences:', contactSequencesError);
        return;
      }
      
      const mappedContactSequences: ContactSequence[] = contactSequencesData.map(cs => {
        const stageProgress = cs.stage_progress.map((progress: any) => ({
          stageId: progress.stage_id,
          status: progress.status,
          completedAt: progress.completed_at
        }));
        
        return {
          id: cs.id,
          contactId: cs.contact_id,
          sequenceId: cs.sequence_id,
          currentStageIndex: cs.current_stage_index,
          currentStageId: cs.current_stage_id,
          status: cs.status as "active" | "completed" | "paused" | "removed",
          startedAt: cs.started_at,
          lastMessageAt: cs.last_message_at,
          completedAt: cs.completed_at,
          removedAt: cs.removed_at,
          stageProgress
        };
      });
      
      setContactSequences(mappedContactSequences);
      
      // Fetch scheduled messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('scheduled_time', { ascending: true });
      
      if (messagesError) {
        console.error('Error fetching scheduled messages:', messagesError);
      } else if (messagesData) {
        const mappedMessages: ScheduledMessage[] = messagesData.map(msg => ({
          id: msg.id,
          contactId: msg.contact_id,
          sequenceId: msg.sequence_id,
          stageId: msg.stage_id,
          scheduledTime: msg.scheduled_time,
          scheduledAt: msg.scheduled_at,
          sentAt: msg.sent_at,
          status: msg.status as "waiting" | "pending" | "processing" | "sent" | "failed" | "persistent_error",
          attempts: msg.attempts || 0
        }));
        
        setScheduledMessages(mappedMessages);
      }
      
      // Fetch daily stats
      const { data: statsData, error: statsError } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: false });
      
      if (statsError) {
        console.error('Error fetching daily stats:', statsError);
        return;
      }
      
      const mappedStats: DailyStats[] = statsData.map(stat => ({
        date: stat.date,
        instanceId: stat.instance_id || "",
        messagesScheduled: stat.messages_scheduled,
        messagesSent: stat.messages_sent,
        messagesFailed: stat.messages_failed,
        newContacts: stat.new_contacts,
        completedSequences: stat.completed_sequences
      }));
      
      setDailyStats(mappedStats);
      setIsDataInitialized(true);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const addInstance = async (instance: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };

      // Check if URL is valid (starts with http or https)
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(instance.evolutionApiUrl)) {
        return { success: false, error: 'URL deve começar com http:// ou https://' };
      }
      
      // Remove trailing slash if present
      let apiUrl = instance.evolutionApiUrl;
      if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl.slice(0, -1);
      }
      
      const { data, error } = await supabase
        .from('instances')
        .insert({
          name: instance.name,
          evolution_api_url: apiUrl,
          api_key: instance.apiKey,
          active: instance.active,
          client_id: instance.clientId,
          created_by: user.id
        })
        .select();
      
      if (error) {
        console.error('Error adding instance:', error);
        return { success: false, error: error.message };
      }
      
      if (data && data.length > 0) {
        const newInstance: Instance = {
          id: data[0].id,
          name: data[0].name,
          evolutionApiUrl: data[0].evolution_api_url,
          apiKey: data[0].api_key,
          active: data[0].active,
          clientId: data[0].client_id,
          createdBy: data[0].created_by,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at
        };
        
        setInstances(prev => [...prev, newInstance]);
        
        // Set as current if it's the first instance
        if (instances.length === 0) {
          setCurrentInstance(newInstance);
        }
        
        return { success: true };
      }
      
      return { success: false, error: 'Failed to add instance' };
    } catch (error: any) {
      console.error('Error adding instance:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const updateInstance = async (id: string, updates: Partial<Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">>) => {
    try {
      if (!isValidUUID(id)) {
        console.error('Invalid instance ID:', id);
        return { success: false, error: 'Invalid instance ID' };
      }
      
      // Prepare updates object by converting camelCase to snake_case
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) {
        dbUpdates.name = updates.name;
      }
      
      if (updates.evolutionApiUrl !== undefined) {
        let apiUrl = updates.evolutionApiUrl;
        // Check if URL is valid (starts with http or https)
        const urlRegex = /^https?:\/\/.+/;
        if (!urlRegex.test(apiUrl)) {
          return { success: false, error: 'URL deve começar com http:// ou https://' };
        }
        
        // Remove trailing slash if present
        if (apiUrl.endsWith('/')) {
          apiUrl = apiUrl.slice(0, -1);
        }
        
        dbUpdates.evolution_api_url = apiUrl;
      }
      
      if (updates.apiKey !== undefined) {
        dbUpdates.api_key = updates.apiKey;
      }
      
      if (updates.active !== undefined) {
        dbUpdates.active = updates.active;
      }
      
      if (updates.clientId !== undefined) {
        dbUpdates.client_id = updates.clientId;
      }
      
      const { data, error } = await supabase
        .from('instances')
        .update(dbUpdates)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error updating instance:', error);
        return { success: false, error: error.message };
      }
      
      if (data && data.length > 0) {
        setInstances(prev => prev.map(inst => 
          inst.id === id 
            ? {
                ...inst,
                ...updates,
                updatedAt: data[0].updated_at
              }
            : inst
        ));
        
        // Update current instance if it's the one being updated
        if (currentInstance && currentInstance.id === id) {
          setCurrentInstance(prev => prev ? { ...prev, ...updates } : null);
        }
        
        return { success: true };
      }
      
      return { success: false, error: 'Failed to update instance' };
    } catch (error: any) {
      console.error('Error updating instance:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const deleteInstance = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        console.error('Invalid instance ID:', id);
        return { success: false, error: 'Invalid instance ID' };
      }
      
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting instance:', error);
        return { success: false, error: error.message };
      }
      
      setInstances(prev => prev.filter(inst => inst.id !== id));
      
      // If current instance was deleted, set first available instance as current
      if (currentInstance && currentInstance.id === id) {
        const remainingInstances = instances.filter(inst => inst.id !== id);
        
        if (remainingInstances.length > 0) {
          setCurrentInstance(remainingInstances[0]);
        } else {
          setCurrentInstance(null);
        }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting instance:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  // Function to add a new sequence with support for both new and legacy condition formats
  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };
      
      if (!isValidUUID(sequence.instanceId)) {
        console.error('Invalid instance ID:', sequence.instanceId);
        return { success: false, error: 'Invalid instance ID' };
      }
      
      // Step 1: Insert the sequence with legacy format for backwards compatibility
      const legacyStartCondition = convertToLegacyFormat(sequence.startCondition);
      const legacyStopCondition = convertToLegacyFormat(sequence.stopCondition);
      
      const { data: newSequence, error: sequenceError } = await supabase
        .from('sequences')
        .insert({
          name: sequence.name,
          instance_id: sequence.instanceId,
          created_by: user.id,
          status: sequence.status,
          start_condition_type: legacyStartCondition.type,
          start_condition_tags: legacyStartCondition.tags,
          stop_condition_type: legacyStopCondition.type,
          stop_condition_tags: legacyStopCondition.tags
        })
        .select();
      
      if (sequenceError || !newSequence || newSequence.length === 0) {
        console.error('Error creating sequence:', sequenceError);
        return { success: false, error: sequenceError?.message || 'Failed to create sequence' };
      }
      
      const sequenceId = newSequence[0].id;

      // Step 2: Insert the new format condition groups and tags
      const insertGroups = async (conditionType: 'start' | 'stop', condition: ConditionStructure) => {
        for (const group of condition.groups) {
          // Skip empty groups
          if (group.tags.length === 0) continue;
          
          const { data: newGroup, error: groupError } = await supabase
            .from('sequence_condition_groups')
            .insert({
              sequence_id: sequenceId,
              condition_type: conditionType,
              group_operator: group.operator
            })
            .select();
          
          if (groupError || !newGroup || newGroup.length === 0) {
            console.error(`Error creating ${conditionType} condition group:`, groupError);
            continue;
          }
          
          const groupId = newGroup[0].id;
          
          // Insert tags for this group
          const tagInserts = group.tags.map(tagName => ({
            group_id: groupId,
            tag_name: tagName
          }));
          
          if (tagInserts.length > 0) {
            const { error: tagsError } = await supabase
              .from('sequence_condition_tags')
              .insert(tagInserts);
            
            if (tagsError) {
              console.error(`Error inserting ${conditionType} condition tags:`, tagsError);
            }
          }
        }
      };
      
      // Insert start and stop condition groups
      await insertGroups('start', sequence.startCondition);
      await insertGroups('stop', sequence.stopCondition);
      
      // Step 3: Insert sequence stages
      const stagesWithSequenceId = sequence.stages.map((stage, index) => ({
        sequence_id: sequenceId,
        name: stage.name,
        type: stage.type,
        content: stage.content,
        delay: stage.delay,
        delay_unit: stage.delayUnit,
        order_index: index,
        typebot_stage: stage.typebotStage
      }));
      
      const { error: stagesError } = await supabase
        .from('sequence_stages')
        .insert(stagesWithSequenceId);
      
      if (stagesError) {
        console.error('Error inserting sequence stages:', stagesError);
        return { success: false, error: stagesError.message };
      }
      
      // Step 4: Handle time restrictions
      const nonGlobalRestrictions = sequence.timeRestrictions
        .filter(r => !r.isGlobal)
        .map(r => ({
          sequence_id: sequenceId,
          name: r.name,
          active: r.active,
          days: r.days,
          start_hour: r.startHour,
          start_minute: r.startMinute,
          end_hour: r.endHour,
          end_minute: r.endMinute,
          created_by: user.id
        }));
      
      if (nonGlobalRestrictions.length > 0) {
        const { error: localRestrictionsError } = await supabase
          .from('sequence_local_restrictions')
          .insert(nonGlobalRestrictions);
        
        if (localRestrictionsError) {
          console.error('Error inserting local time restrictions:', localRestrictionsError);
        }
      }
      
      // Handle global restriction relationships
      const globalRestrictions = sequence.timeRestrictions
        .filter(r => r.isGlobal)
        .map(r => ({
          sequence_id: sequenceId,
          time_restriction_id: r.id
        }));
      
      if (globalRestrictions.length > 0) {
        const { error: globalRestrictionsError } = await supabase
          .from('sequence_time_restrictions')
          .insert(globalRestrictions);
        
        if (globalRestrictionsError) {
          console.error('Error inserting global time restriction links:', globalRestrictionsError);
        }
      }
      
      // Refresh data to get updated sequence list with all relationships
      refreshData();
      
      return { success: true };
    } catch (error: any) {
      console.error('Error adding sequence:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  // Function to update a sequence with support for both new and legacy condition formats
  const updateSequence = async (id: string, updates: Partial<Omit<Sequence, "id" | "createdAt" | "updatedAt">>) => {
    try {
      if (!isValidUUID(id)) {
        console.error('Invalid sequence ID:', id);
        return { success: false, error: 'Invalid sequence ID' };
      }
      
      // Step 1: Create the basic sequence update object (legacy format for backwards compatibility)
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) {
        dbUpdates.name = updates.name;
      }
      
      if (updates.instanceId !== undefined) {
        dbUpdates.instance_id = updates.instanceId;
      }
      
      if (updates.status !== undefined) {
        dbUpdates.status = updates.status;
      }
      
      // If condition structures are being updated, convert to legacy format
      if (updates.startCondition !== undefined) {
        const legacyStart = convertToLegacyFormat(updates.startCondition);
        dbUpdates.start_condition_type = legacyStart.type;
        dbUpdates.start_condition_tags = legacyStart.tags;
      }
      
      if (updates.stopCondition !== undefined) {
        const legacyStop = convertToLegacyFormat(updates.stopCondition);
        dbUpdates.stop_condition_type = legacyStop.type;
        dbUpdates.stop_condition_tags = legacyStop.tags;
      }
      
      // Step 2: Update the sequence record
      if (Object.keys(dbUpdates).length > 0) {
        const { error: sequenceError } = await supabase
          .from('sequences')
          .update(dbUpdates)
          .eq('id', id);
        
        if (sequenceError) {
          console.error('Error updating sequence:', sequenceError);
          return { success: false, error: sequenceError.message };
        }
      }
      
      // Step 3: Handle new format conditions if provided
      if (updates.startCondition || updates.stopCondition) {
        // First delete existing condition groups and tags
        const { error: deleteGroupsError } = await supabase
          .from('sequence_condition_groups')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteGroupsError) {
          console.error('Error deleting existing condition groups:', deleteGroupsError);
        }
        
        // Insert updated condition groups and tags
        const insertGroups = async (conditionType: 'start' | 'stop', condition?: ConditionStructure) => {
          if (!condition) return;
          
          for (const group of condition.groups) {
            // Skip empty groups
            if (group.tags.length === 0) continue;
            
            const { data: newGroup, error: groupError } = await supabase
              .from('sequence_condition_groups')
              .insert({
                sequence_id: id,
                condition_type: conditionType,
                group_operator: group.operator
              })
              .select();
            
            if (groupError || !newGroup || newGroup.length === 0) {
              console.error(`Error creating ${conditionType} condition group:`, groupError);
              continue;
            }
            
            const groupId = newGroup[0].id;
            
            // Insert tags for this group
            const tagInserts = group.tags.map(tagName => ({
              group_id: groupId,
              tag_name: tagName
            }));
            
            if (tagInserts.length > 0) {
              const { error: tagsError } = await supabase
                .from('sequence_condition_tags')
                .insert(tagInserts);
              
              if (tagsError) {
                console.error(`Error inserting ${conditionType} condition tags:`, tagsError);
              }
            }
          }
        };
        
        if (updates.startCondition) {
          await insertGroups('start', updates.startCondition);
        }
        
        if (updates.stopCondition) {
          await insertGroups('stop', updates.stopCondition);
        }
      }
      
      // Step 4: Handle stages if provided
      if (updates.stages) {
        // First delete existing stages
        const { error: deleteStagesError } = await supabase
          .from('sequence_stages')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteStagesError) {
          console.error('Error deleting existing stages:', deleteStagesError);
        }
        
        // Insert new stages
        const stagesWithSequenceId = updates.stages.map((stage, index) => ({
          sequence_id: id,
          name: stage.name,
          type: stage.type || 'message',
          content: stage.content,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: index,
          typebot_stage: stage.typebotStage
        }));
        
        const { error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stagesWithSequenceId);
        
        if (stagesError) {
          console.error('Error inserting updated stages:', stagesError);
        }
      }
      
      // Step 5: Handle time restrictions if provided
      if (updates.timeRestrictions) {
        // First delete existing local restrictions
        const { error: deleteLocalRestrictionsError } = await supabase
          .from('sequence_local_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteLocalRestrictionsError) {
          console.error('Error deleting existing local restrictions:', deleteLocalRestrictionsError);
        }
        
        // Delete existing global restriction links
        const { error: deleteGlobalLinksError } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteGlobalLinksError) {
          console.error('Error deleting existing global restriction links:', deleteGlobalLinksError);
        }
        
        // Insert new local restrictions
        const nonGlobalRestrictions = updates.timeRestrictions
          .filter(r => !r.isGlobal)
          .map(r => ({
            sequence_id: id,
            name: r.name,
            active: r.active,
            days: r.days,
            start_hour: r.startHour,
            start_minute: r.startMinute,
            end_hour: r.endHour,
            end_minute: r.endMinute,
            created_by: user!.id
          }));
        
        if (nonGlobalRestrictions.length > 0) {
          const { error: localRestrictionsError } = await supabase
            .from('sequence_local_restrictions')
            .insert(nonGlobalRestrictions);
          
          if (localRestrictionsError) {
            console.error('Error inserting updated local time restrictions:', localRestrictionsError);
          }
        }
        
        // Insert new global restriction links
        const globalRestrictions = updates.timeRestrictions
          .filter(r => r.isGlobal)
          .map(r => ({
            sequence_id: id,
            time_restriction_id: r.id
          }));
        
        if (globalRestrictions.length > 0) {
          const { error: globalRestrictionsError } = await supabase
            .from('sequence_time_restrictions')
            .insert(globalRestrictions);
          
          if (globalRestrictionsError) {
            console.error('Error inserting updated global time restriction links:', globalRestrictionsError);
          }
        }
      }
      
      // Update local state and trigger refresh to get full updated data
      setSequences(prev => {
        const updatedSequences = [...prev];
        const index = updatedSequences.findIndex(seq => seq.id === id);
        
        if (index !== -1) {
          updatedSequences[index] = {
            ...updatedSequences[index],
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        
        return updatedSequences;
      });
      
      // Refresh data to get updated sequence relationships
      refreshData();
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating sequence:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const deleteSequence = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        console.error('Invalid sequence ID:', id);
        return { success: false, error: 'Invalid sequence ID' };
      }
      
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting sequence:', error);
        return { success: false, error: error.message };
      }
      
      // Update local state
      setSequences(prev => prev.filter(seq => seq.id !== id));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting sequence:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const addTimeRestriction = async (restriction: Omit<TimeRestriction, "id" | "createdAt" | "createdBy">) => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };
      
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
        .select();
      
      if (error) {
        console.error('Error adding time restriction:', error);
        return { success: false, error: error.message };
      }
      
      if (data && data.length > 0) {
        const newRestriction: TimeRestriction = {
          id: data[0].id,
          name: data[0].name,
          active: data[0].active,
          days: data[0].days,
          startHour: data[0].start_hour,
          startMinute: data[0].start_minute,
          endHour: data[0].end_hour,
          endMinute: data[0].end_minute,
          isGlobal: true // All restrictions created directly are global
        };
        
        setTimeRestrictions(prev => [...prev, newRestriction]);
        return { success: true };
      }
      
      return { success: false, error: 'Failed to add time restriction' };
    } catch (error: any) {
      console.error('Error adding time restriction:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  const updateTimeRestriction = async (id: string, updates: Partial<Omit<TimeRestriction, "id" | "createdAt" | "createdBy">>) => {
    try {
      if (!isValidUUID(id)) {
        console.error('Invalid time restriction ID:', id);
        return { success: false, error: 'Invalid time restriction ID' };
      }
      
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.active !== undefined) dbUpdates.active = updates.active;
      if (updates.days !== undefined) dbUpdates.days = updates.days;
      if (updates.startHour !== undefined) dbUpdates.start_hour = updates.startHour;
      if (updates.startMinute !== undefined) dbUpdates.start_minute = updates.startMinute;
      if (updates.endHour !== undefined) dbUpdates.end_hour = updates.endHour;
      if (updates.endMinute !== undefined) dbUpdates.end_minute = updates.endMinute;
      
      const { error } = await supabase
        .from('time_restrictions')
        .update(dbUpdates)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating time restriction:', error);
        return { success: false, error: error.message };
      }
      
      // Update local state
      setTimeRestrictions(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating time restriction:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const deleteTimeRestriction = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        console.error('Invalid time restriction ID:', id);
        return { success: false, error: 'Invalid time restriction ID' };
      }
      
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting time restriction:', error);
        return { success: false, error: error.message };
      }
      
      // Update local state
      setTimeRestrictions(prev => prev.filter(item => item.id !== id));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting time restriction:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  // New methods for contact management
  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting contact:', error);
        return { success: false, error: error.message };
      }
      
      setContacts(prev => prev.filter(contact => contact.id !== id));
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const updateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: updates.name,
          phone_number: updates.phoneNumber,
          // Other fields as needed
        })
        .eq('id', id);
        
      if (error) {
        console.error('Error updating contact:', error);
        return { success: false, error: error.message };
      }
      
      setContacts(prev => prev.map(contact => 
        contact.id === id ? { ...contact, ...updates } : contact
      ));
      return { success: true };
    } catch (error: any) {
      console.error('Error updating contact:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const removeFromSequence = async (contactSequenceId: string) => {
    try {
      const { error } = await supabase
        .from('contact_sequences')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString()
        })
        .eq('id', contactSequenceId);
        
      if (error) {
        console.error('Error removing contact from sequence:', error);
        return { success: false, error: error.message };
      }
      
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
      console.error('Error removing contact from sequence:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const updateContactSequence = async (id: string, updates: Partial<ContactSequence>) => {
    try {
      const dbUpdates: any = {};
      
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.currentStageIndex !== undefined) dbUpdates.current_stage_index = updates.currentStageIndex;
      if (updates.currentStageId !== undefined) dbUpdates.current_stage_id = updates.currentStageId;
      
      const { error } = await supabase
        .from('contact_sequences')
        .update(dbUpdates)
        .eq('id', id);
        
      if (error) {
        console.error('Error updating contact sequence:', error);
        return { success: false, error: error.message };
      }
      
      setContactSequences(prev => prev.map(cs => 
        cs.id === id ? { ...cs, ...updates } : cs
      ));
      return { success: true };
    } catch (error: any) {
      console.error('Error updating contact sequence:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  // User management methods (stub implementations)
  const addUser = async (user: Partial<User>) => {
    // Implementation would be connected to auth system
    return { success: false, error: 'Not implemented yet' };
  };
  
  const updateUser = async (id: string, updates: Partial<User>) => {
    // Implementation would be connected to auth system
    return { success: false, error: 'Not implemented yet' };
  };
  
  const deleteUser = async (id: string) => {
    // Implementation would be connected to auth system
    return { success: false, error: 'Not implemented yet' };
  };
  
  // Client management methods
  const addClient = async (client: Partial<Client>) => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: client.accountId,
          account_name: client.accountName,
          created_by: user.id,
        })
        .select();
      
      if (error) {
        console.error('Error adding client:', error);
        return { success: false, error: error.message };
      }
      
      if (data && data.length > 0) {
        const newClient: Client = {
          id: data[0].id,
          accountId: data[0].account_id,
          accountName: data[0].account_name,
          createdBy: data[0].created_by,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
          creator_account_name: user.accountName
        };
        
        setClients(prev => [...prev, newClient]);
        return { success: true };
      }
      
      return { success: false, error: 'Failed to add client' };
    } catch (error: any) {
      console.error('Error adding client:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      if (!isValidUUID(id)) {
        console.error('Invalid client ID:', id);
        return { success: false, error: 'Invalid client ID' };
      }
      
      const dbUpdates: any = {};
      if (updates.accountName !== undefined) dbUpdates.account_name = updates.accountName;
      if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
      
      const { error } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating client:', error);
        return { success: false, error: error.message };
      }
      
      setClients(prev => prev.map(client => 
        client.id === id ? { ...client, ...updates, updatedAt: new Date().toISOString() } : client
      ));
      return { success: true };
    } catch (error: any) {
      console.error('Error updating client:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  const deleteClient = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        console.error('Invalid client ID:', id);
        return { success: false, error: 'Invalid client ID' };
      }
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting client:', error);
        return { success: false, error: error.message };
      }
      
      setClients(prev => prev.filter(client => client.id !== id));
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting client:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };
  
  // Tag management
  const deleteTag = async (tag: string) => {
    try {
      // This would delete the tag from all contacts
      const { error } = await supabase
        .from('contact_tags')
        .delete()
        .eq('tag_name', tag);
      
      if (error) {
        console.error('Error deleting tag:', error);
        return { success: false, error: error.message };
      }
      
      // Update contacts in state
      setContacts(prev => prev.map(contact => ({
        ...contact,
        tags: contact.tags.filter(t => t !== tag)
      })));
      
      // Update tags list
      setTags(prev => prev.filter(t => t !== tag));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  const getContactSequences = (contactId: string): ContactSequence[] => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        clients,
        instances,
        currentInstance,
        contacts,
        sequences,
        contactSequences,
        tags,
        timeRestrictions,
        dailyStats,
        scheduledMessages,
        users,
        addTag,
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
        getContactSequences,
        deleteContact,
        updateContact,
        removeFromSequence,
        updateContactSequence,
        addUser,
        updateUser,
        deleteUser,
        addClient,
        updateClient,
        deleteClient,
        deleteTag,
        refreshData,
        isDataInitialized,
        isLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
