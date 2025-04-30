
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const createSupabaseClient = (supabaseUrl: string, supabaseKey: string) => {
  return createClient(supabaseUrl, supabaseKey);
};
