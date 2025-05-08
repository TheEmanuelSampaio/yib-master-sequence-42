
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instance, Client, Sequence, Contact, TimeRestriction } from "@/types";
import { useAuth } from "@/context/AuthContext";

// Function to format instances from database response
const formatInstances = (data: any[]): Instance[] => {
  return data.map(instance => ({
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
};

// Function to format clients from database response
const formatClients = (data: any[]): Client[] => {
  return data.map(client => ({
    id: client.id,
    accountId: client.account_id,
    accountName: client.account_name,
    createdBy: client.created_by,
    createdAt: client.created_at,
    updatedAt: client.updated_at
  }));
};

export function useInstances() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('instances')
        .select('*, clients(*)');
      
      if (error) {
        console.error("Error fetching instances:", error);
        throw error;
      }
      
      return formatInstances(data || []);
    },
    enabled: !!user,
  });
}

export function useClients() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      
      if (error) {
        console.error("Error fetching clients:", error);
        throw error;
      }
      
      return formatClients(data || []);
    },
    enabled: !!user,
  });
}

export function useSequences(instanceId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sequences', { instanceId }],
    queryFn: async () => {
      if (!user || !instanceId) return [];
      
      const { data, error } = await supabase
        .from('sequences')
        .select(`
          *,
          sequence_stages (*),
          sequence_time_restrictions (
            *,
            time_restrictions (*)
          )
        `)
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching sequences:", error);
        throw error;
      }
      
      // Process sequences (simplified version - expand as needed)
      return data.map(sequence => {
        // Transform stages
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
        
        return {
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          // Add default type if not present in the database
          type: sequence.type || "message",
          startCondition: {
            type: sequence.start_condition_type,
            tags: sequence.start_condition_tags || []
          },
          stopCondition: {
            type: sequence.stop_condition_type,
            tags: sequence.stop_condition_tags || []
          },
          status: sequence.status,
          stages,
          timeRestrictions: [], // Would need additional processing here
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at,
          createdBy: sequence.created_by,
          webhookEnabled: sequence.webhook_enabled || false,
          webhookId: sequence.webhook_id || undefined
        };
      });
    },
    enabled: !!user && !!instanceId,
  });
}

export function useContacts(instanceId?: string, limit: number = 100) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['contacts', { instanceId, limit }],
    queryFn: async () => {
      if (!user || !instanceId) return [];
      
      // First get instances to find clients
      const { data: instanceData, error: instanceError } = await supabase
        .from('instances')
        .select('client_id')
        .eq('id', instanceId)
        .single();
      
      if (instanceError) {
        console.error("Error fetching instance client:", instanceError);
        throw instanceError;
      }
      
      const clientId = instanceData?.client_id;
      if (!clientId) return [];
      
      // Fetch contacts by client ID
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error("Error fetching contacts:", error);
        throw error;
      }
      
      // Fetch tags for each contact
      const contactsWithTags = await Promise.all(data.map(async (contact) => {
        const { data: tagsData } = await supabase
          .from('contact_tags')
          .select('tag_name')
          .eq('contact_id', contact.id);
        
        return {
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phone_number,
          clientId: contact.client_id,
          clientName: '', // Would need to join with clients table
          adminId: undefined, // Would need additional processing
          adminName: '', // Would need additional processing
          inboxId: contact.inbox_id,
          conversationId: contact.conversation_id,
          displayId: contact.display_id,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at,
          tags: tagsData?.map(t => t.tag_name) || []
        };
      }));
      
      return contactsWithTags;
    },
    enabled: !!user && !!instanceId,
  });
}

export function useTags() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('tags')
        .select('name');
      
      if (error) {
        console.error("Error fetching tags:", error);
        throw error;
      }
      
      return data.map(tag => tag.name);
    },
    enabled: !!user,
  });
}

export function useTimeRestrictions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['timeRestrictions'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('time_restrictions')
        .select('*');
      
      if (error) {
        console.error("Error fetching time restrictions:", error);
        throw error;
      }
      
      return data.map(restriction => ({
        id: restriction.id,
        name: restriction.name,
        active: restriction.active,
        days: restriction.days,
        startHour: restriction.start_hour,
        startMinute: restriction.start_minute,
        endHour: restriction.end_hour,
        endMinute: restriction.end_minute,
        isGlobal: true
      }));
    },
    enabled: !!user,
  });
}
