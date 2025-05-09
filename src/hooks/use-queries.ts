import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";

// Hook para buscar todas as instâncias
export const useInstances = () => {
  return useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instances')
        .select('*');
      if (error) {
        console.error("Erro ao buscar instâncias:", error);
        return [];
      }
      return data || [];
    },
  });
};

// Hook para buscar todos os webhooks
export const useWebhooks = () => {
  const { currentInstance } = useApp();
  
  return useQuery({
    queryKey: ['webhooks', currentInstance?.id],
    queryFn: async () => {
      if (!currentInstance) return [];
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('instance_id', currentInstance.id);
      if (error) {
        console.error("Erro ao buscar webhooks:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentInstance
  });
};

// Hook para buscar todos os usuários com email
export const useUsersWithEmails = () => {
  return useQuery({
    queryKey: ['usersWithEmails'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_with_emails');
      if (error) {
        console.error("Erro ao buscar usuários com emails:", error);
        return [];
      }
      return data || [];
    },
  });
};

// Hook para buscar todas as sequências
export const useSequences = () => {
  const { currentInstance } = useApp();
  
  return useQuery({
    queryKey: ['sequences', currentInstance?.id],
    queryFn: async () => {
      if (!currentInstance) return [];
      const { data, error } = await supabase
        .from('sequences')
        .select(`
          id, name, created_by, created_at, status,
          instance_id, start_condition_type, start_condition_tags,
          stop_condition_type, stop_condition_tags, webhook_id, webhook_enabled,
          sequence_stages (
            id, name, type, content, delay, delay_unit, order_index, typebot_stage
          ),
          sequence_time_restrictions (
            time_restriction:time_restriction_id (
              id, name, active, days, start_hour, start_minute, end_hour, end_minute
            )
          )
        `)
        .eq('instance_id', currentInstance.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Erro ao buscar sequências:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentInstance
  });
};

// Hook para buscar uma sequência específica
export const useSequence = (sequenceId) => {
  const { currentInstance } = useApp();
  
  return useQuery({
    queryKey: ['sequence', sequenceId],
    queryFn: async () => {
      if (!sequenceId || !currentInstance) return null;
      const { data, error } = await supabase
        .from('sequences')
        .select(`
          id, name, created_by, created_at, status,
          instance_id, start_condition_type, start_condition_tags,
          stop_condition_type, stop_condition_tags, webhook_id, webhook_enabled,
          sequence_stages (
            id, name, type, content, delay, delay_unit, order_index, typebot_stage
          ),
          sequence_time_restrictions (
            time_restriction:time_restriction_id (
              id, name, active, days, start_hour, start_minute, end_hour, end_minute
            )
          )
        `)
        .eq('id', sequenceId)
        .maybeSingle();
      if (error) {
        console.error("Erro ao buscar sequência:", error);
        return null;
      }
      return data || null;
    },
    enabled: !!sequenceId && !!currentInstance
  });
};

// Hook para buscar os estágios de uma sequência específica
export const useSequenceStages = (sequenceId) => {
  const { currentInstance } = useApp();
  
  return useQuery({
    queryKey: ['sequence', sequenceId, 'stages'],
    queryFn: async () => {
      if (!sequenceId || !currentInstance) return [];
      const { data, error } = await supabase
        .from('sequences')
        .select(`
          id, name, created_by, created_at, status,
          instance_id, start_condition_type, start_condition_tags,
          stop_condition_type, stop_condition_tags, webhook_id, webhook_enabled,
          sequence_stages (
            id, name, type, content, delay, delay_unit, order_index, typebot_stage
          ),
          sequence_time_restrictions (
            time_restriction:time_restriction_id (
              id, name, active, days, start_hour, start_minute, end_hour, end_minute
            )
          )
        `)
        .eq('id', sequenceId)
        .maybeSingle();
        
      if (error) {
        console.error("Erro ao buscar estágios da sequência:", error);
        return [];
      }
      
      if (!data) return [];
      
      // Mapear estágios para incluir um tipo padrão se não estiver definido
      const stages = (data.sequence_stages || [])
        .map(stage => ({
          ...stage,
          type: stage.type || "message" // Adicionando valor padrão para type
        }))
        .sort((a, b) => a.order_index - b.order_index);
      
      return {
        ...data,
        sequence_stages: stages
      };
    },
    enabled: !!sequenceId && !!currentInstance
  });
};

// Hook para buscar as restrições de tempo de uma sequência específica
export const useSequenceTimeRestrictions = (sequenceId) => {
  return useQuery({
    queryKey: ['sequence', sequenceId, 'timeRestrictions'],
    queryFn: async () => {
      if (!sequenceId) return [];
      const { data, error } = await supabase.rpc('get_sequence_time_restrictions', { seq_id: sequenceId });
      if (error) {
        console.error("Erro ao buscar restrições de tempo da sequência:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!sequenceId
  });
};
