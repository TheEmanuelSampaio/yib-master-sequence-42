
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = "https://mlwcupyfhtxdxcybwbmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd2N1cHlmaHR4ZHhjeWJ3Ym1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NjA0OTcsImV4cCI6MjA2MTUzNjQ5N30.qWFbDo97BLdyWO0DvzbusDCPHXHUcgCGSs8OLW0ewJ8";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Função para validar UUID
export const isValidUUID = (uuid: string): boolean => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
};

// Função para gerar um UUID válido
export const generateUUID = (): string => {
  return uuidv4();
};

// Função para buscar clientes
export const fetchClientsWithCreatorInfo = async () => {
  try {
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
  } catch (error) {
    console.error('Erro ao processar fetch de clientes:', error);
    throw error;
  }
};

// Função para buscar instâncias com informações do cliente
export const fetchInstancesWithClientInfo = async () => {
  try {
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
  } catch (error) {
    console.error('Erro ao processar fetch de instâncias:', error);
    throw error;
  }
};

// Função para buscar sequências com informações da instância
export const fetchSequencesWithInstanceInfo = async () => {
  try {
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
  } catch (error) {
    console.error('Erro ao processar fetch de sequências:', error);
    throw error;
  }
};

// Função para buscar contatos com informações do cliente e tags
export const fetchContactsWithInfo = async () => {
  try {
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
        try {
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
        } catch (error) {
          console.error(`Erro ao processar tags para contato ${contact.id}:`, error);
          return { ...contact, tags: [] };
        }
      }));
      
      return contactsWithTags;
    }
    
    return contacts || [];
  } catch (error) {
    console.error('Erro ao processar fetch de contatos:', error);
    throw error;
  }
};

// Função para buscar tags
export const fetchTagsWithCreatorInfo = async () => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar tags:', error);
      throw error;
    }
    
    return data ? data.map(tag => tag.name) : [];
  } catch (error) {
    console.error('Erro ao processar fetch de tags:', error);
    throw error;
  }
};

// Função para buscar restrições de tempo
export const fetchTimeRestrictionsWithCreatorInfo = async () => {
  try {
    const { data, error } = await supabase
      .from('time_restrictions')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar restrições de tempo:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao processar fetch de restrições de tempo:', error);
    throw error;
  }
};

// Adicionar uma função para buscar estatísticas diárias
export const fetchDailyStats = async () => {
  try {
    const { data, error } = await supabase
      .from('daily_stats')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar estatísticas diárias:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao processar fetch de estatísticas diárias:', error);
    throw error;
  }
};
