
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instance } from "@/types";

export function useInstances() {
  // Query for fetching instances
  const { 
    data: instances, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instances')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });
        
      if (error) {
        console.error("Error fetching instances:", error);
        throw error;
      }
      
      // Transform data to match the expected Instance type
      return data.map(instance => ({
        id: instance.id,
        name: instance.name,
        clientId: instance.client_id,
        active: instance.active,
        apiKey: instance.api_key,
        evolutionApiUrl: instance.evolution_api_url,
        createdAt: instance.created_at,
        createdBy: instance.created_by
      }));
    },
    staleTime: 60000, // Consider data fresh for 60 seconds
  });

  return {
    instances: instances || [],
    isLoading,
    error,
    refetch
  };
}
