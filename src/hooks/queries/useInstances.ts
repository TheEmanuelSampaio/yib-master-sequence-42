
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instance } from "@/types";
import { toast } from "sonner";

// Query key factory
export const instanceKeys = {
  all: ['instances'] as const,
  lists: () => [...instanceKeys.all, 'list'] as const,
  detail: (id: string) => [...instanceKeys.all, 'detail', id] as const,
};

export function useInstances() {
  return useQuery({
    queryKey: instanceKeys.lists(),
    queryFn: async () => {
      console.log("Fetching all instances");
      
      const { data, error } = await supabase
        .from('instances')
        .select('*, clients(*)');
      
      if (error) throw error;
      
      return (data || []).map(instance => ({
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
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useInstance(instanceId: string | undefined) {
  return useQuery({
    queryKey: instanceId ? instanceKeys.detail(instanceId) : null,
    queryFn: async () => {
      if (!instanceId) throw new Error("Instance ID is required");
      
      const { data, error } = await supabase
        .from('instances')
        .select('*, clients(*)')
        .eq('id', instanceId)
        .single();
      
      if (error) throw error;
      
      return {
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
    },
    enabled: !!instanceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateInstance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Instance> }) => {
      const { error } = await supabase
        .from('instances')
        .update({
          name: data.name,
          evolution_api_url: data.evolutionApiUrl,
          api_key: data.apiKey,
          active: data.active,
          client_id: data.clientId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      toast.success("Instância atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Error updating instance:", error);
      toast.error(`Erro ao atualizar instância: ${error.message}`);
    }
  });
}
