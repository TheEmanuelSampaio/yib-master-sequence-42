
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://mlwcupyfhtxdxcybwbmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd2N1cHlmaHR4ZHhjeWJ3Ym1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NjA0OTcsImV4cCI6MjA2MTUzNjQ5N30.qWFbDo97BLdyWO0DvzbusDCPHXHUcgCGSs8OLW0ewJ8";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Função auxiliar para buscar clientes com dados do criador
export const fetchClientsWithCreatorInfo = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      creator:created_by(id, account_name)
    `);

  if (error) {
    console.error('Erro ao buscar clientes com informações do criador:', error);
    throw error;
  }

  return data;
};
