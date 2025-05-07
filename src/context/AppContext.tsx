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
  AdvancedCondition,
  ConditionGroup,
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

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
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

  // Função para carregar dados de condições avançadas
  const loadAdvancedConditions = async (sequenceId: string): Promise<{
    startCondition?: AdvancedCondition,
    stopCondition?: AdvancedCondition
  }> => {
    try {
      // Carregar grupos de condições de início
      const { data: startGroups, error: startError } = await supabase
        .from('sequence_condition_groups')
        .select('*')
        .eq('sequence_id', sequenceId)
        .eq('type', 'start')
        .order('group_index', { ascending: true });
      
      if (startError) throw startError;
      
      // Carregar grupos de condições de parada
      const { data: stopGroups, error: stopError } = await supabase
        .from('sequence_condition_groups')
        .select('*')
        .eq('sequence_id', sequenceId)
        .eq('type', 'stop')
        .order('group_index', { ascending: true });
      
      if (stopError) throw stopError;
      
      const result: { startCondition?: AdvancedCondition, stopCondition?: AdvancedCondition } = {};
      
      // Processar grupos de condição de início se existirem
      if (startGroups && startGroups.length > 0) {
        const startConditionGroups: ConditionGroup[] = [];
        
        for (const group of startGroups) {
          // Carregar tags para este grupo
          const { data: tags, error: tagsError } = await supabase
            .from('sequence_condition_tags')
            .select('tag_name')
            .eq('group_id', group.id);
          
          if (tagsError) throw tagsError;
          
          startConditionGroups.push({
            id: group.id,
            groupIndex: group.group_index,
            groupOperator: group.group_operator as 'AND' | 'OR',
            tags: tags.map((t: any) => t.tag_name)
          });
        }
        
        // Criar condição avançada de início
        if (startConditionGroups.length > 0) {
          result.startCondition = {
            conditionOperator: startGroups[0].condition_operator as 'AND' | 'OR',
            groups: startConditionGroups
          };
        }
      }
      
      // Processar grupos de condição de parada se existirem
      if (stopGroups && stopGroups.length > 0) {
        const stopConditionGroups: ConditionGroup[] = [];
        
        for (const group of stopGroups) {
          // Carregar tags para este grupo
          const { data: tags, error: tagsError } = await supabase
            .from('sequence_condition_tags')
            .select('tag_name')
            .eq('group_id', group.id);
          
          if (tagsError) throw tagsError;
          
          stopConditionGroups.push({
            id: group.id,
            groupIndex: group.group_index,
            groupOperator: group.group_operator as 'AND' | 'OR',
            tags: tags.map((t: any) => t.tag_name)
          });
        }
        
        // Criar condição avançada de parada
        if (stopConditionGroups.length > 0) {
          result.stopCondition = {
            conditionOperator: stopGroups[0].condition_operator as 'AND' | 'OR',
            groups: stopConditionGroups
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error("Erro ao carregar condições avançadas:", error);
      return {};
    }
  };
  
  // Função para salvar grupos de condições
  const saveConditionGroups = async (
    sequenceId: string,
    type: 'start' | 'stop',
    condition: AdvancedCondition
  ): Promise<boolean> => {
    try {
      // Primeiro, remover grupos existentes
      const { error: deleteGroupsError } = await supabase
        .from('sequence_condition_groups')
        .delete()
        .eq('sequence_id', sequenceId)
        .eq('type', type);
      
      if (deleteGroupsError) throw deleteGroupsError;
      
      // Agora, inserir novos grupos
      for (const group of condition.groups) {
        // Inserir grupo
        const { data: newGroup, error: insertError } = await supabase
          .from('sequence_condition_groups')
          .insert({
            sequence_id: sequenceId,
            type: type,
            group_index: group.groupIndex,
            group_operator: group.groupOperator,
            condition_operator: condition.conditionOperator
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        // Inserir tags para o grupo
        if (group.tags.length > 0) {
          const tagInserts = group.tags.map(tag => ({
            group_id: newGroup.id,
            tag_name: tag
          }));
          
          const { error: tagsError } = await supabase
            .from('sequence_condition_tags')
            .insert(tagInserts);
          
          if (tagsError) throw tagsError;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Erro ao salvar condição ${type}:`, error);
      return false;
    }
  };

  // Método updateSequence modificado
  const updateSequence = async (id: string, updates: Partial<Sequence>): Promise<{ success: boolean, error?: string }> => {
    try {
      console.log("Updating sequence with ID:", id);
      console.log("Update payload:", JSON.stringify(updates, null, 2));
      
      if (!id || !isValidUUID(id)) {
        console.error("Invalid sequence ID:", id);
        return { success: false, error: "ID de sequência inválido" };
      }
      
      // Preparar dados para atualização no banco
      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
      };
      
      // Mapear campos básicos
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.startCondition !== undefined) {
        dbUpdates.start_condition_type = updates.startCondition.type;
        dbUpdates.start_condition_tags = updates.startCondition.tags;
      }
      if (updates.stopCondition !== undefined) {
        dbUpdates.stop_condition_type = updates.stopCondition.type;
        dbUpdates.stop_condition_tags = updates.stopCondition.tags;
      }
      
      // Adicionar campos de condições avançadas
      if (updates.useAdvancedStartCondition !== undefined) {
        dbUpdates.use_advanced_start_condition = updates.useAdvancedStartCondition;
      }
      
      if (updates.useAdvancedStopCondition !== undefined) {
        dbUpdates.use_advanced_stop_condition = updates.useAdvancedStopCondition;
      }
      
      // Start by updating the main sequence record
      const { error: seqError } = await supabase
        .from('sequences')
        .update(dbUpdates)
        .eq('id', id);
      
      if (seqError) {
        console.error("Error updating sequence:", seqError);
        return { success: false, error: seqError.message };
      }
      
      // Salvar condições avançadas se necessário
      if (updates.useAdvancedStartCondition && updates.advancedStartCondition) {
        const startResult = await saveConditionGroups(id, 'start', updates.advancedStartCondition);
        if (!startResult) {
          return { success: false, error: "Erro ao salvar condições avançadas de início" };
        }
      }
      
      if (updates.useAdvancedStopCondition && updates.advancedStopCondition) {
        const stopResult = await saveConditionGroups(id, 'stop', updates.advancedStopCondition);
        if (!stopResult) {
          return { success: false, error: "Erro ao salvar condições avançadas de parada" };
        }
      }
      
      // Handle stages update if provided
      if (updates.stages) {
        console.log("Processing stages update for sequence:", id);
        console.log("Total stages to process:", updates.stages.length);
        
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
        const updatedStageIds = new Set(updates.stages.map(stage => stage.id));
        
        // Determine stages to delete (exist in DB but not in the update)
        existingStages?.forEach(existingStage => {
          if (!updatedStageIds.has(existingStage.id)) {
            stageIdsToDelete.push(existingStage.id);
          }
        });
        
        // Process each stage in the update
        updates.stages.forEach((stage, index) => {
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
      if (updates.timeRestrictions) {
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
        const localRestrictions = updates.timeRestrictions.filter(r => !r.isGlobal);
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
        const globalRestrictions = updates.timeRestrictions.filter(r => r.isGlobal);
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
        seq.id === id ? { ...seq, ...updates } : seq
      ));
      
      console.log("Sequence updated successfully");
      return { success: true };
    } catch (error) {
      console.error("Error in updateSequence:", error);
      return { success: false, error: error.message };
    }
  };

  // Modificação ao método refreshData para carregar condições avançadas
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
      
      // Buscar sequências e seus estágios (com condições avançadas)
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
      
      // Para cada sequência, carregar dados adicionais, incluindo condições avançadas
      const typedSequences: Sequence[] = [];
      
      for (const sequence of sequencesData) {
        // Buscar estágios e restrições como antes
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
        
        // Buscar restrições de tempo (global e local) como antes
        const { data: localRestrictions, error: localRestError } = await supabase
          .from('sequence_local_restrictions')
          .select('*')
          .eq('sequence_id', sequence.id);
        
        if (localRestError) {
          console.error("Erro ao carregar restrições locais:", localRestError);
          continue;
        }
        
        const localTimeRestrictions = (localRestrictions || []).map((lr: any) => ({
          id: lr.id,
          name: lr.name,
          active: lr.active,
          days: lr.days,
          startHour: lr.start_hour,
          startMinute: lr.start_minute,
          endHour: lr.end_hour,
          endMinute: lr.end_minute,
          isGlobal: false
        }));
        
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
            isGlobal: true
          }));
        
        // Combinar restrições globais e locais
        const allTimeRestrictions = [
          ...globalTimeRestrictions,
          ...localTimeRestrictions
        ];
        
        // Carregar condições avançadas
        const advancedConditions = await loadAdvancedConditions(sequence.id);
        
        // Determinar o tipo de sequência com base nos estágios
        let sequenceType: "message" | "pattern" | "typebot" = "message";
        if (stages.length > 0) {
          const lastStage = stages[stages.length - 1];
          if (lastStage.type === "typebot") {
            sequenceType = "typebot";
          } else if (lastStage.type === "pattern") {
            sequenceType = "pattern";
          }
        }
        
        // Criar objeto de sequência com suporte a condições avançadas
        typedSequences.push({
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          type: sequence.type || sequenceType,
          startCondition: {
            type: sequence.start_condition_type as "AND" | "OR",
            tags: sequence.start_condition_tags || []
          },
          stopCondition: {
            type: sequence.stop_condition_type as "AND" | "OR",
            tags: sequence.stop_condition_tags || []
          },
          useAdvancedStartCondition: sequence.use_advanced_start_condition || false,
          useAdvancedStopCondition: sequence.use_advanced_stop_condition || false,
          advancedStartCondition: advancedConditions.startCondition,
          advancedStopCondition: advancedConditions.stopCondition,
          status: sequence.status as "active" | "inactive",
          stages,
          timeRestrictions: allTimeRestrictions,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at
        });
      }
      
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
          currentStageIndex
