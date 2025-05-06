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
  ComplexTagCondition
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
  updateSequence: (id: string, update: Partial<Sequence>) => Promise<{ success: boolean; error?: string }>;
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
  type: string;
  start_condition_groups: { type: string; tags: string[] }[];
  stop_condition_groups: { type: string; tags: string[] }[];
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    if (!user) return;

    try {
      // Convert ComplexTagCondition to database format
      const startConditionGroups = sequence.startCondition.groups.map(group => ({
        type: group.type,
        tags: group.tags
      }));

      const stopConditionGroups = sequence.stopCondition.groups.map(group => ({
        type: group.type,
        tags: group.tags
      }));

      const { data, error } = await supabase
        .from('sequences')
        .insert({
          name: sequence.name,
          instance_id: sequence.instanceId,
          type: sequence.type,
          start_condition_groups: startConditionGroups,
          stop_condition_groups: stopConditionGroups,
          status: sequence.status,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Adicione etapas da sequência
      if (sequence.stages && sequence.stages.length > 0) {
        const stagesWithSequenceId = sequence.stages.map((stage, index) => ({
          sequence_id: data.id,
          name: stage.name,
          content: stage.content,
          typebot_stage: stage.typebotStage || null,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: index
        }));

        const { error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stagesWithSequenceId);

        if (stagesError) throw stagesError;
      }

      // Adicione restrições de tempo
      if (sequence.timeRestrictions && sequence.timeRestrictions.length > 0) {
        // Separar restrições globais e locais
        const globalRestrictions = sequence.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = sequence.timeRestrictions.filter(r => !r.isGlobal);

        // Vincular restrições globais à sequência
        if (globalRestrictions.length > 0) {
          const globalRestrictionsLinks = globalRestrictions.map(r => ({
            sequence_id: data.id,
            time_restriction_id: r.id
          }));

          const { error: globalRestError } = await supabase
            .from('sequence_time_restrictions')
            .insert(globalRestrictionsLinks);

          if (globalRestError) throw globalRestError;
        }

        // Criar restrições locais
        if (localRestrictions.length > 0) {
          const localRestrictionsData = localRestrictions.map(r => ({
            sequence_id: data.id,
            name: r.name,
            active: r.active,
            days: r.days,
            start_hour: r.startHour,
            start_minute: r.startMinute,
            end_hour: r.endHour,
            end_minute: r.endMinute,
            created_by: user.id
          }));

          const { error: localRestError } = await supabase
            .from('sequence_local_restrictions')
            .insert(localRestrictionsData);

          if (localRestError) throw localRestError;
        }
      }

      // Recarregar dados para obter a sequência criada
      await refreshData();
      
      toast({
        title: "Sucesso!",
        description: "Sequência criada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao criar sequência:", error);
      toast({
        title: "Erro ao criar sequência",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateSequence = async (id: string, update: Partial<Sequence>) => {
    if (!user) return { success: false, error: "Usuário não autenticado" };
    
    try {
      if (!id || !isValidUUID(id)) {
        return { success: false, error: "ID de sequência inválido" };
      }
      
      // Preparar objeto de atualização
      const updateData: any = {};
      
      if (update.name !== undefined) updateData.name = update.name;
      if (update.type !== undefined) updateData.type = update.type;
      if (update.status !== undefined) updateData.status = update.status;
      
      // Convert ComplexTagCondition to database format if provided
      if (update.startCondition) {
        const startConditionGroups = update.startCondition.groups.map(group => ({
          type: group.type,
          tags: group.tags
        }));
        updateData.start_condition_groups = startConditionGroups;
      }
      
      if (update.stopCondition) {
        const stopConditionGroups = update.stopCondition.groups.map(group => ({
          type: group.type,
          tags: group.tags
        }));
        updateData.stop_condition_groups = stopConditionGroups;
      }
      
      // Adicionar timestamp de atualização
      updateData.updated_at = new Date().toISOString();

      // Atualizar sequência
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('sequences')
          .update(updateData)
          .eq('id', id);
  
        if (updateError) throw updateError;
      }
      
      // Atualizar estágios se fornecidos
      if (update.stages) {
        // Obter IDs dos estágios existentes
        const { data: existingStages, error: existingStagesError } = await supabase
          .from('sequence_stages')
          .select('id')
          .eq('sequence_id', id);
        
        if (existingStagesError) throw existingStagesError;
        
        // Mapear IDs existentes para um conjunto para operações rápidas
        const existingIds = new Set(existingStages.map(s => s.id));
        
        // Separar estágios para cada operação
        const stagesToCreate = update.stages.filter(s => !s.id || !existingIds.has(s.id));
        const stagesToUpdate = update.stages.filter(s => s.id && existingIds.has(s.id));
        const idsToDelete = [...existingIds].filter(id => 
          !update.stages.some(s => s.id === id)
        );
        
        // Verificar se algum estágio a ser excluído está em uso
        if (idsToDelete.length > 0) {
          const stagesInUse = await checkStagesInUse(idsToDelete);
          if (stagesInUse.length > 0) {
            return { 
              success: false, 
              error: `Não é possível excluir estágios em uso: ${stagesInUse.join(', ')}` 
            };
          }
        }
        
        // Criar novos estágios
        if (stagesToCreate.length > 0) {
          const newStages = stagesToCreate.map((stage, idx) => ({
            sequence_id: id,
            name: stage.name,
            content: stage.content,
            typebot_stage: stage.typebotStage || null,
            delay: stage.delay,
            delay_unit: stage.delayUnit,
            order_index: idx
          }));
          
          const { error: createStagesError } = await supabase
            .from('sequence_stages')
            .insert(newStages);
            
          if (createStagesError) throw createStagesError;
        }
        
        // Atualizar estágios existentes
        for (const stage of stagesToUpdate) {
          const { error: updateStageError } = await supabase
            .from('sequence_stages')
            .update({
              name: stage.name,
              content: stage.content,
              typebot_stage: stage.typebotStage || null,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: update.stages.findIndex(s => s.id === stage.id)
            })
            .eq('id', stage.id);
            
          if (updateStageError) throw updateStageError;
        }
        
        // Excluir estágios removidos
        if (idsToDelete.length > 0) {
          const { error: deleteStagesError } = await supabase
            .from('sequence_stages')
            .delete()
            .in('id', idsToDelete);
            
          if (deleteStagesError) throw deleteStagesError;
        }
      }
      
      // Atualizar restrições de tempo se fornecidas
      if (update.timeRestrictions) {
        // Separar restrições globais e locais
        const globalRestrictions = update.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = update.timeRestrictions.filter(r => !r.isGlobal);
        
        // Remover todas as vinculações de restrições globais existentes
        const { error: deleteTimeRestError } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
          
        if (deleteTimeRestError) throw deleteTimeRestError;
        
        // Adicionar novas vinculações para restrições globais
        if (globalRestrictions.length > 0) {
          const globalRestLinks = globalRestrictions.map(r => ({
            sequence_id: id,
            time_restriction_id: r.id
          }));
          
          const { error: insertTimeRestError } = await supabase
            .from('sequence_time_restrictions')
            .insert(globalRestLinks);
            
          if (insertTimeRestError) throw insertTimeRestError;
        }
        
        // Atualizar restrições locais
        // Primeiro, obter todas as restrições locais existentes
        const { data: existingLocalRest, error: existingLocalRestError } = await supabase
          .from('sequence_local_restrictions')
          .select('id')
          .eq('sequence_id', id);
          
        if (existingLocalRestError) throw existingLocalRestError;
        
        // Mapear IDs existentes para um conjunto
        const existingLocalIds = new Set(existingLocalRest.map(r => r.id));
        
        // Separar restrições locais para cada operação
        const localRestToCreate = localRestrictions.filter(r => !r.id || !existingLocalIds.has(r.id));
        const localRestToUpdate = localRestrictions.filter(r => r.id && existingLocalIds.has(r.id));
        const localIdsToDelete = [...existingLocalIds].filter(id => 
          !localRestrictions.some(r => r.id === id)
        );
        
        // Criar novas restrições locais
        if (localRestToCreate.length > 0) {
          const newLocalRest = localRestToCreate.map(r => ({
            sequence_id: id,
            name: r.name,
            active: r.active,
            days: r.days,
            start_hour: r.startHour,
            start_minute: r.startMinute,
            end_hour: r.endHour,
            end_minute: r.endMinute,
            created_by: user.id
          }));
          
          const { error: createLocalRestError } = await supabase
            .from('sequence_local_restrictions')
            .insert(newLocalRest);
            
          if (createLocalRestError) throw createLocalRestError;
        }
        
        // Atualizar restrições locais existentes
        for (const rest of localRestToUpdate) {
          const { error: updateLocalRestError } = await supabase
            .from('sequence_local_restrictions')
            .update({
              name: rest.name,
              active: rest.active,
              days: rest.days,
              start_hour: rest.startHour,
              start_minute: rest.startMinute,
              end_hour: rest.endHour,
              end_minute: rest.endMinute
            })
            .eq('id', rest.id);
            
          if (updateLocalRestError) throw updateLocalRestError;
        }
        
        // Excluir restrições locais removidas
        if (localIdsToDelete.length > 0) {
          const { error: deleteLocalRestError } = await supabase
            .from('sequence_local_restrictions')
            .delete()
            .in('id', localIdsToDelete);
            
          if (deleteLocalRestError) throw deleteLocalRestError;
        }
      }
      
      // Recarregar dados para refletir as alterações
      await refreshData();
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar sequência:", error);
      return { 
        success: false, 
        error: `Erro ao atualizar sequência: ${error.message}` 
      };
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
        
        // Create ComplexTagCondition from database format
        const startCondition: ComplexTagCondition = {
          groups: sequence.start_condition_groups.map(group => ({
            type: group.type as "AND" | "OR",
            tags: group.tags
          }))
        };

        const stopCondition: ComplexTagCondition = {
          groups: sequence.stop_condition_groups.map(group => ({
            type: group.type as "AND" | "OR",
            tags: group.tags
          }))
        };
        
        // Ensure status is "active" or "inactive"
        const status = sequence.status === "active" ? "active" : "inactive";
        
        // Ensure type is valid
        const type = ["message", "pattern", "typebot"].includes(sequence.type) ? 
          sequence.type as "message" | "pattern" | "typebot" : 
          "message";
        
        return {
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          startCondition,
          stopCondition,
          status: status as "active" | "inactive",
          type,
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
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const addInstance = async (instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
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
      
      toast({
        title: "Sucesso",
        description: `Instância "${data.name}" criada com sucesso`,
      });
    } catch (error: any) {
      console.error("Error creating instance:", error);
      toast({
        title: "Erro ao criar instância",
        description: error.message,
        variant: "destructive",
      });
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
      
      toast({
        title: "Sucesso",
        description: "Instância atualizada com sucesso",
      });
      
      // Refresh instances to get updated client relationship
      refreshData();
    } catch (error: any) {
      console.error("Error updating instance:", error);
      toast({
        title: "Erro ao atualizar instância",
        description: error.message,
        variant: "destructive",
      });
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
      
      toast({
        title: "Sucesso",
        description: "Instância excluída com sucesso",
      });
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      toast({
        title: "Erro ao excluir instância",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Sucesso",
        description: "Sequência excluída com sucesso",
      });
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      toast({
        title: "Erro ao excluir sequência",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addTimeRestriction = async (restrictionData: Omit<TimeRestriction, "id">) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
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
      toast({
        title: "Sucesso",
        description: "Restrição de horário criada com sucesso",
      });
    } catch (error: any) {
      console.error("Error creating time restriction:", error);
      toast({
        title: "Erro ao criar restrição de horário",
        description: error.message,
        variant: "destructive",
      });
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
      
      toast({
        title: "Sucesso",
        description: "Restrição de horário atualizada com sucesso",
      });
    } catch (error: any) {
      console.error("Error updating time restriction:", error);
      toast({
        title: "Erro ao atualizar restrição de horário",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Sucesso",
        description: "Restrição de horário excluída com sucesso",
      });
    } catch (error: any) {
      console.error("Error deleting time restriction:", error);
      toast({
        title: "Erro ao excluir restrição de horário",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Sucesso",
        description: "Contato adicionado com sucesso",
      });
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast({
        title: "Erro ao adicionar contato",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addClient = async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
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
      toast({
        title: "Sucesso",
        description: `Cliente "${data.account_name}" adicionado com sucesso`,
      });
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message,
        variant: "destructive",
      });
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
      
      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso",
      });
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso",
      });
      
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
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
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
      
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso",
      });
      refreshData();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Erro ao adicionar usuário",
        description: error.message,
        variant: "destructive",
      });
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
      
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso",
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addTag = async (tagName: string) => {
    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
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
      toast({
        title: "Sucesso",
        description: "Tag adicionada com sucesso",
      });
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast({
        title: "Erro ao adicionar tag",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Sucesso",
        description: "Tag removida com sucesso",
      });
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast({
        title: "Erro ao remover tag",
        description: error.message,
        variant: "destructive",
      });
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
        
        // Create ComplexTagCondition from database format
        const startCondition: ComplexTagCondition = {
          groups: seq.start_condition_groups.map(group => ({
            type: group.type as "AND" | "OR",
            tags: group.tags
          }))
        };

        const stopCondition: ComplexTagCondition = {
          groups: seq.stop_condition_groups.map(group => ({
            type: group.type as "AND" | "OR",
            tags: group.tags
          }))
        };
        
        // Ensure type is valid
        const type = ["message", "pattern", "typebot"].includes(seq.type) ? 
          seq.type as "message" | "pattern" | "typebot" : 
          "message";
        
        // Adicionar sequência ao array
        sequencesWithStages.push({
          id: seq.id,
          name: seq.name,
          instanceId: seq.instance_id,
          status: seq.status as "active" | "inactive",
          type,
          startCondition,
          stopCondition,
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
