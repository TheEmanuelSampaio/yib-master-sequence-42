
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, Client, Instance, Sequence, Contact, 
  ContactSequence, ScheduledMessage, TagCondition, 
  SequenceStage, TimeRestriction, StageProgress
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "@/components/ui/use-toast";

interface AppContextType {
  user: User | null;
  clients: Client[];
  instances: Instance[];
  currentInstanceId: string | null;
  sequences: Sequence[];
  contacts: Contact[];
  contactSequences: ContactSequence[];
  scheduledMessages: ScheduledMessage[];
  tags: string[];
  refreshData: () => Promise<void>;
  setCurrentInstanceId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  clients: [],
  instances: [],
  currentInstanceId: null,
  sequences: [],
  contacts: [],
  contactSequences: [],
  scheduledMessages: [],
  tags: [],
  refreshData: async () => {},
  setCurrentInstanceId: () => {},
});

export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  
  // Lista para atualização de todos os dados
  const refreshData = async () => {
    console.info("Refreshing data...");
    
    try {
      // 1. Buscar dados do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setUser({
            id: user.id,
            email: user.email || '',
            accountName: profile.account_name,
            role: profile.role,
            avatar: user.user_metadata?.avatar_url,
          });
          
          // 2. Buscar clientes
          const { data: clientsData } = await supabase
            .from('clients')
            .select('*');
            
          if (clientsData) {
            setClients(clientsData.map(client => ({
              id: client.id,
              accountId: client.account_id,
              accountName: client.account_name,
              createdBy: client.created_by,
              createdAt: client.created_at,
              updatedAt: client.updated_at,
            })));
            
            // 3. Buscar instâncias
            const { data: instancesData } = await supabase
              .from('instances')
              .select('*, client:clients(*)');
              
            if (instancesData) {
              const mappedInstances = instancesData.map(instance => ({
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
                } : undefined,
                createdBy: instance.created_by,
                createdAt: instance.created_at,
                updatedAt: instance.updated_at,
              }));
              
              setInstances(mappedInstances);
              
              // Se não houver instância selecionada, selecione a primeira ativa
              if (!currentInstanceId && mappedInstances.length > 0) {
                const activeInstance = mappedInstances.find(i => i.active);
                if (activeInstance) {
                  setCurrentInstanceId(activeInstance.id);
                }
              }
              
              // 4. Buscar sequências com seus estágios e restrições
              const { data: sequencesData, error } = await supabase
                .from('sequences')
                .select(`
                  *,
                  stages:sequence_stages(*)
                `);
                
              if (sequencesData) {
                console.info(`Sequences fetched: ${sequencesData.length}`);
                
                const mappedSequences: Sequence[] = sequencesData.map(seq => ({
                  id: seq.id,
                  instanceId: seq.instance_id,
                  name: seq.name,
                  startCondition: {
                    type: seq.start_condition_type as "AND" | "OR",
                    tags: seq.start_condition_tags || [],
                  },
                  stopCondition: {
                    type: seq.stop_condition_type as "AND" | "OR",
                    tags: seq.stop_condition_tags || [],
                  },
                  stages: (seq.stages || []).map((stage: any) => ({
                    id: stage.id,
                    name: stage.name,
                    type: stage.type as "message" | "pattern" | "typebot",
                    content: stage.content,
                    typebotStage: stage.typebot_stage,
                    delay: stage.delay,
                    delayUnit: stage.delay_unit as "minutes" | "hours" | "days",
                    orderIndex: stage.order_index,
                  })),
                  timeRestrictions: [], // Preenchido mais tarde
                  status: seq.status as "active" | "inactive",
                  createdAt: seq.created_at,
                  updatedAt: seq.updated_at,
                }));
                
                // Para cada sequência, busque as restrições de tempo
                for (const sequence of mappedSequences) {
                  const { data: restrictionsData } = await supabase
                    .rpc('get_sequence_time_restrictions', { seq_id: sequence.id });
                    
                  if (restrictionsData) {
                    sequence.timeRestrictions = restrictionsData.map((restriction: any) => ({
                      id: restriction.id,
                      name: restriction.name,
                      active: restriction.active,
                      days: restriction.days,
                      startHour: restriction.start_hour,
                      startMinute: restriction.start_minute,
                      endHour: restriction.end_hour,
                      endMinute: restriction.end_minute,
                      isGlobal: restriction.is_global,
                    }));
                  }
                }
                
                setSequences(mappedSequences);
              } else if (error) {
                console.error("Error fetching sequences:", error);
              }
              
              // 5. Buscar contatos e suas tags
              const { data: contactsData } = await supabase
                .from('contacts')
                .select('*');

              // Buscar todas as tags dos contatos
              const { data: contactTagsData } = await supabase
                .from('contact_tags')
                .select('*');
                
              if (contactsData && contactTagsData) {
                // Criar mapeamento de tags por contactId
                const tagsByContactId: Record<string, string[]> = {};
                
                contactTagsData.forEach(ct => {
                  if (!tagsByContactId[ct.contact_id]) {
                    tagsByContactId[ct.contact_id] = [];
                  }
                  tagsByContactId[ct.contact_id].push(ct.tag_name);
                });
                
                const mappedContacts = contactsData.map(contact => ({
                  id: contact.id,
                  name: contact.name,
                  phoneNumber: contact.phone_number,
                  clientId: contact.client_id,
                  inboxId: contact.inbox_id,
                  conversationId: contact.conversation_id,
                  displayId: contact.display_id,
                  tags: tagsByContactId[contact.id] || [],
                  createdAt: contact.created_at,
                  updatedAt: contact.updated_at,
                }));
                
                setContacts(mappedContacts);
              }
              
              // 6. Buscar todas as sequências de contatos e progresso
              const { data: contactSequencesData } = await supabase
                .from('contact_sequences')
                .select('*');
                
              const { data: stageProgressData } = await supabase
                .from('stage_progress')
                .select('*');
                
              if (contactSequencesData && stageProgressData) {
                // Criar mapeamento de progresso por contactSequenceId
                const progressByContactSequenceId: Record<string, StageProgress[]> = {};
                
                stageProgressData.forEach(sp => {
                  if (!progressByContactSequenceId[sp.contact_sequence_id]) {
                    progressByContactSequenceId[sp.contact_sequence_id] = [];
                  }
                  
                  progressByContactSequenceId[sp.contact_sequence_id].push({
                    stageId: sp.stage_id,
                    status: sp.status as "pending" | "completed" | "skipped",
                    completedAt: sp.completed_at,
                  });
                });
                
                const mappedContactSequences = contactSequencesData.map(cs => ({
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
                  stageProgress: progressByContactSequenceId[cs.id] || [],
                }));
                
                setContactSequences(mappedContactSequences);
              }
              
              // 7. Buscar mensagens agendadas
              const { data: scheduledMessagesData } = await supabase
                .from('scheduled_messages')
                .select('*');
                
              if (scheduledMessagesData) {
                const mappedScheduledMessages = scheduledMessagesData.map(sm => ({
                  id: sm.id,
                  contactId: sm.contact_id,
                  sequenceId: sm.sequence_id,
                  stageId: sm.stage_id,
                  scheduledTime: sm.scheduled_time,
                  scheduledAt: sm.scheduled_at,
                  sentAt: sm.sent_at,
                  status: sm.status as "pending" | "processing" | "sent" | "failed" | "persistent_error",
                  attempts: sm.attempts,
                }));
                
                setScheduledMessages(mappedScheduledMessages);
              }
              
              // 8. Buscar todas as tags disponíveis
              const { data: tagsData } = await supabase
                .from('tags')
                .select('name');
                
              if (tagsData) {
                setTags(tagsData.map(t => t.name));
              }
            }
          }
        }
      }
      
      console.info("Data refresh completed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao atualizar os dados. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  // Efeito para carregar dados iniciais após autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.info(`Auth state changed: ${event}${session?.user?.id ? ' ' + session.user.id : ''}`);
        
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          console.info("Initial data load after authentication");
          refreshData();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setClients([]);
          setInstances([]);
          setCurrentInstanceId(null);
          setSequences([]);
          setContacts([]);
          setContactSequences([]);
          setScheduledMessages([]);
          setTags([]);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Efeito para recarregar dados quando a instância atual mudar
  useEffect(() => {
    if (currentInstanceId) {
      refreshData();
    }
  }, [currentInstanceId]);
  
  return (
    <AppContext.Provider
      value={{
        user,
        clients,
        instances,
        currentInstanceId,
        sequences,
        contacts,
        contactSequences,
        scheduledMessages,
        tags,
        refreshData,
        setCurrentInstanceId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
