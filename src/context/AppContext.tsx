import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Instance, Sequence, Contact, ContactSequence } from '@/types';
import { toast } from 'sonner';

interface AppContextType {
  session: Session | null;
  user: Database['public']['Tables']['users']['Row'] | null;
  loading: boolean;
  instances: Instance[];
  sequences: Sequence[];
  contacts: Contact[];
  contactSequences: ContactSequence[];
  currentInstance: Instance | null;
  isSuperAdmin: boolean;
  isDataInitialized: boolean;
  
  setSession: (session: Session | null) => void;
  setUser: (user: Database['public']['Tables']['users']['Row'] | null) => void;
  setInstances: (instances: Instance[]) => void;
  setSequences: (sequences: Sequence[]) => void;
  setContacts: (contacts: Contact[]) => void;
  setContactSequences: (contactSequences: ContactSequence[]) => void;
  setCurrentInstance: (instance: Instance | null) => void;
  setIsSuperAdmin: (isSuperAdmin: boolean) => void;
  
  refreshData: () => Promise<void>;
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInstance: (id: string, updates: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSequence: (id: string, data: Partial<Sequence>) => Promise<Promise<{ success: boolean; }>>;
  deleteSequence: (id: string) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
  updateContact: (contactId: string, data: Partial<Omit<Contact, "id">>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Database['public']['Tables']['users']['Row'] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isDataInitialized, setIsDataInitialized] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch user details
        if (session?.user?.id) {
          const { data: userDetails, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (userError) {
            console.error("Erro ao buscar detalhes do usuário:", userError);
            toast.error(`Erro ao buscar detalhes do usuário: ${userError.message}`);
          } else if (userDetails) {
            setUser(userDetails);
          }
        }
        
        // Fetch instances
        const { data: instancesData, error: instancesError } = await supabase
          .from('instances')
          .select('*');
        
        if (instancesError) {
          console.error("Erro ao buscar instâncias:", instancesError);
          toast.error(`Erro ao buscar instâncias: ${instancesError.message}`);
        } else {
          setInstances(instancesData);
          if (instancesData.length > 0 && !currentInstance) {
            setCurrentInstance(instancesData[0]);
          }
        }
        
        // Fetch sequences, contacts, and contact_sequences only if an instance is selected
        if (currentInstance) {
          await Promise.all([
            fetchSequences(currentInstance.id),
            fetchContacts(currentInstance.id),
            fetchContactSequences(currentInstance.id)
          ]);
        }
        
        // Check if user is super admin
        if (user?.id) {
          const { data: isAdmin, error: adminError } = await supabase.rpc('is_super_admin');
          if (adminError) {
            console.error("Erro ao verificar super admin:", adminError);
            toast.error(`Erro ao verificar super admin: ${adminError.message}`);
          } else {
            setIsSuperAdmin(isAdmin === true);
          }
        }
        
        setIsDataInitialized(true);
      } catch (error) {
        console.error("Erro durante a inicialização dos dados:", error);
        toast.error(`Erro ao inicializar dados: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (session && !isDataInitialized) {
      console.log("AppProvider - loading initial data");
      fetchInitialData();
    }
  }, [session, currentInstance, user?.id, isDataInitialized]);
  
  // Refresh data whenever currentInstance changes
  useEffect(() => {
    const refresh = async () => {
      if (currentInstance) {
        setLoading(true);
        try {
          await Promise.all([
            fetchSequences(currentInstance.id),
            fetchContacts(currentInstance.id),
            fetchContactSequences(currentInstance.id)
          ]);
        } catch (error) {
          console.error("Erro ao atualizar dados:", error);
          toast.error(`Erro ao atualizar dados: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setLoading(false);
        }
      }
    };
    
    if (currentInstance) {
      console.log("AppProvider - refreshing data");
      refresh();
    }
  }, [currentInstance]);
  
  const fetchSequences = useCallback(async (instanceId: string) => {
    if (!instanceId) return;
    
    const { data, error } = await supabase
      .from('sequences')
      .select('*, stages:sequence_stages(*)')
      .eq('instance_id', instanceId);
    
    if (error) {
      console.error("Erro ao buscar sequências:", error);
      toast.error(`Erro ao buscar sequências: ${error.message}`);
    } else {
      setSequences(data || []);
    }
  }, []);
  
  const fetchContacts = useCallback(async (instanceId: string) => {
    if (!instanceId) return;
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('client_id', instanceId);
    
    if (error) {
      console.error("Erro ao buscar contatos:", error);
      toast.error(`Erro ao buscar contatos: ${error.message}`);
    } else {
      setContacts(data || []);
    }
  }, []);
  
  const fetchContactSequences = useCallback(async (instanceId: string) => {
    if (!instanceId) return;
    
    const { data, error } = await supabase
      .from('contact_sequences')
      .select('*, stageProgress:stage_progress(*)')
      .in('sequence_id', sequences.map(seq => seq.id))
      .in('contact_id', contacts.map(contact => contact.id));
    
    if (error) {
      console.error("Erro ao buscar contact_sequences:", error);
      toast.error(`Erro ao buscar contact_sequences: ${error.message}`);
    } else {
      setContactSequences(data || []);
    }
  }, [sequences, contacts]);
  
  const refreshData = useCallback(async () => {
    if (currentInstance) {
      setLoading(true);
      try {
        await Promise.all([
          fetchSequences(currentInstance.id),
          fetchContacts(currentInstance.id),
          fetchContactSequences(currentInstance.id)
        ]);
      } catch (error) {
        console.error("Erro ao atualizar dados:", error);
        toast.error(`Erro ao atualizar dados: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    }
  }, [currentInstance, fetchSequences, fetchContacts, fetchContactSequences]);
  
  // Função para adicionar uma nova instância
  const addInstance = async (instance: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      
      // Simulação de criação de instância (remover em ambiente real)
      const newInstance: Instance = {
        id: Math.random().toString(36).substring(2, 15), // Gera um ID aleatório
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...instance,
      };
      
      setInstances(prev => [...prev, newInstance]);
      setCurrentInstance(newInstance);
      
      // Em uma aplicação real, você faria uma chamada para a API aqui
      toast.success(`Instância "${instance.name}" criada com sucesso`);
      
      // Exemplo de chamada para Supabase (adaptar conforme necessário)
      // const { data, error } = await supabase
      //   .from('instances')
      //   .insert([instance])
      //   .select()
      //   .single();
      
      // if (error) throw error;
    } catch (error) {
      console.error("Erro ao criar instância:", error);
      toast.error(`Erro ao criar instância: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para atualizar uma instância existente
  const updateInstance = async (id: string, updates: Partial<Instance>) => {
    try {
      setLoading(true);
      
      setInstances(prev =>
        prev.map(instance =>
          instance.id === id ? { ...instance, ...updates, updatedAt: new Date().toISOString() } : instance
        )
      );
      
      // Atualizar a instância atual se estiver sendo modificada
      if (currentInstance?.id === id) {
        setCurrentInstance(prev => prev ? { ...prev, ...updates } : null);
      }
      
      // Em uma aplicação real, você faria uma chamada para a API aqui
      toast.success(`Instância atualizada com sucesso`);
      
      // Exemplo de chamada para Supabase (adaptar conforme necessário)
      // const { data, error } = await supabase
      //   .from('instances')
      //   .update(updates)
      //   .eq('id', id)
      //   .select()
      //   .single();
      
      // if (error) throw error;
    } catch (error) {
      console.error("Erro ao atualizar instância:", error);
      toast.error(`Erro ao atualizar instância: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para remover uma instância
  const deleteInstance = async (id: string) => {
    try {
      setLoading(true);
      
      // Remover a instância do estado local
      setInstances(prev => prev.filter(instance => instance.id !== id));
      
      // Se a instância atual for a que está sendo removida, deselecionar
      if (currentInstance?.id === id) {
        setCurrentInstance(null);
      }
      
      // Em uma aplicação real, você faria uma chamada para a API aqui
      toast.success(`Instância excluída com sucesso`);
      
      // Exemplo de chamada para Supabase (adaptar conforme necessário)
      // const { error } = await supabase
      //   .from('instances')
      //   .delete()
      //   .eq('id', id);
      
      // if (error) throw error;
    } catch (error) {
      console.error("Erro ao excluir instância:", error);
      toast.error(`Erro ao excluir instância: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para adicionar uma nova sequência
  const addSequence = async (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      
      // Simulação de criação de sequência (remover em ambiente real)
      const newSequence: Sequence = {
        id: Math.random().toString(36).substring(2, 15), // Gera um ID aleatório
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...sequence,
        stages: sequence.stages.map(stage => ({
          ...stage,
          id: Math.random().toString(36).substring(2, 15) // Gerar IDs aleatórios para os estágios
        }))
      };
      
      setSequences(prev => [...prev, newSequence]);
      
      // Em uma aplicação real, você faria uma chamada para a API aqui
      toast.success(`Sequência "${sequence.name}" criada com sucesso`);
      
      // Exemplo de chamada para Supabase (adaptar conforme necessário)
      // const { data, error } = await supabase
      //   .from('sequences')
      //   .insert([sequence])
      //   .select()
      //   .single();
      
      // if (error) throw error;
    } catch (error) {
      setLoading(false);
      console.error("Erro ao criar sequência:", error);
      toast.error(`Erro ao criar sequência: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para atualizar uma sequência existente
  const updateSequence = async (id: string, data: Partial<Sequence>) => {
    try {
      setLoading(true);
      
      // Verificar se stages está sendo atualizado
      if (data.stages) {
        // Identificar os estágios que estão sendo removidos para verificar se estão em uso
        const existingSequence = sequences.find(seq => seq.id === id);
        if (existingSequence) {
          const existingStageIds = existingSequence.stages.map(stage => stage.id);
          const newStageIds = data.stages.map(stage => stage.id);
          
          // IDs dos estágios que estão sendo removidos
          const removedStageIds = existingStageIds.filter(stageId => !newStageIds.includes(stageId));
          
          // Verificar se algum contato está usando os estágios que estão sendo removidos como current_stage_id
          // Na integração real com o backend, isso seria feito no servidor
          const contactsUsingRemovedStages = contactSequences.filter(
            cs => cs.currentStageId && removedStageIds.includes(cs.currentStageId)
          );
          
          if (contactsUsingRemovedStages.length > 0) {
            throw new Error(
              "Não é possível remover estágios que estão sendo usados por contatos ativos na sequência. " +
              "Remova os contatos da sequência primeiro ou atualize-os para outros estágios."
            );
          }
        }
      }
      
      // Atualizar a sequência no estado local
      setSequences(prev => prev.map(seq =>
        seq.id === id
          ? { ...seq, ...data, updatedAt: new Date().toISOString() }
          : seq
      ));
      
      // Em produção, implementar a atualização no backend
      
      // Na versão com backend, a sequência seria atualizada no banco de dados
      // const { error } = await supabase
      //   .from("sequences")
      //   .update({
      //     ...data,
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq("id", id);
      
      // if (error) throw error;
      
      // Depois seria necessário atualizar os estágios separadamente, removendo os obsoletos
      // e adicionando os novos
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Erro ao atualizar sequência:", error);
      throw new Error(`Erro ao atualizar sequéncia: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Função para remover uma sequência
  const deleteSequence = async (id: string) => {
    try {
      setLoading(true);
      
      // Remover a sequência do estado local
      setSequences(prev => prev.filter(sequence => sequence.id !== id));
      
      // Em uma aplicação real, você faria uma chamada para a API aqui
      toast.success(`Sequência excluída com sucesso`);
      
      // Exemplo de chamada para Supabase (adaptar conforme necessário)
      // const { error } = await supabase
      //   .from('sequences')
      //   .delete()
      //   .eq('id', id);
      
      // if (error) throw error;
    } catch (error) {
      setLoading(false);
      console.error("Erro ao excluir sequência:", error);
      toast.error(`Erro ao excluir sequência: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Função para remover contato
  const deleteContact = async (contactId: string) => {
    try {
      // Remover contato do estado local
      setContacts(prevContacts => prevContacts.filter(contact => contact.id !== contactId));
      
      // Em uma implementação real, aqui faria a chamada para remover o contato na API
      toast.success(`Contato excluído com sucesso`);
      
      // Note: No ambiente de produção, você integraria isso com o backend
      // const { error } = await supabase
      //  .from('contacts')
      //  .delete()
      //  .eq('id', contactId);
      
      // if (error) throw error;
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      toast.error(`Erro ao excluir contato: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Função para atualizar contato
  const updateContact = async (contactId: string, data: Partial<Omit<Contact, "id">>) => {
    try {
      // Atualizar contato no estado local
      setContacts(prevContacts => prevContacts.map(contact => 
        contact.id === contactId ? { ...contact, ...data } : contact
      ));
      
      // Em uma implementação real, aqui faria a chamada para atualizar o contato na API
      toast.success(`Contato atualizado com sucesso`);
      
      // Note: No ambiente de produção, você integraria isso com o backend
      // const { error } = await supabase
      //  .from('contacts')
      //  .update(data)
      //  .eq('id', contactId);
      
      // if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
      toast.error(`Erro ao atualizar contato: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <AppContext.Provider
      value={{
        session,
        user,
        loading,
        instances,
        sequences,
        contacts,
        contactSequences,
        currentInstance,
        isSuperAdmin,
        isDataInitialized,
        setSession,
        setUser,
        setInstances,
        setSequences,
        setContacts,
        setContactSequences,
        setCurrentInstance,
        setIsSuperAdmin,
        refreshData,
        addInstance,
        updateInstance,
        deleteInstance,
        addSequence,
        updateSequence,
        deleteSequence,
        contacts,
        deleteContact,
        updateContact,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
