
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { 
  Sequence, 
  SequenceStage, 
  Contact, 
  ContactSequence,
  TimeRestriction,
  DailyStats,
  StageProgress,
  Tag,
  Instance,
  Profile,
  AppContextType,
  ScheduledMessage
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext<AppContextType>({
  currentInstance: null,
  instances: [],
  sequences: [],
  contacts: [],
  contactSequences: [],
  timeRestrictions: [],
  scheduledMessages: [],
  tags: [],
  stats: [],
  isDataInitialized: false,
  setCurrentInstance: () => {},
  refreshData: async () => ({ success: false }),
  addInstance: async () => ({ success: false }),
  updateInstance: async () => ({ success: false }),
  deleteInstance: async () => ({ success: false }),
  addSequence: async () => ({ success: false }),
  updateSequence: async () => ({ success: false }),
  deleteSequence: async () => ({ success: false }),
  addContact: async () => ({ success: false }),
  updateContact: async () => ({ success: false }),
  deleteContact: async () => ({ success: false }),
  addTag: async () => ({ success: false }),
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isDataInitialized, setIsDataInitialized] = useState<boolean>(false);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<DailyStats[]>([]);

  // Fetch all data when the component mounts
  useEffect(() => {
    refreshData();
  }, []);

  // Fetch data for the current instance when it changes
  useEffect(() => {
    if (currentInstance) {
      fetchSequencesForInstance(currentInstance.id);
      fetchContactsForInstance(currentInstance.id);
      fetchStatsForInstance(currentInstance.id);
    }
  }, [currentInstance]);

  // Set the first instance as the current one if not set
  useEffect(() => {
    if (instances.length > 0 && !currentInstance) {
      setCurrentInstance(instances[0]);
    }
  }, [instances, currentInstance]);

  const refreshData = async () => {
    try {
      // Reset states
      setIsDataInitialized(false);

      // Fetch all instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*')
        .order('name');

      if (instancesError) throw instancesError;
      
      const mappedInstances = instancesData.map(instance => ({
        id: instance.id,
        name: instance.name,
        apiKey: instance.api_key,
        evolutionApiUrl: instance.evolution_api_url,
        clientId: instance.client_id,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at,
        active: instance.active
      }));

      setInstances(mappedInstances);
      
      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (tagsError) throw tagsError;
      
      const mappedTags = tagsData.map(tag => ({
        id: tag.id,
        name: tag.name,
        createdBy: tag.created_by,
        createdAt: tag.created_at
      }));

      setTags(mappedTags);

      // Fetch time restrictions
      const { data: timeRestrictionsData, error: timeRestrictionsError } = await supabase
        .from('time_restrictions')
        .select('*')
        .order('name');

      if (timeRestrictionsError) throw timeRestrictionsError;
      
      const mappedTimeRestrictions = timeRestrictionsData.map(restriction => ({
        id: restriction.id,
        name: restriction.name,
        active: restriction.active,
        days: restriction.days,
        startHour: restriction.start_hour,
        startMinute: restriction.start_minute,
        endHour: restriction.end_hour,
        endMinute: restriction.end_minute,
        createdBy: restriction.created_by,
        createdAt: restriction.created_at
      }));

      setTimeRestrictions(mappedTimeRestrictions);

      // If current instance is set, fetch data for it
      if (currentInstance) {
        await Promise.all([
          fetchSequencesForInstance(currentInstance.id),
          fetchContactsForInstance(currentInstance.id),
          fetchStatsForInstance(currentInstance.id)
        ]);
      } else if (mappedInstances.length > 0) {
        // If no current instance is set but we have instances, set the first one
        setCurrentInstance(mappedInstances[0]);
        await Promise.all([
          fetchSequencesForInstance(mappedInstances[0].id),
          fetchContactsForInstance(mappedInstances[0].id),
          fetchStatsForInstance(mappedInstances[0].id)
        ]);
      }
      
      setIsDataInitialized(true);
      return { success: true };
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Erro ao carregar dados");
      return { success: false, error };
    }
  };

  const fetchSequencesForInstance = async (instanceId: string) => {
    try {
      // Fetch sequences for the instance
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select(`
          *,
          sequence_stages(*)
        `)
        .eq('instance_id', instanceId)
        .order('name');

      if (sequencesError) throw sequencesError;

      // Map the data to our frontend model
      const mappedSequences = sequencesData.map((sequence) => {
        // Process start condition
        const startCondition = {
          type: sequence.start_condition_type,
          tags: sequence.start_condition_tags || []
        };
        
        // Process stop condition
        const stopCondition = {
          type: sequence.stop_condition_type,
          tags: sequence.stop_condition_tags || []
        };
        
        // Process stages
        const stages = sequence.sequence_stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          content: stage.content,
          type: stage.type,
          typebotStage: stage.typebot_stage,
          delay: stage.delay,
          delayUnit: stage.delay_unit,
          orderIndex: stage.order_index,
          sequenceId: stage.sequence_id,
          createdAt: stage.created_at,
        }));
        
        // Sort stages by order_index
        stages.sort((a, b) => a.orderIndex - b.orderIndex);
        
        return {
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          startCondition,
          stopCondition,
          stages,
          status: sequence.status,
          createdBy: sequence.created_by,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at,
          timeRestrictions: [] // Will be populated later if needed
        };
      });

      setSequences(mappedSequences);
      
      // Fetch contact sequences for the instance
      await fetchContactSequencesForInstance(instanceId);
      
      return mappedSequences;
    } catch (error) {
      console.error("Error fetching sequences:", error);
      toast.error("Erro ao carregar sequências");
      return [];
    }
  };

  const fetchContactsForInstance = async (instanceId: string) => {
    try {
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', instanceId);

      if (contactsError) throw contactsError;
      
      const contactsWithTags = await Promise.all(
        contactsData.map(async (contact) => {
          const { data: tagData, error: tagError } = await supabase
            .from('contact_tags')
            .select('tag_name')
            .eq('contact_id', contact.id);
          
          if (tagError) throw tagError;
          
          const tags = tagData.map(t => t.tag_name);
          
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
            tags: tags
          };
        })
      );

      setContacts(contactsWithTags);
      return contactsWithTags;
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Erro ao carregar contatos");
      return [];
    }
  };

  const fetchContactSequencesForInstance = async (instanceId: string) => {
    try {
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .select('id')
        .eq('instance_id', instanceId);
        
      if (seqError) throw seqError;
      const sequenceIds = seqData.map(s => s.id);
      
      if (sequenceIds.length === 0) {
        setContactSequences([]);
        return [];
      }
      
      const { data: contactSeqData, error: contactSeqError } = await supabase
        .from('contact_sequences')
        .select(`
          *,
          stage_progress(*)
        `)
        .in('sequence_id', sequenceIds);
        
      if (contactSeqError) throw contactSeqError;
      
      const mappedContactSequences = contactSeqData.map(cs => ({
        id: cs.id,
        contactId: cs.contact_id,
        sequenceId: cs.sequence_id,
        currentStageIndex: cs.current_stage_index,
        currentStageId: cs.current_stage_id,
        startedAt: cs.started_at,
        lastMessageAt: cs.last_message_at,
        completedAt: cs.completed_at,
        removedAt: cs.removed_at,
        status: cs.status,
        stageProgress: cs.stage_progress.map(sp => ({
          id: sp.id,
          contactSequenceId: sp.contact_sequence_id,
          stageId: sp.stage_id,
          status: sp.status,
          completedAt: sp.completed_at
        }))
      }));
      
      setContactSequences(mappedContactSequences);
      return mappedContactSequences;
    } catch (error) {
      console.error("Error fetching contact sequences:", error);
      toast.error("Erro ao carregar sequências de contatos");
      return [];
    }
  };

  const fetchStatsForInstance = async (instanceId: string) => {
    try {
      // Get stats for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const { data: statsData, error: statsError } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('instance_id', instanceId)
        .gte('date', dateStr)
        .order('date');
        
      if (statsError) throw statsError;
      
      const mappedStats = statsData.map(stat => ({
        id: stat.id,
        date: stat.date,
        instanceId: stat.instance_id,
        messagesSent: stat.messages_sent,
        messagesScheduled: stat.messages_scheduled,
        messagesFailed: stat.messages_failed,
        newContacts: stat.new_contacts,
        completedSequences: stat.completed_sequences
      }));
      
      setStats(mappedStats);
      return mappedStats;
    } catch (error) {
      console.error("Error fetching stats:", error);
      return [];
    }
  };

  const addInstance = async (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .insert({
          name: instance.name,
          api_key: instance.apiKey,
          evolution_api_url: instance.evolutionApiUrl,
          client_id: instance.clientId,
          created_by: instance.createdBy,
          active: instance.active
        })
        .select();
        
      if (error) throw error;

      // Refetch instances to update the list
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*')
        .order('name');

      if (instancesError) throw instancesError;
      
      const mappedInstances = instancesData.map(instance => ({
        id: instance.id,
        name: instance.name,
        apiKey: instance.api_key,
        evolutionApiUrl: instance.evolution_api_url,
        clientId: instance.client_id,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at,
        active: instance.active
      }));

      setInstances(mappedInstances);

      if (data && data.length > 0) {
        const newInstance = {
          id: data[0].id,
          name: data[0].name,
          apiKey: data[0].api_key,
          evolutionApiUrl: data[0].evolution_api_url,
          clientId: data[0].client_id,
          createdBy: data[0].created_by,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
          active: data[0].active
        };

        // Set as current instance if it's the first one
        if (!currentInstance) {
          setCurrentInstance(newInstance);
        }

        return { success: true };
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error adding instance:", error);
      return { success: false, error };
    }
  };

  const updateInstance = async (id: string, instance: Partial<Instance>) => {
    try {
      const updateData: any = {};
      if (instance.name !== undefined) updateData.name = instance.name;
      if (instance.apiKey !== undefined) updateData.api_key = instance.apiKey;
      if (instance.evolutionApiUrl !== undefined) updateData.evolution_api_url = instance.evolutionApiUrl;
      if (instance.active !== undefined) updateData.active = instance.active;

      const { error } = await supabase
        .from('instances')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;

      // Update the instances list
      setInstances(instances.map(i => 
        i.id === id ? { ...i, ...instance } : i
      ));

      // Update current instance if it's the one being updated
      if (currentInstance && currentInstance.id === id) {
        setCurrentInstance({ ...currentInstance, ...instance });
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error updating instance:", error);
      return { success: false, error };
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);
        
      if (error) throw error;

      // Remove from instances list
      const updatedInstances = instances.filter(i => i.id !== id);
      setInstances(updatedInstances);

      // If deleted instance was current, set another one as current
      if (currentInstance && currentInstance.id === id) {
        if (updatedInstances.length > 0) {
          setCurrentInstance(updatedInstances[0]);
        } else {
          setCurrentInstance(null);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting instance:", error);
      return { success: false, error };
    }
  };

  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!currentInstance) throw new Error("Nenhuma instância selecionada");

      // 1. First create sequence record
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert({
          name: sequence.name,
          instance_id: sequence.instanceId,
          start_condition_type: sequence.startCondition.type,
          start_condition_tags: sequence.startCondition.tags,
          stop_condition_type: sequence.stopCondition.type,
          stop_condition_tags: sequence.stopCondition.tags,
          status: sequence.status,
          created_by: sequence.createdBy
        })
        .select();
        
      if (seqError) throw seqError;
      if (!seqData || seqData.length === 0) throw new Error("Falha ao criar sequência");

      const sequenceId = seqData[0].id;
      
      // 2. Create stages for the sequence
      if (sequence.stages && sequence.stages.length > 0) {
        const stagesToInsert = sequence.stages.map((stage, index) => ({
          name: stage.name,
          content: stage.content,
          type: stage.type,
          typebot_stage: stage.typebotStage,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: index,
          sequence_id: sequenceId
        }));

        const { error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stagesToInsert);
          
        if (stagesError) throw stagesError;
      }

      // 3. Add time restrictions if any
      if (sequence.timeRestrictions && sequence.timeRestrictions.length > 0) {
        const restrictionLinks = sequence.timeRestrictions.map(tr => ({
          sequence_id: sequenceId,
          time_restriction_id: tr.id
        }));

        const { error: restrictionError } = await supabase
          .from('sequence_time_restrictions')
          .insert(restrictionLinks);
          
        if (restrictionError) throw restrictionError;
      }

      // Fetch the updated sequence with all its relations
      await fetchSequencesForInstance(currentInstance.id);
      
      return { success: true };
    } catch (error) {
      console.error("Error adding sequence:", error);
      return { success: false, error };
    }
  };

  const updateSequence = async (id: string, data: Partial<Sequence>) => {
    try {
      // Update base sequence information if provided
      const sequenceUpdateData: any = {};
      
      if (data.name !== undefined) sequenceUpdateData.name = data.name;
      if (data.status !== undefined) sequenceUpdateData.status = data.status;
      
      if (data.startCondition !== undefined) {
        sequenceUpdateData.start_condition_type = data.startCondition.type;
        sequenceUpdateData.start_condition_tags = data.startCondition.tags;
      }
      
      if (data.stopCondition !== undefined) {
        sequenceUpdateData.stop_condition_type = data.stopCondition.type;
        sequenceUpdateData.stop_condition_tags = data.stopCondition.tags;
      }
      
      // Update sequence base data if there's something to update
      if (Object.keys(sequenceUpdateData).length > 0) {
        const { error: updateError } = await supabase
          .from('sequences')
          .update(sequenceUpdateData)
          .eq('id', id);
          
        if (updateError) throw updateError;
      }

      // Update stages if provided
      if (data.stages !== undefined) {
        // Get existing stages to compare
        const { data: existingStagesData, error: existingStagesError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', id)
          .order('order_index');
          
        if (existingStagesError) throw existingStagesError;

        const existingStages = existingStagesData || [];
        const newStages = data.stages || [];

        // FIX: Primeiro, recuperamos qualquer contato_sequences que esteja usando os estágios desta sequência
        const { data: contactSeqData, error: contactSeqError } = await supabase
          .from('contact_sequences')
          .select('*')
          .eq('sequence_id', id);

        if (contactSeqError) throw contactSeqError;

        // Se existem contatos usando esta sequência, não podemos simplesmente excluir os estágios
        if (contactSeqData && contactSeqData.length > 0) {
          // Mapa de ID antigo para novo ID para atualizar referências
          const stageIdMap = new Map();

          // 1. Criar novos estágios para preservar o histórico
          for (let i = 0; i < newStages.length; i++) {
            const stage = newStages[i];
            
            // Se o estágio já existe e tem um ID
            if (stage.id) {
              // Para estágios existentes, apenas atualizamos os dados
              const { error: updateStageError } = await supabase
                .from('sequence_stages')
                .update({
                  name: stage.name,
                  content: stage.content,
                  type: stage.type,
                  typebot_stage: stage.typebotStage,
                  delay: stage.delay,
                  delay_unit: stage.delayUnit,
                  order_index: i
                })
                .eq('id', stage.id);
                
              if (updateStageError) throw updateStageError;
            } else {
              // Para novos estágios, inserimos
              const { data: newStageData, error: newStageError } = await supabase
                .from('sequence_stages')
                .insert({
                  name: stage.name,
                  content: stage.content,
                  type: stage.type,
                  typebot_stage: stage.typebotStage,
                  delay: stage.delay,
                  delay_unit: stage.delayUnit,
                  order_index: i,
                  sequence_id: id
                })
                .select();
                
              if (newStageError) throw newStageError;
              
              if (newStageData && newStageData.length > 0) {
                // Se for um novo estágio, não precisamos mapear
              }
            }
          }
          
          // 2. Removemos os estágios que não existem mais na lista nova,
          // apenas se eles não estiverem sendo usados por nenhum contato
          const newStageIds = newStages
            .filter(s => s.id) // Filtra apenas estágios existentes com ID
            .map(s => s.id);
            
          const stagesToDelete = existingStages
            .filter(s => !newStageIds.includes(s.id))
            .map(s => s.id);
            
          if (stagesToDelete.length > 0) {
            // Verificar quais estágios estão sendo usados
            const { data: usedStages, error: usedStagesError } = await supabase
              .from('contact_sequences')
              .select('current_stage_id')
              .in('current_stage_id', stagesToDelete);
              
            if (usedStagesError) throw usedStagesError;
            
            const usedStageIds = usedStages ? usedStages.map(s => s.current_stage_id) : [];
            
            // Remover apenas estágios não usados
            const safeToDeleteStageIds = stagesToDelete.filter(id => !usedStageIds.includes(id));
            
            if (safeToDeleteStageIds.length > 0) {
              const { error: deleteStagesError } = await supabase
                .from('sequence_stages')
                .delete()
                .in('id', safeToDeleteStageIds);
                
              if (deleteStagesError) throw deleteStagesError;
            }
            
            // Desativar (não excluir) estágios que estão em uso
            if (usedStageIds.length > 0) {
              // Aqui podemos marcar esses estágios como obsoletos ou implementar outra lógica...
              // Por enquanto, simplesmente não vamos apagá-los
            }
          }
        } else {
          // Se não há contatos usando esta sequência, podemos atualizar normalmente
          
          // 1. Delete all existing stages
          const { error: deleteError } = await supabase
            .from('sequence_stages')
            .delete()
            .eq('sequence_id', id);
            
          if (deleteError) throw deleteError;
          
          // 2. Insert all new stages
          if (newStages.length > 0) {
            const stagesToInsert = newStages.map((stage, index) => ({
              name: stage.name,
              content: stage.content,
              type: stage.type,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: index,
              sequence_id: id
            }));

            const { error: insertError } = await supabase
              .from('sequence_stages')
              .insert(stagesToInsert);
              
            if (insertError) throw insertError;
          }
        }
      }
      
      // Update time restrictions if provided
      if (data.timeRestrictions !== undefined) {
        // Delete existing restrictions
        const { error: deleteRestError } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
          
        if (deleteRestError) throw deleteRestError;
        
        // Add new ones if any
        if (data.timeRestrictions.length > 0) {
          const restrictionLinks = data.timeRestrictions.map(tr => ({
            sequence_id: id,
            time_restriction_id: tr.id
          }));

          const { error: addRestError } = await supabase
            .from('sequence_time_restrictions')
            .insert(restrictionLinks);
            
          if (addRestError) throw addRestError;
        }
      }

      // Refresh sequences for the current instance
      if (currentInstance) {
        await fetchSequencesForInstance(currentInstance.id);
      }
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar sequência:", error);
      toast.error(`Erro ao atualizar sequéncia: ${error.message}`);
      return { success: false, error };
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      // Delete all associated stages first (needed due to foreign key constraints)
      const { error: stageError } = await supabase
        .from('sequence_stages')
        .delete()
        .eq('sequence_id', id);
        
      if (stageError) throw stageError;
      
      // Delete the sequence
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
        
      if (error) throw error;

      // Update the UI
      setSequences(sequences.filter(s => s.id !== id));
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting sequence:", error);
      return { success: false, error };
    }
  };

  const addContact = async (contact: Omit<Contact, "id">) => {
    try {
      if (!currentInstance) throw new Error("Nenhuma instância selecionada");
      
      // Create the contact
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: contact.name,
          phone_number: contact.phoneNumber,
          client_id: currentInstance.id,
          inbox_id: contact.inboxId || 0,
          conversation_id: contact.conversationId || 0,
          display_id: contact.displayId || 0
        })
        .select();
        
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Failed to create contact");

      const contactId = data[0].id;
      
      // Add tags if any
      if (contact.tags && contact.tags.length > 0) {
        const tagInserts = contact.tags.map(tag => ({
          contact_id: contactId,
          tag_name: tag
        }));

        const { error: tagError } = await supabase
          .from('contact_tags')
          .insert(tagInserts);
          
        if (tagError) throw tagError;
      }

      // Refresh contacts
      await fetchContactsForInstance(currentInstance.id);
      
      return { success: true };
    } catch (error) {
      console.error("Error adding contact:", error);
      return { success: false, error };
    }
  };

  const updateContact = async (id: string, data: Partial<Contact>) => {
    try {
      const contactUpdateData: any = {};
      
      if (data.name !== undefined) contactUpdateData.name = data.name;
      if (data.phoneNumber !== undefined) contactUpdateData.phone_number = data.phoneNumber;
      
      // Update contact base data if there's something to update
      if (Object.keys(contactUpdateData).length > 0) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update(contactUpdateData)
          .eq('id', id);
          
        if (updateError) throw updateError;
      }

      // Update tags if provided
      if (data.tags !== undefined) {
        // First delete existing tags
        const { error: deleteTagsError } = await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', id);
          
        if (deleteTagsError) throw deleteTagsError;
        
        // Then insert new tags
        if (data.tags.length > 0) {
          const tagInserts = data.tags.map(tag => ({
            contact_id: id,
            tag_name: tag
          }));

          const { error: insertTagsError } = await supabase
            .from('contact_tags')
            .insert(tagInserts);
            
          if (insertTagsError) throw insertTagsError;
        }
      }

      // Refresh contacts for the current instance
      if (currentInstance) {
        await fetchContactsForInstance(currentInstance.id);
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error updating contact:", error);
      return { success: false, error };
    }
  };

  const deleteContact = async (id: string) => {
    try {
      // Delete the contact
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;

      // Update the UI
      setContacts(contacts.filter(c => c.id !== id));
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting contact:", error);
      return { success: false, error };
    }
  };

  const addTag = async (name: string) => {
    try {
      const { error } = await supabase.rpc('insert_tag_if_not_exists_for_user', {
        p_name: name,
        p_created_by: supabase.auth.getSession().data.session.user.id
      });
      
      if (error) throw error;

      // Refresh tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (tagsError) throw tagsError;
      
      const mappedTags = tagsData.map(tag => ({
        id: tag.id,
        name: tag.name,
        createdBy: tag.created_by,
        createdAt: tag.created_at
      }));

      setTags(mappedTags);
      
      return { success: true };
    } catch (error) {
      console.error("Error adding tag:", error);
      return { success: false, error };
    }
  };
  
  const value = {
    currentInstance,
    instances,
    sequences,
    contacts,
    contactSequences,
    timeRestrictions,
    scheduledMessages,
    tags,
    stats,
    isDataInitialized,
    setCurrentInstance,
    refreshData,
    addInstance,
    updateInstance,
    deleteInstance,
    addSequence,
    updateSequence,
    deleteSequence,
    addContact,
    updateContact,
    deleteContact,
    addTag,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
