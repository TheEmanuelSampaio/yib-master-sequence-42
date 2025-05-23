
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Client, TimeRestriction, User } from "@/types";
import { ConfigContextType, Tag } from "@/types/context";
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
      
      // Map database fields to our Client interface
      const mappedClients = clientsData.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        authToken: client.auth_token,
        creator_account_name: client.creator_account_name
      }));
      
      setClients(mappedClients);
      
      // Load users from profiles table
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*');
      
      if (usersError) throw usersError;
      
      // Map database fields to our User interface
      const mappedUsers = usersData.map(profile => ({
        id: profile.id,
        accountName: profile.account_name,
        email: '', // Email isn't directly accessible from profiles
        role: profile.role,
        authToken: profile.auth_token
      }));
      
      setUsers(mappedUsers);
      
      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('created_by', user.id);
      
      if (tagsError) throw tagsError;
      
      const mappedTags = tagsData.map(tag => ({
        id: tag.id,
        name: tag.name,
        createdBy: tag.created_by,
        createdAt: tag.created_at
      }));
      
      setTags(mappedTags);
      
      // Load time restrictions
      if (currentInstance) {
        const { data: restrictionsData, error: restrictionsError } = await supabase
          .from('time_restrictions')
          .select('*')
          .eq('created_by', user.id);
        
        if (restrictionsError) throw restrictionsError;
        
        const mappedRestrictions = restrictionsData.map(restriction => ({
          id: restriction.id,
          name: restriction.name,
          active: restriction.active,
          days: restriction.days,
          startHour: restriction.start_hour,
          startMinute: restriction.start_minute, 
          endHour: restriction.end_hour,
          endMinute: restriction.end_minute,
          isGlobal: true // Assuming all from time_restrictions are global
        }));
        
        setTimeRestrictions(mappedRestrictions);
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
          account_id: client.accountId,
          account_name: client.accountName,
          created_by: user?.id,
          auth_token: client.authToken,
          creator_account_name: user?.accountName
        })
        .select();
      
      if (error) throw error;
      
      // Update local state
      if (data && data[0]) {
        const newClient: Client = {
          id: data[0].id,
          accountId: data[0].account_id,
          accountName: data[0].account_name,
          createdBy: data[0].created_by,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
          authToken: data[0].auth_token,
          creator_account_name: data[0].creator_account_name
        };
        
        setClients([...clients, newClient]);
      }
      
      return { success: true, data: data?.[0] };
    } catch (error: any) {
      console.error("Error adding client:", error);
      return { success: false, error: error.message };
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const updateData: any = {};
      if (updates.accountName) updateData.account_name = updates.accountName;
      if (updates.authToken) updateData.auth_token = updates.authToken;
      
      const { error } = await supabase
        .from('clients')
        .update(updateData)
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
      // This is a placeholder - actual user creation would be handled differently
      // typically using auth.signUp or a custom endpoint
      toast.info("Adding new users requires a proper auth implementation");
      return { success: false, error: "Not implemented directly" };
    } catch (error: any) {
      console.error("Error adding user:", error);
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const updateData: any = {};
      if (updates.accountName) updateData.account_name = updates.accountName;
      if (updates.role) updateData.role = updates.role;
      if (updates.authToken) updateData.auth_token = updates.authToken;
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
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
      // This would typically call a server-side function to handle the actual deletion
      toast.info("Deleting users requires a proper auth implementation");
      return { success: false, error: "Not implemented directly" };
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
      
      if (data && data[0]) {
        const newTag: Tag = {
          id: data[0].id,
          name: data[0].name,
          createdBy: data[0].created_by,
          createdAt: data[0].created_at
        };
        
        // Update local state
        setTags([...tags, newTag]);
        
        return { success: true, data: newTag };
      }
      
      return { success: true };
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
          active: restriction.active,
          days: restriction.days,
          start_hour: restriction.startHour,
          start_minute: restriction.startMinute,
          end_hour: restriction.endHour,
          end_minute: restriction.endMinute,
          created_by: user?.id
        })
        .select();
      
      if (error) throw error;
      
      if (data && data[0]) {
        const newRestriction: TimeRestriction = {
          id: data[0].id,
          name: data[0].name,
          active: data[0].active,
          days: data[0].days,
          startHour: data[0].start_hour,
          startMinute: data[0].start_minute,
          endHour: data[0].end_hour,
          endMinute: data[0].end_minute,
          isGlobal: true
        };
        
        // Update local state
        setTimeRestrictions([...timeRestrictions, newRestriction]);
        
        return { success: true, data: newRestriction };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Error adding time restriction:", error);
      return { success: false, error: error.message };
    }
  };

  const updateTimeRestriction = async (id: string, updates: Partial<TimeRestriction>) => {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.active !== undefined) updateData.active = updates.active;
      if (updates.days) updateData.days = updates.days;
      if (updates.startHour !== undefined) updateData.start_hour = updates.startHour;
      if (updates.startMinute !== undefined) updateData.start_minute = updates.startMinute;
      if (updates.endHour !== undefined) updateData.end_hour = updates.endHour;
      if (updates.endMinute !== undefined) updateData.end_minute = updates.endMinute;
      
      const { error } = await supabase
        .from('time_restrictions')
        .update(updateData)
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
