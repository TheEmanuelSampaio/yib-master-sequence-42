
import { createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sequence, TimeRestriction } from "@/types";
import { toast } from "@/hooks/use-toast";
import { usePagedData } from "@/hooks/use-paged-data";
import { queryClient } from "@/lib/queryClient";
import { isValidUUID } from "@/integrations/supabase/client";

interface SequenceContextType {
  sequences: Sequence[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  refreshSequences: () => void;
  addSequence: (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSequence: (id: string, updates: Partial<Sequence>) => Promise<{ success: boolean, error?: string }>;
  deleteSequence: (id: string) => Promise<void>;
}

const SequenceContext = createContext<SequenceContextType | undefined>(undefined);

export function SequenceProvider({ 
  children, 
  pageSize = 10,
  instanceId 
}: { 
  children: ReactNode, 
  pageSize?: number,
  instanceId?: string 
}) {
  const filter = instanceId ? { instance_id: instanceId } : {};

  const {
    data: sequences,
    isLoading,
    page,
    totalPages,
    nextPage,
    previousPage,
    goToPage,
    refetch
  } = usePagedData<Sequence>({
    pageSize,
    queryKey: ["sequences", instanceId || "all"],
    tableName: "sequences",
    orderBy: { column: "created_at", ascending: false },
    select: "*",
    relationships: `
      sequence_stages (*),
      sequence_time_restrictions (
        *,
        time_restrictions (*)
      )
    `,
    filter
  });

  const refreshSequences = () => {
    refetch();
  };

  const addSequence = async (sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Obter o ID do usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      console.log("Adding sequence:", sequenceData);
      
      // Separar as restrições em globais e locais
      const globalRestrictions = sequenceData.timeRestrictions.filter(r => r.isGlobal);
      const localRestrictions = sequenceData.timeRestrictions.filter(r => !r.isGlobal);
      
      // First create the sequence
      const { data: seqData, error: seqError } = await supabase
        .from('sequences')
        .insert({
          instance_id: sequenceData.instanceId,
          name: sequenceData.name,
          start_condition_type: sequenceData.startCondition.type,
          start_condition_tags: sequenceData.startCondition.tags,
          stop_condition_type: sequenceData.stopCondition.type,
          stop_condition_tags: sequenceData.stopCondition.tags,
          status: sequenceData.status,
          created_by: user.id,
          webhook_enabled: sequenceData.webhookEnabled,
          webhook_id: sequenceData.webhookId
        })
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      console.log("Sequence created:", seqData);
      
      // Then create the stages
      for (let i = 0; i < sequenceData.stages.length; i++) {
        const stage = sequenceData.stages[i];
        
        const { data: stageData, error: stageError } = await supabase
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
          })
          .select();
        
        if (stageError) throw stageError;
        console.log("Stage created:", stageData);
      }
      
      // Add time restrictions - handle global restrictions
      if (globalRestrictions.length > 0) {
        for (const restriction of globalRestrictions) {
          // Verificar se a restrição global existe antes de tentar adicionar
          const { data: checkRestriction } = await supabase
            .from('time_restrictions')
            .select('id')
            .eq('id', restriction.id)
            .single();
              
          if (!checkRestriction) {
            console.error(`Restrição global com ID ${restriction.id} não encontrada`);
            continue;
          }
          
          const { data: restrictionData, error: restrictionError } = await supabase
            .from('sequence_time_restrictions')
            .insert({
              sequence_id: seqData.id,
              time_restriction_id: restriction.id
            })
            .select();
          
          if (restrictionError) throw restrictionError;
          console.log("Global restriction added:", restrictionData);
        }
      }
      
      // Adicionar restrições locais à tabela sequence_local_restrictions
      if (localRestrictions.length > 0) {
        for (const restriction of localRestrictions) {
          const { error: localRestError } = await supabase
            .from('sequence_local_restrictions')
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
            
          if (localRestError) throw localRestError;
          console.log("Local restriction added for sequence");
        }
      }

      // Invalidate the query cache
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success(`Sequência "${sequenceData.name}" criada com sucesso`);
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
    }
  };

  const updateSequence = async (id: string, updates: Partial<Sequence>): Promise<{ success: boolean, error?: string }> => {
    try {
      console.log("Updating sequence with ID:", id);
      console.log("Update payload:", JSON.stringify(updates, null, 2));
      
      if (!id || !isValidUUID(id)) {
        console.error("Invalid sequence ID:", id);
        return { success: false, error: "ID de sequência inválido" };
      }
      
      // Start by updating the main sequence record
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
          webhook_enabled: updates.webhookEnabled,
          webhook_id: updates.webhookId
        })
        .eq('id', id);
      
      if (seqError) {
        console.error("Error updating sequence:", seqError);
        return { success: false, error: seqError.message };
      }
      
      // Handle stages update if provided
      if (updates.stages) {
        console.log("Processing stages update for sequence:", id);
        console.log("Total stages to process:", updates.stages.length);
        
        // Get current stages from database to compare
        const { data: existingStages, error: stagesQueryError } = await supabase
          .from('sequence_stages')
          .select('*')
          .eq('sequence_id', id);
        
        if (stagesQueryError) {
          console.error("Error fetching existing stages:", stagesQueryError);
          return { success: false, error: stagesQueryError.message };
        }
        
        console.log("Existing stages in DB:", existingStages?.length || 0);
        
        // Track stages to update, delete, and insert
        const stagesToUpdate = [];
        const stageIdsToDelete = [];
        const stagesToInsert = [];
        
        // Find existing stage IDs
        const existingStageIds = new Set(existingStages?.map(stage => stage.id) || []);
        const updatedStageIds = new Set(updates.stages.map(stage => stage.id));
        
        // Determine stages to delete (exist in DB but not in the update)
        existingStages?.forEach(existingStage => {
          if (!updatedStageIds.has(existingStage.id)) {
            stageIdsToDelete.push(existingStage.id);
          }
        });
        
        // Process each stage in the update
        updates.stages.forEach((stage, index) => {
          // Check if the stage already exists in the database
          if (existingStageIds.has(stage.id)) {
            // Update existing stage
            stagesToUpdate.push({
              id: stage.id,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: index
            });
          } else {
            // Insert new stage
            stagesToInsert.push({
              id: stage.id,
              sequence_id: id,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: index
            });
          }
        });
        
        console.log("Stages to update:", stagesToUpdate.length);
        console.log("Stages to insert:", stagesToInsert.length);
        console.log("Stage IDs to delete:", stageIdsToDelete.length);
        
        // Process deletions
        if (stageIdsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('sequence_stages')
            .delete()
            .in('id', stageIdsToDelete);
          
          if (deleteError) {
            console.error("Error deleting stages:", deleteError);
            return { success: false, error: deleteError.message };
          }
        }
        
        // Process updates (one at a time to avoid conflicts)
        for (const stage of stagesToUpdate) {
          const { error: updateError } = await supabase
            .from('sequence_stages')
            .update(stage)
            .eq('id', stage.id);
          
          if (updateError) {
            console.error(`Error updating stage ${stage.id}:`, updateError);
            return { success: false, error: updateError.message };
          }
        }
        
        // Process inserts (in batch)
        if (stagesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('sequence_stages')
            .insert(stagesToInsert);
          
          if (insertError) {
            console.error("Error inserting new stages:", insertError);
            return { success: false, error: insertError.message };
          }
        }
      }
      
      // Handle time restrictions update if provided
      if (updates.timeRestrictions) {
        // First remove all existing time restrictions
        const { error: deleteLocalError } = await supabase
          .from("sequence_local_restrictions")
          .delete()
          .eq("sequence_id", id);
        
        if (deleteLocalError) throw deleteLocalError;
        
        const { error: deleteGlobalError } = await supabase
          .from("sequence_time_restrictions")
          .delete()
          .eq("sequence_id", id);
        
        if (deleteGlobalError) throw deleteGlobalError;
        
        // Get the current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return { success: false, error: "Usuário não autenticado" };
        }
        
        // Add new local restrictions
        const localRestrictions = updates.timeRestrictions.filter(r => !r.isGlobal);
        if (localRestrictions.length > 0) {
          // Corrigido: precisamos passar cada restrição individual com o campo created_by
          for (const restriction of localRestrictions) {
            const { error: localError } = await supabase
              .from("sequence_local_restrictions")
              .insert({
                sequence_id: id,
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
        
        // Add new global restrictions
        const globalRestrictions = updates.timeRestrictions.filter(r => r.isGlobal);
        if (globalRestrictions.length > 0) {
          const globalRestrictionsData = globalRestrictions.map(r => ({
            sequence_id: id,
            time_restriction_id: r.id
          }));
          
          const { error: globalError } = await supabase
            .from("sequence_time_restrictions")
            .insert(globalRestrictionsData);
          
          if (globalError) throw globalError;
        }
      }

      // Invalidate the query cache
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      
      console.log("Sequence updated successfully");
      return { success: true };
    } catch (error: any) {
      console.error("Error in updateSequence:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Invalidate the query cache
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sequência excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      toast.error(`Erro ao excluir sequência: ${error.message}`);
    }
  };

  // Process sequences data to include time restrictions and proper typing
  const processedSequences = sequences.map(sequence => {
    // This would be where we'd transform the sequence data to match the Sequence type
    // For now, returning as-is since the usePagedData function already gives us the data in the right format
    return sequence;
  });

  return (
    <SequenceContext.Provider
      value={{
        sequences: processedSequences,
        isLoading,
        page,
        totalPages,
        nextPage,
        previousPage,
        goToPage,
        refreshSequences,
        addSequence,
        updateSequence,
        deleteSequence,
      }}
    >
      {children}
    </SequenceContext.Provider>
  );
}

export const useSequences = (): SequenceContextType => {
  const context = useContext(SequenceContext);
  if (!context) {
    throw new Error("useSequences must be used within a SequenceProvider");
  }
  return context;
};
