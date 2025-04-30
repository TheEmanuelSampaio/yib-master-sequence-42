
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Usando URLs completas em vez de variáveis de ambiente
const SUPABASE_URL = "https://mlwcupyfhtxdxcybwbmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd2N1cHlmaHR4ZHhjeWJ3Ym1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NjA0OTcsImV4cCI6MjA2MTUzNjQ5N30.qWFbDo97BLdyWO0DvzbusDCPHXHUcgCGSs8OLW0ewJ8";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
});

// Configurar o canal realtime para as tabelas principais
export const setupRealtimeSubscription = () => {
  // Canal para atualizações de contatos e sequências
  const channel = supabase.channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contacts' },
      (payload) => {
        console.log('Contacts change received:', payload);
        // Você pode disparar uma função de refreshData aqui ou usar um evento personalizado
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contact_tags' },
      (payload) => {
        console.log('Contact tags change received:', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sequences' },
      (payload) => {
        console.log('Sequences change received:', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'scheduled_messages' },
      (payload) => {
        console.log('Scheduled messages change received:', payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
