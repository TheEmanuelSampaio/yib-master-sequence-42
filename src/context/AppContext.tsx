import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Instance,
  Sequence,
  Contact,
  TimeRestriction,
  ScheduledMessage,
  ContactSequence,
  Client,
  User,
  DailyStats,
  StageProgress
} from "@/types";
import { toast } from "sonner";

interface AppContextType {
  clients: Client[];
  instances: Instance[];
  currentInstance: Instance | null;
  sequences: Sequence[];
  contacts: Contact[];
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  tags: string[];
  timeRestrictions: TimeRestriction[];
  users: User[];
  stats: DailyStats[];
  setCurrentInstance: (instance: Instance) => void;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => void;
  updateInstance: (id: string, instance: Partial<Instance>) => void;
  deleteInstance: (id: string) => void;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => void;
  updateSequence: (id: string, sequence: Partial<Sequence>) => void;
  deleteSequence: (id: string) => void;
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id">) => void;
  updateTimeRestriction: (id: string, restriction: Partial<TimeRestriction>) => void;
  deleteTimeRestriction: (id: string) => void;
  addContact: (contact: Contact) => void;
  getContactSequences: (contactId: string) => ContactSequence[];
  addClient: (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addUser: (user: { email: string; password: string; accountName: string, isAdmin?: boolean }) => Promise<void>;
  updateUser: (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addTag: (tagName: string) => Promise<void>;
  deleteTag: (tagName: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DailyStats[]>([]);

  // Get contact sequences helper function
  const getContactSequences = (contactId: string): ContactSequence[] => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };

  // Fetch data when auth user changes
  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      // Clear data when user logs out
      setClients([]);
      setInstances([]);
      setCurrentInstance(null);
      setSequences([]);
      setContacts([]);
      setScheduledMessages([]);
      setContactSequences([]);
      setTags([]);
      setTimeRestrictions([]);
      setUsers([]);
      setStats([]);
    }
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    
    try {
      console.log("Refreshing data...");
      
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
      
      // Fetch instances
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
      
      // Set current instance if not already set
      if (typedInstances.length > 0 && !currentInstance) {
        const activeInstance = typedInstances.find(i => i.active) || typedInstances[0];
        setCurrentInstance(activeInstance);
      }
      
      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('name');
      
      if (tagsError) throw tagsError;
      
      setTags(tagsData.map(tag => tag.name));
      
      // Fetch time restrictions
      const { data: restrictionsData, error: restrictionsError } = await supabase
        .from('time_restrictions')
        .select('*');
      
      if (restrictionsError) throw restrictionsError;
      
      const typedRestrictions = restrictionsData.map(restriction => ({
        id: restriction.id,
        name: restriction.name,
        active: restriction.active,
        days: restriction.days,
        startHour: restriction.start_hour,
        startMinute: restriction.start_minute,
        endHour: restriction.end_hour,
        endMinute: restriction.end_minute
      }));
      
      setTimeRestrictions(typedRestrictions);
      
      // Fetch sequences and their stages
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('sequences')
        .select(`
          *,
          sequence_stages (*),
          sequence_time_restrictions (
            *,
            time_restrictions (*)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (sequencesError) throw sequencesError;
      
      console.log("Sequences fetched:", sequencesData);
      
      const typedSequences: Sequence[] = sequencesData.map(sequence => {
        // Transformar os estágios no formato correto
        const stages = sequence.sequence_stages
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((stage: any) => ({
            id: stage.id,
            name: stage.name,
            type: stage.type,
            content: stage.content,
            typebotStage: stage.typebot_stage,
            delay: stage.delay,
            delayUnit: stage.delay_unit
          }));
          
        // Transformar as restrições de tempo
        const timeRestrictions = sequence.sequence_time_restrictions
          .map((str: any) => str.time_restrictions)
          .filter(Boolean)
          .map((tr: any) => ({
            id: tr.id,
            name: tr.name,
            active: tr.active,
            days: tr.days,
            startHour: tr.start_hour,
            startMinute: tr.start_minute,
            endHour: tr.end_hour,
            endMinute: tr.end_minute
          }));
        
        return {
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          startCondition: {
            type: sequence.start_condition_type,
            tags: sequence.start_condition_tags
          },
          stopCondition: {
            type: sequence.stop_condition_type,
            tags: sequence.stop_condition_tags
          },
          status: sequence.status,
          stages,
          timeRestrictions,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at
        };
      });
      
      setSequences(typedSequences);
      console.log("Sequences set:", typedSequences);
      
      // Fetch users (only for super_admin)
      if (user.role === 'super_admin') {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
        
        if (profilesError) throw profilesError;
        
        // Get user emails from auth.users (requires admin rights)
        const usersWithEmails = await Promise.all(
          profilesData.map(async (profile) => {
            // For now, using email from user object if it's the current user
            const email = profile.id === user.id ? user.email : `user-${profile.id.substring(0, 4)}@example.com`;
            
            return {
              id: profile.id,
              accountName: profile.account_name,
              email,
              role: profile.role,
              avatar: ""
            };
          })
        );
        
        setUsers(usersWithEmails);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    }
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
      refreshData();
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
      }
      
      toast.success("Instância excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      toast.error(`Erro ao excluir instância: ${error.message}`);
    }
  };

  const addSequence = async (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      // First create the sequence
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert({
          instance_id: sequenceData.instanceId,
          name: sequenceData.name,
          start_condition_type: sequenceData.startCondition.type,
          start_condition_tags: sequenceData.startCondition.tags,
          stop_condition_type: sequenceData.stopCondition.type,
          stop_condition_tags: sequenceData.stopCondition.tags,
          status: sequenceData.status,
          created_by: user.id
        })
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      // Then create the stages
      for (let i = 0; i < sequenceData.stages.length; i++) {
        const stage = sequenceData.stages[i];
        
        const { error: stageError } = await supabase
          .from('sequence_stages')
          .insert({
            sequence_id: seqData.id,
            name: stage.name,
            type: stage.type,
            content: stage.content,
            typebot_stage: stage.typebotStage,
            delay: stage.delay,
            delay_unit: stage.delayUnit,
            order_index: i
          });
        
        if (stageError) throw stageError;
      }
      
      // Finally, add time restrictions
      for (const restriction of sequenceData.timeRestrictions) {
        const { error: restrictionError } = await supabase
          .from('sequence_time_restrictions')
          .insert({
            sequence_id: seqData.id,
            time_restriction_id: restriction.id
          });
        
        if (restrictionError) throw restrictionError;
      }
      
      toast.success(`Sequência "${sequenceData.name}" criada com sucesso`);
      
      // Importante: fazer um refresh completo dos dados para garantir que as novas sequências apareçam
      await refreshData();
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
    }
  };

  const updateSequence = async (id: string, sequenceData: Partial<Sequence>) => {
    try {
      if (sequenceData.name || sequenceData.status || 
          sequenceData.startCondition || sequenceData.stopCondition) {
        
        const updateData: any = {
          updated_at: new Date().toISOString()
        };
        
        if (sequenceData.name) updateData.name = sequenceData.name;
        if (sequenceData.status) updateData.status = sequenceData.status;
        if (sequenceData.startCondition) {
          updateData.start_condition_type = sequenceData.startCondition.type;
          updateData.start_condition_tags = sequenceData.startCondition.tags;
        }
        if (sequenceData.stopCondition) {
          updateData.stop_condition_type = sequenceData.stopCondition.type;
          updateData.stop_condition_tags = sequenceData.stopCondition.tags;
        }
        
        const { error } = await supabase
          .from('sequences')
          .update(updateData)
          .eq('id', id);
        
        if (error) throw error;
      }
      
      // Update stages if provided
      if (sequenceData.stages) {
        // First delete all existing stages
        const { error: deleteError } = await supabase
          .from('sequence_stages')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteError) throw deleteError;
        
        // Then create the new stages
        for (let i = 0; i < sequenceData.stages.length; i++) {
          const stage = sequenceData.stages[i];
          
          const { error: stageError } = await supabase
            .from('sequence_stages')
            .insert({
              sequence_id: id,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: i
            });
          
          if (stageError) throw stageError;
        }
      }
      
      // Update time restrictions if provided
      if (sequenceData.timeRestrictions) {
        // First delete all existing restrictions
        const { error: deleteRestError } = await supabase
          .from('sequence_time_restrictions')
          .delete()
          .eq('sequence_id', id);
        
        if (deleteRestError) throw deleteRestError;
        
        // Then create the new restrictions
        for (const restriction of sequenceData.timeRestrictions) {
          const { error: restrictionError } = await supabase
            .from('sequence_time_restrictions')
            .insert({
              sequence_id: id,
              time_restriction_id: restriction.id
            });
          
          if (restrictionError) throw restrictionError;
        }
      }
      
      toast.success("Sequência atualizada com sucesso");
      
      // Refresh sequences
      refreshData();
    } catch (error: any) {
      console.error("Error updating sequence:", error);
      toast.error(`Erro ao atualizar sequência: ${error.message}`);
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSequences(prev => prev.filter(sequence => sequence.id !== id));
      toast.success("Sequência excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      toast.error(`Erro ao excluir sequência: ${error.message}`);
    }
  };

  const addTimeRestriction = async (restrictionData: Omit<TimeRestriction, "id">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert({
          name: restrictionData.name,
          days: restrictionData.days,
          start_hour: restrictionData.startHour,
          start_minute: restrictionData.startMinute,
          end_hour: restrictionData.endHour,
          end_minute: restrictionData.endMinute,
          active: restrictionData.active,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newRestriction: TimeRestriction = {
        id: data.id,
        name: data.name,
        active: data.active,
        days: data.days,
        startHour: data.start_hour,
        startMinute: data.start_minute,
        endHour: data.end_hour,
        endMinute: data.end_minute
      };
      
      setTimeRestrictions(prev => [...prev, newRestriction]);
      toast.success("Restrição de horário criada com sucesso");
    } catch (error: any) {
      console.error("Error creating time restriction:", error);
      toast.error(`Erro ao criar restrição de horário: ${error.message}`);
    }
  };

  const updateTimeRestriction = async (id: string, restrictionData: Partial<TimeRestriction>) => {
    try {
      const updateData: any = {};
      
      if (restrictionData.name !== undefined) updateData.name = restrictionData.name;
      if (restrictionData.active !== undefined) updateData.active = restrictionData.active;
      if (restrictionData.days !== undefined) updateData.days = restrictionData.days;
      if (restrictionData.startHour !== undefined) updateData.start_hour = restrictionData.startHour;
      if (restrictionData.startMinute !== undefined) updateData.start_minute = restrictionData.startMinute;
      if (restrictionData.endHour !== undefined) updateData.end_hour = restrictionData.endHour;
      if (restrictionData.endMinute !== undefined) updateData.end_minute = restrictionData.endMinute;
      
      const { error } = await supabase
        .from('time_restrictions')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => 
        prev.map(restriction => 
          restriction.id === id ? { ...restriction, ...restrictionData } : restriction
        )
      );
      
      toast.success("Restrição de horário atualizada com sucesso");
    } catch (error: any) {
      console.error("Error updating time restriction:", error);
      toast.error(`Erro ao atualizar restrição de horário: ${error.message}`);
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => prev.filter(restriction => restriction.id !== id));
      toast.success("Restrição de horário excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting time restriction:", error);
      toast.error(`Erro ao excluir restrição de horário: ${error.message}`);
    }
  };

  const addContact = async (contactData: Contact) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          id: contactData.id,
          name: contactData.name,
          phone_number: contactData.phoneNumber,
          client_id: contactData.clientId,
          inbox_id: contactData.inboxId,
          conversation_id: contactData.conversationId,
          display_id: contactData.displayId
        });
      
      if (error) throw error;
      
      // Add tags
      if (contactData.tags && contactData.tags.length > 0) {
        for (const tag of contactData.tags) {
          const { error: tagError } = await supabase
            .from('contact_tags')
            .insert({
              contact_id: contactData.id,
              tag_name: tag
            });
          
          if (tagError) console.error("Error adding tag:", tagError);
        }
      }
      
      refreshData();
      toast.success("Contato adicionado com sucesso");
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error(`Erro ao adicionar contato: ${error.message}`);
    }
  };

  const addClient = async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          account_id: clientData.accountId,
          account_name: clientData.accountName,
          created_by: user.id
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
      toast.success(`Cliente "${data.account_name}" adicionado com sucesso`);
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (clientData.accountId !== undefined) updateData.account_id = clientData.accountId;
      if (clientData.accountName !== undefined) updateData.account_name = clientData.accountName;
      
      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => 
        prev.map(client => 
          client.id === id ? { ...client, ...clientData } : client
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
      
      // Check if any instances were using this client and remove them from instances list
      const affectedInstances = instances.filter(instance => instance.clientId === id);
      if (affectedInstances.length > 0) {
        setInstances(prev => prev.filter(instance => instance.clientId !== id));
        
        // If current instance was using this client, set current instance to null
        if (currentInstance && currentInstance.clientId === id) {
          const nextInstance = instances.find(i => i.clientId !== id);
          setCurrentInstance(nextInstance || null);
        }
      }
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  const addUser = async (userData: { email: string; password: string; accountName: string, isAdmin?: boolean }) => {
    try {
      // Use Supabase auth to sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error("Erro ao criar usuário");
      }
      
      // Update the profile with the account name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          account_name: userData.accountName,
          role: userData.isAdmin ? 'admin' : 'admin' // Default to admin for now
        })
        .eq('id', data.user.id);
      
      if (updateError) throw updateError;
      
      toast.success("Usuário criado com sucesso");
      refreshData();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
    }
  };

  const updateUser = async (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => {
    try {
      const updateData: any = {};
      
      if (data.accountName !== undefined) updateData.account_name = data.accountName;
      if (data.role !== undefined) updateData.role = data.role;
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setUsers(prev => 
        prev.map(u => 
          u.id === id ? { ...u, accountName: data.accountName || u.accountName, role: data.role || u.role } : u
        )
      );
      
      toast.success("Usuário atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // This requires admin privileges in Supabase
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("Usuário excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    }
  };

  const addTag = async (tagName: string) => {
    try {
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { error } = await supabase
        .from('tags')
        .insert({
          name: tagName,
          created_by: user.id
        });
      
      if (error) throw error;
      
      setTags(prev => [...prev, tagName]);
      toast.success("Tag adicionada com sucesso");
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  };

  const deleteTag = async (tagName: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('name', tagName);
      
      if (error) throw error;
      
      setTags(prev => prev.filter(tag => tag !== tagName));
      toast.success("Tag removida com sucesso");
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(`Erro ao remover tag: ${error.message}`);
    }
  };

  const value = {
    clients,
    instances,
    currentInstance,
    sequences,
    contacts,
    scheduledMessages,
    contactSequences,
    tags,
    timeRestrictions,
    users,
    stats,
    setCurrentInstance,
    addInstance,
    updateInstance,
    deleteInstance,
    addSequence,
    updateSequence,
    deleteSequence,
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction,
    addContact,
    getContactSequences,
    addClient,
    updateClient,
    deleteClient,
    addUser,
    updateUser,
    deleteUser,
    addTag,
    deleteTag,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
