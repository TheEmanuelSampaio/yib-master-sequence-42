
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types";
import { toast } from "sonner";

export function useContacts(instanceId: string | undefined, options = { enabled: true }) {
  const queryClient = useQueryClient();
  
  // Query for fetching contacts
  const { 
    data: contacts, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['contacts', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*, contact_tags(tag_name)')
        .eq('client_id', instanceId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching contacts:", error);
        throw error;
      }
      
      // Transform data to match the expected Contact type
      return data.map(contact => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone_number,
        clientId: contact.client_id,
        inboxId: contact.inbox_id,
        conversationId: contact.conversation_id,
        displayId: contact.display_id,
        tags: contact.contact_tags ? contact.contact_tags.map((t: any) => t.tag_name) : [],
        createdAt: contact.created_at
      }));
    },
    enabled: !!instanceId && options.enabled,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  return {
    contacts: contacts || [],
    isLoading,
    error,
    refetch
  };
}
