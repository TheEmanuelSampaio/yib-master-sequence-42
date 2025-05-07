
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sequence } from "@/types";
import { toast } from "sonner";

export function useSequences(instanceId: string | undefined) {
  const queryClient = useQueryClient();
  
  // Query for fetching sequences
  const { 
    data: sequences, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['sequences', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      
      const { data, error } = await supabase
        .from('sequences')
        .select('*, stages:sequence_stages(*)')
        .eq('instance_id', instanceId)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching sequences:", error);
        throw error;
      }
      
      // Transform data to match the expected Sequence type
      return data.map(seq => ({
        id: seq.id,
        name: seq.name,
        instanceId: seq.instance_id,
        startCondition: {
          type: seq.start_condition_type,
          tags: seq.start_condition_tags || []
        },
        stopCondition: {
          type: seq.stop_condition_type,
          tags: seq.stop_condition_tags || []
        },
        status: seq.status,
        stages: seq.stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          delay: stage.delay,
          delayUnit: stage.delay_unit,
          orderIndex: stage.order_index,
          typebotStage: stage.typebot_stage
        })),
        createdAt: seq.created_at,
        updatedAt: seq.updated_at,
        createdBy: seq.created_by
      }));
    },
    enabled: !!instanceId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Add mutation for sequence status toggle
  const toggleSequenceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'active' | 'inactive' }) => {
      const { error } = await supabase
        .from('sequences')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
      return { id, status };
    },
    onSuccess: (data) => {
      // Update the cache with the new status
      queryClient.setQueryData(['sequences', instanceId], (oldData: Sequence[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(seq => {
          if (seq.id === data.id) {
            return { ...seq, status: data.status };
          }
          return seq;
        });
      });
      
      toast.success(`Sequência ${data.status === 'active' ? 'ativada' : 'desativada'} com sucesso`);
    },
    onError: (error) => {
      console.error("Error toggling sequence status:", error);
      toast.error(`Erro ao alterar status da sequência`);
    }
  });

  // Add mutation for deleting sequence
  const deleteSequenceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Update the cache by removing the deleted sequence
      queryClient.setQueryData(['sequences', instanceId], (oldData: Sequence[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(seq => seq.id !== id);
      });
      
      toast.success("Sequência excluída com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting sequence:", error);
      toast.error("Erro ao excluir sequência");
    }
  });
  
  // Add mutation for creating new sequence
  const addSequenceMutation = useMutation({
    mutationFn: async (newSequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
      if (!instanceId) throw new Error("Nenhuma instância selecionada");
      
      const sequenceData = {
        name: newSequence.name,
        instance_id: instanceId,
        start_condition_type: newSequence.startCondition.type,
        start_condition_tags: newSequence.startCondition.tags,
        stop_condition_type: newSequence.stopCondition.type,
        stop_condition_tags: newSequence.stopCondition.tags,
        status: newSequence.status,
        created_by: newSequence.createdBy
      };
      
      const { data: sequence, error } = await supabase
        .from('sequences')
        .insert(sequenceData)
        .select('*')
        .single();
        
      if (error) throw error;
      
      // Insert stages if any
      if (newSequence.stages && newSequence.stages.length > 0) {
        const stagesData = newSequence.stages.map(stage => ({
          sequence_id: sequence.id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: stage.orderIndex,
          typebot_stage: stage.typebotStage
        }));
        
        const { error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stagesData);
          
        if (stagesError) throw stagesError;
      }
      
      return sequence.id;
    },
    onSuccess: () => {
      // Refetch the sequences to get the updated list
      queryClient.invalidateQueries({ queryKey: ['sequences', instanceId] });
      toast.success("Sequência criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating sequence:", error);
      toast.error("Erro ao criar sequência");
    }
  });
  
  // Add mutation for updating existing sequence
  const updateSequenceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Omit<Sequence, "id" | "createdAt" | "updatedAt" | "stages">> }) => {
      // Convert the updates to the database column format
      const sequenceData: Record<string, any> = {};
      
      if (updates.name) sequenceData.name = updates.name;
      if (updates.status) sequenceData.status = updates.status;
      if (updates.startCondition) {
        sequenceData.start_condition_type = updates.startCondition.type;
        sequenceData.start_condition_tags = updates.startCondition.tags;
      }
      if (updates.stopCondition) {
        sequenceData.stop_condition_type = updates.stopCondition.type;
        sequenceData.stop_condition_tags = updates.stopCondition.tags;
      }
      
      const { error } = await supabase
        .from('sequences')
        .update(sequenceData)
        .eq('id', id);
        
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      // Refetch the sequences to get the updated list
      queryClient.invalidateQueries({ queryKey: ['sequences', instanceId] });
      toast.success("Sequência atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Error updating sequence:", error);
      toast.error("Erro ao atualizar sequência");
    }
  });

  return {
    sequences: sequences || [],
    isLoading,
    error,
    refetch,
    toggleSequenceStatus,
    deleteSequence: deleteSequenceMutation.mutate,
    addSequence: addSequenceMutation.mutate,
    updateSequence: (id: string, updates: any) => updateSequenceMutation.mutate({ id, updates }),
  };
}
