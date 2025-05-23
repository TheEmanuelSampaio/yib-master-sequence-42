
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Instance, Client } from "@/types";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";

interface InstanceContextType {
  instances: Instance[];
  isLoading: boolean;
  currentInstance: Instance | null;
  setCurrentInstance: (instance: Instance) => void;
  addInstance: (instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  updateInstance: (id: string, instanceData: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  refreshInstances: () => Promise<void>;
}

const InstanceContext = createContext<InstanceContextType | undefined>(undefined);

export function InstanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [clients, setClients] = useState<Client[]>([]);

  // Load instances when user logs in
  useEffect(() => {
    if (user) {
      loadInstances();
    } else {
      // Clear data when user logs out
      setInstances([]);
      setCurrentInstance(null);
      setClients([]);
    }
  }, [user]);

  // Load current instance from localStorage when instances are loaded
  useEffect(() => {
    if (instances.length > 0) {
      const savedInstanceId = localStorage.getItem('selectedInstanceId');
      
      if (savedInstanceId) {
        const savedInstance = instances.find(i => i.id === savedInstanceId);
        if (savedInstance) {
          console.log("Effect: Setting saved instance:", savedInstance.name);
          setCurrentInstance(savedInstance);
        } else {
          // Fallback to first active instance if saved instance not found
          const activeInstance = instances.find(i => i.active) || instances[0];
          setCurrentInstance(activeInstance);
          localStorage.setItem('selectedInstanceId', activeInstance.id);
        }
      } else {
        // No saved instance, use first active instance
        const activeInstance = instances.find(i => i.active) || instances[0];
        setCurrentInstance(activeInstance);
        localStorage.setItem('selectedInstanceId', activeInstance.id);
      }
    }
  }, [instances]);

  // Save currentInstance to localStorage when it changes
  useEffect(() => {
    if (currentInstance) {
      localStorage.setItem('selectedInstanceId', currentInstance.id);
    }
  }, [currentInstance]);

  const handleSetCurrentInstance = (instance: Instance) => {
    setCurrentInstance(instance);
  };

  const loadInstances = async () => {
    try {
      setIsLoading(true);
      
      // First load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (clientsError) throw clientsError;
      
      const typedClients = clientsData.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at
      }));
      
      setClients(typedClients);
      
      // Then load instances with clients data
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*, clients(*)');
      
      if (instancesError) throw instancesError;
      
      const typedInstances = instancesData.map(instance => ({
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
          createdBy: instance.clients.created_by,
          createdAt: instance.clients.created_at,
          updatedAt: instance.clients.updated_at
        } : undefined,
        createdBy: instance.created_by,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at
      }));
      
      setInstances(typedInstances);
      
    } catch (error: any) {
      console.error("Error loading instances:", error);
      toast.error(`Erro ao carregar instâncias: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshInstances = async () => {
    await loadInstances();
  };

  const addInstance = async (instanceData: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('instances')
        .insert({
          name: instanceData.name,
          evolution_api_url: instanceData.evolutionApiUrl,
          api_key: instanceData.apiKey,
          active: instanceData.active,
          client_id: instanceData.clientId,
          created_by: user.id
        })
        .select('*, clients(*)')
        .single();
      
      if (error) throw error;
      
      const newInstance: Instance = {
        id: data.id,
        name: data.name,
        evolutionApiUrl: data.evolution_api_url,
        apiKey: data.api_key,
        active: data.active,
        clientId: data.client_id,
        client: data.clients ? {
          id: data.clients.id,
          accountId: data.clients.account_id,
          accountName: data.clients.account_name,
          createdBy: data.clients.created_by,
          createdAt: data.clients.created_at,
          updatedAt: data.clients.updated_at
        } : undefined,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setInstances(prev => [...prev, newInstance]);
      
      if (!currentInstance) {
        setCurrentInstance(newInstance);
      }
      
      toast.success(`Instância "${data.name}" criada com sucesso`);
    } catch (error: any) {
      console.error("Error creating instance:", error);
      toast.error(`Erro ao criar instância: ${error.message}`);
    }
  };

  const updateInstance = async (id: string, instanceData: Partial<Instance>) => {
    try {
      const { error } = await supabase
        .from('instances')
        .update({
          name: instanceData.name,
          evolution_api_url: instanceData.evolutionApiUrl,
          api_key: instanceData.apiKey,
          active: instanceData.active,
          client_id: instanceData.clientId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setInstances(prev => 
        prev.map(instance => 
          instance.id === id ? { ...instance, ...instanceData } : instance
        )
      );
      
      if (currentInstance && currentInstance.id === id) {
        setCurrentInstance(prev => prev ? { ...prev, ...instanceData } : null);
      }
      
      toast.success(`Instância atualizada com sucesso`);
      
      // Refresh instances to get updated client relationship
      await loadInstances();
    } catch (error: any) {
      console.error("Error updating instance:", error);
      toast.error(`Erro ao atualizar instância: ${error.message}`);
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('instances')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setInstances(prev => prev.filter(instance => instance.id !== id));
      
      if (currentInstance && currentInstance.id === id) {
        const nextInstance = instances.find(i => i.id !== id);
        setCurrentInstance(nextInstance || null);
        if (nextInstance) {
          localStorage.setItem('selectedInstanceId', nextInstance.id);
        } else {
          localStorage.removeItem('selectedInstanceId');
        }
      }
      
      toast.success("Instância excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      toast.error(`Erro ao excluir instância: ${error.message}`);
    }
  };

  return (
    <InstanceContext.Provider
      value={{
        instances,
        isLoading,
        currentInstance,
        setCurrentInstance: handleSetCurrentInstance,
        addInstance,
        updateInstance,
        deleteInstance,
        refreshInstances,
      }}
    >
      {children}
    </InstanceContext.Provider>
  );
}

export const useInstances = (): InstanceContextType => {
  const context = useContext(InstanceContext);
  if (!context) {
    throw new Error("useInstances must be used within an InstanceProvider");
  }
  return context;
};
