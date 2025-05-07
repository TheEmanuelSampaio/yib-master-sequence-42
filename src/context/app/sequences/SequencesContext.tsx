
import { createContext, useContext, useState } from "react";
import { Sequence } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { useInstances } from "../instances/InstancesContext";
import { ExtendedSequence } from "../types";
import { transformSequence, isValidArray } from "../utils";
import { isValidUUID } from "@/integrations/supabase/client";

interface SequencesContextType {
  sequences: Sequence[];
  setSequences: (sequences: Sequence[]) => void;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSequence: (id: string, updates: Partial<Sequence>) => Promise<{ success: boolean, error?: string }>;
  deleteSequence: (id: string) => Promise<void>;
  refreshSequences: () => Promise<void>;
}

const SequencesContext = createContext<SequencesContextType | undefined>(undefined);

export const SequencesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const { currentInstance } = useInstances();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshSequences = async () => {
    try {
      if (!currentUser) return;
      setLoading(true);
      
      // Fetch sequences and their stages
      const { data: sequencesData, error: sequencesError } = await supabase
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
      
      if (sequencesError) throw sequencesError;
      
      // Ensure sequencesData is always an array
      const safeSequencesData = Array.isArray(sequencesData) ? sequencesData : [];
      
      // Process sequences
      const processedSequences = safeSequencesData as ExtendedSequence[];
      
      for (const sequence of processedSequences) {
        // Add local time restrictions
        sequence.localTimeRestrictions = [];
        
        const { data: localRestrictions, error: localRestError } = await supabase
          .from('sequence_local_restrictions')
          .select('*')
          .eq('sequence_id', sequence.id);
          
        if (localRestError) {
          console.error("Erro ao carregar restrições locais:", localRestError);
          continue;
        }
        
        // Add local restrictions if exist
        if (isValidArray(localRestrictions) && localRestrictions.length > 0) {
          const typedLocalRestrictions = localRestrictions.map(lr => ({
            id: lr.id,
            name: lr.name,
            active: lr.active,
            days: lr.days,
            startHour: lr.start_hour,
            startMinute: lr.start_minute,
            endHour: lr.end_hour,
            endMinute: lr.end_minute,
            isGlobal: false
          }));
          
          sequence.localTimeRestrictions = typedLocalRestrictions;
        }
      }
      
      // Transform sequences to application format
      const typedSequences = processedSequences.map(transformSequence);
      
      setSequences(typedSequences);
    } catch (error: any) {
      console.error("Error fetching sequences:", error);
      toast.error(`Erro ao carregar sequências: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!currentInstance || !currentUser) return;

      // Fix TypeScript error: Type 'string' is not assignable to type '"AND" | "OR"'
      const startConditionType = sequence.startCondition.type as "AND" | "OR";
      const stopConditionType = sequence.stopCondition.type as "AND" | "OR";

      const { data, error } = await supabase
        .from("sequences")
        .insert({
          name: sequence.name,
          instance_id: currentInstance.id,
          created_by: currentUser.id,
          start_condition_type: startConditionType,
          start_condition_tags: sequence.startCondition.tags,
          stop_condition_type: stopConditionType,
          stop_condition_tags: sequence.stopCondition.tags,
          status: sequence.status,
          webhook_enabled: sequence.webhookEnabled || false,
          webhook_id: sequence.webhookId || null,
        })
        .select();
      
      if (error) throw error;
      
      console.log("Sequence created:", data);
      
      // Create the stages
      for (let i = 0; i < sequence.stages.length; i++) {
        const stage = sequence.stages[i];
        
        const { data: stageData, error: stageError } = await supabase
          .from('sequence_stages')
          .insert({
            sequence_id: data[0].id,
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
      if (sequence.timeRestrictions) {
        const globalRestrictions = sequence.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = sequence.timeRestrictions.filter(r => !r.isGlobal);
        
        if (globalRestrictions.length > 0) {
          for (const restriction of globalRestrictions) {
            // Check if global restriction exists before adding
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
                sequence_id: data[0].id,
                time_restriction_id: restriction.id
              })
              .select();
            
            if (restrictionError) throw restrictionError;
            console.log("Global restriction added:", restrictionData);
          }
        }
        
        if (localRestrictions.length > 0) {
          for (const restriction of localRestrictions) {
            const { error: localRestError } = await supabase
              .from('sequence_local_restrictions')
              .insert({
                sequence_id: data[0].id,
                name: restriction.name,
                active: restriction.active,
                days: restriction.days,
                start_hour: restriction.startHour,
                start_minute: restriction.startMinute,
                end_hour: restriction.endHour,
                end_minute: restriction.endMinute,
                created_by: currentUser.id
              });
            
            if (localRestError) throw localRestError;
            console.log("Local restriction added for sequence");
          }
        }
      }
      
      toast.success(`Sequência "${sequence.name}" criada com sucesso`);
      
      // Refresh sequences to get the updated data
      await refreshSequences();
    } catch (error: any) {
      console.error("Error creating sequence:", error);
      toast.error(`Erro ao criar sequência: ${error.message}`);
    }
  };

  const updateSequence = async (
    id: string, 
    updates: Partial<Sequence>
  ): Promise<{success: boolean, error?: string}> => {
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
        
        // Add new local restrictions
        const localRestrictions = updates.timeRestrictions.filter(r => !r.isGlobal);
        if (localRestrictions.length > 0 && currentUser) {
          // Pass each restriction individually with created_by field
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
                created_by: currentUser.id
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
      
      // Update the sequence in local state
      setSequences(prevSequences => prevSequences.map(seq => 
        seq.id === id ? { ...seq, ...updates } : seq
      ));
      
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
      
      setSequences(prev => prev.filter(sequence => sequence.id !== id));
      toast.success("Sequência excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      toast.error(`Erro ao excluir sequência: ${error.message}`);
    }
  };

  return (
    <SequencesContext.Provider value={{
      sequences,
      setSequences,
      addSequence,
      updateSequence,
      deleteSequence,
      refreshSequences
    }}>
      {children}
    </SequencesContext.Provider>
  );
};

export const useSequences = () => {
  const context = useContext(SequencesContext);
  if (context === undefined) {
    throw new Error("useSequences must be used within a SequencesProvider");
  }
  return context;
};
