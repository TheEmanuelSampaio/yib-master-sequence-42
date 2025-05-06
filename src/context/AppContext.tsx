import React, { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sequence, 
  Instance, 
  TimeRestriction, 
  Contact,
  ContactSequence
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Definição do contexto
interface AppContextType {
  // Estados
  instances: Instance[];
  currentInstance: Instance | null;
  sequences: Sequence[];
  timeRestrictions: TimeRestriction[];
  contacts: Contact[];
  contactSequences: ContactSequence[];
  stats: any;
  tags: string[];
  isDataInitialized: boolean;
  
  // Funções de gerenciamento de instâncias
  setCurrentInstance: (instance: Instance | null) => void;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => Promise<Instance>;
  updateInstance: (id: string, instance: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  
  // Funções de gerenciamento de sequências
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<Sequence>;
  updateSequence: (id: string, sequence: Partial<Sequence>) => Promise<Sequence>;
  deleteSequence: (id: string) => Promise<void>;
  
  // Funções de gerenciamento de contatos e sequências de contatos
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateContact: (id: string, contact: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  addContactSequence: (contactSequence: Omit<ContactSequence, "id" | "createdAt">) => Promise<void>;
  updateContactSequence: (id: string, contactSequence: Partial<ContactSequence>) => Promise<void>;
  deleteContactSequence: (id: string) => Promise<void>;
  
  // Funções de gerenciamento de restrições de tempo
  addTimeRestriction: (timeRestriction: Omit<TimeRestriction, "id" | "createdAt">) => Promise<void>;
  updateTimeRestriction: (id: string, timeRestriction: Partial<TimeRestriction>) => Promise<void>;
  deleteTimeRestriction: (id: string) => Promise<void>;
  
  // Funções de gerenciamento de tags
  addTag: (tag: string) => void;
  
  // Funções de carregamento de dados
  loadInstances: () => Promise<void>;
  loadSequences: () => Promise<void>;
  loadTimeRestrictions: () => Promise<void>;
  loadContacts: () => Promise<void>;
  loadContactSequences: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadTags: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  // Estados
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [stats, setStats] = useState<any>({});
  const [tags, setTags] = useState<string[]>([]);
  const [isDataInitialized, setIsDataInitialized] = useState<boolean>(false);
  
  // Funções de gerenciamento de instâncias
  const addInstance = async (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const newInstance = {
        ...instance,
        created_by: user.id
      };
      
      const { data, error } = await supabase
        .from('instances')
        .insert([newInstance])
        .select('*')
        .single();
        
      if (error) throw error;
      
      const formattedInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        clientId: data.client_id,
        createdBy: data.created_by,
        active: data.active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setInstances(prev => [...prev, formattedInstance]);
      
      return formattedInstance;
    } catch (error) {
      console.error('Erro ao adicionar instância:', error);
      throw error;
    }
  };
  
  const updateInstance = async (id: string, instance: Partial<Instance>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('instances')
        .update({
          name: instance.name,
          evolution_api_url: instance.evolutionApiUrl,
          api_key: instance.apiKey,
          active: instance.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualiza o estado local
      setInstances(prev => prev.map(inst => 
        inst.id === id ? { ...inst, ...instance, updatedAt: new Date().toISOString() } : inst
      ));
      
      // Se a instância atual for atualizada, atualize-a também
      if (currentInstance?.id === id) {
        setCurrentInstance(prev => prev ? { ...prev, ...instance, updatedAt: new Date().toISOString() } : prev);
      }
    } catch (error) {
      console.error('Erro ao atualizar instância:', error);
      throw error;
    }
  };
  
  const deleteInstance = async (id: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Remove do estado local
      setInstances(prev => prev.filter(inst => inst.id !== id));
      
      // Se a instância atual for excluída, limpe-a
      if (currentInstance?.id === id) {
        setCurrentInstance(null);
      }
    } catch (error) {
      console.error('Erro ao excluir instância:', error);
      throw error;
    }
  };
  
  // Funções de gerenciamento de sequências
  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">): Promise<Sequence> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Primeiro, inserimos a sequência principal
      const { data: sequenceData, error: sequenceError } = await supabase
        .from('sequences')
        .insert([{
          name: sequence.name,
          status: sequence.status,
          start_condition_type: sequence.startCondition.type,
          start_condition_tags: sequence.startCondition.tags,
          stop_condition_type: sequence.stopCondition.type,
          stop_condition_tags: sequence.stopCondition.tags,
          instance_id: sequence.instanceId,
          created_by: user.id,
        }])
        .select('*')
        .single();
        
      if (sequenceError) {
        console.error("Erro ao criar sequência:", sequenceError);
        throw sequenceError;
      }
      
      const sequenceId = sequenceData.id;
      
      console.log(`Sequência criada com ID ${sequenceId}, processando ${sequence.stages.length} estágios`);
      
      // Em seguida, inserimos os estágios da sequência
      if (sequence.stages && sequence.stages.length > 0) {
        const stageEntries = sequence.stages.map((stage, index) => ({
          sequence_id: sequenceId,
          name: stage.name,
          type: stage.type,
          content: stage.content || '',
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          typebot_stage: stage.typebotStage || null,
          order_index: index
        }));
        
        console.log("Inserindo estágios:", stageEntries);
        
        const { data: stagesData, error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stageEntries)
          .select('*');
          
        if (stagesError) {
          console.error("Erro ao inserir estágios:", stagesError);
          throw stagesError;
        }
        
        console.log(`${stagesData?.length || 0} estágios inseridos com sucesso`);
      }
      
      // Por fim, inserimos as restrições de tempo
      if (sequence.timeRestrictions && sequence.timeRestrictions.length > 0) {
        // Separar restrições globais e locais
        const globalRestrictions = sequence.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = sequence.timeRestrictions.filter(r => !r.isGlobal);
        
        // Processar restrições globais (criar associação)
        if (globalRestrictions.length > 0) {
          const globalRestrictionsEntries = globalRestrictions.map(restriction => ({
            sequence_id: sequenceId,
            time_restriction_id: restriction.id
          }));
          
          const { error: globalError } = await supabase
            .from('sequence_time_restrictions')
            .insert(globalRestrictionsEntries);
            
          if (globalError) {
            console.error("Erro ao inserir restrições de tempo globais:", globalError);
            throw globalError;
          }
        }
        
        // Processar restrições locais (criar novas entradas)
        if (localRestrictions.length > 0) {
          const localRestrictionsEntries = localRestrictions.map(restriction => ({
            sequence_id: sequenceId,
            name: restriction.name,
            active: restriction.active,
            days: restriction.days,
            start_hour: restriction.startHour,
            start_minute: restriction.startMinute,
            end_hour: restriction.endHour,
            end_minute: restriction.endMinute,
            created_by: user.id
          }));
          
          const { error: localError } = await supabase
            .from('sequence_local_restrictions')
            .insert(localRestrictionsEntries);
            
          if (localError) {
            console.error("Erro ao inserir restrições de tempo locais:", localError);
            throw localError;
          }
        }
      }
      
      // Recarregar as sequências para obter os dados completos
      await loadSequences();
      
      // Retornar a sequência recém-criada
      const createdSequence = sequences.find(seq => seq.id === sequenceId);
      if (!createdSequence) {
        throw new Error("Sequência criada mas não encontrada no estado");
      }
      
      return createdSequence;
    } catch (error) {
      console.error('Erro ao adicionar sequência:', error);
      throw error;
    }
  };
  
  const updateSequence = async (id: string, sequenceUpdate: Partial<Sequence>): Promise<Sequence> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Primeiro, atualizamos a sequência principal
      const sequenceUpdateData: any = {};
      
      if (sequenceUpdate.name !== undefined) sequenceUpdateData.name = sequenceUpdate.name;
      if (sequenceUpdate.status !== undefined) sequenceUpdateData.status = sequenceUpdate.status;
      
      if (sequenceUpdate.startCondition) {
        sequenceUpdateData.start_condition_type = sequenceUpdate.startCondition.type;
        sequenceUpdateData.start_condition_tags = sequenceUpdate.startCondition.tags;
      }
      
      if (sequenceUpdate.stopCondition) {
        sequenceUpdateData.stop_condition_type = sequenceUpdate.stopCondition.type;
        sequenceUpdateData.stop_condition_tags = sequenceUpdate.stopCondition.tags;
      }
      
      // Se houver campos para atualizar na sequência principal
      if (Object.keys(sequenceUpdateData).length > 0) {
        sequenceUpdateData.updated_at = new Date().toISOString();
        
        const { error: sequenceError } = await supabase
          .from('sequences')
          .update(sequenceUpdateData)
          .eq('id', id);
          
        if (sequenceError) {
          console.error("Erro ao atualizar sequência:", sequenceError);
          throw sequenceError;
        }
      }
      
      // Atualizar estágios se fornecidos
      if (sequenceUpdate.stages) {
        console.log(`Atualizando estágios da sequência ${id}. Total de estágios: ${sequenceUpdate.stages.length}`);
        
        // Obter estágios existentes para esta sequência
        const { data: existingStages, error: stagesQueryError } = await supabase
          .from('sequence_stages')
          .select('id')
          .eq('sequence_id', id);
          
        if (stagesQueryError) {
          console.error("Erro ao buscar estágios existentes:", stagesQueryError);
          throw stagesQueryError;
        }
        
        // Mapear IDs dos estágios existentes e novos
        const existingStageIds = existingStages ? existingStages.map(s => s.id) : [];
        const updatedStageIds = sequenceUpdate.stages.map(s => s.id).filter(Boolean);
        
        console.log("IDs de estágios existentes:", existingStageIds);
        console.log("IDs de estágios novos/atualizados:", updatedStageIds);
        
        // Identificar estágios para excluir (existem no banco mas não no update)
        const stageIdsToDelete = existingStageIds.filter(id => !updatedStageIds.includes(id));
        
        if (stageIdsToDelete.length > 0) {
          console.log("Excluindo estágios:", stageIdsToDelete);
          
          const { error: deleteError } = await supabase
            .from('sequence_stages')
            .delete()
            .in('id', stageIdsToDelete);
            
          if (deleteError) {
            console.error("Erro ao excluir estágios:", deleteError);
            throw deleteError;
          }
        }
        
        // Processar cada estágio: atualizar existentes e inserir novos
        for (let i = 0; i < sequenceUpdate.stages.length; i++) {
          const stage = sequenceUpdate.stages[i];
          const isExistingStage = stage.id && existingStageIds.includes(stage.id);
          
          const stageData = {
            sequence_id: id,
            name: stage.name,
            type: stage.type,
            content: stage.content || '',
            delay: stage.delay,
            delay_unit: stage.delayUnit,
            typebot_stage: stage.typebotStage || null,
            order_index: i
          };
          
          if (isExistingStage) {
            console.log(`Atualizando estágio existente: ${stage.id}`);
            
            const { error: updateError } = await supabase
              .from('sequence_stages')
              .update(stageData)
              .eq('id', stage.id);
              
            if (updateError) {
              console.error(`Erro ao atualizar estágio ${stage.id}:`, updateError);
              throw updateError;
            }
          } else {
            console.log("Inserindo novo estágio:", stageData);
            
            const { error: insertError } = await supabase
              .from('sequence_stages')
              .insert([stageData]);
              
            if (insertError) {
              console.error("Erro ao inserir novo estágio:", insertError);
              throw insertError;
            }
          }
        }
      }
      
      // Atualizar restrições de tempo se fornecidas
      if (sequenceUpdate.timeRestrictions) {
        // Separar restrições globais e locais
        const globalRestrictions = sequenceUpdate.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = sequenceUpdate.timeRestrictions.filter(r => !r.isGlobal);
        
        // Processar restrições globais
        // Primeiro, remover todas as associações existentes
        const { error: deleteAssociationsError } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
          
        if (deleteAssociationsError) {
          console.error("Erro ao remover associações de restrições de tempo:", deleteAssociationsError);
          throw deleteAssociationsError;
        }
        
        // Depois, criar novas associações
        if (globalRestrictions.length > 0) {
          const globalRestrictionsEntries = globalRestrictions.map(restriction => ({
            sequence_id: id,
            time_restriction_id: restriction.id
          }));
          
          const { error: createAssociationsError } = await supabase
            .from('sequence_time_restrictions')
            .insert(globalRestrictionsEntries);
            
          if (createAssociationsError) {
            console.error("Erro ao criar associações de restrições de tempo:", createAssociationsError);
            throw createAssociationsError;
          }
        }
        
        // Processar restrições locais
        // Obter restrições locais existentes
        const { data: existingLocalRestrictions, error: localQueryError } = await supabase
          .from('sequence_local_restrictions')
          .select('id')
          .eq('sequence_id', id);
          
        if (localQueryError) {
          console.error("Erro ao buscar restrições de tempo locais:", localQueryError);
          throw localQueryError;
        }
        
        // Mapear IDs das restrições existentes e novas
        const existingLocalRestrictionIds = existingLocalRestrictions ? existingLocalRestrictions.map(r => r.id) : [];
        const updatedLocalRestrictionIds = localRestrictions.map(r => r.id).filter(Boolean);
        
        // Identificar restrições para excluir
        const restrictionIdsToDelete = existingLocalRestrictionIds.filter(id => !updatedLocalRestrictionIds.includes(id));
        
        if (restrictionIdsToDelete.length > 0) {
          const { error: deleteLocalError } = await supabase
            .from('sequence_local_restrictions')
            .delete()
            .in('id', restrictionIdsToDelete);
            
          if (deleteLocalError) {
            console.error("Erro ao excluir restrições locais:", deleteLocalError);
            throw deleteLocalError;
          }
        }
        
        // Processar cada restrição local: atualizar existentes e inserir novas
        for (const restriction of localRestrictions) {
          const isExistingRestriction = restriction.id && existingLocalRestrictionIds.includes(restriction.id);
          
          const restrictionData = {
            sequence_id: id,
            name: restriction.name,
            active: restriction.active,
            days: restriction.days,
            start_hour: restriction.startHour,
            start_minute: restriction.startMinute,
            end_hour: restriction.endHour,
            end_minute: restriction.endMinute
          };
          
          if (isExistingRestriction) {
            const { error: updateError } = await supabase
              .from('sequence_local_restrictions')
              .update(restrictionData)
              .eq('id', restriction.id);
              
            if (updateError) {
              console.error(`Erro ao atualizar restrição local ${restriction.id}:`, updateError);
              throw updateError;
            }
          } else {
            const { error: insertError } = await supabase
              .from('sequence_local_restrictions')
              .insert([{
                ...restrictionData,
                created_by: user.id
              }]);
              
            if (insertError) {
              console.error("Erro ao inserir nova restrição local:", insertError);
              throw insertError;
            }
          }
        }
      }
      
      // Recarregar as sequências para obter os dados atualizados
      console.log("Recarregando dados de sequências após atualização");
      await loadSequences();
      
      // Retornar a sequência atualizada
      const updatedSequence = sequences.find(seq => seq.id === id);
      if (!updatedSequence) {
        throw new Error("Sequência atualizada mas não encontrada no estado");
      }
      
      return updatedSequence;
    } catch (error) {
      console.error('Erro ao atualizar sequência:', error);
      throw error;
    }
  };
  
  const deleteSequence = async (id: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Excluir a sequência (as tabelas relacionadas serão excluídas automaticamente por causa das restrições de chave estrangeira)
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar o estado local
      setSequences(prev => prev.filter(seq => seq.id !== id));
    } catch (error) {
      console.error('Erro ao excluir sequência:', error);
      throw error;
    }
  };
  
  // Funções de gerenciamento de contatos
  const addContact = async (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('contacts')
        .insert([{
          name: contact.name,
          phone: contact.phone,
          tags: contact.tags || [],
          instance_id: contact.instanceId,
          created_by: user.id
        }]);
        
      if (error) throw error;
      
      // Recarregar contatos
      await loadContacts();
    } catch (error) {
      console.error('Erro ao adicionar contato:', error);
      throw error;
    }
  };
  
  const updateContact = async (id: string, contact: Partial<Contact>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const updateData: any = {};
      if (contact.name !== undefined) updateData.name = contact.name;
      if (contact.phone !== undefined) updateData.phone = contact.phone;
      if (contact.tags !== undefined) updateData.tags = contact.tags;
      if (contact.instanceId !== undefined) updateData.instance_id = contact.instanceId;
      
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar o estado local
      setContacts(prev => prev.map(c => 
        c.id === id ? { ...c, ...contact, updatedAt: new Date().toISOString() } : c
      ));
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
      throw error;
    }
  };
  
  const deleteContact = async (id: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar o estado local
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      throw error;
    }
  };
  
  // Funções de gerenciamento de sequências de contatos
  const addContactSequence = async (contactSequence: Omit<ContactSequence, "id" | "createdAt">) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('contact_sequences')
        .insert([{
          contact_id: contactSequence.contactId,
          sequence_id: contactSequence.sequenceId,
          current_stage_id: contactSequence.currentStageId,
          status: contactSequence.status,
          next_execution: contactSequence.nextExecution,
          created_by: user.id
        }]);
        
      if (error) throw error;
      
      // Recarregar sequências de contatos
      await loadContactSequences();
    } catch (error) {
      console.error('Erro ao adicionar sequência de contato:', error);
      throw error;
    }
  };
  
  const updateContactSequence = async (id: string, contactSequence: Partial<ContactSequence>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const updateData: any = {};
      if (contactSequence.contactId !== undefined) updateData.contact_id = contactSequence.contactId;
      if (contactSequence.sequenceId !== undefined) updateData.sequence_id = contactSequence.sequenceId;
      if (contactSequence.currentStageId !== undefined) updateData.current_stage_id = contactSequence.currentStageId;
      if (contactSequence.status !== undefined) updateData.status = contactSequence.status;
      if (contactSequence.nextExecution !== undefined) updateData.next_execution = contactSequence.nextExecution;
      
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('contact_sequences')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar o estado local
      setContactSequences(prev => prev.map(cs => 
        cs.id === id ? { ...cs, ...contactSequence, updatedAt: new Date().toISOString() } : cs
      ));
    } catch (error) {
      console.error('Erro ao atualizar sequência de contato:', error);
      throw error;
    }
  };
  
  const deleteContactSequence = async (id: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('contact_sequences')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar o estado local
      setContactSequences(prev => prev.filter(cs => cs.id !== id));
    } catch (error) {
      console.error('Erro ao excluir sequência de contato:', error);
      throw error;
    }
  };
  
  // Funções de gerenciamento de restrições de tempo
  const addTimeRestriction = async (timeRestriction: Omit<TimeRestriction, "id" | "createdAt">) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('time_restrictions')
        .insert([{
          name: timeRestriction.name,
          active: timeRestriction.active,
          days: timeRestriction.days,
          start_hour: timeRestriction.startHour,
          start_minute: timeRestriction.startMinute,
          end_hour: timeRestriction.endHour,
          end_minute: timeRestriction.endMinute,
          created_by: user.id
        }]);
        
      if (error) throw error;
      
      // Recarregar restrições de tempo
      await loadTimeRestrictions();
    } catch (error) {
      console.error('Erro ao adicionar restrição de tempo:', error);
      throw error;
    }
  };
  
  const updateTimeRestriction = async (id: string, timeRestriction: Partial<TimeRestriction>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const updateData: any = {};
      if (timeRestriction.name !== undefined) updateData.name = timeRestriction.name;
      if (timeRestriction.active !== undefined) updateData.active = timeRestriction.active;
      if (timeRestriction.days !== undefined) updateData.days = timeRestriction.days;
      if (timeRestriction.startHour !== undefined) updateData.start_hour = timeRestriction.startHour;
      if (timeRestriction.startMinute !== undefined) updateData.start_minute = timeRestriction.startMinute;
      if (timeRestriction.endHour !== undefined) updateData.end_hour = timeRestriction.endHour;
      if (timeRestriction.endMinute !== undefined) updateData.end_minute = timeRestriction.endMinute;
      
      const { error } = await supabase
        .from('time_restrictions')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar o estado local
      setTimeRestrictions(prev => prev.map(tr => 
        tr.id === id ? { ...tr, ...timeRestriction } : tr
      ));
    } catch (error) {
      console.error('Erro ao atualizar restrição de tempo:', error);
      throw error;
    }
  };
  
  const deleteTimeRestriction = async (id: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar o estado local
      setTimeRestrictions(prev => prev.filter(tr => tr.id !== id));
    } catch (error) {
      console.error('Erro ao excluir restrição de tempo:', error);
      throw error;
    }
  };
  
  // Função para adicionar tag
  const addTag = (tag: string) => {
    if (!tag || tags.includes(tag)) return;
    setTags(prev => [...prev, tag]);
  };
  
  // Funções de carregamento de dados
  const loadInstances = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('instances')
        .select('*');
        
      if (error) throw error;
      
      const formattedInstances: Instance[] = data.map(instance => ({
        id: instance.id,
        name: instance.name,
        evolutionApiUrl: instance.evolution_api_url,
        apiKey: instance.api_key,
        clientId: instance.client_id,
        createdBy: instance.created_by,
        active: instance.active,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at
      }));
      
      setInstances(formattedInstances);
      
      // Se não houver instância atual selecionada e houver instâncias disponíveis, selecione a primeira
      if (!currentInstance && formattedInstances.length > 0) {
        setCurrentInstance(formattedInstances[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      toast.error('Erro ao carregar instâncias. Por favor, tente novamente.');
    }
  };

  // Função para carregar sequências
  const loadSequences = async () => {
    try {
      if (!user) return;
      
      // Carregar sequências principais
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select('*');
        
      if (sequencesError) throw sequencesError;
      
      // Carregar estágios para todas as sequências
      const { data: stagesData, error: stagesError } = await supabase
        .from('sequence_stages')
        .select('*')
        .order('order_index', { ascending: true });
        
      if (stagesError) throw stagesError;
      
      // Carregar restrições de tempo para todas as sequências
      // Restrições globais vinculadas
      const { data: sequenceTimeRestrictions, error: strError } = await supabase
        .from('sequence_time_restrictions')
        .select('sequence_id, time_restrictions(*)');
        
      if (strError) throw strError;
      
      // Restrições locais
      const { data: sequenceLocalRestrictions, error: slrError } = await supabase
        .from('sequence_local_restrictions')
        .select('*');
        
      if (slrError) throw slrError;
      
      // Formatar os dados para o formato usado na aplicação
      const formattedSequences: Sequence[] = sequencesData.map(sequence => {
        // Encontrar estágios para esta sequência
        const sequenceStages = stagesData
          .filter(stage => stage.sequence_id === sequence.id)
          .map(stage => ({
            id: stage.id,
            name: stage.name,
            type: stage.type as "message" | "pattern" | "typebot",
            content: stage.content,
            delay: stage.delay,
            delayUnit: stage.delay_unit as "minutes" | "hours" | "days",
            typebotStage: stage.typebot_stage
          }));
          
        // Encontrar restrições de tempo globais para esta sequência
        const globalRestrictions = sequenceTimeRestrictions
          .filter(str => str.sequence_id === sequence.id && str.time_restrictions)
          .map(str => ({
            id: str.time_restrictions.id,
            name: str.time_restrictions.name,
            active: str.time_restrictions.active,
            days: str.time_restrictions.days,
            startHour: str.time_restrictions.start_hour,
            startMinute: str.time_restrictions.start_minute,
            endHour: str.time_restrictions.end_hour,
            endMinute: str.time_restrictions.end_minute,
            createdAt: str.time_restrictions.created_at,
            isGlobal: true
          }));
          
        // Encontrar restrições de tempo locais para esta sequência
        const localRestrictions = sequenceLocalRestrictions
          .filter(slr => slr.sequence_id === sequence.id)
          .map(slr => ({
            id: slr.id,
            name: slr.name,
            active: slr.active,
            days: slr.days,
            startHour: slr.start_hour,
            startMinute: slr.start_minute,
            endHour: slr.end_hour,
            endMinute: slr.end_minute,
            createdAt: slr.created_at,
            isGlobal: false
          }));
          
        return {
          id: sequence.id,
          name: sequence.name,
          type: sequenceStages.length > 0 ? sequenceStages[0].type : "message",
          startCondition: {
            type: sequence.start_condition_type as "AND" | "OR",
            tags: sequence.start_condition_tags
          },
          stopCondition: {
            type: sequence.stop_condition_type as "AND" | "OR",
            tags: sequence.stop_condition_tags
          },
          stages: sequenceStages,
          timeRestrictions: [...globalRestrictions, ...localRestrictions],
          status: sequence.status as "active" | "inactive",
          instanceId: sequence.instance_id,
          createdBy: sequence.created_by,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at
        };
      });
      
      console.log(`${formattedSequences.length} sequências carregadas com sucesso`);
      setSequences(formattedSequences);
    } catch (error) {
      console.error('Erro ao carregar sequências:', error);
      toast.error('Erro ao carregar sequências. Por favor, tente novamente.');
    }
  };
  
  const loadTimeRestrictions = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('time_restrictions')
        .select('*');
        
      if (error) throw error;
      
      const formattedRestrictions: TimeRestriction[] = data.map(restriction => ({
        id: restriction.id,
        name: restriction.name,
        active: restriction.active,
        days: restriction.days,
        startHour: restriction.start_hour,
        startMinute: restriction.start_minute,
        endHour: restriction.end_hour,
        endMinute: restriction.end_minute,
        createdAt: restriction.created_at,
        isGlobal: true
      }));
      
      setTimeRestrictions(formattedRestrictions);
    } catch (error) {
      console.error('Erro ao carregar restrições de tempo:', error);
      toast.error('Erro ao carregar restrições de tempo. Por favor, tente novamente.');
    }
  };
  
  const loadContacts = async () => {
    try {
      if (!user || !currentInstance) return;
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('instance_id', currentInstance.id);
        
      if (error) throw error;
      
      const formattedContacts: Contact[] = data.map(contact => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        tags: contact.tags || [],
        instanceId: contact.instance_id,
        createdBy: contact.created_by,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      }));
      
      setContacts(formattedContacts);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos. Por favor, tente novamente.');
    }
  };
  
  const loadContactSequences = async () => {
    try {
      if (!user || !currentInstance) return;
      
      // Primeiro, obter todas as sequências da instância atual
      const instanceSequenceIds = sequences
        .filter(seq => seq.instanceId === currentInstance.id)
        .map(seq => seq.id);
        
      if (instanceSequenceIds.length === 0) {
        setContactSequences([]);
        return;
      }
      
      // Em seguida, obter todas as sequências de contatos para essas sequências
      const { data, error } = await supabase
        .from('contact_sequences')
        .select('*, contact:contact_id(*), sequence:sequence_id(*), current_stage:current_stage_id(*)')
        .in('sequence_id', instanceSequenceIds);
        
      if (error) throw error;
      
      const formattedContactSequences: ContactSequence[] = data.map(cs => ({
        id: cs.id,
        contactId: cs.contact_id,
        sequenceId: cs.sequence_id,
        currentStageId: cs.current_stage_id,
        status: cs.status,
        nextExecution: cs.next_execution,
        createdBy: cs.created_by,
        createdAt: cs.created_at,
        updatedAt: cs.updated_at,
        contact: cs.contact ? {
          id: cs.contact.id,
          name: cs.contact.name,
          phone: cs.contact.phone,
          tags: cs.contact.tags || [],
          instanceId: cs.contact.instance_id,
          createdBy: cs.contact.created_by,
          createdAt: cs.contact.created_at,
          updatedAt: cs.contact.updated_at
        } : undefined,
        sequence: cs.sequence ? {
          id: cs.sequence.id,
          name: cs.sequence.name,
          // Outros campos da sequência não são necessários aqui
          instanceId: cs.sequence.instance_id,
          status: cs.sequence.status,
          createdAt: cs.sequence.created_at,
          updatedAt: cs.sequence.updated_at
        } as any : undefined,
        currentStage: cs.current_stage ? {
          id: cs.current_stage.id,
          name: cs.current_stage.name,
          type: cs.current_stage.type,
          content: cs.current_stage.content,
          delay: cs.current_stage.delay,
          delayUnit: cs.current_stage.delay_unit,
          typebotStage: cs.current_stage.typebot_stage
        } : undefined
      }));
      
      setContactSequences(formattedContactSequences);
    } catch (error) {
      console.error('Erro ao carregar sequências de contatos:', error);
      toast.error('Erro ao carregar sequências de contatos. Por favor, tente novamente.');
    }
  };
  
  const loadStats = async () => {
    try {
      if (!user || !currentInstance) return;
      
      // Obter estatísticas básicas
      const contactCount = contacts.length;
      const sequenceCount = sequences.filter(seq => seq.instanceId === currentInstance.id).length;
      const activeSequenceCount = sequences.filter(seq => seq.instanceId === currentInstance.id && seq.status === 'active').length;
      
      // Contagem de contatos por tag
      const tagCounts: Record<string, number> = {};
      contacts.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      
      // Contagem de sequências de contatos por status
      const contactSequenceStatusCounts: Record<string, number> = {};
      contactSequences.forEach(cs => {
        contactSequenceStatusCounts[cs.status] = (contactSequenceStatusCounts[cs.status] || 0) + 1;
      });
      
      setStats({
        contactCount,
        sequenceCount,
        activeSequenceCount,
        tagCounts,
        contactSequenceStatusCounts
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas. Por favor, tente novamente.');
    }
  };
  
  const loadTags = async () => {
    try {
      if (!user) return;
      
      // Coletar todas as tags únicas de contatos
      const contactTags = new Set<string>();
      contacts.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach(tag => contactTags.add(tag));
        }
      });
      
      // Coletar todas as tags únicas de condições de sequências
      const sequenceTags = new Set<string>();
      sequences.forEach(sequence => {
        sequence.startCondition.tags.forEach(tag => sequenceTags.add(tag));
        sequence.stopCondition.tags.forEach(tag => sequenceTags.add(tag));
      });
      
      // Combinar todas as tags únicas
      const allTags = [...new Set([...contactTags, ...sequenceTags])];
      
      setTags(allTags);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
      toast.error('Erro ao carregar tags. Por favor, tente novamente.');
    }
  };
  
  // Função para recarregar todos os dados
  const refreshData = async () => {
    try {
      if (!user) return;
      
      await Promise.all([
        loadInstances(),
        loadSequences(),
        loadTimeRestrictions(),
        loadTags(),
      ]);
      
      // Carregar contatos e sequências de contatos apenas se houver uma instância selecionada
      if (currentInstance) {
        await Promise.all([
          loadContacts(),
          loadContactSequences(),
          loadStats()
        ]);
      }
      
      setIsDataInitialized(true);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados. Por favor, tente novamente.');
    }
  };
  
  // Efeito para inicializar dados quando o usuário estiver autenticado
  useEffect(() => {
    if (user && !isDataInitialized) {
      refreshData();
    }
  }, [user]);
  
  // Efeito para carregar dados específicos da instância quando ela for alterada
  useEffect(() => {
    if (user && currentInstance) {
      Promise.all([
        loadContacts(),
        loadContactSequences(),
        loadStats()
      ]);
    }
  }, [currentInstance]);
  
  // Valores do contexto
  const contextValue = {
    instances,
    currentInstance,
    sequences,
    timeRestrictions,
    contacts,
    contactSequences,
    stats,
    tags,
    isDataInitialized,
    
    setCurrentInstance,
    addInstance,
    updateInstance,
    deleteInstance,
    
    addSequence,
    updateSequence,
    deleteSequence,
    
    addContact,
    updateContact,
    deleteContact,
    addContactSequence,
    updateContactSequence,
    deleteContactSequence,
    
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction,
    
    addTag,
    
    loadInstances,
    loadSequences,
    loadTimeRestrictions,
    loadContacts,
    loadContactSequences,
    loadStats,
    loadTags,
    refreshData
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
