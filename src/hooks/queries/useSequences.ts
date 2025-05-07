
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sequence, TagCondition } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// Query key factory helps with consistent cache management
export const sequenceKeys = {
  all: ['sequences'] as const,
  byInstance: (instanceId: string) => [...sequenceKeys.all, 'instance', instanceId] as const,
  detail: (id: string) => [...sequenceKeys.all, 'detail', id] as const,
};

interface SequencesQueryParams {
  instanceId?: string;
  status?: "active" | "inactive" | "all";
  enabled?: boolean;
}

export function useSequences({ instanceId, status = "all", enabled = true }: SequencesQueryParams = {}) {
  return useQuery({
    queryKey: instanceId ? sequenceKeys.byInstance(instanceId) : sequenceKeys.all,
    queryFn: async () => {
      console.log(`Fetching sequences for instance: ${instanceId || 'all'}`);
      
      let query = supabase
        .from('sequences')
        .select(`
          *,
          sequence_stages (*),
          sequence_time_restrictions (
            *,
            time_restrictions (*)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }
      
      if (status !== "all") {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Process sequences into the expected format (similar to the AppContext processing)
      return processSequences(data || []);
    },
    enabled,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useSequence(sequenceId: string | undefined) {
  return useQuery({
    queryKey: sequenceId ? sequenceKeys.detail(sequenceId) : null,
    queryFn: async () => {
      if (!sequenceId) throw new Error("Sequence ID is required");
      
      const { data, error } = await supabase
        .from('sequences')
        .select(`
          *,
          sequence_stages (*),
          sequence_time_restrictions (
            *,
            time_restrictions (*)
          )
        `)
        .eq('id', sequenceId)
        .single();
      
      if (error) throw error;
      
      // Process sequence into the expected format
      const sequences = processSequences([data]);
      return sequences[0];
    },
    enabled: !!sequenceId,
  });
}

export function useAddSequence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
      console.log("Adding sequence:", sequence);
      
      if (!user?.id) {
        throw new Error("User authentication required");
      }
      
      // Create the sequence
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert({
          instance_id: sequence.instanceId,
          name: sequence.name,
          start_condition_type: sequence.startCondition.type,
          start_condition_tags: sequence.startCondition.tags,
          stop_condition_type: sequence.stopCondition.type,
          stop_condition_tags: sequence.stopCondition.tags,
          status: sequence.status,
          created_by: user.id
        })
        .select('*')
        .single();
      
      if (seqError) throw seqError;
      
      // Add stages
      for (let i = 0; i < sequence.stages.length; i++) {
        const stage = sequence.stages[i];
        
        const { error: stageError } = await supabase
          .from('sequence_stages')
          .insert({
            sequence_id: seqData.id,
            name: stage.name,
            type: stage.type,
            content: stage.content,
            typebot_stage: stage.typebotStage,
            delay: stage.delay,
            delay_unit: stage.delayUnit,
            order_index: i
          });
        
        if (stageError) throw stageError;
      }
      
      // Add time restrictions
      const globalRestrictions = sequence.timeRestrictions.filter(r => r.isGlobal);
      const localRestrictions = sequence.timeRestrictions.filter(r => !r.isGlobal);
      
      // Add global restrictions
      if (globalRestrictions.length > 0) {
        const { error: globalError } = await supabase
          .from("sequence_time_restrictions")
          .insert(globalRestrictions.map(r => ({
            sequence_id: seqData.id,
            time_restriction_id: r.id
          })));
          
        if (globalError) throw globalError;
      }
      
      // Add local restrictions
      if (localRestrictions.length > 0) {
        // We need to handle each restriction individually to add created_by
        for (const restriction of localRestrictions) {
          const { error: localError } = await supabase
            .from("sequence_local_restrictions")
            .insert({
              sequence_id: seqData.id,
              name: restriction.name,
              active: restriction.active,
              days: restriction.days,
              start_hour: restriction.startHour,
              start_minute: restriction.startMinute,
              end_hour: restriction.endHour,
              end_minute: restriction.endMinute,
              created_by: user.id
            });
            
          if (localError) throw localError;
        }
      }
      
      return seqData;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh the data
      if (variables.instanceId) {
        queryClient.invalidateQueries({ queryKey: sequenceKeys.byInstance(variables.instanceId) });
      }
      queryClient.invalidateQueries({ queryKey: sequenceKeys.all });
      toast.success(`Sequência "${variables.name}" criada com sucesso`);
    },
    onError: (error) => {
      console.error("Error adding sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
    }
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Sequence> }) => {
      console.log("Updating sequence:", id, updates);
      
      if (!user?.id) {
        throw new Error("User authentication required");
      }
      
      // Update the main sequence record
      if (updates.name || updates.status || updates.startCondition || updates.stopCondition) {
        const { error: seqError } = await supabase
          .from('sequences')
          .update({
            name: updates.name,
            status: updates.status,
            start_condition_type: updates.startCondition?.type,
            start_condition_tags: updates.startCondition?.tags,
            stop_condition_type: updates.stopCondition?.type,
            stop_condition_tags: updates.stopCondition?.tags,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        
        if (seqError) throw seqError;
      }
      
      // Handle stages update if provided
      if (updates.stages) {
        // Get current stages
        const { data: existingStages, error: stagesQueryError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', id);
        
        if (stagesQueryError) throw stagesQueryError;
        
        const existingStageIds = new Set((existingStages || []).map(stage => stage.id));
        const updatedStageIds = new Set(updates.stages.map(stage => stage.id));
        
        // Delete stages that aren't in the updates
        const stageIdsToDelete = (existingStages || [])
          .filter(stage => !updatedStageIds.has(stage.id))
          .map(stage => stage.id);
          
        if (stageIdsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('sequence_stages')
            .delete()
            .in('id', stageIdsToDelete);
          
          if (deleteError) throw deleteError;
        }
        
        // Update existing stages
        for (const stage of updates.stages) {
          if (existingStageIds.has(stage.id)) {
            const { error: updateError } = await supabase
              .from('sequence_stages')
              .update({
                name: stage.name,
                type: stage.type,
                content: stage.content,
                typebot_stage: stage.typebotStage,
                delay: stage.delay,
                delay_unit: stage.delayUnit,
              })
              .eq('id', stage.id);
            
            if (updateError) throw updateError;
          } else {
            // Insert new stage
            const { error: insertError } = await supabase
              .from('sequence_stages')
              .insert({
                id: stage.id,
                sequence_id: id,
                name: stage.name,
                type: stage.type,
                content: stage.content,
                typebot_stage: stage.typebotStage,
                delay: stage.delay,
                delay_unit: stage.delayUnit,
                order_index: updates.stages.indexOf(stage),
              });
            
            if (insertError) throw insertError;
          }
        }
      }
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sequenceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: sequenceKeys.all });
      toast.success("Sequência atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Error updating sequence:", error);
      toast.error(`Erro ao atualizar sequência: ${error.message}`);
    }
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sequenceKeys.all });
      toast.success("Sequência excluída com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting sequence:", error);
      toast.error(`Erro ao excluir sequência: ${error.message}`);
    }
  });
}

// Helper function to process sequences from API response to app format
function processSequences(sequencesData: any[]): Sequence[] {
  return sequencesData.map(sequence => {
    // Transform the stages in the correct format
    const stages = (sequence.sequence_stages || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        type: stage.type,
        content: stage.content,
        typebotStage: stage.typebot_stage,
        delay: stage.delay,
        delayUnit: stage.delay_unit
      }));
      
    // Get global time restrictions
    const globalTimeRestrictions = (sequence.sequence_time_restrictions || [])
      .map((str: any) => str.time_restrictions)
      .filter(Boolean)
      .map((tr: any) => ({
        id: tr.id,
        name: tr.name,
        active: tr.active,
        days: tr.days,
        startHour: tr.start_hour,
        startMinute: tr.start_minute,
        endHour: tr.end_hour,
        endMinute: tr.end_minute,
        isGlobal: true
      }));
      
    // Process local time restrictions
    // Note: This would need to be adapted if sequence_local_restrictions data is available
      
    const startType = sequence.start_condition_type === "AND" ? "AND" : "OR";
    const stopType = sequence.stop_condition_type === "AND" ? "AND" : "OR";
    const status = sequence.status === "active" ? "active" : "inactive";
    
    // Determine sequence type based on stages
    let sequenceType: "message" | "pattern" | "typebot" = "message";
    if (stages.length > 0) {
      const lastStage = stages[stages.length - 1];
      if (lastStage.type === "typebot") {
        sequenceType = "typebot";
      } else if (lastStage.type === "pattern") {
        sequenceType = "pattern";
      }
    }
    
    return {
      id: sequence.id,
      name: sequence.name,
      instanceId: sequence.instance_id,
      type: sequence.type || sequenceType,
      startCondition: {
        type: startType as "AND" | "OR",
        tags: sequence.start_condition_tags || []
      },
      stopCondition: {
        type: stopType as "AND" | "OR",
        tags: sequence.stop_condition_tags || []
      },
      status: status as "active" | "inactive",
      stages,
      timeRestrictions: globalTimeRestrictions,
      createdAt: sequence.created_at,
      updatedAt: sequence.updated_at
    };
  });
}
