
import { createContext, useContext, useState } from "react";
import { Client } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface ClientsContextType {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  refreshClients: () => Promise<void>;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export const ClientsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);

  const refreshClients = async () => {
    try {
      if (!currentUser) return;
      
      // Fetch clients
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
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast.error(`Erro ao carregar clientes: ${error.message}`);
    }
  };

  const addClient = async (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!currentUser) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: client.accountId,
          account_name: client.accountName,
          creator_account_name: currentUser.accountName || 'Unknown',  // Add this field
          created_by: currentUser.id
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
        updatedAt: data.updated_at
      };
      
      setClients(prev => [...prev, newClient]);
      toast.success(`Cliente "${client.accountName}" criado com sucesso`);
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast.error(`Erro ao criar cliente: ${error.message}`);
    }
  };

  const updateClient = async (id: string, client: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          account_id: client.accountId,
          account_name: client.accountName,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => 
        prev.map(c => 
          c.id === id ? { ...c, ...client } : c
        )
      );
      
      toast.success("Cliente atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => prev.filter(client => client.id !== id));
      toast.success("Cliente excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  return (
    <ClientsContext.Provider value={{
      clients,
      setClients,
      addClient,
      updateClient,
      deleteClient,
      refreshClients
    }}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientsContext);
  if (context === undefined) {
    throw new Error("useClients must be used within a ClientsProvider");
  }
  return context;
};
