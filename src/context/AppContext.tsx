
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, fetchClientsWithCreatorInfo, fetchInstancesWithClientInfo, fetchSequencesWithInstanceInfo, fetchContactsWithInfo, fetchTagsWithCreatorInfo, fetchTimeRestrictionsWithCreatorInfo } from "@/integrations/supabase/client";
import { Client, Instance, Sequence, SequenceStage, TagCondition, TimeRestriction, Contact, DailyStat } from "@/types";
import { mockClients, mockInstances, mockSequences, mockDailyStats, mockContacts, mockTimeRestrictions } from "@/lib/mockData";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";

export interface AppContextType {
  clients: Client[];
  instances: Instance[];
  sequences: Sequence[];
  currentInstance: Instance | null;
  contacts: Contact[];
  tags: string[];
  timeRestrictions: TimeRestriction[];
  dailyStats: DailyStat[];
  loading: boolean;
  setCurrentInstance: (instance: Instance | null) => void;
  addClient: (client: Omit<Client, "id" | "createdAt" | "createdBy">) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "createdBy">) => Promise<void>;
  updateInstance: (id: string, instance: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  updateSequence: (id: string, sequence: Partial<Sequence>) => Promise<void>;
  deleteSequence: (id: string) => Promise<void>;
  addTag: (tag: string) => void;
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id" | "createdAt" | "createdBy">) => Promise<void>;
  updateTimeRestriction: (id: string, restriction: Partial<TimeRestriction>) => Promise<void>;
  deleteTimeRestriction: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Carrega clientes
          try {
            const clientsData = await fetchClientsWithCreatorInfo();
            if (clientsData && clientsData.length > 0) {
              const mappedClients: Client[] = clientsData.map(client => ({
                id: client.id,
                accountId: client.account_id,
                accountName: client.account_name,
                createdBy: client.created_by,
                createdAt: client.created_at,
                updatedAt: client.updated_at,
                creator: client.creator ? {
                  id: client.creator.id,
                  accountName: client.creator.account_name
                } : undefined
              }));
              setClients(mappedClients);
            }
          } catch (error) {
            console.error("Erro ao carregar clientes:", error);
            setClients(mockClients);
          }

          // Carrega instâncias
          try {
            const instancesData = await fetchInstancesWithClientInfo();
            if (instancesData && instancesData.length > 0) {
              const mappedInstances: Instance[] = instancesData.map(instance => ({
                id: instance.id,
                name: instance.name,
                evolutionApiUrl: instance.evolution_api_url,
                apiKey: instance.api_key,
                clientId: instance.client_id,
                createdBy: instance.created_by,
                createdAt: instance.created_at,
                updatedAt: instance.updated_at,
                active: instance.active,
                client: instance.client ? {
                  id: instance.client.id,
                  accountId: instance.client.account_id,
                  accountName: instance.client.account_name
                } : undefined
              }));
              setInstances(mappedInstances);
              if (mappedInstances.length > 0 && !currentInstance) {
                setCurrentInstance(mappedInstances[0]);
              }
            }
          } catch (error) {
            console.error("Erro ao carregar instâncias:", error);
            setInstances(mockInstances);
            if (mockInstances.length > 0 && !currentInstance) {
              setCurrentInstance(mockInstances[0]);
            }
          }

          // Carrega sequências
          try {
            const sequencesData = await fetchSequencesWithInstanceInfo();
            if (sequencesData && sequencesData.length > 0) {
              const mappedSequences: Sequence[] = await Promise.all(
                sequencesData.map(async sequence => {
                  // Carrega estágios
                  const { data: stages } = await supabase
                    .from('sequence_stages')
                    .select('*')
                    .eq('sequence_id', sequence.id)
                    .order('order_index');

                  // Carrega restrições de tempo
                  const { data: timeRestrictions } = await supabase
                    .rpc('get_sequence_time_restrictions', { seq_id: sequence.id });

                  const mappedStages: SequenceStage[] = stages ? stages.map(stage => ({
                    id: stage.id,
                    name: stage.name,
                    type: stage.type as "message" | "pattern" | "typebot",
                    content: stage.content,
                    delay: stage.delay,
                    delayUnit: stage.delay_unit as "minutes" | "hours" | "days",
                    typebotStage: stage.typebot_stage
                  })) : [];

                  const mappedTimeRestrictions: TimeRestriction[] = timeRestrictions ? timeRestrictions.map(tr => ({
                    id: tr.id,
                    name: tr.name,
                    active: tr.active,
                    days: tr.days,
                    startHour: tr.start_hour,
                    startMinute: tr.start_minute,
                    endHour: tr.end_hour,
                    endMinute: tr.end_minute,
                    isGlobal: tr.is_global,
                    createdAt: '',
                    createdBy: ''
                  })) : [];

                  return {
                    id: sequence.id,
                    name: sequence.name,
                    instanceId: sequence.instance_id,
                    startCondition: {
                      type: sequence.start_condition_type as "AND" | "OR",
                      tags: sequence.start_condition_tags || []
                    },
                    stopCondition: {
                      type: sequence.stop_condition_type as "AND" | "OR",
                      tags: sequence.stop_condition_tags || []
                    },
                    stages: mappedStages,
                    status: sequence.status as "active" | "inactive",
                    timeRestrictions: mappedTimeRestrictions,
                    createdAt: sequence.created_at,
                    updatedAt: sequence.updated_at,
                    createdBy: sequence.created_by,
                    instance: sequence.instance ? {
                      id: sequence.instance.id,
                      name: sequence.instance.name
                    } : undefined
                  };
                })
              );
              setSequences(mappedSequences);
            }
          } catch (error) {
            console.error("Erro ao carregar sequências:", error);
            setSequences(mockSequences);
          }

          // Carrega contatos
          try {
            const contactsData = await fetchContactsWithInfo();
            if (contactsData && contactsData.length > 0) {
              const mappedContacts: Contact[] = contactsData.map(contact => ({
                id: contact.id,
                name: contact.name,
                phoneNumber: contact.phone_number,
                clientId: contact.client_id,
                inboxId: contact.inbox_id,
                conversationId: contact.conversation_id,
                displayId: contact.display_id,
                createdAt: contact.created_at,
                updatedAt: contact.updated_at,
                tags: contact.tags || [],
                client: contact.client ? {
                  id: contact.client.id,
                  accountName: contact.client.account_name
                } : undefined
              }));
              setContacts(mappedContacts);
            }
          } catch (error) {
            console.error("Erro ao carregar contatos:", error);
            setContacts(mockContacts);
          }

          // Carrega tags
          try {
            const tagsData = await fetchTagsWithCreatorInfo();
            if (tagsData && tagsData.length > 0) {
              setTags(tagsData);
            }
          } catch (error) {
            console.error("Erro ao carregar tags:", error);
            setTags([]);
          }

          // Carrega restrições de tempo
          try {
            const restrictionsData = await fetchTimeRestrictionsWithCreatorInfo();
            if (restrictionsData && restrictionsData.length > 0) {
              const mappedRestrictions: TimeRestriction[] = restrictionsData.map(restriction => ({
                id: restriction.id,
                name: restriction.name,
                active: restriction.active,
                days: restriction.days,
                startHour: restriction.start_hour,
                startMinute: restriction.start_minute,
                endHour: restriction.end_hour,
                endMinute: restriction.end_minute,
                createdAt: restriction.created_at,
                createdBy: restriction.created_by,
                isGlobal: true
              }));
              setTimeRestrictions(mappedRestrictions);
            }
          } catch (error) {
            console.error("Erro ao carregar restrições de tempo:", error);
            setTimeRestrictions(mockTimeRestrictions);
          }

          // Carrega estatísticas diárias
          try {
            // Filtro de instância para estatísticas, caso tenhamos uma instância atual
            const instanceFilter = currentInstance ? { instanceId: currentInstance.id } : {};
            
            // Busca estatísticas diárias dos últimos 30 dias
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const formattedDate = thirtyDaysAgo.toISOString().split('T')[0];

            const { data: statsData, error } = await supabase
              .from('daily_stats')
              .select('*')
              .gte('date', formattedDate)
              .order('date');

            if (error) {
              throw error;
            }

            if (statsData && statsData.length > 0) {
              const mappedStats: DailyStat[] = statsData.map(stat => ({
                id: stat.id,
                date: stat.date,
                messagesScheduled: stat.messages_scheduled,
                messagesSent: stat.messages_sent,
                messagesFailed: stat.messages_failed,
                completedSequences: stat.completed_sequences,
                newContacts: stat.new_contacts,
                instanceId: stat.instance_id
              }));
              setDailyStats(mappedStats);
            } else {
              setDailyStats(mockDailyStats);
            }
          } catch (error) {
            console.error("Erro ao carregar estatísticas:", error);
            setDailyStats(mockDailyStats);
          }
        } else {
          // Se não há sessão, usa dados mock
          setClients(mockClients);
          setInstances(mockInstances);
          setSequences(mockSequences);
          setContacts(mockContacts);
          setDailyStats(mockDailyStats);
          setTimeRestrictions(mockTimeRestrictions);
          if (mockInstances.length > 0) {
            setCurrentInstance(mockInstances[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao inicializar dados:", error);
        // Usa dados mock em caso de erro
        setClients(mockClients);
        setInstances(mockInstances);
        setSequences(mockSequences);
        setContacts(mockContacts);
        setDailyStats(mockDailyStats);
        setTimeRestrictions(mockTimeRestrictions);
        if (mockInstances.length > 0) {
          setCurrentInstance(mockInstances[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const addClient = async (client: Omit<Client, "id" | "createdAt" | "createdBy">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      // Preparar dados para inserção
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: client.accountId,
          account_name: client.accountName,
          created_by: user.id,
          creator_account_name: user.email || "Usuário do sistema"
        })
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const newClient: Client = {
          id: data[0].id,
          accountId: data[0].account_id,
          accountName: data[0].account_name,
          createdBy: data[0].created_by,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
          creator: {
            id: user.id,
            accountName: user.email || "Usuário do sistema"
          }
        };
        
        setClients(prevClients => [...prevClients, newClient]);
      }
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast.error(`Erro ao adicionar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const updateClient = async (id: string, client: Partial<Client>) => {
    try {
      // Converter nomes de propriedades camelCase para snake_case
      const updateData: Record<string, any> = {};
      if (client.accountId !== undefined) updateData.account_id = client.accountId;
      if (client.accountName !== undefined) updateData.account_name = client.accountName;
      
      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Atualiza o estado local
      setClients(prevClients =>
        prevClients.map(c =>
          c.id === id ? { ...c, ...client } : c
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error(`Erro ao atualizar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove do estado local
      setClients(prevClients => 
        prevClients.filter(client => client.id !== id)
      );
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast.error(`Erro ao excluir cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const addInstance = async (instance: Omit<Instance, "id" | "createdAt" | "createdBy">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      // Preparar dados para inserção
      const { data, error } = await supabase
        .from('instances')
        .insert({
          name: instance.name,
          evolution_api_url: instance.evolutionApiUrl,
          api_key: instance.apiKey,
          client_id: instance.clientId,
          active: instance.active,
          created_by: user.id
        })
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const newInstance: Instance = {
          id: data[0].id,
          name: data[0].name,
          evolutionApiUrl: data[0].evolution_api_url,
          apiKey: data[0].api_key,
          clientId: data[0].client_id,
          active: data[0].active,
          createdBy: data[0].created_by,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
          client: instance.client
        };
        
        setInstances(prevInstances => [...prevInstances, newInstance]);
        
        // Define como instância atual se for a primeira
        if (!currentInstance) {
          setCurrentInstance(newInstance);
        }
      }
    } catch (error) {
      console.error("Erro ao adicionar instância:", error);
      toast.error(`Erro ao adicionar instância: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const updateInstance = async (id: string, instance: Partial<Instance>) => {
    try {
      // Converter nomes de propriedades camelCase para snake_case
      const updateData: Record<string, any> = {};
      if (instance.name !== undefined) updateData.name = instance.name;
      if (instance.evolutionApiUrl !== undefined) updateData.evolution_api_url = instance.evolutionApiUrl;
      if (instance.apiKey !== undefined) updateData.api_key = instance.apiKey;
      if (instance.clientId !== undefined) updateData.client_id = instance.clientId;
      if (instance.active !== undefined) updateData.active = instance.active;
      
      const { error } = await supabase
        .from('instances')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Atualiza o estado local
      setInstances(prevInstances =>
        prevInstances.map(i =>
          i.id === id ? { ...i, ...instance } : i
        )
      );
      
      // Atualiza instância atual se necessário
      if (currentInstance && currentInstance.id === id) {
        setCurrentInstance(prev => prev ? { ...prev, ...instance } : null);
      }
    } catch (error) {
      console.error("Erro ao atualizar instância:", error);
      toast.error(`Erro ao atualizar instância: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove do estado local
      setInstances(prevInstances => 
        prevInstances.filter(instance => instance.id !== id)
      );
      
      // Limpa instância atual se necessário
      if (currentInstance && currentInstance.id === id) {
        setCurrentInstance(instances.filter(i => i.id !== id)[0] || null);
      }
    } catch (error) {
      console.error("Erro ao excluir instância:", error);
      toast.error(`Erro ao excluir instância: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");
      
      // Log de depuração
      console.log("Adicionando sequência com dados:", JSON.stringify(sequence, null, 2));
      
      // Validar instanceId
      if (!sequence.instanceId) {
        throw new Error("ID da instância é obrigatório");
      }
      
      // Verificar se é um UUID válido
      try {
        // Tentar converter para garantir que é um UUID válido
        const parsedUuid = uuidv4(); // Este é apenas para teste de função, não será usado
        console.log("UUID function test successful:", parsedUuid);
        
        // Verificar se a instanceId é uma string formatada corretamente como UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sequence.instanceId)) {
          throw new Error("ID da instância não é um UUID válido");
        }
      } catch (e) {
        console.error("Erro ao validar UUID:", e);
        throw new Error("ID da instância inválido");
      }

      // Preparar dados para inserção
      const sequenceInsertData = {
        name: sequence.name,
        instance_id: sequence.instanceId,
        start_condition_type: sequence.startCondition.type,
        start_condition_tags: sequence.startCondition.tags,
        stop_condition_type: sequence.stopCondition.type,
        stop_condition_tags: sequence.stopCondition.tags,
        status: sequence.status,
        created_by: user.id
      };
      
      console.log("Dados de inserção da sequência:", JSON.stringify(sequenceInsertData, null, 2));

      const { data, error } = await supabase
        .from('sequences')
        .insert(sequenceInsertData)
        .select('*');

      if (error) {
        console.error("Erro detalhado ao inserir sequência:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Nenhum dado retornado ao criar sequência");
      }

      const newSequenceId = data[0].id;
      console.log("Sequência criada com ID:", newSequenceId);
      
      // Inserir estágios
      if (sequence.stages && sequence.stages.length > 0) {
        const stageInserts = sequence.stages.map((stage, index) => ({
          sequence_id: newSequenceId,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          typebot_stage: stage.typebotStage,
          order_index: index
        }));
        
        console.log("Inserindo estágios:", JSON.stringify(stageInserts, null, 2));

        const { error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stageInserts);

        if (stagesError) {
          console.error("Erro detalhado ao inserir estágios:", stagesError);
          throw stagesError;
        }
      }
      
      // Inserir restrições de tempo locais
      const localRestrictions = sequence.timeRestrictions ? sequence.timeRestrictions.filter(r => !r.isGlobal) : [];
      if (localRestrictions.length > 0) {
        const localRestrictionsInserts = localRestrictions.map(r => ({
          sequence_id: newSequenceId,
          name: r.name,
          active: r.active,
          days: r.days,
          start_hour: r.startHour,
          start_minute: r.startMinute,
          end_hour: r.endHour,
          end_minute: r.endMinute,
          created_by: user.id
        }));
        
        console.log("Inserindo restrições locais:", JSON.stringify(localRestrictionsInserts, null, 2));

        const { error: localRestrictionsError } = await supabase
          .from('sequence_local_restrictions')
          .insert(localRestrictionsInserts);

        if (localRestrictionsError) {
          console.error("Erro detalhado ao inserir restrições locais:", localRestrictionsError);
          throw localRestrictionsError;
        }
      }
      
      // Inserir associações com restrições globais
      const globalRestrictions = sequence.timeRestrictions ? sequence.timeRestrictions.filter(r => r.isGlobal) : [];
      if (globalRestrictions.length > 0) {
        const globalRestrictionsInserts = globalRestrictions.map(r => ({
          sequence_id: newSequenceId,
          time_restriction_id: r.id
        }));
        
        console.log("Inserindo associações com restrições globais:", JSON.stringify(globalRestrictionsInserts, null, 2));

        const { error: globalRestrictionsError } = await supabase
          .from('sequence_time_restrictions')
          .insert(globalRestrictionsInserts);

        if (globalRestrictionsError) {
          console.error("Erro detalhado ao inserir associações com restrições globais:", globalRestrictionsError);
          throw globalRestrictionsError;
        }
      }

      // Buscar a sequência completa para atualizar o estado
      const { data: sequenceData, error: sequenceError } = await supabase
        .from('sequences')
        .select('*')
        .eq('id', newSequenceId)
        .single();

      if (sequenceError) throw sequenceError;
      
      // Buscar estágios
      const { data: stagesData, error: stagesQueryError } = await supabase
        .from('sequence_stages')
        .select('*')
        .eq('sequence_id', newSequenceId)
        .order('order_index');

      if (stagesQueryError) throw stagesQueryError;
      
      // Buscar restrições de tempo
      const { data: timeRestrictionsData, error: timeRestrictionsError } = await supabase
        .rpc('get_sequence_time_restrictions', { seq_id: newSequenceId });

      if (timeRestrictionsError) throw timeRestrictionsError;

      // Mapear dados para o formato usado no front-end
      const mappedStages: SequenceStage[] = stagesData ? stagesData.map(stage => ({
        id: stage.id,
        name: stage.name,
        type: stage.type as "message" | "pattern" | "typebot",
        content: stage.content,
        delay: stage.delay,
        delayUnit: stage.delay_unit as "minutes" | "hours" | "days",
        typebotStage: stage.typebot_stage
      })) : [];

      const mappedTimeRestrictions: TimeRestriction[] = timeRestrictionsData ? timeRestrictionsData.map(tr => ({
        id: tr.id,
        name: tr.name,
        active: tr.active,
        days: tr.days,
        startHour: tr.start_hour,
        startMinute: tr.start_minute,
        endHour: tr.end_hour,
        endMinute: tr.end_minute,
        isGlobal: tr.is_global,
        createdAt: '',
        createdBy: ''
      })) : [];

      const newSequence: Sequence = {
        id: sequenceData.id,
        name: sequenceData.name,
        instanceId: sequenceData.instance_id,
        startCondition: {
          type: sequenceData.start_condition_type as "AND" | "OR",
          tags: sequenceData.start_condition_tags || []
        },
        stopCondition: {
          type: sequenceData.stop_condition_type as "AND" | "OR",
          tags: sequenceData.stop_condition_tags || []
        },
        stages: mappedStages,
        timeRestrictions: mappedTimeRestrictions,
        status: sequenceData.status as "active" | "inactive",
        createdAt: sequenceData.created_at,
        updatedAt: sequenceData.updated_at,
        createdBy: sequenceData.created_by,
        instance: currentInstance ? {
          id: currentInstance.id,
          name: currentInstance.name
        } : undefined
      };
      
      console.log("Sequência completa criada:", JSON.stringify(newSequence, null, 2));
      
      setSequences(prevSequences => [...prevSequences, newSequence]);
      toast.success("Sequência criada com sucesso");
    } catch (error) {
      console.error("Erro ao adicionar sequência:", error);
      toast.error(`Erro ao criar sequência: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const updateSequence = async (id: string, sequence: Partial<Sequence>) => {
    try {
      const updateData: Record<string, any> = {};
      
      if (sequence.name !== undefined) updateData.name = sequence.name;
      if (sequence.instanceId !== undefined) updateData.instance_id = sequence.instanceId;
      if (sequence.status !== undefined) updateData.status = sequence.status;
      if (sequence.startCondition !== undefined) {
        updateData.start_condition_type = sequence.startCondition.type;
        updateData.start_condition_tags = sequence.startCondition.tags;
      }
      if (sequence.stopCondition !== undefined) {
        updateData.stop_condition_type = sequence.stopCondition.type;
        updateData.stop_condition_tags = sequence.stopCondition.tags;
      }
      
      const { error } = await supabase
        .from('sequences')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Se estágios foram atualizados
      if (sequence.stages !== undefined) {
        // Primeiro, exclui os estágios existentes
        const { error: deleteError } = await supabase
          .from('sequence_stages')
          .delete()
          .eq('sequence_id', id);
          
        if (deleteError) throw deleteError;
        
        // Depois, insere os novos estágios
        const stageInserts = sequence.stages.map((stage, index) => ({
          sequence_id: id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          typebot_stage: stage.typebotStage,
          order_index: index
        }));
        
        if (stageInserts.length > 0) {
          const { error: insertError } = await supabase
            .from('sequence_stages')
            .insert(stageInserts);
            
          if (insertError) throw insertError;
        }
      }
      
      // Se restrições de tempo foram atualizadas
      if (sequence.timeRestrictions !== undefined) {
        // Primeiro, remove todas as associações de restrições globais
        const { error: deleteGlobalError } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
          
        if (deleteGlobalError) throw deleteGlobalError;
        
        // Depois, remove todas as restrições locais
        const { error: deleteLocalError } = await supabase
          .from('sequence_local_restrictions')
          .delete()
          .eq('sequence_id', id);
          
        if (deleteLocalError) throw deleteLocalError;
        
        // Insere as novas restrições locais
        const localRestrictions = sequence.timeRestrictions.filter(r => !r.isGlobal);
        if (localRestrictions.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          
          const localRestrictionsInserts = localRestrictions.map(r => ({
            sequence_id: id,
            name: r.name,
            active: r.active,
            days: r.days,
            start_hour: r.startHour,
            start_minute: r.startMinute,
            end_hour: r.endHour,
            end_minute: r.endMinute,
            created_by: user?.id || ''
          }));
          
          const { error: insertLocalError } = await supabase
            .from('sequence_local_restrictions')
            .insert(localRestrictionsInserts);
            
          if (insertLocalError) throw insertLocalError;
        }
        
        // Insere as novas associações de restrições globais
        const globalRestrictions = sequence.timeRestrictions.filter(r => r.isGlobal);
        if (globalRestrictions.length > 0) {
          const globalRestrictionsInserts = globalRestrictions.map(r => ({
            sequence_id: id,
            time_restriction_id: r.id
          }));
          
          const { error: insertGlobalError } = await supabase
            .from('sequence_time_restrictions')
            .insert(globalRestrictionsInserts);
            
          if (insertGlobalError) throw insertGlobalError;
        }
      }

      // Atualiza o estado local
      setSequences(prevSequences =>
        prevSequences.map(s =>
          s.id === id ? { ...s, ...sequence } : s
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar sequência:", error);
      toast.error(`Erro ao atualizar sequência: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove do estado local
      setSequences(prevSequences => 
        prevSequences.filter(sequence => sequence.id !== id)
      );
    } catch (error) {
      console.error("Erro ao excluir sequência:", error);
      toast.error(`Erro ao excluir sequência: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const addContact = async (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Converter para formato da tabela
      const contactInsert = {
        id: contact.id,
        name: contact.name,
        phone_number: contact.phoneNumber,
        client_id: contact.clientId,
        inbox_id: contact.inboxId,
        conversation_id: contact.conversationId,
        display_id: contact.displayId
      };
      
      const { data, error } = await supabase
        .from('contacts')
        .insert(contactInsert)
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        // Verificar se há tags para adicionar
        if (contact.tags && contact.tags.length > 0) {
          const tagInserts = contact.tags.map(tag => ({
            contact_id: data[0].id,
            tag_name: tag
          }));
          
          const { error: tagError } = await supabase
            .from('contact_tags')
            .insert(tagInserts);
            
          if (tagError) throw tagError;
        }
        
        const newContact: Contact = {
          id: data[0].id,
          name: data[0].name,
          phoneNumber: data[0].phone_number,
          clientId: data[0].client_id,
          inboxId: data[0].inbox_id,
          conversationId: data[0].conversation_id,
          displayId: data[0].display_id,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
          tags: contact.tags || [],
          client: contact.client
        };
        
        setContacts(prevContacts => [...prevContacts, newContact]);
      }
    } catch (error) {
      console.error("Erro ao adicionar contato:", error);
      toast.error(`Erro ao adicionar contato: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const addTimeRestriction = async (restriction: Omit<TimeRestriction, "id" | "createdAt" | "createdBy">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      // Preparar dados para inserção
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
        .select('*');

      if (error) throw error;

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
          createdAt: data[0].created_at,
          createdBy: data[0].created_by,
          isGlobal: true
        };
        
        setTimeRestrictions(prevRestrictions => [...prevRestrictions, newRestriction]);
      }
    } catch (error) {
      console.error("Erro ao adicionar restrição de tempo:", error);
      toast.error(`Erro ao adicionar restrição de tempo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const updateTimeRestriction = async (id: string, restriction: Partial<TimeRestriction>) => {
    try {
      // Converter nomes de propriedades camelCase para snake_case
      const updateData: Record<string, any> = {};
      if (restriction.name !== undefined) updateData.name = restriction.name;
      if (restriction.active !== undefined) updateData.active = restriction.active;
      if (restriction.days !== undefined) updateData.days = restriction.days;
      if (restriction.startHour !== undefined) updateData.start_hour = restriction.startHour;
      if (restriction.startMinute !== undefined) updateData.start_minute = restriction.startMinute;
      if (restriction.endHour !== undefined) updateData.end_hour = restriction.endHour;
      if (restriction.endMinute !== undefined) updateData.end_minute = restriction.endMinute;
      
      const { error } = await supabase
        .from('time_restrictions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Atualiza o estado local
      setTimeRestrictions(prevRestrictions =>
        prevRestrictions.map(r =>
          r.id === id ? { ...r, ...restriction } : r
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar restrição de tempo:", error);
      toast.error(`Erro ao atualizar restrição de tempo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove do estado local
      setTimeRestrictions(prevRestrictions => 
        prevRestrictions.filter(restriction => restriction.id !== id)
      );
    } catch (error) {
      console.error("Erro ao excluir restrição de tempo:", error);
      toast.error(`Erro ao excluir restrição de tempo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  // Função para adicionar tag ao estado
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  // Contexto fornecido
  const context: AppContextType = {
    clients,
    instances,
    sequences,
    contacts,
    currentInstance,
    tags,
    timeRestrictions,
    dailyStats,
    loading,
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
    addTag,
    addContact,
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction
  };

  return (
    <AppContext.Provider value={context}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  
  return context;
};
