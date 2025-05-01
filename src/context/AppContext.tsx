
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { AppContextType, Instance, Sequence, Contact, ContactSequence, TimeRestriction, Condition, SequenceStage } from '@/types';
import { toast } from 'sonner';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isDataInitialized, setIsDataInitialized] = useState<boolean>(false);
  const [stats, setStats] = useState<any[]>([]); // Added stats
  const [tags, setTags] = useState<string[]>([]); // Added tags
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]); // Added time restrictions
  
  // Add a tag to the global tag list
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
  };
  
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch user details
        if (session?.user?.id) {
          const { data: userDetails, error: userError } = await supabase
            .from('profiles')
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
            fetchContactSequences(currentInstance.id),
            fetchTags(), // Added tags fetch
            fetchTimeRestrictions(), // Added time restrictions fetch
            fetchStats(currentInstance.id) // Added stats fetch
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
            fetchContactSequences(currentInstance.id),
            fetchStats(currentInstance.id)
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
  
  // Fetch tags from the database or local data
  const fetchTags = useCallback(async () => {
    // Mock implementation using unique tags from contacts
    const allTags: string[] = [];
    contacts.forEach(contact => {
      contact.tags?.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag);
        }
      });
    });
    setTags(allTags);
  }, [contacts]);

  // Fetch time restrictions
  const fetchTimeRestrictions = useCallback(async () => {
    // In a real app, fetch from backend
    const mockRestrictions: TimeRestriction[] = [
      {
        id: "1",
        name: "Horário noturno",
        active: true,
        days: [0, 1, 2, 3, 4, 5, 6],
        startHour: 22,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
        isGlobal: true
      },
      {
        id: "2",
        name: "Final de semana",
        active: true,
        days: [0, 6],
        startHour: 0,
        startMinute: 0,
        endHour: 23,
        endMinute: 59,
        isGlobal: true
      }
    ];
    
    setTimeRestrictions(mockRestrictions);
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async (instanceId: string) => {
    // In a real app, fetch from backend
    const mockStats = [
      {
        date: new Date().toISOString().split('T')[0],
        messages_sent: 45,
        messages_scheduled: 12,
        messages_failed: 3,
        new_contacts: 8,
        completed_sequences: 2
      },
      {
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        messages_sent: 38,
        messages_scheduled: 10,
        messages_failed: 2,
        new_contacts: 5,
        completed_sequences: 1
      }
    ];
    
    setStats(mockStats);
  }, []);
  
  const fetchSequences = useCallback(async (instanceId: string) => {
    if (!instanceId) return;
    
    const { data, error } = await supabase
      .from('sequences')
      .select('*, stages:sequence_stages(*)')
      .eq('instance_id', instanceId);
    
    if (error) {
      console.error("Erro ao buscar sequências:", error);
      toast.error(`Erro ao buscar sequências: ${error.message}`);
    } else if (data) {
      // Transform the data format to match our type
      const transformedSequences: Sequence[] = data.map(seq => {
        // Create startCondition and stopCondition from the database fields
        const startCondition: Condition = {
          type: seq.start_condition_type as 'AND' | 'OR',
          tags: seq.start_condition_tags || []
        };
        
        const stopCondition: Condition = {
          type: seq.stop_condition_type as 'AND' | 'OR',
          tags: seq.stop_condition_tags || []
        };

        // Transform stages to ensure type safety
        const typedStages: SequenceStage[] = seq.stages ? seq.stages.map((stage: any) => ({
          ...stage,
          type: stage.type as "message" | "pattern" | "typebot",
        })) : [];
        
        return {
          ...seq,
          startCondition,
          stopCondition,
          timeRestrictions: [],
          stages: typedStages
        };
      });
      
      setSequences(transformedSequences);
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
    } else if (data) {
      // Add tags to contacts (in a real app, fetch from contact_tags table)
      const contactsWithTags: Contact[] = data.map(contact => ({
        ...contact,
        tags: ['lead'] // Mock tags for now
      }));
      
      setContacts(contactsWithTags);
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
          fetchContactSequences(currentInstance.id),
          fetchStats(currentInstance.id)
        ]);
      } catch (error) {
        console.error("Erro ao atualizar dados:", error);
        toast.error(`Erro ao atualizar dados: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    }
  }, [currentInstance, fetchSequences, fetchContacts, fetchContactSequences, fetchStats]);
  
  // Function to add a new instance
  const addInstance = async (instance: Omit<Instance, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      
      // Simulation of instance creation (remove in real environment)
      const newInstance: Instance = {
        id: Math.random().toString(36).substring(2, 15), // Generates a random ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...instance,
      };
      
      setInstances(prev => [...prev, newInstance]);
      setCurrentInstance(newInstance);
      
      // In a real application, you would make an API call here
      toast.success(`Instância "${instance.name}" criada com sucesso`);
      
      // Example of a Supabase call (adapt as needed)
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
  
  // Function to update an existing instance
  const updateInstance = async (id: string, updates: Partial<Instance>) => {
    try {
      setLoading(true);
      
      setInstances(prev =>
        prev.map(instance =>
          instance.id === id ? { ...instance, ...updates, updated_at: new Date().toISOString() } : instance
        )
      );
      
      // Update current instance if being modified
      if (currentInstance?.id === id) {
        setCurrentInstance(prev => prev ? { ...prev, ...updates } : null);
      }
      
      // In a real application, you would make an API call here
      toast.success(`Instância atualizada com sucesso`);
      
      // Example of a Supabase call (adapt as needed)
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
  
  // Function to delete an instance
  const deleteInstance = async (id: string) => {
    try {
      setLoading(true);
      
      // Remove the instance from local state
      setInstances(prev => prev.filter(instance => instance.id !== id));
      
      // If the current instance is the one being removed, deselect it
      if (currentInstance?.id === id) {
        setCurrentInstance(null);
      }
      
      // In a real application, you would make an API call here
      toast.success(`Instância excluída com sucesso`);
      
      // Example of a Supabase call (adapt as needed)
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
  
  // Function to add a new sequence
  const addSequence = async (sequence: Omit<Sequence, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      
      // Simulation of sequence creation (remove in real environment)
      const newSequence: Sequence = {
        id: Math.random().toString(36).substring(2, 15), // Generates a random ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: session?.user?.id || '',
        start_condition_type: sequence.startCondition.type,
        start_condition_tags: sequence.startCondition.tags,
        stop_condition_type: sequence.stopCondition.type,
        stop_condition_tags: sequence.stopCondition.tags,
        ...sequence,
        stages: sequence.stages.map(stage => ({
          ...stage,
          id: Math.random().toString(36).substring(2, 15) // Generate random IDs for stages
        }))
      };
      
      setSequences(prev => [...prev, newSequence]);
      
      // In a real application, you would make an API call here
      toast.success(`Sequência "${sequence.name}" criada com sucesso`);
    } catch (error) {
      console.error("Erro ao criar sequência:", error);
      toast.error(`Erro ao criar sequência: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to update an existing sequence
  const updateSequence = async (id: string, data: Partial<Sequence>) => {
    try {
      setLoading(true);
      
      // Check if stages is being updated
      if (data.stages) {
        // Identify stages being removed to check if they are in use
        const existingSequence = sequences.find(seq => seq.id === id);
        if (existingSequence) {
          const existingStageIds = existingSequence.stages.map(stage => stage.id);
          const newStageIds = data.stages.map(stage => stage.id);
          
          // IDs of stages being removed
          const removedStageIds = existingStageIds.filter(stageId => !newStageIds.includes(stageId));
          
          // Check if any contact is using the stages being removed as current_stage_id
          // In a real integration with the backend, this would be done on the server
          const contactsUsingRemovedStages = contactSequences.filter(
            cs => cs.current_stage_id && removedStageIds.includes(cs.current_stage_id)
          );
          
          if (contactsUsingRemovedStages.length > 0) {
            throw new Error(
              "Não é possível remover estágios que estão sendo usados por contatos ativos na sequência. " +
              "Remova os contatos da sequência primeiro ou atualize-os para outros estágios."
            );
          }
        }
      }
      
      // Update the sequence in local state
      setSequences(prev => prev.map(seq =>
        seq.id === id
          ? { 
              ...seq,
              ...data,
              ...(data.startCondition ? {
                start_condition_type: data.startCondition.type,
                start_condition_tags: data.startCondition.tags
              } : {}),
              ...(data.stopCondition ? {
                stop_condition_type: data.stopCondition.type,
                stop_condition_tags: data.stopCondition.tags
              } : {}),
              updated_at: new Date().toISOString()
            }
          : seq
      ));
      
      // In production, implement backend update
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Erro ao atualizar sequência:", error);
      throw new Error(`Erro ao atualizar sequência: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Function to delete a sequence
  const deleteSequence = async (id: string) => {
    try {
      setLoading(true);
      
      // Remove the sequence from local state
      setSequences(prev => prev.filter(sequence => sequence.id !== id));
      
      // In a real application, you would make an API call here
      toast.success(`Sequência excluída com sucesso`);
    } catch (error) {
      setLoading(false);
      console.error("Erro ao excluir sequência:", error);
      toast.error(`Erro ao excluir sequência: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to delete a contact
  const deleteContact = async (contactId: string) => {
    try {
      // Remove the contact from local state
      setContacts(prevContacts => prevContacts.filter(contact => contact.id !== contactId));
      
      // In a real implementation, you would make an API call here
      toast.success(`Contato excluído com sucesso`);
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      toast.error(`Erro ao excluir contato: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Function to update a contact
  const updateContact = async (contactId: string, data: Partial<Omit<Contact, "id">>) => {
    try {
      // Update the contact in local state
      setContacts(prevContacts => prevContacts.map(contact => 
        contact.id === contactId ? { ...contact, ...data } : contact
      ));
      
      // In a real implementation, you would make an API call here
      toast.success(`Contato atualizado com sucesso`);
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
        profile: user,
        loading,
        instances,
        sequences,
        contacts,
        contactSequences,
        currentInstance,
        isSuperAdmin,
        isDataInitialized,
        stats,
        tags,
        timeRestrictions,
        setLoading,
        refreshData,
        fetchInstances,
        addInstance,
        updateInstance,
        deleteInstance,
        addSequence,
        updateSequence,
        deleteSequence,
        deleteContact,
        updateContact,
        addTag,
        setCurrentInstance
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
