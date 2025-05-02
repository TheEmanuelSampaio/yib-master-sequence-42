import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, UserWithEmail } from "@/integrations/supabase/client";
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
  updateSequence: (id: string, sequence: Partial<Sequence>) => void;
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
  updateSequence: () => {},
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

  // Get contact sequences helper function
  const getContactSequences = (contactId: string): ContactSequence[] => {
    return contactSequences.filter(cs => cs.contactId === contactId);
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
            endHour: lr.end_hour, // Fixed: Changed from endHour to end_hour
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
        
        return {
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
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
      
      // Separar as restrições em globais e locais
      const globalRestrictions = sequenceData.timeRestrictions.filter(r => r.isGlobal);
      const localRestrictions = sequenceData.timeRestrictions.filter(r => !r.isGlobal);
      
      // First create the sequence
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
          created_by: user.id
        })
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      console.log("Sequence created:", seqData);
      
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
      
      // Fazer um refresh completo dos dados para garantir que as novas sequências apareçam
      await refreshData();
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
    }
  };

  const updateSequence = async (
    sequenceId: string,
    updatedData: Partial<Sequence>
  ) => {
    try {
      if (!isValidUUID(sequenceId)) {
        console.error(`ID de sequência inválido: ${sequenceId}`);
        toast.error("ID de sequência inválido");
        return;
      }

      setLoading(true);

      // Verificar se há contactos ativos usando esta sequência
      const { data: activeContacts, error: contactsError } = await supabase
        .from("contact_sequences")
        .select("id, current_stage_id")
        .eq("sequence_id", sequenceId)
        .in("status", ["active", "paused"]);
      
      if (contactsError) {
        throw new Error(`Falha ao verificar contatos ativos: ${contactsError.message}`);
      }
      
      // Se houver estágios para atualizar e contatos ativos, precisamos fazer uma migração cuidadosa
      if (updatedData.stages && activeContacts && activeContacts.length > 0) {
        // Buscar os estágios existentes
        const { data: existingStages, error: stagesError } = await supabase
          .from("sequence_stages")
          .select("*")
          .eq("sequence_id", sequenceId)
          .order("order_index", { ascending: true });
        
        if (stagesError) {
          throw new Error(`Falha ao buscar estágios existentes: ${stagesError.message}`);
        }
        
        // Criar um mapeamento de estágios antigos para novos com base em nome e posição
        const stageMapping = new Map();
        const stageIdsToUpdate = [];
        
        // Identificar quais estágios antigos estão em uso e precisam ser preservados/mapeados
        const usedStageIds = new Set(activeContacts
          .map(contact => contact.current_stage_id)
          .filter(id => id !== null));
        
        for (const oldStage of existingStages) {
          if (usedStageIds.has(oldStage.id)) {
            // Encontre o estágio correspondente nos novos estágios com base no nome e ordem
            const matchingStage = updatedData.stages.find(
              (s, idx) => s.name === oldStage.name && Math.abs(idx - oldStage.order_index) <= 1
            );
            
            if (matchingStage) {
              stageMapping.set(oldStage.id, matchingStage);
              stageIdsToUpdate.push(oldStage.id);
            }
          }
        }
        
        // Atualizar a sequência no banco de dados (exceto estágios)
        const { stages, ...sequenceData } = updatedData;
        const { error: updateError } = await supabase
          .from("sequences")
          .update({
            ...sequenceData,
            updated_at: new Date().toISOString()
          })
          .eq("id", sequenceId);
        
        if (updateError) {
          throw new Error(`Falha ao atualizar sequência: ${updateError.message}`);
        }
        
        // Tratar os estágios separadamente para evitar violação da restrição de chave estrangeira
        
        // 1. Criar novos estágios com IDs temporários
        const newStages = [];
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const { data: newStage, error: createStageError } = await supabase
            .from("sequence_stages")
            .insert({
              sequence_id: sequenceId,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: i
            })
            .select()
            .single();
            
          if (createStageError) {
            throw new Error(`Falha ao criar novo estágio: ${createStageError.message}`);
          }
          
          newStages.push(newStage);
        }
        
        // 2. Para cada contato ativo, atualizar para o novo estágio correspondente
        for (const contact of activeContacts) {
          if (!contact.current_stage_id) continue;
          
          const oldStageId = contact.current_stage_id;
          const mappedStage = stageMapping.get(oldStageId);
          
          if (mappedStage) {
            // Encontrar o novo ID de estágio correspondente
            const newStageIndex = stages.findIndex(s => 
              s.name === mappedStage.name && 
              s.type === mappedStage.type && 
              s.content === mappedStage.content
            );
            
            if (newStageIndex !== -1) {
              const newStageId = newStages[newStageIndex].id;
              
              // Atualizar o contato para usar o novo ID de estágio
              const { error: updateContactError } = await supabase
                .from("contact_sequences")
                .update({
                  current_stage_id: newStageId,
                  current_stage_index: newStageIndex
                })
                .eq("id", contact.id);
                
              if (updateContactError) {
                console.error(`Falha ao atualizar estágio do contato: ${updateContactError.message}`);
              }
              
              // Atualizar os registros de progresso
              const { error: updateProgressError } = await supabase
                .from("stage_progress")
                .update({
                  stage_id: newStageId
                })
                .eq("contact_sequence_id", contact.id)
                .eq("stage_id", oldStageId);
                
              if (updateProgressError) {
                console.error(`Falha ao atualizar progresso do estágio: ${updateProgressError.message}`);
              }
              
              // Atualizar mensagens agendadas
              const { error: updateScheduledError } = await supabase
                .from("scheduled_messages")
                .update({
                  stage_id: newStageId
                })
                .eq("contact_id", contact.id)
                .eq("sequence_id", sequenceId)
                .eq("stage_id", oldStageId)
                .in("status", ["pending", "processing"]);
                
              if (updateScheduledError) {
                console.error(`Falha ao atualizar mensagens agendadas: ${updateScheduledError.message}`);
              }
            }
          }
        }
        
        // 3. Remover os estágios antigos quando for seguro
        setTimeout(async () => {
          try {
            // Excluir estágios antigos que não são mais necessários
            const { error: deleteStagesError } = await supabase
              .from("sequence_stages")
              .delete()
              .eq("sequence_id", sequenceId)
              .not("id", "in", newStages.map(s => s.id));
            
            if (deleteStagesError) {
              console.error(`Erro ao excluir estágios antigos: ${deleteStagesError.message}`);
            }
          } catch (error) {
            console.error("Erro ao limpar estágios antigos:", error);
          }
        }, 1000); // Pequeno atraso para garantir que as atualizações acima foram concluídas
        
        // Atualizar o estado local
        setSequences(prevSequences => 
          prevSequences.map(seq => 
            seq.id === sequenceId 
              ? { 
                  ...seq, 
                  ...sequenceData, 
                  stages: stages.map((stage, index) => ({ 
                    ...stage, 
                    id: newStages[index]?.id || stage.id 
                  })),
                  updatedAt: new Date().toISOString()
                } 
              : seq
          )
        );
        
        return;
      }

      // Caminho simples: sem estágios ou sem contatos ativos
      const { stages, timeRestrictions, ...restData } = updatedData;

      // Atualizar dados básicos da sequência
      const { error: updateError } = await supabase
        .from("sequences")
        .update({
          ...restData,
          updated_at: new Date().toISOString()
        })
        .eq("id", sequenceId);

      if (updateError) throw updateError;

      // Se houver estágios para atualizar, primeiro excluir os antigos e depois inserir os novos
      if (stages) {
        // Excluir estágios antigos
        const { error: deleteError } = await supabase
          .from("sequence_stages")
          .delete()
          .eq("sequence_id", sequenceId);

        if (deleteError) throw deleteError;

        // Inserir novos estágios
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const { error: stageError } = await supabase
            .from("sequence_stages")
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

      // Se houver restrições de tempo para atualizar
      if (timeRestrictions) {
        // Primeiro, excluir todas as associações existentes com restrições globais
        const { error: deleteGlobalError } = await supabase
          .from("sequence_time_restrictions")
          .delete()
          .eq("sequence_id", sequenceId);

        if (deleteGlobalError) throw deleteGlobalError;

        // Excluir todas as restrições locais
        const { error: deleteLocalError } = await supabase
          .from("sequence_local_restrictions")
          .delete()
          .eq("sequence_id", sequenceId);

        if (deleteLocalError) throw deleteLocalError;

        // Inserir novas restrições
        for (const restriction of timeRestrictions) {
          if (restriction.isGlobal) {
            // Para restrições globais, criar uma associação
            const { error: restrictionError } = await supabase
              .from("sequence_time_restrictions")
              .insert({
                sequence_id: sequenceId,
                time_restriction_id: restriction.id
              });

            if (restrictionError) throw restrictionError;
          } else {
            // Para restrições locais, criar uma nova restrição local
            const { error: localRestrictionError } = await supabase
              .from("sequence_local_restrictions")
              .insert({
                sequence_id: sequenceId,
                name: restriction.name,
                active: restriction.active,
                days: restriction.days,
                start_hour: restriction.startHour,
                start_minute: restriction.startMinute,
                end_hour: restriction.endHour,
                end_minute: restriction.endMinute,
                created_by: user?.id
              });

            if (localRestrictionError) throw localRestrictionError;
          }
        }
      }

      // Atualizar o estado local
      setSequences(prevSequences => {
        return prevSequences.map(seq => {
          if (seq.id === sequenceId) {
            return {
              ...seq,
              ...restData,
              // Se temos novos estágios, atualizar o estado
              ...(stages ? { stages } : {}),
              // Se temos novas restrições de tempo, atualizar o estado
              ...(timeRestrictions ? { timeRestrictions } : {}),
              updatedAt: new Date().toISOString()
            };
          }
          return seq;
        });
      });

      console.log(`Sequência ${sequenceId} atualizada com sucesso`);
    } catch (error) {
      console.error("Erro ao atualizar sequência:", error);
      toast.error(`Erro ao atualizar sequência: ${error.message}`);
    } finally {
      setLoading(false);
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
          created_by: user.id,
          creator_account_name: user.accountName || "Usuário" // Adicionar nome da conta do criador
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
      toast.success(`Cliente "${data.account_name}" adicionado com sucesso`);
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
