import { createContext, useContext, useState, useEffect } from "react";
import { supabase, isValidUUID } from "@/integrations/supabase/client";
import { User, Client, Instance, Sequence, SequenceStage, TimeRestriction, ConditionStructure } from "@/types";
import { toast } from "sonner";

interface AppContextType {
  user: User | null;
  clients: Client[];
  instances: Instance[];
  sequences: Sequence[];
  currentClient: Client | null;
  currentInstance: Instance | null;
  isDataInitialized: boolean;
  setCurrentClient: (client: Client | null) => void;
  setCurrentInstance: (instance: Instance | null) => void;
  addClient: (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "creator">) => Promise<void>;
  updateClient: (id: string, updates: Partial<Omit<Client, "id" | "createdAt" | "updatedAt" | "creator">>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt" | "client">) => Promise<void>;
  updateInstance: (id: string, updates: Partial<Omit<Instance, "id" | "createdAt" | "updatedAt" | "client">>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<{success: boolean, error?: string}>;
  updateSequence: (id: string, updates: Partial<Omit<Sequence, "id" | "createdAt" | "updatedAt">>) => Promise<{success: boolean, error?: string}>;
  deleteSequence: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [isDataInitialized, setIsDataInitialized] = useState(false);

  // Carregar usuário atual
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profile) {
          setUser({
            id: authUser.id,
            accountName: profile.account_name,
            email: authUser.email || '',
            role: profile.role,
            avatar: authUser.user_metadata?.avatar_url
          });
        }
      }
    };
    
    fetchUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUser({
            id: session.user.id,
            accountName: profile.account_name,
            email: session.user.email || '',
            role: profile.role,
            avatar: session.user.user_metadata?.avatar_url
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentClient(null);
        setCurrentInstance(null);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  // Persistir cliente e instância selecionados no localStorage
  useEffect(() => {
    if (currentClient) {
      localStorage.setItem('currentClientId', currentClient.id);
    } else {
      localStorage.removeItem('currentClientId');
    }
  }, [currentClient]);

  useEffect(() => {
    if (currentInstance) {
      localStorage.setItem('currentInstanceId', currentInstance.id);
    } else {
      localStorage.removeItem('currentInstanceId');
    }
  }, [currentInstance]);

  // Restaurar cliente e instância selecionados do localStorage
  useEffect(() => {
    if (clients.length > 0) {
      const savedClientId = localStorage.getItem('currentClientId');
      if (savedClientId) {
        const savedClient = clients.find(c => c.id === savedClientId);
        if (savedClient) {
          setCurrentClient(savedClient);
        } else if (clients.length > 0) {
          setCurrentClient(clients[0]);
        }
      } else if (clients.length > 0 && !currentClient) {
        setCurrentClient(clients[0]);
      }
    }
  }, [clients]);

  useEffect(() => {
    if (instances.length > 0 && currentClient) {
      const savedInstanceId = localStorage.getItem('currentInstanceId');
      if (savedInstanceId) {
        const savedInstance = instances.find(i => i.id === savedInstanceId && i.clientId === currentClient.id);
        if (savedInstance) {
          setCurrentInstance(savedInstance);
        } else {
          const clientInstances = instances.filter(i => i.clientId === currentClient.id);
          if (clientInstances.length > 0) {
            setCurrentInstance(clientInstances[0]);
          } else {
            setCurrentInstance(null);
          }
        }
      } else {
        const clientInstances = instances.filter(i => i.clientId === currentClient.id);
        if (clientInstances.length > 0) {
          setCurrentInstance(clientInstances[0]);
        } else {
          setCurrentInstance(null);
        }
      }
    } else {
      setCurrentInstance(null);
    }
  }, [instances, currentClient]);

  const addClient = async (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "creator">) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: client.accountId,
          account_name: client.accountName,
          created_by: user?.id || 'system',
          creator_account_name: user?.accountName || 'System'
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
        updatedAt: data.updated_at,
        creator_account_name: data.creator_account_name
      };
      
      setClients(prev => [newClient, ...prev]);
      setCurrentClient(newClient);
      toast.success("Cliente adicionado com sucesso");
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
    }
  };

  const updateClient = async (id: string, updates: Partial<Omit<Client, "id" | "createdAt" | "updatedAt" | "creator">>) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error("ID de cliente inválido");
      }
      
      const updateData: any = {};
      if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
      if (updates.accountName !== undefined) updateData.account_name = updates.accountName;
      
      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedClient: Client = {
        id: data.id,
        accountId: data.account_id,
        accountName: data.account_name,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        creator_account_name: data.creator_account_name
      };
      
      setClients(prev => prev.map(c => c.id === id ? updatedClient : c));
      
      if (currentClient?.id === id) {
        setCurrentClient(updatedClient);
      }
      
      toast.success("Cliente atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error("ID de cliente inválido");
      }
      
      // Verificar se há instâncias associadas a este cliente
      const { data: clientInstances } = await supabase
        .from('instances')
        .select('id')
        .eq('client_id', id);
      
      if (clientInstances && clientInstances.length > 0) {
        throw new Error("Este cliente possui instâncias associadas. Exclua as instâncias primeiro.");
      }
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => prev.filter(c => c.id !== id));
      
      if (currentClient?.id === id) {
        const remainingClients = clients.filter(c => c.id !== id);
        setCurrentClient(remainingClients.length > 0 ? remainingClients[0] : null);
      }
      
      toast.success("Cliente excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  const addInstance = async (instance: Omit<Instance, "id" | "createdAt" | "updatedAt" | "client">) => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .insert({
          name: instance.name,
          evolution_api_url: instance.evolutionApiUrl,
          api_key: instance.apiKey,
          active: instance.active,
          client_id: instance.clientId,
          created_by: user?.id || 'system'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        active: data.active,
        clientId: data.client_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setInstances(prev => [newInstance, ...prev]);
      
      if (currentClient?.id === newInstance.clientId) {
        setCurrentInstance(newInstance);
      }
      
      toast.success("Instância adicionada com sucesso");
    } catch (error: any) {
      console.error("Error adding instance:", error);
      toast.error(`Erro ao adicionar instância: ${error.message}`);
    }
  };

  const updateInstance = async (id: string, updates: Partial<Omit<Instance, "id" | "createdAt" | "updatedAt" | "client">>) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error("ID de instância inválido");
      }
      
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.evolutionApiUrl !== undefined) updateData.evolution_api_url = updates.evolutionApiUrl;
      if (updates.apiKey !== undefined) updateData.api_key = updates.apiKey;
      if (updates.active !== undefined) updateData.active = updates.active;
      if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
      
      const { data, error } = await supabase
        .from('instances')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        active: data.active,
        clientId: data.client_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setInstances(prev => prev.map(i => i.id === id ? updatedInstance : i));
      
      if (currentInstance?.id === id) {
        setCurrentInstance(updatedInstance);
      }
      
      toast.success("Instância atualizada com sucesso");
    } catch (error: any) {
      console.error("Error updating instance:", error);
      toast.error(`Erro ao atualizar instância: ${error.message}`);
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error("ID de instância inválido");
      }
      
      // Verificar se há sequências associadas a esta instância
      const { data: instanceSequences } = await supabase
        .from('sequences')
        .select('id')
        .eq('instance_id', id);
      
      if (instanceSequences && instanceSequences.length > 0) {
        throw new Error("Esta instância possui sequências associadas. Exclua as sequências primeiro.");
      }
      
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setInstances(prev => prev.filter(i => i.id !== id));
      
      if (currentInstance?.id === id) {
        const remainingInstances = instances.filter(i => i.id !== id && i.clientId === currentClient?.id);
        setCurrentInstance(remainingInstances.length > 0 ? remainingInstances[0] : null);
      }
      
      toast.success("Instância excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      toast.error(`Erro ao excluir instância: ${error.message}`);
    }
  };

  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">): Promise<{success: boolean, error?: string}> => {
    try {
      if (!currentInstance) {
        throw new Error("Nenhuma instância selecionada");
      }

      // Preparar dados para inserção na tabela principal de sequências
      const sequenceData = {
        instance_id: sequence.instanceId,
        name: sequence.name,
        start_condition_type: sequence.startCondition.type,
        start_condition_tags: sequence.startCondition.tags,
        stop_condition_type: sequence.stopCondition.type,
        stop_condition_tags: sequence.stopCondition.tags,
        status: sequence.status,
        created_by: user?.id || 'system'
      };

      // Primeiro criar a sequência
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert(sequenceData)
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      console.log("Sequence created:", seqData);

      // Se houver condições avançadas de início, salvá-las nas tabelas dedicadas
      if (sequence.advancedStartCondition && sequence.advancedStartCondition.groups.length > 0) {
        await saveAdvancedConditions(seqData.id, 'start', sequence.advancedStartCondition);
      }

      // Se houver condições avançadas de parada, salvá-las nas tabelas dedicadas
      if (sequence.advancedStopCondition && sequence.advancedStopCondition.groups.length > 0) {
        await saveAdvancedConditions(seqData.id, 'stop', sequence.advancedStopCondition);
      }
      
      // Criar estágios da sequência
      if (sequence.stages && sequence.stages.length > 0) {
        const stagesData = sequence.stages.map((stage, index) => ({
          sequence_id: seqData.id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          typebot_stage: stage.typebotStage || null,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: index
        }));
        
        const { error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stagesData);
        
        if (stagesError) throw stagesError;
      }
      
      // Adicionar restrições de tempo
      if (sequence.timeRestrictions && sequence.timeRestrictions.length > 0) {
        for (const restriction of sequence.timeRestrictions) {
          if (restriction.isGlobal) {
            // Se for uma restrição global, apenas criar a associação
            const { error: restrictionError } = await supabase
              .from('sequence_time_restrictions')
              .insert({
                sequence_id: seqData.id,
                time_restriction_id: restriction.id
              });
            
            if (restrictionError) throw restrictionError;
          } else {
            // Se for uma restrição local, criar uma nova restrição específica para esta sequência
            const { data: localRestriction, error: localError } = await supabase
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
                created_by: user?.id || 'system'
              })
              .select();
            
            if (localError) throw localError;
          }
        }
      }
      
      await refreshData();
      toast.success("Sequência criada com sucesso");
      
      return { success: true };
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Função auxiliar para salvar condições avançadas nas tabelas dedicadas
  const saveAdvancedConditions = async (
    sequenceId: string, 
    conditionType: 'start' | 'stop', 
    conditionStructure: ConditionStructure
  ) => {
    try {
      // Se não houver grupos, não precisamos fazer nada
      if (!conditionStructure.groups || conditionStructure.groups.length === 0) {
        return;
      }

      console.log(`Saving advanced ${conditionType} conditions for sequence ${sequenceId}`, conditionStructure);

      // Para cada grupo na estrutura de condição
      for (const group of conditionStructure.groups) {
        // Primeiro criamos o grupo na tabela sequence_condition_groups
        const { data: groupData, error: groupError } = await supabase
          .from('sequence_condition_groups')
          .insert({
            sequence_id: sequenceId,
            condition_type: conditionType,
            group_operator: group.operator
          })
          .select()
          .single();

        if (groupError) throw groupError;
        console.log(`Created condition group for ${conditionType}:`, groupData);

        // Agora adicionamos cada tag associada a este grupo
        if (group.tags && group.tags.length > 0) {
          const tagInserts = group.tags.map(tagName => ({
            group_id: groupData.id,
            tag_name: tagName
          }));

          const { data: tagData, error: tagError } = await supabase
            .from('sequence_condition_tags')
            .insert(tagInserts)
            .select();

          if (tagError) throw tagError;
          console.log(`Added ${tagData.length} tags to condition group`);
        }
      }
    } catch (error) {
      console.error("Error saving advanced conditions:", error);
      throw error;
    }
  };

  const updateSequence = async (id: string, updates: Partial<Omit<Sequence, "id" | "createdAt" | "updatedAt">>): Promise<{success: boolean, error?: string}> => {
    try {
      if (!isValidUUID(id)) {
        throw new Error("ID de sequência inválido");
      }
      
      console.log("Updating sequence:", id, updates);
      
      // Preparar dados para atualização da tabela principal de sequências
      const sequenceData: any = {};
      
      if (updates.name !== undefined) sequenceData.name = updates.name;
      if (updates.status !== undefined) sequenceData.status = updates.status;
      
      // Dados de condições básicas (manter para compatibilidade)
      if (updates.startCondition) {
        sequenceData.start_condition_type = updates.startCondition.type;
        sequenceData.start_condition_tags = updates.startCondition.tags;
      }
      
      if (updates.stopCondition) {
        sequenceData.stop_condition_type = updates.stopCondition.type;
        sequenceData.stop_condition_tags = updates.stopCondition.tags;
      }

      // Atualizar os dados principais da sequência se houver algo para atualizar
      if (Object.keys(sequenceData).length > 0) {
        sequenceData.updated_at = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('sequences')
          .update(sequenceData)
          .eq('id', id);
        
        if (updateError) throw updateError;
      }
      
      // Se houver condições avançadas para atualizar
      if (updates.advancedStartCondition || updates.advancedStopCondition) {
        // Primeiro, vamos remover as condições avançadas existentes
        if (updates.advancedStartCondition) {
          await deleteAdvancedConditions(id, 'start');
          await saveAdvancedConditions(id, 'start', updates.advancedStartCondition);
        }
        
        if (updates.advancedStopCondition) {
          await deleteAdvancedConditions(id, 'stop');
          await saveAdvancedConditions(id, 'stop', updates.advancedStopCondition);
        }
      }
      
      // Atualizar estágios se fornecidos
      if (updates.stages) {
        // Verificar se algum estágio está em uso por contatos ativos
        const stageIds = updates.stages
          .filter(stage => isValidUUID(stage.id))
          .map(stage => stage.id);
        
        if (stageIds.length > 0) {
          const { inUse, stageIds: inUseStageIds } = await isValidUUID(id) 
            ? await checkStagesInUse(stageIds)
            : { inUse: false, stageIds: [] };
          
          if (inUse) {
            throw new Error(`Não é possível modificar estágios em uso por contatos ativos. Estágios em uso: ${inUseStageIds.join(', ')}`);
          }
        }
        
        // Excluir estágios existentes
        const { error: deleteStagesError } = await supabase
          .from('sequence_stages')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteStagesError) throw deleteStagesError;
        
        // Inserir novos estágios
        const stagesData = updates.stages.map((stage, index) => ({
          sequence_id: id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          typebot_stage: stage.typebotStage || null,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: index
        }));
        
        const { error: insertStagesError } = await supabase
          .from('sequence_stages')
          .insert(stagesData);
        
        if (insertStagesError) throw insertStagesError;
      }
      
      // Atualizar restrições de tempo se fornecidas
      if (updates.timeRestrictions) {
        // Remover associações existentes com restrições globais
        const { error: deleteRestrictionsError } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteRestrictionsError) throw deleteRestrictionsError;
        
        // Remover restrições locais existentes
        const { error: deleteLocalRestrictionsError } = await supabase
          .from('sequence_local_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteLocalRestrictionsError) throw deleteLocalRestrictionsError;
        
        // Adicionar novas restrições
        for (const restriction of updates.timeRestrictions) {
          if (restriction.isGlobal) {
            // Se for uma restrição global, apenas criar a associação
            const { error: restrictionError } = await supabase
              .from('sequence_time_restrictions')
              .insert({
                sequence_id: id,
                time_restriction_id: restriction.id
              });
            
            if (restrictionError) throw restrictionError;
          } else {
            // Se for uma restrição local, criar uma nova restrição específica para esta sequência
            const { error: localError } = await supabase
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
                created_by: user?.id || 'system'
              });
            
            if (localError) throw localError;
          }
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

  // Função para excluir condições avançadas existentes
  const deleteAdvancedConditions = async (sequenceId: string, conditionType: 'start' | 'stop') => {
    try {
      // Buscar grupos existentes para esta sequência e tipo de condição
      const { data: groups, error: groupsError } = await supabase
        .from('sequence_condition_groups')
        .select('id')
        .eq('sequence_id', sequenceId)
        .eq('condition_type', conditionType);
      
      if (groupsError) throw groupsError;
      
      // Se não houver grupos, não precisamos fazer nada
      if (!groups || groups.length === 0) {
        return;
      }
      
      // Extrair IDs dos grupos
      const groupIds = groups.map(group => group.id);
      
      // Excluir as tags associadas a estes grupos
      // Nota: isso deve acontecer automaticamente com a restrição ON DELETE CASCADE,
      // mas vamos garantir para evitar problemas
      const { error: tagsError } = await supabase
        .from('sequence_condition_tags')
        .delete()
        .in('group_id', groupIds);
      
      if (tagsError) throw tagsError;
      
      // Agora, excluir os grupos
      const { error: deleteError } = await supabase
        .from('sequence_condition_groups')
        .delete()
        .in('id', groupIds);
      
      if (deleteError) throw deleteError;
      
      console.log(`Deleted ${groups.length} advanced condition groups for ${conditionType}`);
    } catch (error) {
      console.error("Error deleting advanced conditions:", error);
      throw error;
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error("ID de sequência inválido");
      }
      
      // Verificar se há contatos ativos usando esta sequência
      const { data: activeContacts, error: contactsError } = await supabase
        .from('contact_sequences')
        .select('id')
        .eq('sequence_id', id)
        .in('status', ['active', 'paused'])
        .limit(1);
      
      if (contactsError) throw contactsError;
      
      if (activeContacts && activeContacts.length > 0) {
        throw new Error("Esta sequência possui contatos ativos. Remova os contatos da sequência primeiro.");
      }
      
      // Excluir estágios da sequência
      const { error: stagesError } = await supabase
        .from('sequence_stages')
        .delete()
        .eq('sequence_id', id);
      
      if (stagesError) throw stagesError;
      
      // Excluir restrições de tempo locais
      const { error: localRestrictionsError } = await supabase
        .from('sequence_local_restrictions')
        .delete()
        .eq('sequence_id', id);
      
      if (localRestrictionsError) throw localRestrictionsError;
      
      // Excluir associações com restrições globais
      const { error: restrictionsError } = await supabase
        .from('sequence_time_restrictions')
        .delete()
        .eq('sequence_id', id);
      
      if (restrictionsError) throw restrictionsError;
      
      // Excluir condições avançadas
      await deleteAdvancedConditions(id, 'start');
      await deleteAdvancedConditions(id, 'stop');
      
      // Finalmente, excluir a sequência
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSequences(prev => prev.filter(s => s.id !== id));
      toast.success("Sequência excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      toast.error(`Erro ao excluir sequência: ${error.message}`);
    }
  };

  // Atualizar o método refreshData para buscar as condições avançadas
  const refreshData = async () => {
    try {
      console.log('Atualizando dados...');
      
      // Buscar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (clientsError) throw clientsError;
      
      const transformedClients: Client[] = clientsData.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        creator_account_name: client.creator_account_name
      }));
      
      setClients(transformedClients);
      
      // Buscar instâncias
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (instancesError) throw instancesError;
      
      const transformedInstances: Instance[] = instancesData.map(instance => ({
        id: instance.id,
        name: instance.name,
        evolutionApiUrl: instance.evolution_api_url,
        apiKey: instance.api_key,
        active: instance.active,
        clientId: instance.client_id,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at
      }));
      
      setInstances(transformedInstances);
      
      // Ao buscar sequências, também buscar as condições avançadas associadas
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (sequencesError) throw sequencesError;
      
      // Transformar os dados para nosso formato de interface Sequence
      const transformedSequences: Sequence[] = [];
      
      for (const seqData of sequencesData) {
        // Buscar estágios da sequência
        const { data: stagesData, error: stagesError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', seqData.id)
          .order('order_index', { ascending: true });
        
        if (stagesError) throw stagesError;
        
        // Buscar grupos de condições avançadas para início
        const { data: startGroups, error: startGroupsError } = await supabase
          .from('sequence_condition_groups')
          .select(`
            *,
            tags:sequence_condition_tags(*)
          `)
          .eq('sequence_id', seqData.id)
          .eq('condition_type', 'start');
        
        if (startGroupsError) throw startGroupsError;
        
        // Buscar grupos de condições avançadas para parada
        const { data: stopGroups, error: stopGroupsError } = await supabase
          .from('sequence_condition_groups')
          .select(`
            *,
            tags:sequence_condition_tags(*)
          `)
          .eq('sequence_id', seqData.id)
          .eq('condition_type', 'stop');
        
        if (stopGroupsError) throw stopGroupsError;
        
        // Transformar grupos de início
        const advancedStartCondition = startGroups && startGroups.length > 0
          ? {
              mainOperator: startGroups[0].group_operator,
              groups: startGroups.map(group => ({
                id: group.id,
                operator: group.group_operator as "AND" | "OR",
                tags: group.tags.map((tag: any) => tag.tag_name)
              }))
            }
          : undefined;
        
        // Transformar grupos de parada
        const advancedStopCondition = stopGroups && stopGroups.length > 0
          ? {
              mainOperator: stopGroups[0].group_operator,
              groups: stopGroups.map(group => ({
                id: group.id,
                operator: group.group_operator as "AND" | "OR",
                tags: group.tags.map((tag: any) => tag.tag_name)
              }))
            }
          : undefined;
        
        // Buscar restrições de tempo
        const { data: timeRestrictions, error: restrictionsError } = await supabase.rpc(
          'get_sequence_time_restrictions',
          { seq_id: seqData.id }
        );
        
        if (restrictionsError) throw restrictionsError;
        
        transformedSequences.push({
          id: seqData.id,
          instanceId: seqData.instance_id,
          name: seqData.name,
          type: seqData.type || "message",
          startCondition: {
            type: seqData.start_condition_type as "AND" | "OR",
            tags: seqData.start_condition_tags || []
          },
          stopCondition: {
            type: seqData.stop_condition_type as "AND" | "OR",
            tags: seqData.stop_condition_tags || []
          },
          advancedStartCondition: advancedStartCondition,
          advancedStopCondition: advancedStopCondition,
          stages: stagesData.map(stage => ({
            id: stage.id,
            name: stage.name,
            type: stage.type,
            content: stage.content,
            typebotStage: stage.typebot_stage,
            delay: stage.delay,
            delayUnit: stage.delay_unit as "minutes" | "hours" | "days",
            orderIndex: stage.order_index
          })),
          timeRestrictions: timeRestrictions.map((restriction: any) => ({
            id: restriction.id,
            name: restriction.name,
            active: restriction.active,
            days: restriction.days,
            startHour: restriction.start_hour,
            startMinute: restriction.start_minute,
            endHour: restriction.end_hour,
            endMinute: restriction.end_minute,
            isGlobal: restriction.is_global
          })),
          status: seqData.status as "active" | "inactive",
          createdAt: seqData.created_at,
          updatedAt: seqData.updated_at
        });
      }
      
      setSequences(transformedSequences);
      setIsDataInitialized(true);
      
      console.log('Dados atualizados com sucesso');
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      toast.error("Erro ao atualizar dados");
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        clients,
        instances,
        sequences,
        currentClient,
        currentInstance,
        isDataInitialized,
        setCurrentClient,
        setCurrentInstance,
        addClient,
        updateClient,
        deleteClient,
        addInstance,
        updateInstance,
        deleteInstance,
        addSequence,
        updateSequence,
        deleteSequence,
        refreshData
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
