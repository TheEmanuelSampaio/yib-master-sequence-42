
import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from '@tanstack/react-query';
import { sequenceKeys } from '@/hooks/queries/useSequences';
import { contactKeys } from '@/hooks/queries/useContacts';
import { instanceKeys } from '@/hooks/queries/useInstances';

interface RealtimeOptions {
  /** Enable sequence change subscriptions */
  enableSequences?: boolean;
  /** Enable contact change subscriptions */
  enableContacts?: boolean;
  /** Enable instance change subscriptions */
  enableInstances?: boolean;
  /** Notification callback when a change is detected */
  onNotify?: (table: string, event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void;
}

/**
 * Hook to subscribe to realtime database changes with improved error handling
 */
export function useRealtime({
  enableSequences = false,
  enableContacts = false,
  enableInstances = false,
  onNotify
}: RealtimeOptions = {}) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Create a channel for realtime updates with more specific name
    const channelName = `realtime-updates-${Date.now()}`;
    const channel = supabase.channel(channelName);
    
    let subscriptions = [];
    
    try {
      // Add subscriptions based on options
      if (enableSequences) {
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sequences'
        }, (payload) => {
          console.log('Sequences change detected:', payload);
          queryClient.invalidateQueries({ queryKey: sequenceKeys.all });
          if (onNotify && payload.new) onNotify('sequences', payload.eventType as any, payload.new);
        });
        
        // Also subscribe to sequence stages changes
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sequence_stages'
        }, (payload) => {
          console.log('Sequence stages change detected:', payload);
          // If we have a sequence_id, invalidate that specific sequence
          const sequenceId = payload.new?.sequence_id || payload.old?.sequence_id;
          if (sequenceId) {
            queryClient.invalidateQueries({ queryKey: sequenceKeys.detail(sequenceId) });
          }
          queryClient.invalidateQueries({ queryKey: sequenceKeys.all });
        });
      }
      
      if (enableContacts) {
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'contacts'
        }, (payload) => {
          console.log('Contacts change detected:', payload);
          queryClient.invalidateQueries({ queryKey: contactKeys.all });
          if (onNotify && payload.new) onNotify('contacts', payload.eventType as any, payload.new);
        });
        
        // Also subscribe to contact tags changes
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'contact_tags'
        }, (payload) => {
          console.log('Contact tags change detected:', payload);
          // If we have a contact_id, invalidate that specific contact
          const contactId = payload.new?.contact_id || payload.old?.contact_id;
          if (contactId) {
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) });
          }
          queryClient.invalidateQueries({ queryKey: contactKeys.all });
        });
      }
      
      if (enableInstances) {
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'instances'
        }, (payload) => {
          console.log('Instances change detected:', payload);
          queryClient.invalidateQueries({ queryKey: instanceKeys.all });
          if (onNotify && payload.new) onNotify('instances', payload.eventType as any, payload.new);
        });
      }
    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
    }
    
    // Subscribe to the channel with better error handling
    try {
      channel.subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Error in realtime channel, attempting to reconnect in 5s');
          // Attempt to reconnect after a delay
          setTimeout(() => {
            try {
              channel.subscribe();
            } catch (e) {
              console.error('Failed to reconnect realtime channel', e);
            }
          }, 5000);
        }
      });
    } catch (error) {
      console.error('Failed to subscribe to realtime channel:', error);
    }
    
    // Cleanup function to remove the channel when component unmounts
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
    };
  }, [enableSequences, enableContacts, enableInstances, onNotify, queryClient]);
}
