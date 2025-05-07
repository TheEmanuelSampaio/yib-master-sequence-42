
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Query key factory for contacts
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  detail: (id: string) => [...contactKeys.all, 'detail', id] as const,
  byInstance: (instanceId: string) => [...contactKeys.all, 'instance', instanceId] as const,
};

// Interface for query params
interface ContactsQueryParams {
  instanceId?: string;
  limit?: number;
  page?: number;
  searchQuery?: string;
  enabled?: boolean;
}

export function useContacts({
  instanceId,
  limit = 10,
  page = 1,
  searchQuery = '',
  enabled = true
}: ContactsQueryParams = {}) {
  return useQuery({
    queryKey: [...contactKeys.lists(), { instanceId, limit, page, searchQuery }],
    queryFn: async () => {
      console.log(`Fetching contacts: instance=${instanceId}, page=${page}, limit=${limit}, search=${searchQuery}`);
      
      let query = supabase
        .from('contacts')
        .select('*, contact_tags(tag_name)', { count: 'exact' });
      
      if (instanceId) {
        query = query.eq('client_id', instanceId);
      }
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`);
      }
      
      // Add pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Process contacts to include tags
      const contacts = (data || []).map(contact => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone_number,
        displayId: contact.display_id,
        conversationId: contact.conversation_id,
        inboxId: contact.inbox_id,
        clientId: contact.client_id,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at,
        tags: ((contact.contact_tags || []) as any[]).map(ct => ct.tag_name)
      }));
      
      return {
        contacts,
        totalCount: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      };
    },
    enabled: enabled && (!!instanceId || !searchQuery), // Don't run without filters if empty search
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useContact(contactId: string | undefined) {
  return useQuery({
    queryKey: contactId ? contactKeys.detail(contactId) : null,
    queryFn: async () => {
      if (!contactId) throw new Error('Contact ID is required');
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*, contact_tags(tag_name)')
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        phoneNumber: data.phone_number,
        displayId: data.display_id,
        conversationId: data.conversation_id,
        inboxId: data.inbox_id,
        clientId: data.client_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        tags: ((data.contact_tags || []) as any[]).map(ct => ct.tag_name)
      };
    },
    enabled: !!contactId,
  });
}

export function useAddContactTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ contactId, tagName }: { contactId: string, tagName: string }) => {
      const { error } = await supabase
        .from('contact_tags')
        .insert({ contact_id: contactId, tag_name: tagName });
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      toast.success(`Tag "${variables.tagName}" adicionada com sucesso`);
    },
    onError: (error) => {
      console.error('Error adding tag:', error);
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  });
}

export function useRemoveContactTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ contactId, tagName }: { contactId: string, tagName: string }) => {
      const { error } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId)
        .eq('tag_name', tagName);
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      toast.success(`Tag "${variables.tagName}" removida com sucesso`);
    },
    onError: (error) => {
      console.error('Error removing tag:', error);
      toast.error(`Erro ao remover tag: ${error.message}`);
    }
  });
}
