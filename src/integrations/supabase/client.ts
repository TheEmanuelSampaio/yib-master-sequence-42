
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

// Função para buscar clientes com informações adicionais do criador usando JOIN
export const fetchClientsWithCreatorInfo = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      creator:profiles!clients_created_by_fkey(id, account_name)
    `);
  
  if (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }
  
  return data || [];
};

// Função para buscar instâncias com informações do cliente
export const fetchInstancesWithClientInfo = async () => {
  const { data, error } = await supabase
    .from('instances')
    .select(`
      *,
      client:clients(id, account_name, account_id)
    `);
  
  if (error) {
    console.error('Erro ao buscar instâncias:', error);
    throw error;
  }
  
  return data || [];
};

// Função para buscar sequências com informações da instância
export const fetchSequencesWithInstanceInfo = async () => {
  const { data, error } = await supabase
    .from('sequences')
    .select(`
      *,
      instance:instances(id, name)
    `);
  
  if (error) {
    console.error('Erro ao buscar sequências:', error);
    throw error;
  }
  
  return data || [];
};

// Função para buscar contatos com informações do cliente e tags
export const fetchContactsWithInfo = async () => {
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select(`
      *,
      client:clients(id, account_name)
    `);
  
  if (contactsError) {
    console.error('Erro ao buscar contatos:', contactsError);
    throw contactsError;
  }
  
  // Para cada contato, buscar suas tags
  if (contacts && contacts.length > 0) {
    const contactsWithTags = await Promise.all(contacts.map(async (contact) => {
      const { data: tagData, error: tagError } = await supabase
        .from('contact_tags')
        .select('tag_name')
        .eq('contact_id', contact.id);
      
      if (tagError) {
        console.error(`Erro ao buscar tags para contato ${contact.id}:`, tagError);
        return { ...contact, tags: [] };
      }
      
      const tags = tagData ? tagData.map(t => t.tag_name) : [];
      return { ...contact, tags };
    }));
    
    return contactsWithTags;
  }
  
  return contacts || [];
};

// Função para buscar tags e informações do criador
export const fetchTagsWithCreatorInfo = async () => {
  const { data, error } = await supabase
    .from('tags')
    .select(`
      *,
      creator:profiles!tags_created_by_fkey(id, account_name)
    `);
  
  if (error) {
    console.error('Erro ao buscar tags:', error);
    throw error;
  }
  
  return data || [];
};

// Função para buscar restrições de tempo e informações do criador
export const fetchTimeRestrictionsWithCreatorInfo = async () => {
  const { data, error } = await supabase
    .from('time_restrictions')
    .select(`
      *,
      creator:profiles!time_restrictions_created_by_fkey(id, account_name)
    `);
  
  if (error) {
    console.error('Erro ao buscar restrições de tempo:', error);
    throw error;
  }
  
  return data || [];
};
