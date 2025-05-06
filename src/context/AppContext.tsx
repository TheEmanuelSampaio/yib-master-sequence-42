import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Client, Instance, Sequence, Contact, ScheduledMessage, TimeRestriction, TagCondition, ComplexTagCondition, TagConditionGroup } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { mockClients, mockInstances, mockSequences, mockContacts, mockScheduledMessages } from '@/lib/mockData';

interface AppContextType {
  currentUser: User | null;
  clients: Client[];
  instances: Instance[];
  sequences: Sequence[];
  contacts: Contact[];
  scheduledMessages: ScheduledMessage[];
  timeRestrictions: TimeRestriction[];
  currentClient: Client | null;
  currentInstance: Instance | null;
  isDataInitialized: boolean;
  isLoading: boolean;
  setCurrentClient: (client: Client | null) => void;
  setCurrentInstance: (instance: Instance | null) => void;
  refreshData: () => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInstance: (id: string, instance: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean, error?: string }>;
  updateSequence: (id: string, sequence: Partial<Sequence>) => Promise<{ success: boolean, error?: string }>;
  deleteSequence: (id: string) => Promise<void>;
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateContact: (id: string, contact: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  addTimeRestriction: (restriction: Omit<TimeRestriction, 'id'>) => Promise<void>;
  updateTimeRestriction: (id: string, restriction: Partial<TimeRestriction>) => Promise<void>;
  deleteTimeRestriction: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper para converter a estrutura de tag antiga para a nova
const convertToComplexTagCondition = (tagCondition: TagCondition): ComplexTagCondition => {
  return {
    groups: [{
      type: "AND",
      tags: tagCondition.tags
    }]
  };
};

// Helper para converter a estrutura de tag nova para a antiga (compatibilidade)
const convertToTagCondition = (complexCondition: ComplexTagCondition): TagCondition => {
  // Se não há grupos, retornar uma condição vazia
  if (!complexCondition.groups || complexCondition.groups.length === 0) {
    return { type: "AND", tags: [] };
  }
  
  // Se há apenas um grupo, usar seu tipo e tags
  if (complexCondition.groups.length === 1) {
    return { 
      type: complexCondition.groups[0].type, 
      tags: complexCondition.groups[0].tags 
    };
  }
  
  // Se há múltiplos grupos, tratar como OR de ANDs
  return { 
    type: "OR", 
    tags: complexCondition.groups.flatMap(group => group.tags)
  };
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticação ao iniciar
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setCurrentUser({
              id: session.user.id,
              accountName: profile.account_name,
              email: session.user.email || '',
              role: profile.role,
              avatar: session.user.user_metadata?.avatar_url
            });
          }
        } else {
          setCurrentUser(null);
        }
        setIsLoading(false);
      }
    );

    // Verificar sessão atual
    const checkCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: session.user.id,
            accountName: profile.account_name,
            email: session.user.email || '',
            role: profile.role,
            avatar: session.user.user_metadata?.avatar_url
          });
        }
      }
      setIsLoading(false);
    };

    checkCurrentSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Carregar dados iniciais quando o usuário estiver autenticado
  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  // Função para recarregar todos os dados
  const refreshData = async () => {
    if (!currentUser) return;

    try {
      console.log("Recarregando todos os dados...");
      setIsLoading(true);

      // Carregar clientes
      const clientsData = await fetchClients();
      setClients(clientsData);

      // Carregar instâncias
      const instancesData = await fetchInstances();
      setInstances(instancesData);

      // Carregar sequências
      const sequencesData = await fetchSequences();
      setSequences(sequencesData);

      // Carregar contatos
      const contactsData = await fetchContacts();
      setContacts(contactsData);

      // Carregar mensagens agendadas
      const messagesData = await fetchScheduledMessages();
      setScheduledMessages(messagesData);

      // Carregar restrições de tempo
      const restrictionsData = await fetchTimeRestrictions();
      setTimeRestrictions(restrictionsData);

      setIsDataInitialized(true);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Função para adicionar um novo cliente
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para adicionar um cliente");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: clientData.accountId,
          account_name: clientData.accountName,
          created_by: currentUser.id
        })
        .select();

      if (error) throw error;

      if (data) {
        const newClient: Client = {
          id: data[0].id,
          accountId: data[0].account_id,
          accountName: data[0].account_name,
          createdBy: data[0].created_by,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
          creator_account_name: currentUser.accountName
        };

        setClients(prev => [...prev, newClient]);
        toast.success("Cliente adicionado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
    }
  };

  // Função para atualizar um cliente existente
  const updateClient = async (id: string, clientUpdate: Partial<Client>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para atualizar um cliente");
      return;
    }

    try {
      const updateData: any = {};
      if (clientUpdate.accountId) updateData.account_id = clientUpdate.accountId;
      if (clientUpdate.accountName) updateData.account_name = clientUpdate.accountName;

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setClients(prev =>
        prev.map(client =>
          client.id === id ? { ...client, ...clientUpdate } : client
        )
      );

      toast.success("Cliente atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    }
  };

  // Função para excluir um cliente
  const deleteClient = async (id: string) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para excluir um cliente");
      return;
    }

    try {
      // Verificar se há instâncias associadas
      const { data: clientInstances } = await supabase
        .from('instances')
        .select('id')
        .eq('client_id', id);

      if (clientInstances && clientInstances.length > 0) {
        toast.error("Não é possível excluir um cliente que possui instâncias. Exclua as instâncias primeiro.");
        return;
      }

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(client => client.id !== id));
      
      // Se o cliente excluído for o atual, limpar a seleção
      if (currentClient?.id === id) {
        setCurrentClient(null);
      }

      toast.success("Cliente excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  // Função para adicionar uma nova instância
  const addInstance = async (instanceData: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para adicionar uma instância");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('instances')
        .insert({
          name: instanceData.name,
          evolution_api_url: instanceData.evolutionApiUrl,
          api_key: instanceData.apiKey,
          active: instanceData.active,
          client_id: instanceData.clientId,
          created_by: currentUser.id
        })
        .select();

      if (error) throw error;

      if (data) {
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
        toast.success("Instância adicionada com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao adicionar instância:", error);
      toast.error(`Erro ao adicionar instância: ${error.message}`);
    }
  };

  // Função para atualizar uma instância existente
  const updateInstance = async (id: string, instanceUpdate: Partial<Instance>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para atualizar uma instância");
      return;
    }

    try {
      const updateData: any = {};
      if (instanceUpdate.name !== undefined) updateData.name = instanceUpdate.name;
      if (instanceUpdate.evolutionApiUrl !== undefined) updateData.evolution_api_url = instanceUpdate.evolutionApiUrl;
      if (instanceUpdate.apiKey !== undefined) updateData.api_key = instanceUpdate.apiKey;
      if (instanceUpdate.active !== undefined) updateData.active = instanceUpdate.active;
      if (instanceUpdate.clientId !== undefined) updateData.client_id = instanceUpdate.clientId;

      const { error } = await supabase
        .from('instances')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setInstances(prev =>
        prev.map(instance =>
          instance.id === id ? { ...instance, ...instanceUpdate } : instance
        )
      );

      // Se a instância atualizada for a atual, atualizar também o estado currentInstance
      if (currentInstance?.id === id) {
        setCurrentInstance(prev => prev ? { ...prev, ...instanceUpdate } : null);
      }

      toast.success("Instância atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar instância:", error);
      toast.error(`Erro ao atualizar instância: ${error.message}`);
    }
  };

  // Função para excluir uma instância
  const deleteInstance = async (id: string) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para excluir uma instância");
      return;
    }

    try {
      // Verificar se há sequências associadas
      const { data: instanceSequences } = await supabase
        .from('sequences')
        .select('id')
        .eq('instance_id', id);

      if (instanceSequences && instanceSequences.length > 0) {
        toast.error("Não é possível excluir uma instância que possui sequências. Exclua as sequências primeiro.");
        return;
      }

      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInstances(prev => prev.filter(instance => instance.id !== id));
      
      // Se a instância excluída for a atual, limpar a seleção
      if (currentInstance?.id === id) {
        setCurrentInstance(null);
      }

      toast.success("Instância excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir instância:", error);
      toast.error(`Erro ao excluir instância: ${error.message}`);
    }
  };

  // Função para adicionar uma nova sequência
  const addSequence = async (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para adicionar uma sequência");
      return;
    }

    try {
      // Converter as condições complexas para formato de BD
      const startGroups = sequenceData.startCondition.groups;
      const stopGroups = sequenceData.stopCondition.groups;
      
      // Para compatibilidade, extraímos tags do primeiro grupo
      const startTags = startGroups.length > 0 ? startGroups[0].tags : [];
      const stopTags = stopGroups.length > 0 ? stopGroups[0].tags : [];
      
      // Inserir a sequência
      const { data: newSequence, error } = await supabase
        .from('sequences')
        .insert({
          instance_id: sequenceData.instanceId,
          name: sequenceData.name,
          type: sequenceData.type, // Novo campo de tipo no nível da sequência
          start_condition_type: "COMPLEX",
          start_condition_tags: startTags, 
          stop_condition_type: "COMPLEX",
          stop_condition_tags: stopTags,
          start_condition_groups: startGroups,
          stop_condition_groups: stopGroups,
          status: sequenceData.status,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      // Inserir os estágios da sequência
      if (newSequence) {
        const sequenceStages = sequenceData.stages.map((stage, index) => ({
          sequence_id: newSequence.id,
          name: stage.name,
          content: stage.content,
          typebot_stage: stage.typebotStage,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: index
        }));

        const { error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(sequenceStages);

        if (stagesError) throw stagesError;

        // Associar restrições de tempo
        if (sequenceData.timeRestrictions && sequenceData.timeRestrictions.length > 0) {
          const timeRestrictionMappings = sequenceData.timeRestrictions
            .filter(tr => tr.isGlobal) // Apenas restrições globais
            .map(tr => ({
              sequence_id: newSequence.id,
              time_restriction_id: tr.id
            }));

          if (timeRestrictionMappings.length > 0) {
            const { error: restrictionsError } = await supabase
              .from('sequence_time_restrictions')
              .insert(timeRestrictionMappings);

            if (restrictionsError) throw restrictionsError;
          }

          // Criar restrições locais se houver
          const localRestrictions = sequenceData.timeRestrictions
            .filter(tr => !tr.isGlobal)
            .map(tr => ({
              sequence_id: newSequence.id,
              name: tr.name,
              active: tr.active,
              days: tr.days,
              start_hour: tr.startHour,
              start_minute: tr.startMinute,
              end_hour: tr.endHour,
              end_minute: tr.endMinute,
              created_by: currentUser.id
            }));

          if (localRestrictions.length > 0) {
            const { error: localRestrictionsError } = await supabase
              .from('sequence_local_restrictions')
              .insert(localRestrictions);

            if (localRestrictionsError) throw localRestrictionsError;
          }
        }

        // Atualizar o estado local
        await refreshData();
        
        toast.success("Sequência criada com sucesso!");
        return { success: true };
      }

      return { success: false, error: "Erro ao criar sequência" };

    } catch (error) {
      console.error("Erro ao adicionar sequência:", error);
      toast.error(`Erro ao adicionar sequência: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Função para atualizar uma sequência existente
  const updateSequence = async (sequenceId: string, sequenceUpdate: Partial<Sequence>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para atualizar uma sequência");
      return { success: false, error: "Usuário não autenticado" };
    }

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Copiar campos simples
      if (sequenceUpdate.name) updateData.name = sequenceUpdate.name;
      if (sequenceUpdate.status) updateData.status = sequenceUpdate.status;
      if (sequenceUpdate.type) updateData.type = sequenceUpdate.type;

      // Processar condições de tags
      if (sequenceUpdate.startCondition) {
        const startGroups = sequenceUpdate.startCondition.groups;
        updateData.start_condition_groups = startGroups;
        updateData.start_condition_type = "COMPLEX";
        // Para compatibilidade com o formato antigo
        updateData.start_condition_tags = startGroups.length > 0 ? startGroups[0].tags : [];
      }

      if (sequenceUpdate.stopCondition) {
        const stopGroups = sequenceUpdate.stopCondition.groups;
        updateData.stop_condition_groups = stopGroups;
        updateData.stop_condition_type = "COMPLEX";
        // Para compatibilidade com o formato antigo
        updateData.stop_condition_tags = stopGroups.length > 0 ? stopGroups[0].tags : [];
      }

      // Atualizar a sequência
      const { error } = await supabase
        .from('sequences')
        .update(updateData)
        .eq('id', sequenceId);

      if (error) throw error;

      // Processar estágios, se foram atualizados
      if (sequenceUpdate.stages) {
        // Primeiro, buscar estágios existentes para verificar quais devem ser mantidos
        const { data: existingStages, error: stagesQueryError } = await supabase
          .from('sequence_stages')
          .select('id')
          .eq('sequence_id', sequenceId);

        if (stagesQueryError) throw stagesQueryError;

        // Mapear IDs dos estágios existentes e dos novos estágios
        const existingStageIds = existingStages.map(stage => stage.id);
        const newStageIds = sequenceUpdate.stages.filter(stage => stage.id).map(stage => stage.id);

        // Identificar estágios a serem excluídos (estão no DB mas não nos novos dados)
        const stageIdsToDelete = existingStageIds.filter(id => !newStageIds.includes(id));

        if (stageIdsToDelete.length > 0) {
          // Verificar se algum estágio a ser deletado está sendo usado em mensagens agendadas
          const { data: inUseStages, error: inUseCheckError } = await supabase
            .from('scheduled_messages')
            .select('stage_id')
            .in('stage_id', stageIdsToDelete)
            .not('status', 'eq', 'sent');

          if (inUseCheckError) throw inUseCheckError;

          if (inUseStages && inUseStages.length > 0) {
            const usedStageIds = inUseStages.map(msg => msg.stage_id);
            console.log("Alguns estágios não podem ser deletados pois estão em uso:", usedStageIds);
            
            // Filtrar apenas os que não estão em uso
            const safeToDeleteIds = stageIdsToDelete.filter(id => !usedStageIds.includes(id));

            if (safeToDeleteIds.length > 0) {
              const { error: deleteError } = await supabase
                .from('sequence_stages')
                .delete()
                .in('id', safeToDeleteIds);

              if (deleteError) throw deleteError;
            }

            if (usedStageIds.length > 0) {
              return { 
                success: false, 
                error: `Não foi possível excluir alguns estágios pois estão sendo usados em mensagens agendadas: ${usedStageIds.join(", ")}`
              };
            }
          } else {
            // Nenhum estágio em uso, podemos deletar todos com segurança
            const { error: deleteError } = await supabase
              .from('sequence_stages')
              .delete()
              .in('id', stageIdsToDelete);

            if (deleteError) throw deleteError;
          }
        }

        // Para cada estágio, atualizar ou inserir
        for (let i = 0; i < sequenceUpdate.stages.length; i++) {
          const stage = sequenceUpdate.stages[i];

          if (stage.id && existingStageIds.includes(stage.id)) {
            // Estágio existe, atualizar
            const { error: updateError } = await supabase
              .from('sequence_stages')
              .update({
                name: stage.name,
                content: stage.content,
                typebot_stage: stage.typebotStage,
                delay: stage.delay,
                delay_unit: stage.delayUnit,
                order_index: i
              })
              .eq('id', stage.id);

            if (updateError) throw updateError;
          } else {
            // Estágio novo, inserir
            const { error: insertError } = await supabase
              .from('sequence_stages')
              .insert({
                sequence_id: sequenceId,
                name: stage.name,
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

      // Processar restrições de tempo
      if (sequenceUpdate.timeRestrictions) {
        // Remover todas as associações existentes
        const { error: deleteAssociationsError } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', sequenceId);

        if (deleteAssociationsError) throw deleteAssociationsError;

        // Remover restrições locais existentes
        const { error: deleteLocalError } = await supabase
          .from('sequence_local_restrictions')
          .delete()
          .eq('sequence_id', sequenceId);

        if (deleteLocalError) throw deleteLocalError;

        // Adicionar novas associações para restrições globais
        const globalRestrictions = sequenceUpdate.timeRestrictions
          .filter(tr => tr.isGlobal)
          .map(tr => ({
            sequence_id: sequenceId,
            time_restriction_id: tr.id
          }));

        if (globalRestrictions.length > 0) {
          const { error: insertAssociationsError } = await supabase
            .from('sequence_time_restrictions')
            .insert(globalRestrictions);

          if (insertAssociationsError) throw insertAssociationsError;
        }

        // Adicionar novas restrições locais
        const localRestrictions = sequenceUpdate.timeRestrictions
          .filter(tr => !tr.isGlobal)
          .map(tr => ({
            sequence_id: sequenceId,
            name: tr.name,
            active: tr.active,
            days: tr.days,
            start_hour: tr.startHour,
            start_minute: tr.startMinute,
            end_hour: tr.endHour,
            end_minute: tr.endMinute,
            created_by: currentUser.id
          }));

        if (localRestrictions.length > 0) {
          const { error: insertLocalError } = await supabase
            .from('sequence_local_restrictions')
            .insert(localRestrictions);

          if (insertLocalError) throw insertLocalError;
        }
      }

      // Atualizar dados locais
      await refreshData();
      
      return { success: true };

    } catch (error) {
      console.error("Erro ao atualizar sequência:", error);
      toast.error(`Erro ao atualizar sequência: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Função para excluir uma sequência
  const deleteSequence = async (id: string) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para excluir uma sequência");
      return;
    }

    try {
      // Verificar se há mensagens agendadas para esta sequência
      const { data: scheduledMessages } = await supabase
        .from('scheduled_messages')
        .select('id')
        .eq('sequence_id', id)
        .not('status', 'in', '("sent", "failed")');

      if (scheduledMessages && scheduledMessages.length > 0) {
        // Cancelar todas as mensagens agendadas
        const { error: updateError } = await supabase
          .from('scheduled_messages')
          .update({ status: 'cancelled' })
          .eq('sequence_id', id)
          .not('status', 'in', '("sent", "failed")');

        if (updateError) throw updateError;
      }

      // Remover associações com restrições de tempo
      const { error: restrictionsError } = await supabase
        .from('sequence_time_restrictions')
        .delete()
        .eq('sequence_id', id);

      if (restrictionsError) throw restrictionsError;

      // Remover restrições locais
      const { error: localRestrictionsError } = await supabase
        .from('sequence_local_restrictions')
        .delete()
        .eq('sequence_id', id);

      if (localRestrictionsError) throw localRestrictionsError;

      // Remover estágios
      const { error: stagesError } = await supabase
        .from('sequence_stages')
        .delete()
        .eq('sequence_id', id);

      if (stagesError) throw stagesError;

      // Remover a sequência
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar estado local
      setSequences(prev => prev.filter(sequence => sequence.id !== id));
      toast.success("Sequência excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir sequência:", error);
      toast.error(`Erro ao excluir sequência: ${error.message}`);
    }
  };

  // Função para adicionar um novo contato
  const addContact = async (contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para adicionar um contato");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: contactData.name,
          phone_number: contactData.phoneNumber,
          client_id: contactData.clientId,
          inbox_id: contactData.inboxId,
          conversation_id: contactData.conversationId,
          display_id: contactData.displayId,
          tags: contactData.tags || []
        })
        .select();

      if (error) throw error;

      if (data) {
        const newContact: Contact = {
          id: data[0].id,
          name: data[0].name,
          phoneNumber: data[0].phone_number,
          clientId: data[0].client_id,
          inboxId: data[0].inbox_id,
          conversationId: data[0].conversation_id,
          displayId: data[0].display_id,
          tags: data[0].tags || [],
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at
        };

        setContacts(prev => [...prev, newContact]);
        toast.success("Contato adicionado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao adicionar contato:", error);
      toast.error(`Erro ao adicionar contato: ${error.message}`);
    }
  };

  // Função para atualizar um contato existente
  const updateContact = async (id: string, contactUpdate: Partial<Contact>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para atualizar um contato");
      return;
    }

    try {
      const updateData: any = {};
      if (contactUpdate.name !== undefined) updateData.name = contactUpdate.name;
      if (contactUpdate.phoneNumber !== undefined) updateData.phone_number = contactUpdate.phoneNumber;
      if (contactUpdate.tags !== undefined) updateData.tags = contactUpdate.tags;
      if (contactUpdate.inboxId !== undefined) updateData.inbox_id = contactUpdate.inboxId;
      if (contactUpdate.conversationId !== undefined) updateData.conversation_id = contactUpdate.conversationId;
      if (contactUpdate.displayId !== undefined) updateData.display_id = contactUpdate.displayId;

      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setContacts(prev =>
        prev.map(contact =>
          contact.id === id ? { ...contact, ...contactUpdate } : contact
        )
      );

      toast.success("Contato atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar contato:", error);
      toast.error(`Erro ao atualizar contato: ${error.message}`);
    }
  };

  // Função para excluir um contato
  const deleteContact = async (id: string) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para excluir um contato");
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContacts(prev => prev.filter(contact => contact.id !== id));
      toast.success("Contato excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir contato:", error);
      toast.error(`Erro ao excluir contato: ${error.message}`);
    }
  };

  // Função para adicionar uma nova restrição de tempo
  const addTimeRestriction = async (restrictionData: Omit<TimeRestriction, 'id'>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para adicionar uma restrição de tempo");
      return;
    }

    try {
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
          created_by: currentUser.id
        })
        .select();

      if (error) throw error;

      if (data) {
        const newRestriction: TimeRestriction = {
          id: data[0].id,
          name: data[0].name,
          active: data[0].active,
          days: data[0].days,
          startHour: data[0].start_hour,
          startMinute: data[0].start_minute,
          endHour: data[0].end_hour,
          endMinute: data[0].end_minute,
          isGlobal: true
        };

        setTimeRestrictions(prev => [...prev, newRestriction]);
        toast.success("Restrição de tempo adicionada com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao adicionar restrição de tempo:", error);
      toast.error(`Erro ao adicionar restrição de tempo: ${error.message}`);
    }
  };

  // Função para atualizar uma restrição de tempo existente
  const updateTimeRestriction = async (id: string, restrictionUpdate: Partial<TimeRestriction>) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para atualizar uma restrição de tempo");
      return;
    }

    try {
      const updateData: any = {};
      if (restrictionUpdate.name !== undefined) updateData.name = restrictionUpdate.name;
      if (restrictionUpdate.active !== undefined) updateData.active = restrictionUpdate.active;
      if (restrictionUpdate.days !== undefined) updateData.days = restrictionUpdate.days;
      if (restrictionUpdate.startHour !== undefined) updateData.start_hour = restrictionUpdate.startHour;
      if (restrictionUpdate.startMinute !== undefined) updateData.start_minute = restrictionUpdate.startMinute;
      if (restrictionUpdate.endHour !== undefined) updateData.end_hour = restrictionUpdate.endHour;
      if (restrictionUpdate.endMinute !== undefined) updateData.end_minute = restrictionUpdate.endMinute;

      const { error } = await supabase
        .from('time_restrictions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setTimeRestrictions(prev =>
        prev.map(restriction =>
          restriction.id === id ? { ...restriction, ...restrictionUpdate } : restriction
        )
      );

      toast.success("Restrição de tempo atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar restrição de tempo:", error);
      toast.error(`Erro ao atualizar restrição de tempo: ${error.message}`);
    }
  };

  // Função para excluir uma restrição de tempo
  const deleteTimeRestriction = async (id: string) => {
    if (!currentUser) {
      console.error("Usuário não autenticado");
      toast.error("Você precisa estar autenticado para excluir uma restrição de tempo");
      return;
    }

    try {
      // Verificar se a restrição está sendo usada em alguma sequência
      const { data: usedRestrictions } = await supabase
        .from('sequence_time_restrictions')
        .select('sequence_id')
        .eq('time_restriction_id', id);

      if (usedRestrictions && usedRestrictions.length > 0) {
        toast.error("Não é possível excluir uma restrição de tempo que está sendo usada em sequências.");
        return;
      }

      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTimeRestrictions(prev => prev.filter(restriction => restriction.id !== id));
      toast.success("Restrição de tempo excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir restrição de tempo:", error);
      toast.error(`Erro ao excluir restrição de tempo: ${error.message}`);
    }
  };

  /**
   * Consulta todos os clientes e transforma-os para o formato da interface
   */
  const fetchClients = async (): Promise<Client[]> => {
    try {
      if (!currentUser) return [];

      console.log("Buscando todos os clientes...");
      const { data: dbClients, error } = await supabase
        .from('clients')
        .select(`
          *,
          profiles!clients_created_by_fkey (
            id,
            account_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar clientes:", error);
        throw error;
      }

      if (!dbClients) return [];

      // Transformar dados do banco para o formato da interface
      const clients: Client[] = dbClients.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        creator: client.profiles ? {
          id: client.profiles.id,
          account_name: client.profiles.account_name
        } : undefined,
        creator_account_name: client.profiles?.account_name
      }));

      console.log("Clientes buscados com sucesso:", clients.length);
      return clients;
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast.error(`Erro ao buscar clientes: ${error.message}`);
      return [];
    }
  };

  /**
   * Consulta todas as instâncias e transforma-as para o formato da interface
   */
  const fetchInstances = async (): Promise<Instance[]> => {
    try {
      if (!currentUser) return [];

      console.log("Buscando todas as instâncias...");
      const { data: dbInstances, error } = await supabase
        .from('instances')
        .select(`
          *,
          clients (
            id,
            account_id,
            account_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar instâncias:", error);
        throw error;
      }

      if (!dbInstances) return [];

      // Transformar dados do banco para o formato da interface
      const instances: Instance[] = dbInstances.map(instance => ({
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
          createdBy: '',
          createdAt: '',
          updatedAt: ''
        } : undefined,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at
      }));

      console.log("Instâncias buscadas com sucesso:", instances.length);
      return instances;
    } catch (error) {
      console.error("Erro ao buscar instâncias:", error);
      toast.error(`Erro ao buscar instâncias: ${error.message}`);
      return [];
    }
  };

  /**
   * Consulta todas as sequências e transforma-as para o formato da interface
   */
  const fetchSequences = async (): Promise<Sequence[]> => {
    try {
      if (!currentUser) return [];

      console.log("Buscando todas as sequências...");
      const { data: dbSequences, error } = await supabase
        .from('sequences')
        .select(`
          *,
          sequence_stages (*),
          sequence_time_restrictions (
            time_restriction_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar sequências:", error);
        throw error;
      }

      if (!dbSequences) return [];

      // Transformar dados do banco para o formato da interface
      const sequencesWithDetails = await Promise.all(dbSequences.map(async (seq: any): Promise<Sequence> => {
        // Buscar restrições de tempo associadas
        const timeRestrictions: TimeRestriction[] = [];

        // Para cada restrição global associada, buscar seus detalhes
        if (seq.sequence_time_restrictions && seq.sequence_time_restrictions.length > 0) {
          const restrictionIds = seq.sequence_time_restrictions.map((link: any) => link.time_restriction_id);
          
          const { data: globalRestrictions, error: globalRestrictionsError } = await supabase
            .from('time_restrictions')
            .select('*')
            .in('id', restrictionIds);

          if (!globalRestrictionsError && globalRestrictions) {
            globalRestrictions.forEach((restriction: any) => {
              timeRestrictions.push({
                id: restriction.id,
                name: restriction.name,
                active: restriction.active,
                days: restriction.days,
                startHour: restriction.start_hour,
                startMinute: restriction.start_minute,
                endHour: restriction.end_hour,
                endMinute: restriction.end_minute,
                isGlobal: true
              });
            });
          }
        }

        // Buscar restrições locais da sequência
        const { data: localRestrictions, error: localRestrictionsError } = await supabase
          .from('sequence_local_restrictions')
          .select('*')
          .eq('sequence_id', seq.id);

        if (!localRestrictionsError && localRestrictions) {
          localRestrictions.forEach((restriction: any) => {
            timeRestrictions.push({
              id: restriction.id,
              name: restriction.name,
              active: restriction.active,
              days: restriction.days,
              startHour: restriction.start_hour,
              startMinute: restriction.start_minute,
              endHour: restriction.end_hour,
              endMinute: restriction.end_minute,
              isGlobal: false
            });
          });
        }

        // Converter estágios para o formato da interface
        const stages = seq.sequence_stages
          ? seq.sequence_stages
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((stage: any): SequenceStage => ({
              id: stage.id,
              name: stage.name,
              content: stage.content,
              typebotStage: stage.typebot_stage,
              delay: stage.delay,
              delayUnit: stage.delay_unit as "minutes" | "hours" | "days",
              orderIndex: stage.order_index
            }))
          : [];

        // Converter as condições de tags para o formato complexo
        let startCondition: ComplexTagCondition = {
          groups: []
        };
        
        let stopCondition: ComplexTagCondition = {
          groups: []
        };
        
        // Verificar se temos o formato complexo ou precisamos converter do formato antigo
        if (seq.start_condition_groups && Array.isArray(seq.start_condition_groups)) {
          startCondition = { groups: seq.start_condition_groups };
        } else {
          // Formato antigo - converter para o novo formato
          startCondition = {
            groups: [{
              type: "AND" as const,
              tags: seq.start_condition_tags || []
            }]
          };
        }
        
        if (seq.stop_condition_groups && Array.isArray(seq.stop_condition_groups)) {
          stopCondition = { groups: seq.stop_condition_groups };
        } else {
          // Formato antigo - converter para o novo formato
          stopCondition = {
            groups: [{
              type: "AND" as const,
              tags: seq.stop_condition_tags || []
            }]
          };
        }

        return {
          id: seq.id,
          instanceId: seq.instance_id,
          name: seq.name,
          type: seq.type || "message", // Usar o tipo da sequência, com fallback para "message"
          startCondition: startCondition,
          stopCondition: stopCondition,
          stages: stages,
          timeRestrictions: timeRestrictions,
          status: seq.status,
          createdAt: seq.created_at,
          updatedAt: seq.updated_at
        };
      }));

      console.log("Sequências buscadas com sucesso:", sequencesWithDetails.length);
      return sequencesWithDetails;

    } catch (error) {
      console.error("Erro ao buscar sequências:", error);
      toast.error(`Erro ao buscar sequências: ${error.message}`);
      return [];
    }
  };

  /**
   * Consulta todos os contatos e transforma-os para o formato da interface
   */
  const fetchContacts = async (): Promise<Contact[]> => {
    try {
      if (!currentUser) return [];

      console.log("Buscando todos os contatos...");
      const { data: dbContacts, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar contatos:", error);
        throw error;
      }

      if (!dbContacts) return [];

      // Transformar dados do banco para o formato da interface
      const contacts: Contact[] = dbContacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone_number,
        clientId: contact.client_id,
        inboxId: contact.inbox_id,
        conversationId: contact.conversation_id,
        displayId: contact.display_id,
        tags: contact.tags || [],
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      }));

      console.log("Contatos buscados com sucesso:", contacts.length);
      return contacts;
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
      toast.error(`Erro ao buscar contatos: ${error.message}`);
      return [];
    }
  };

  /**
   * Consulta todas as mensagens agendadas e transforma-as para o formato da interface
   */
  const fetchScheduledMessages = async (): Promise<ScheduledMessage[]> => {
    try {
      if (!currentUser) return [];

      console.log("Buscando todas as mensagens agendadas...");
      const { data: dbMessages, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('scheduled_time', { ascending: true });

      if (error) {
        console.error("Erro ao buscar mensagens agendadas:", error);
        throw error;
      }

      if (!dbMessages) return [];

      // Transformar dados do banco para o formato da interface
      const messages: ScheduledMessage[] = dbMessages.map(message => ({
        id: message.id,
        contactId: message.contact_id,
        sequenceId: message.sequence_id,
        stageId: message.stage_id,
        scheduledTime: message.scheduled_time,
        scheduledAt: message.scheduled_at || message.created_at,
        sentAt: message.sent_at,
        status: message.status,
        attempts: message.attempts
      }));

      console.log("Mensagens agendadas buscadas com sucesso:", messages.length);
      return messages;
    } catch (error) {
      console.error("Erro ao buscar mensagens agendadas:", error);
      toast.error(`Erro ao buscar mensagens agendadas: ${error.message}`);
      return [];
    }
  };

  /**
   * Consulta todas as restrições de tempo e transforma-as para o formato da interface
   */
  const fetchTimeRestrictions = async (): Promise<TimeRestriction[]> => {
    try {
      if (!currentUser) return [];

      console.log("Buscando todas as restrições de tempo...");
      const { data: dbRestrictions, error } = await supabase
        .from('time_restrictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar restrições de tempo:", error);
        throw error;
      }

      if (!dbRestrictions) return [];

      // Transformar dados do banco para o formato da interface
      const restrictions: TimeRestriction[] = dbRestrictions.map(restriction => ({
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

      console.log("Restrições de tempo buscadas com sucesso:", restrictions.length);
      return restrictions;
    } catch (error) {
      console.error("Erro ao buscar restrições de tempo:", error);
      toast.error(`Erro ao buscar restrições de tempo: ${error.message}`);
      return [];
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        clients,
        instances,
        sequences,
        contacts,
        scheduledMessages,
        timeRestrictions,
        currentClient,
        currentInstance,
        isDataInitialized,
        isLoading,
        setCurrentClient,
        setCurrentInstance,
        refreshData,
        addClient,
        updateClient,
        deleteClient,
        addInstance,
        updateInstance,
        deleteInstance,
        addSequence,
        updateSequence,
        deleteSequence,
        addContact,
        updateContact,
        deleteContact,
        addTimeRestriction,
        updateTimeRestriction,
        deleteTimeRestriction
      }}
    >
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
