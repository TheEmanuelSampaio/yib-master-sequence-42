import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  Contact,
  ContactSequence,
  Instance,
  Sequence,
  SequenceStage,
  Tag,
  ScheduledMessage,
} from "@/types";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { toast } from "sonner";

// Define the types for the context
interface AppContextType {
  contacts: Contact[];
  sequences: Sequence[];
  instances: Instance[];
  tags: Tag[];
  scheduledMessages: ScheduledMessage[];
  currentInstance: Instance | null;
  currentContact: Contact | null;
  currentSequence: Sequence | null;
  isDataInitialized: boolean;
  refreshData: () => Promise<void>;
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateContact: (id: string, contact: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  deleteContact: (id: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean; error?: string }>;
  updateSequence: (id: string, sequence: Partial<Sequence>) => Promise<{ success: boolean; error?: string }>;
  deleteSequence: (id: string) => Promise<void>;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateInstance: (id: string, instance: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  addTag: (tag: Omit<Tag, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateTag: (id: string, tag: Partial<Tag>) => Promise<void>;
  deleteTag: (tag: string[]) => Promise<void>;
  addStage: (stage: Omit<SequenceStage, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateStage: (id: string, stage: Partial<SequenceStage>) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  updateScheduledMessage: (id: string, message: Partial<ScheduledMessage>) => Promise<void>;
  deleteScheduledMessage: (id: string) => Promise<void>;
  loadInstanceFromLocalStorage: () => void;
  saveInstanceToLocalStorage: (instanceId: string) => void;
  clearInstanceFromLocalStorage: () => void;
  isSuperAdmin: boolean;
  setIsSuperAdmin: (isSuperAdmin: boolean) => void;
}

// Create the context with a default value
const AppContext = createContext<AppContextType | undefined>(undefined);

// Create a provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [currentSequence, setCurrentSequence] = useState<Sequence | null>(null);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
	const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const user = useUser();
  const router = useRouter();

  // Function to load instance ID from local storage
  const loadInstanceFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      const instanceId = localStorage.getItem('currentInstanceId');
      if (instanceId) {
        console.log("Loading instance from local storage:", instanceId);
        // Find the instance in the instances array
        const instance = instances.find(i => i.id === instanceId);
        if (instance) {
          setCurrentInstance(instance);
        } else {
          console.warn("Instance not found in the instances array. Refreshing data.");
          refreshData();
        }
      }
    }
  };

  // Function to save instance ID to local storage
  const saveInstanceToLocalStorage = (instanceId: string) => {
    if (typeof window !== 'undefined') {
      console.log("Saving instance to local storage:", instanceId);
      localStorage.setItem('currentInstanceId', instanceId);
    }
  };

  // Function to clear instance ID from local storage
  const clearInstanceFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      console.log("Clearing instance from local storage");
      localStorage.removeItem('currentInstanceId');
    }
  };

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    if (!user?.id) {
      console.log("User not logged in, skipping data fetch.");
      return;
    }

    try {
      console.log("Fetching data from Supabase...");

      // Fetch instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*')
        .order('createdAt', { ascending: false });

      if (instancesError) {
        throw new Error(`Erro ao buscar instâncias: ${instancesError.message}`);
      }

      setInstances(instancesData || []);

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('createdAt', { ascending: false });

      if (contactsError) {
        throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
      }

      setContacts(contactsData || []);

      // Fetch sequences
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select('*')
        .order('createdAt', { ascending: false });

      if (sequencesError) {
        throw new Error(`Erro ao buscar sequências: ${sequencesError.message}`);
      }

      setSequences(sequencesData || []);

      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('createdAt', { ascending: false });

      if (tagsError) {
        throw new Error(`Erro ao buscar tags: ${tagsError.message}`);
      }

      setTags(tagsData || []);
      
      // Fetch scheduled messages
      const { data: scheduledMessagesData, error: scheduledMessagesError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('scheduled_time', { ascending: true });
        
      if (scheduledMessagesError) {
        throw new Error(`Erro ao buscar mensagens agendadas: ${scheduledMessagesError.message}`);
      }
      
      setScheduledMessages(scheduledMessagesData || []);

      console.log("Data fetched successfully.");
      setIsDataInitialized(true);

      // Load current instance from local storage after fetching data
      loadInstanceFromLocalStorage();
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados. Por favor, tente novamente.");
    }
  }, [user?.id, loadInstanceFromLocalStorage]);

  // Fetch super admin status
  const fetchSuperAdminStatus = useCallback(async () => {
		if (!user?.id) {
			console.log("User not logged in, skipping super admin status fetch.");
			return;
		}

		try {
			console.log("Fetching super admin status...");

			const { data: isSuperAdminData, error: isSuperAdminError } = await supabase.rpc(
				'is_super_admin',
				{ p_user_id: user.id }
			);

			if (isSuperAdminError) {
				throw new Error(`Erro ao buscar status de super admin: ${isSuperAdminError.message}`);
			}

			setIsSuperAdmin(isSuperAdminData || false);

			console.log("Super admin status fetched successfully.");
		} catch (error) {
			console.error("Erro ao buscar status de super admin:", error);
			toast.error("Erro ao carregar status de super admin. Por favor, tente novamente.");
		}
	}, [user?.id]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    setIsDataInitialized(false); // Reset the flag before refreshing data
    await fetchData();
		await fetchSuperAdminStatus();
  }, [fetchData, fetchSuperAdminStatus]);

  useEffect(() => {
    if (user?.id) {
      console.log("User logged in, fetching data.");
      refreshData();
    } else {
      console.log("User not logged in.");
      setIsDataInitialized(false);
      setContacts([]);
      setSequences([]);
      setInstances([]);
      setTags([]);
      setScheduledMessages([]);
      setCurrentInstance(null);
			setIsSuperAdmin(false);
      router.push("/login");
    }
  }, [user?.id, refreshData, router]);

  // Add a new contact
  const addContact = async (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ ...contact, id: uuidv4() }]);

      if (error) {
        throw new Error(`Erro ao adicionar contato: ${error.message}`);
      }

      setContacts(prevContacts => [...prevContacts, { ...contact, id: uuidv4() }]);
      toast.success("Contato adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar contato:", error);
      toast.error("Erro ao adicionar contato. Por favor, tente novamente.");
    }
  };

  // Update an existing contact
  const updateContact = async (id: string, contact: Partial<Contact>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update(contact)
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao atualizar contato: ${error.message}`);
      }

      setContacts(prevContacts =>
        prevContacts.map(c => (c.id === id ? { ...c, ...contact } : c))
      );
      toast.success("Contato atualizado com sucesso!");
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar contato:", error);
      toast.error("Erro ao atualizar contato. Por favor, tente novamente.");
      return { success: false, error: error.message };
    }
  };

  // Delete a contact
  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao deletar contato: ${error.message}`);
      }

      setContacts(prevContacts => prevContacts.filter(c => c.id !== id));
      toast.success("Contato deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar contato:", error);
      toast.error("Erro ao deletar contato. Por favor, tente novamente.");
    }
  };

  // Add a new sequence
  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('sequences')
        .insert([{ ...sequence, id: uuidv4() }]);

      if (error) {
        return { success: false, error: error.message };
      }

      setSequences(prevSequences => [...prevSequences, { ...sequence, id: uuidv4() }]);
      return { success: true };
    } catch (error) {
      console.error("Erro ao adicionar sequência:", error);
      return { success: false, error: error.message };
    }
  };

  // Update an existing sequence
  const updateSequence = async (id: string, sequence: Partial<Sequence>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('sequences')
        .update(sequence)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      setSequences(prevSequences =>
        prevSequences.map(s => (s.id === id ? { ...s, ...sequence } : s))
      );
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar sequência:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete a sequence
  const deleteSequence = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao deletar sequência: ${error.message}`);
      }

      setSequences(prevSequences => prevSequences.filter(s => s.id !== id));
      toast.success("Sequência deletada com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar sequência:", error);
      toast.error("Erro ao deletar sequência. Por favor, tente novamente.");
    }
  };

  // Add a new instance
  const addInstance = async (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .insert([{ ...instance, id: uuidv4() }]);

      if (error) {
        throw new Error(`Erro ao adicionar instância: ${error.message}`);
      }

      setInstances(prevInstances => [...prevInstances, { ...instance, id: uuidv4() }]);
      toast.success("Instância adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar instância:", error);
      toast.error("Erro ao adicionar instância. Por favor, tente novamente.");
    }
  };

  // Update an existing instance
  const updateInstance = async (id: string, instance: Partial<Instance>) => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .update(instance)
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao atualizar instância: ${error.message}`);
      }

      setInstances(prevInstances =>
        prevInstances.map(i => (i.id === id ? { ...i, ...instance } : i))
      );
      toast.success("Instância atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar instância:", error);
      toast.error("Erro ao atualizar instância. Por favor, tente novamente.");
    }
  };

  // Delete an instance
  const deleteInstance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao deletar instância: ${error.message}`);
      }

      setInstances(prevInstances => prevInstances.filter(i => i.id !== id));
      toast.success("Instância deletada com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar instância:", error);
      toast.error("Erro ao deletar instância. Por favor, tente novamente.");
    }
  };

  // Add a new tag
  const addTag = async (tag: Omit<Tag, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ ...tag, id: uuidv4() }]);

      if (error) {
        throw new Error(`Erro ao adicionar tag: ${error.message}`);
      }

      setTags(prevTags => [...prevTags, { ...tag, id: uuidv4() }]);
      toast.success("Tag adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar tag:", error);
      toast.error("Erro ao adicionar tag. Por favor, tente novamente.");
    }
  };

  // Update an existing tag
  const updateTag = async (id: string, tag: Partial<Tag>) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .update(tag)
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao atualizar tag: ${error.message}`);
      }

      setTags(prevTags =>
        prevTags.map(t => (t.id === id ? { ...t, ...tag } : t))
      );
      toast.success("Tag atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar tag:", error);
      toast.error("Erro ao atualizar tag. Por favor, tente novamente.");
    }
  };

  const deleteTag = async (tag: string[]) => {
    try {
      // Certifique-se de que 'tag' é sempre um array de strings
      const tagsToDelete = Array.isArray(tag) ? tag : [tag];
  
      // Use o correto operador "in" para deletar múltiplos tags de uma vez
      const { data, error } = await supabase
        .from('tags')
        .delete()
        .in('id', tagsToDelete);
  
      if (error) {
        throw new Error(`Erro ao deletar tag(s): ${error.message}`);
      }
  
      // Atualiza o estado local removendo os tags deletados
      setTags(prevTags => prevTags.filter(t => !tagsToDelete.includes(t.id)));
      toast.success("Tag(s) deletada(s) com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar tag(s):", error);
      toast.error("Erro ao deletar tag(s). Por favor, tente novamente.");
    }
  };

  // Add a new stage
  const addStage = async (stage: Omit<SequenceStage, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('sequence_stages')
        .insert([{ ...stage, id: uuidv4() }]);

      if (error) {
        throw new Error(`Erro ao adicionar estágio: ${error.message}`);
      }

      setSequences(prevSequences =>
        prevSequences.map(sequence =>
          sequence.id === stage.sequenceId
            ? { ...sequence, stages: [...sequence.stages, { ...stage, id: uuidv4() }] }
            : sequence
        )
      );
      toast.success("Estágio adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar estágio:", error);
      toast.error("Erro ao adicionar estágio. Por favor, tente novamente.");
    }
  };

  // Update an existing stage
  const updateStage = async (id: string, stage: Partial<SequenceStage>) => {
    try {
      const { data, error } = await supabase
        .from('sequence_stages')
        .update(stage)
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao atualizar estágio: ${error.message}`);
      }

      setSequences(prevSequences =>
        prevSequences.map(sequence => ({
          ...sequence,
          stages: sequence.stages.map(s => (s.id === id ? { ...s, ...stage } : s)),
        }))
      );
      toast.success("Estágio atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar estágio:", error);
      toast.error("Erro ao atualizar estágio. Por favor, tente novamente.");
    }
  };

  // Delete a stage
  const deleteStage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequence_stages')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao deletar estágio: ${error.message}`);
      }

      setSequences(prevSequences =>
        prevSequences.map(sequence => ({
          ...sequence,
          stages: sequence.stages.filter(s => s.id !== id),
        }))
      );
      toast.success("Estágio deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar estágio:", error);
      toast.error("Erro ao deletar estágio. Por favor, tente novamente.");
    }
  };
  
  // Update an existing scheduled message
  const updateScheduledMessage = async (id: string, message: Partial<ScheduledMessage>) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .update(message)
        .eq('id', id);
        
      if (error) {
        throw new Error(`Erro ao atualizar mensagem agendada: ${error.message}`);
      }
      
      setScheduledMessages(prevMessages =>
        prevMessages.map(m => (m.id === id ? { ...m, ...message } : m))
      );
      toast.success("Mensagem agendada atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar mensagem agendada:", error);
      toast.error("Erro ao atualizar mensagem agendada. Por favor, tente novamente.");
    }
  };
  
  // Delete a scheduled message
  const deleteScheduledMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw new Error(`Erro ao deletar mensagem agendada: ${error.message}`);
      }
      
      setScheduledMessages(prevMessages => prevMessages.filter(m => m.id !== id));
      toast.success("Mensagem agendada deletada com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar mensagem agendada:", error);
      toast.error("Erro ao deletar mensagem agendada. Por favor, tente novamente.");
    }
  };

  // Provide the context value
  const value: AppContextType = {
    contacts,
    sequences,
    instances,
    tags,
    scheduledMessages,
    currentInstance,
    currentContact,
    currentSequence,
    isDataInitialized,
    refreshData,
    addContact,
    updateContact,
    deleteContact,
    addSequence,
    updateSequence,
    deleteSequence,
    addInstance,
    updateInstance,
    deleteInstance,
    addTag,
    updateTag,
    deleteTag,
    addStage,
    updateStage,
    deleteStage,
    updateScheduledMessage,
    deleteScheduledMessage,
    loadInstanceFromLocalStorage,
    saveInstanceToLocalStorage,
    clearInstanceFromLocalStorage,
		isSuperAdmin,
		setIsSuperAdmin,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Create a hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
