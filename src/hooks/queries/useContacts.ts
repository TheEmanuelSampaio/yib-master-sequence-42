
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types";
import { toast } from "sonner";

// Query key factory
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  byClient: (clientId: string) => [...contactKeys.all, 'client', clientId] as const,
  detail: (id: string) => [...contactKeys.all, 'detail', id] as const,
};

interface ContactsQueryParams {
  clientId?: string;
  limit?: number;
  offset?: number;
}

export function useContacts({ clientId, limit = 50, offset = 0 }: ContactsQueryParams = {}) {
  return useQuery({
    queryKey: clientId ? [...contactKeys.byClient(clientId), limit, offset] : [...contactKeys.lists(), limit, offset],
    queryFn: async () => {
      console.log(`Fetching contacts for client: ${clientId || 'all'}, limit: ${limit}, offset: ${offset}`);
      
      let query = supabase
        .from('contacts')
        .select('*')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data: contactsData, error: contactsError } = await query;
      
      if (contactsError) throw contactsError;
      
      // Fetch tags for each contact
      const contactsWithTags = await Promise.all((contactsData || []).map(async (contact) => {
        const { data: tagsData, error: tagsError } = await supabase
          .from('contact_tags')
          .select('tag_name')
          .eq('contact_id', contact.id);
          
        if (tagsError) {
          console.error(`Error fetching tags for contact ${contact.id}:`, tagsError);
          return null;
        }
        
        return {
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phone_number,
          clientId: contact.client_id,
          inboxId: contact.inbox_id,
          conversationId: contact.conversation_id,
          displayId: contact.display_id,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at,
          tags: tagsData?.map(t => t.tag_name) || []
        };
      }));
      
      return contactsWithTags.filter(Boolean) as Contact[];
    },
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useContact(contactId: string | undefined) {
  return useQuery({
    queryKey: contactId ? contactKeys.detail(contactId) : null,
    queryFn: async () => {
      if (!contactId) throw new Error("Contact ID is required");
      
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (contactError) throw contactError;
      
      const { data: tagsData, error: tagsError } = await supabase
        .from('contact_tags')
        .select('tag_name')
        .eq('contact_id', contactId);
        
      if (tagsError) throw tagsError;
      
      return {
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone_number,
        clientId: contact.client_id,
        inboxId: contact.inbox_id,
        conversationId: contact.conversation_id,
        displayId: contact.display_id,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at,
        tags: tagsData?.map(t => t.tag_name) || []
      };
    },
    enabled: !!contactId,
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Contact> }) => {
      // Update contact data
      if (data.name || data.phoneNumber) {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: data.name,
            phone_number: data.phoneNumber,
          })
          .eq('id', id);
        
        if (error) throw error;
      }
      
      // Update tags if they've changed
      if (data.tags) {
        // First delete all existing tags
        const { error: deleteError } = await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', id);
        
        if (deleteError) throw deleteError;
        
        // Then add the new tags
        if (data.tags.length > 0) {
          const { error: insertError } = await supabase
            .from('contact_tags')
            .insert(data.tags.map(tag => ({
              contact_id: id,
              tag_name: tag
            })));
          
          if (insertError) throw insertError;
        }
      }
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
      toast.success("Contato atualizado com sucesso");
    },
    onError: (error) => {
      console.error("Error updating contact:", error);
      toast.error(`Erro ao atualizar contato: ${error.message}`);
    }
  });
}
