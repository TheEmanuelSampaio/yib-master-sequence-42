import { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { Client, Instance, Sequence } from '@/types';

interface AppContextType {
  clients: Client[];
  instances: Instance[];
  sequences: Sequence[];
  currentInstance: Instance | null;
  isDataInitialized: boolean;
  refreshData: () => void;
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addInstance: (instance: Omit<Instance, 'id'>) => void;
  updateInstance: (id: string, updates: Partial<Instance>) => void;
  deleteInstance: (id: string) => void;
  addSequence: (sequence: Omit<Sequence, 'id' | 'instance_id'>) => void;
  updateSequence: (id: string, updates: Partial<Sequence>) => void;
  deleteSequence: (id: string) => void;
  setCurrentInstance: (instance: Instance | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const { user } = useContext(AuthContext);

  const refreshData = () => {
    setRefreshCount(prevCount => prevCount + 1);
  };

  useEffect(() => {
    const loadClients = async () => {
      console.log("Loading clients...");
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq('user_id', user?.id);

        if (error) {
          throw error;
        }

        if (data) {
          console.log(`${data.length} clients loaded`);
          setClients(data);
        }
      } catch (error) {
        console.error("Error loading clients:", error);
      }
    };

    if (user?.id) {
      loadClients();
    }
  }, [refreshCount, user?.id]);

  useEffect(() => {
    const loadInstances = async () => {
      console.log("Loading instances...");
      try {
        const { data, error } = await supabase
          .from("instances")
          .select("*")
          .eq('user_id', user?.id);

        if (error) {
          throw error;
        }

        if (data) {
          console.log(`${data.length} instances loaded`);
          setInstances(data);
          setInitialCurrentInstance(data);
        }
      } catch (error) {
        console.error("Error loading instances:", error);
      }
    };

    if (user?.id) {
      loadInstances();
    }
  }, [refreshCount, user?.id]);

  useEffect(() => {
    const loadSequences = async () => {
      console.log("Loading sequences...");
      if (!currentInstance) {
        console.log("No instance selected, skipping sequences load.");
        setSequences([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("sequences")
          .select("*")
          .eq('instance_id', currentInstance.id);

        if (error) {
          throw error;
        }

        if (data) {
          console.log(`${data.length} sequences loaded`);
          setSequences(data);
        }
      } catch (error) {
        console.error("Error loading sequences:", error);
      } finally {
        setIsDataInitialized(true);
      }
    };

    if (user?.id) {
      loadSequences();
    }
  }, [currentInstance, refreshCount, user?.id]);

  const addClient = async (client: Omit<Client, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, user_id: user?.id }])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setClients(prevClients => [...prevClients, data]);
      }
    } catch (error) {
      console.error("Error adding client:", error);
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setClients(prevClients =>
          prevClients.map(client => (client.id === id ? data : client))
        );
      }
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setClients(prevClients => prevClients.filter(client => client.id !== id));
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  const addInstance = async (instance: Omit<Instance, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .insert([{ ...instance, user_id: user?.id }])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setInstances(prevInstances => [...prevInstances, data]);
      }
    } catch (error) {
      console.error("Error adding instance:", error);
    }
  };

  const updateInstance = async (id: string, updates: Partial<Instance>) => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setInstances(prevInstances =>
          prevInstances.map(instance => (instance.id === id ? data : instance))
        );
        if (currentInstance?.id === id) {
          setCurrentInstance(data);
        }
      }
    } catch (error) {
      console.error("Error updating instance:", error);
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setInstances(prevInstances => prevInstances.filter(instance => instance.id !== id));
    } catch (error) {
      console.error("Error deleting instance:", error);
    }
  };

  const addSequence = async (sequence: Omit<Sequence, 'id' | 'instance_id'>) => {
    if (!currentInstance) {
      console.error("No instance selected. Cannot add sequence.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sequences')
        .insert([{ ...sequence, instance_id: currentInstance.id }])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setSequences(prevSequences => [...prevSequences, data]);
      }
    } catch (error) {
      console.error("Error adding sequence:", error);
    }
  };

  const updateSequence = async (id: string, updates: Partial<Sequence>) => {
    try {
      const { data, error } = await supabase
        .from('sequences')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setSequences(prevSequences =>
          prevSequences.map(sequence => (sequence.id === id ? data : sequence))
        );
      }
    } catch (error) {
      console.error("Error updating sequence:", error);
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setSequences(prevSequences => prevSequences.filter(sequence => sequence.id !== id));
    } catch (error) {
      console.error("Error deleting sequence:", error);
    }
  };
  
  const setInitialCurrentInstance = (instances: Instance[]) => {
    if (instances.length === 0) return;

    // Try to get the saved instance ID from localStorage
    const savedInstanceId = localStorage.getItem('selectedInstanceId');
    
    if (savedInstanceId) {
      const savedInstance = instances.find(instance => instance.id === savedInstanceId);
      if (savedInstance) {
        setCurrentInstance(savedInstance);
        return;
      }
    }
    
    // If no saved instance is found or it's no longer valid, use the first instance
    setCurrentInstance(instances[0]);
  };

  const value: AppContextType = {
    clients,
    instances,
    sequences,
    currentInstance,
    isDataInitialized,
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
    setCurrentInstance,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
