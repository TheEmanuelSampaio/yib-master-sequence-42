
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Client, TimeRestriction, User, Tag } from "@/types";
import { ConfigContextType } from "@/types/context";
import { toast } from "sonner";

const defaultContextValue: ConfigContextType = {
  clients: [],
  users: [],
  tags: [],
  timeRestrictions: [],
  isLoading: false,
  addClient: async () => ({ success: false }),
  updateClient: async () => ({ success: false }),
  deleteClient: async () => ({ success: false }),
  addUser: async () => ({ success: false }),
  updateUser: async () => ({ success: false }),
  deleteUser: async () => ({ success: false }),
  addTag: async () => ({ success: false }),
  deleteTag: async () => ({ success: false }),
  addTimeRestriction: async () => ({ success: false }),
  updateTimeRestriction: async () => ({ success: false }),
  deleteTimeRestriction: async () => ({ success: false }),
  refreshConfigData: async () => {},
};

export const ConfigContext = createContext<ConfigContextType>(defaultContextValue);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { currentInstance } = useApp();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load config data when user changes or instance changes
  const refreshConfigData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log("ConfigContext: Loading configuration data...");
      
      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (clientsError) throw clientsError;
      setClients(clientsData as Client[]);
      
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      if (usersError) throw usersError;
      setUsers(usersData as User[]);
      
      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('created_by', user.id);
      
      if (tagsError) throw tagsError;
      setTags(tagsData.map(tag => ({
        id: tag.id,
        name: tag.name,
        createdBy: tag.created_by,
        createdAt: tag.created_at
      })));
      
      // Load time restrictions
      if (currentInstance) {
        const { data: restrictionsData, error: restrictionsError } = await supabase
          .from('time_restrictions')
          .select('*')
          .eq('instance_id', currentInstance.id);
        
        if (restrictionsError) throw restrictionsError;
        setTimeRestrictions(restrictionsData.map(restriction => ({
          id: restriction.id,
          name: restriction.name,
          instanceId: restriction.instance_id,
          days: restriction.days,
          startTime: restriction.start_time,
          endTime: restriction.end_time,
          createdAt: restriction.created_at,
          updatedAt: restriction.updated_at
        })));
      }
      
      console.log("ConfigContext: Configuration data loaded successfully");
      
    } catch (error: any) {
      console.error("ConfigContext: Error loading configuration data:", error);
      toast.error("Error loading configuration: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CRUD operations for clients
  const addClient = async (client: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_name: client.accountName,
          created_by: user?.id,
          auth_token: client.authToken,
          creator_account_name: user?.accountName
        })
        .select();
      
      if (error) throw error;
      
      // Update local state
      const newClient = data[0] as any;
      setClients([...clients, {
        id: newClient.id,
        accountId: newClient.account_id,
        accountName: newClient.account_name,
        createdBy: newClient.created_by,
        createdAt: newClient.created_at,
        updatedAt: newClient.updated_at,
        authToken: newClient.auth_token,
        creator_account_name: newClient.creator_account_name
      }]);
      
      return { success: true, data: newClient };
    } catch (error: any) {
      console.error("Error adding client:", error);
      return { success: false, error: error.message };
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          account_name: updates.accountName,
          auth_token: updates.authToken,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setClients(clients.map(client => 
        client.id === id ? { ...client, ...updates } : client
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating client:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setClients(clients.filter(client => client.id !== id));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting client:", error);
      return { success: false, error: error.message };
    }
  };

  // Handle CRUD operations for users
  const addUser = async (newUser: Omit<User, "id">) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: newUser.email,
          account_name: newUser.accountName,
          role: newUser.role,
        })
        .select();
      
      if (error) throw error;
      
      // Update local state
      const addedUser = data[0] as any;
      setUsers([...users, {
        id: addedUser.id,
        email: addedUser.email,
        accountName: addedUser.account_name,
        role: addedUser.role,
        active: addedUser.active,
        setupComplete: addedUser.setup_complete
      }]);
      
      return { success: true, data: addedUser };
    } catch (error: any) {
      console.error("Error adding user:", error);
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          account_name: updates.accountName,
          email: updates.email,
          role: updates.role,
          active: updates.active
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(user => 
        user.id === id ? { ...user, ...updates } : user
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating user:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setUsers(users.filter(user => user.id !== id));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting user:", error);
      return { success: false, error: error.message };
    }
  };

  // Handle CRUD operations for tags
  const addTag = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name,
          created_by: user?.id
        })
        .select();
      
      if (error) throw error;
      
      // Update local state
      const newTag = data[0] as any;
      setTags([...tags, {
        id: newTag.id,
        name: newTag.name,
        createdBy: newTag.created_by,
        createdAt: newTag.created_at
      }]);
      
      return { success: true, data: newTag };
    } catch (error: any) {
      console.error("Error adding tag:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setTags(tags.filter(tag => tag.id !== id));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      return { success: false, error: error.message };
    }
  };

  // Handle CRUD operations for time restrictions
  const addTimeRestriction = async (restriction: Omit<TimeRestriction, "id" | "createdAt" | "updatedAt">) => {
    try {
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert({
          name: restriction.name,
          instance_id: restriction.instanceId,
          days: restriction.days,
          start_time: restriction.startTime,
          end_time: restriction.endTime
        })
        .select();
      
      if (error) throw error;
      
      // Update local state
      const newRestriction = data[0] as any;
      setTimeRestrictions([...timeRestrictions, {
        id: newRestriction.id,
        name: newRestriction.name,
        instanceId: newRestriction.instance_id,
        days: newRestriction.days,
        startTime: newRestriction.start_time,
        endTime: newRestriction.end_time,
        createdAt: newRestriction.created_at,
        updatedAt: newRestriction.updated_at
      }]);
      
      return { success: true, data: newRestriction };
    } catch (error: any) {
      console.error("Error adding time restriction:", error);
      return { success: false, error: error.message };
    }
  };

  const updateTimeRestriction = async (id: string, updates: Partial<TimeRestriction>) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .update({
          name: updates.name,
          days: updates.days,
          start_time: updates.startTime,
          end_time: updates.endTime
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setTimeRestrictions(timeRestrictions.map(restriction => 
        restriction.id === id ? { ...restriction, ...updates } : restriction
      ));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating time restriction:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setTimeRestrictions(timeRestrictions.filter(restriction => restriction.id !== id));
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting time restriction:", error);
      return { success: false, error: error.message };
    }
  };

  // Initial data load
  useEffect(() => {
    if (user) {
      refreshConfigData();
    }
  }, [user, currentInstance?.id]);

  const value: ConfigContextType = {
    clients,
    users,
    tags,
    timeRestrictions,
    isLoading,
    addClient,
    updateClient,
    deleteClient,
    addUser,
    updateUser,
    deleteUser,
    addTag,
    deleteTag,
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction,
    refreshConfigData
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};
