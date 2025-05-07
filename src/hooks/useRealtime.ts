
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

// Types for realtime updates
type RealtimeSubscriptionOptions = {
  showToasts?: boolean;
  onSequenceUpdate?: (payload: any) => void;
  onContactUpdate?: (payload: any) => void;
};

// Define payload types to improve type safety
type SupabaseRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
};

export function useRealtime(options: RealtimeSubscriptionOptions = {}) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Default options
  const { 
    showToasts = true, 
    onSequenceUpdate,
    onContactUpdate
  } = options;

  useEffect(() => {
    // Only enable specific subscriptions based on the current route
    const enableSequencesSubscription = currentPath === '/' || currentPath.includes('/sequences');
    const enableContactsSubscription = currentPath === '/' || currentPath.includes('/contacts');

    // Create a Supabase Realtime channel
    const channel = supabase.channel('db-changes');
    
    // Setup subscriptions based on current route
    if (enableSequencesSubscription) {
      // Listen for sequence changes
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sequences' },
          (payload: SupabaseRealtimePayload) => {
            console.log('Sequence change detected:', payload);
            
            // Show notification if enabled
            if (showToasts) {
              if (payload.eventType === 'INSERT') {
                toast.info('Nova sequência adicionada');
              } else if (payload.eventType === 'UPDATE') {
                toast.info('Sequência atualizada');
              } else if (payload.eventType === 'DELETE') {
                toast.info('Sequência removida');
              }
            }
            
            // Safely access instance_id from payload
            const instanceId = payload.new?.instance_id || payload.old?.instance_id;
            
            // Only invalidate if we have an instanceId
            if (instanceId) {
              // Invalidate sequences query cache to trigger refetch
              queryClient.invalidateQueries({ queryKey: ['sequences', instanceId] });
            }
            
            // Call custom handler if provided
            if (onSequenceUpdate) {
              onSequenceUpdate(payload);
            }
          }
        );
        
      // Listen for sequence stage changes
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sequence_stages' },
          (payload: SupabaseRealtimePayload) => {
            // Safely access sequence_id
            const sequenceId = payload.new?.sequence_id || payload.old?.sequence_id;
            
            // Only invalidate if we have a sequenceId
            if (sequenceId) {
              // Invalidate the parent sequence query
              queryClient.invalidateQueries({ queryKey: ['sequences', sequenceId] });
            }
          }
        );
    }

    if (enableContactsSubscription) {
      // Listen for contact changes
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'contacts' },
          (payload: SupabaseRealtimePayload) => {
            console.log('Contact change detected:', payload);
            
            // Show notification if enabled
            if (showToasts) {
              if (payload.eventType === 'INSERT') {
                toast.info('Novo contato adicionado');
              } else if (payload.eventType === 'UPDATE') {
                toast.info('Contato atualizado');
              } else if (payload.eventType === 'DELETE') {
                toast.info('Contato removido');
              }
            }
            
            // Safely access client_id
            const clientId = payload.new?.client_id || payload.old?.client_id;
            
            // Only invalidate if we have a clientId
            if (clientId) {
              // Invalidate contacts query cache to trigger refetch
              queryClient.invalidateQueries({ queryKey: ['contacts', clientId] });
            }
            
            // Call custom handler if provided
            if (onContactUpdate) {
              onContactUpdate(payload);
            }
          }
        );
        
      // Listen for contact tags changes
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'contact_tags' },
          (_payload: SupabaseRealtimePayload) => {
            // For contact tags, we need to invalidate the contacts query
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }
        );
    }

    // Subscribe to the channel
    channel.subscribe();

    // Cleanup on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, currentPath, showToasts, onSequenceUpdate, onContactUpdate]);
}
