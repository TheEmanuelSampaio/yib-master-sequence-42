
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://mlwcupyfhtxdxcybwbmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd2N1cHlmaHR4ZHhjeWJ3Ym1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NjA0OTcsImV4cCI6MjA2MTUzNjQ5N30.qWFbDo97BLdyWO0DvzbusDCPHXHUcgCGSs8OLW0ewJ8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper function to validate UUID strings
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Helper function to check if stages are in use by any active contacts
export const checkStagesInUse = async (stageIds: string[]): Promise<{
  inUse: boolean;
  stageIds: string[];
}> => {
  try {
    if (!stageIds || stageIds.length === 0) {
      return { inUse: false, stageIds: [] };
    }

    const validIds = stageIds.filter(id => isValidUUID(id));
    if (validIds.length === 0) {
      return { inUse: false, stageIds: [] };
    }

    // Check if any stage is currently in use by a contact sequence
    const { data, error } = await supabase
      .from("contact_sequences")
      .select("current_stage_id")
      .in("current_stage_id", validIds)
      .in("status", ["active", "paused"]);

    if (error) {
      console.error("Erro ao verificar estágios em uso:", error);
      // Em caso de erro, presume que os estágios estão em uso (por segurança)
      return { inUse: true, stageIds: validIds };
    }

    const inUseStageIds = data && data.length > 0 ? 
      data.map(item => item.current_stage_id).filter(Boolean) as string[] : 
      [];

    return {
      inUse: inUseStageIds.length > 0,
      stageIds: inUseStageIds
    };
  } catch (error) {
    console.error("Erro ao verificar estágios em uso:", error);
    return { inUse: true, stageIds: [] };
  }
};

// Define types for our custom RPC functions
export type UserWithEmail = {
  id: string;
  email: string;
};

// Extend Database type to include custom RPC functions
declare module '@supabase/supabase-js' {
  interface SupabaseClient<Database> {
    rpc<
      RpcName extends 'get_users_with_emails' | 'get_sequence_time_restrictions' | 'is_super_admin',
      Args extends Record<string, unknown> = Record<string, never>
    >(
      fn: RpcName,
      args?: Args,
      options?: any
    ): RpcName extends 'get_users_with_emails'
        ? Promise<{ data: UserWithEmail[] | null; error: Error | null }>
        : RpcName extends 'get_sequence_time_restrictions'
        ? Promise<{ data: any[] | null; error: Error | null }>
        : Promise<{ data: boolean | null; error: Error | null }>;
  }
}
