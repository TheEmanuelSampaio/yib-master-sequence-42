
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sequence, SequenceStage, TagCondition, TimeRestriction } from "@/types";
import { LoadingState, SequenceContextType } from "@/types/context";
import { useApp } from "./AppContext";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

// Default context value
const defaultContextValue: SequenceContextType = {
  sequences: [],
  loadingState: {
    isLoading: false,
    error: null
  },
  loadSequences: async () => {},
  addSequence: async () => {},
  updateSequence: async () => ({ success: false }),
  deleteSequence: async () => {},
};

// Create the context
export const SequenceContext = createContext<SequenceContextType>(defaultContextValue);

// Provider component
export const SequenceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { currentInstance } = useApp();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null
  });

  // Function to load sequences
  const loadSequences = useCallback(async (instanceId?: string) => {
    if (!user) {
      console.log("SequenceContext: No user, skipping loadSequences");
      return;
    }

    const targetInstanceId = instanceId || currentInstance?.id;
    if (!targetInstanceId) {
      console.log("SequenceContext: No instanceId provided and no currentInstance set");
      return;
    }

    setLoadingState({ isLoading: true, error: null });
    console.log(`SequenceContext: Loading sequences for instance ${targetInstanceId}`);

    try {
      // Fetch sequences with related data
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
        .eq('instance_id', targetInstanceId)
        .order('created_at', { ascending: false });

      if (sequencesError) throw sequencesError;

      // Fetch local time restrictions for these sequences
      const sequenceIds = sequencesData.map(s => s.id);
      const { data: localRestrictions, error: localRestrictionsError } = await supabase
        .from('sequence_local_restrictions')
        .select('*')
        .in('sequence_id', sequenceIds);

      if (localRestrictionsError) throw localRestrictionsError;

      // Process and map local restrictions by sequence ID
      const localRestrictionsMap = new Map();
      for (const restriction of (localRestrictions || [])) {
        if (!localRestrictionsMap.has(restriction.sequence_id)) {
          localRestrictionsMap.set(restriction.sequence_id, []);
        }
        
        localRestrictionsMap.get(restriction.sequence_id).push({
          id: restriction.id,
          name: restriction.name,
          active: restriction.active,
          days: restriction.days,
          startHour: restriction.start_hour,
          startMinute: restriction.start_minute,
          endHour: restriction.end_hour,
          endMinute: restriction.end_minute,
          isGlobal: false
        });
      }

      // Transform sequences data
      const processedSequences = sequencesData.map(sequence => {
        // Process stages
        const stages = (sequence.sequence_stages || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(stage => ({
            id: stage.id,
            name: stage.name,
            type: stage.type as SequenceStage['type'],
            content: stage.content,
            typebotStage: stage.typebot_stage,
            delay: stage.delay,
            delayUnit: stage.delay_unit as SequenceStage['delayUnit'],
            orderIndex: stage.order_index
          }));

        // Process global time restrictions
        const globalRestrictions = (sequence.sequence_time_restrictions || [])
          .map(str => str.time_restrictions)
          .filter(Boolean)
          .map(tr => ({
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

        // Get local restrictions for this sequence
        const localRestrictions = localRestrictionsMap.get(sequence.id) || [];

        // Combine restrictions
        const allTimeRestrictions = [...globalRestrictions, ...localRestrictions];

        // Determine sequence type
        let sequenceType: Sequence['type'] = "message";
        if (stages.length > 0) {
          const lastStageType = stages[stages.length - 1].type;
          if (lastStageType === "typebot" || lastStageType === "pattern" || lastStageType === "message") {
            sequenceType = lastStageType;
          }
        }

        // Return processed sequence
        return {
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          type: sequence.type || sequenceType,
          startCondition: {
            type: (sequence.start_condition_type || 'AND') as TagCondition['type'],
            tags: sequence.start_condition_tags || []
          },
          stopCondition: {
            type: (sequence.stop_condition_type || 'OR') as TagCondition['type'],
            tags: sequence.stop_condition_tags || []
          },
          status: (sequence.status || 'inactive') as Sequence['status'],
          stages,
          timeRestrictions: allTimeRestrictions,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at,
          createdBy: sequence.created_by,
          webhookEnabled: sequence.webhook_enabled || false,
          webhookId: sequence.webhook_id || undefined
        };
      });

      setSequences(processedSequences);
      setLoadingState({ isLoading: false, error: null });
      console.log(`SequenceContext: Loaded ${processedSequences.length} sequences successfully`);
    } catch (error: any) {
      console.error("SequenceContext: Error loading sequences:", error);
      setLoadingState({ isLoading: false, error: error.message });
      toast.error("Error loading sequences: " + error.message);
    }
  }, [user, currentInstance]);

  // Function to add a new sequence
  const addSequence = useCallback(async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    if (!user) {
      toast.error("You must be logged in to create sequences");
      return;
    }

    setLoadingState({ isLoading: true, error: null });
    console.log("SequenceContext: Creating new sequence", { name: sequence.name });

    try {
      // 1. Insert sequence record
      const { data: sequenceData, error: sequenceError } = await supabase
        .from('sequences')
        .insert({
          name: sequence.name,
          instance_id: sequence.instanceId,
          start_condition_type: sequence.startCondition.type,
          start_condition_tags: sequence.startCondition.tags,
          stop_condition_type: sequence.stopCondition.type,
          stop_condition_tags: sequence.stopCondition.tags,
          status: sequence.status,
          created_by: user.id,
          webhook_enabled: sequence.webhookEnabled,
          webhook_id: sequence.webhookId
        })
        .select()
        .single();

      if (sequenceError) throw sequenceError;

      // 2. Insert sequence stages
      if (sequence.stages && sequence.stages.length > 0) {
        const stagesToInsert = sequence.stages.map((stage, index) => ({
          sequence_id: sequenceData.id,
          name: stage.name,
          type: stage.type,
          content: stage.content,
          typebot_stage: stage.typebotStage,
          delay: stage.delay,
          delay_unit: stage.delayUnit,
          order_index: index
        }));

        const { error: stagesError } = await supabase
          .from('sequence_stages')
          .insert(stagesToInsert);

        if (stagesError) throw stagesError;
      }

      // 3. Add time restrictions if provided
      if (sequence.timeRestrictions && sequence.timeRestrictions.length > 0) {
        // Split between global and local restrictions
        const globalRestrictions = sequence.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = sequence.timeRestrictions.filter(r => !r.isGlobal);

        // Link global restrictions to the sequence
        for (const restriction of globalRestrictions) {
          const { error: linkError } = await supabase
            .from('sequence_time_restrictions')
            .insert({
              sequence_id: sequenceData.id,
              time_restriction_id: restriction.id
            });

          if (linkError) throw linkError;
        }

        // Create local restrictions
        if (localRestrictions.length > 0) {
          const localRestrictionsToInsert = localRestrictions.map(r => ({
            sequence_id: sequenceData.id,
            name: r.name,
            active: r.active,
            days: r.days,
            start_hour: r.startHour,
            start_minute: r.startMinute,
            end_hour: r.endHour,
            end_minute: r.endMinute,
            created_by: user.id
          }));

          const { error: localRestrictionsError } = await supabase
            .from('sequence_local_restrictions')
            .insert(localRestrictionsToInsert);

          if (localRestrictionsError) throw localRestrictionsError;
        }
      }

      // Reload sequences to get the newly created one
      await loadSequences(sequence.instanceId);
      toast.success(`Sequence "${sequence.name}" created successfully`);
    } catch (error: any) {
      console.error("SequenceContext: Error creating sequence:", error);
      setLoadingState({ isLoading: false, error: error.message });
      toast.error("Error creating sequence: " + error.message);
    } finally {
      setLoadingState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, [user, loadSequences]);

  // Function to update an existing sequence
  const updateSequence = useCallback(async (id: string, updates: Partial<Sequence>): Promise<{ success: boolean, error?: string }> => {
    if (!user) {
      return { success: false, error: "You must be logged in to update sequences" };
    }

    setLoadingState({ isLoading: true, error: null });
    console.log("SequenceContext: Updating sequence", { id, updates });

    try {
      // Prepare sequence updates
      const sequenceUpdates: any = {};
      
      if (updates.name !== undefined) sequenceUpdates.name = updates.name;
      if (updates.status !== undefined) sequenceUpdates.status = updates.status;
      
      if (updates.startCondition !== undefined) {
        sequenceUpdates.start_condition_type = updates.startCondition.type;
        sequenceUpdates.start_condition_tags = updates.startCondition.tags;
      }
      
      if (updates.stopCondition !== undefined) {
        sequenceUpdates.stop_condition_type = updates.stopCondition.type;
        sequenceUpdates.stop_condition_tags = updates.stopCondition.tags;
      }

      if (updates.webhookEnabled !== undefined) {
        sequenceUpdates.webhook_enabled = updates.webhookEnabled;
      }

      if (updates.webhookId !== undefined) {
        sequenceUpdates.webhook_id = updates.webhookId;
      }

      // 1. Check if webhook ID is unique if enabling it
      if (updates.webhookEnabled && updates.webhookId) {
        // Fetch the existing sequence to get its instance_id
        const { data: existingSequence, error: getError } = await supabase
          .from('sequences')
          .select('instance_id')
          .eq('id', id)
          .single();
        
        if (getError) throw getError;
        
        // Check if webhook ID is unique for the client
        const { data: isUnique, error: uniqueError } = await supabase
          .rpc('is_webhook_id_unique_for_client_except_self', {
            p_webhook_id: updates.webhookId,
            p_instance_id: existingSequence.instance_id,
            p_sequence_id: id
          });
        
        if (uniqueError) throw uniqueError;
        
        if (!isUnique) {
          return {
            success: false,
            error: "Webhook ID must be unique across all sequences for this client"
          };
        }
      }
      
      // 2. Update the sequence record if there are any changes
      if (Object.keys(sequenceUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from('sequences')
          .update(sequenceUpdates)
          .eq('id', id);

        if (updateError) throw updateError;
      }
      
      // 3. Update stages if provided
      if (updates.stages) {
        // Get existing stages
        const { data: existingStages, error: stagesError } = await supabase
          .from('sequence_stages')
          .select('id')
          .eq('sequence_id', id);

        if (stagesError) throw stagesError;
        
        // Determine stages to delete (existing but not in updates)
        const existingStageIds = existingStages.map(s => s.id);
        const updatedStageIds = updates.stages.map(s => s.id).filter(Boolean);
        const stagesToDeleteIds = existingStageIds.filter(id => !updatedStageIds.includes(id));
        
        // Delete stages that are no longer present
        if (stagesToDeleteIds.length > 0) {
          const { error: deleteStagesError } = await supabase
            .from('sequence_stages')
            .delete()
            .in('id', stagesToDeleteIds);
            
          if (deleteStagesError) throw deleteStagesError;
        }
        
        // Update or insert stages
        for (let i = 0; i < updates.stages.length; i++) {
          const stage = updates.stages[i];
          
          if (stage.id) {
            // Update existing stage
            const { error: updateStageError } = await supabase
              .from('sequence_stages')
              .update({
                name: stage.name,
                type: stage.type,
                content: stage.content,
                typebot_stage: stage.typebotStage,
                delay: stage.delay,
                delay_unit: stage.delayUnit,
                order_index: i
              })
              .eq('id', stage.id);
              
            if (updateStageError) throw updateStageError;
          } else {
            // Insert new stage
            const { error: insertStageError } = await supabase
              .from('sequence_stages')
              .insert({
                sequence_id: id,
                name: stage.name,
                type: stage.type,
                content: stage.content,
                typebot_stage: stage.typebotStage,
                delay: stage.delay,
                delay_unit: stage.delayUnit,
                order_index: i
              });
              
            if (insertStageError) throw insertStageError;
          }
        }
      }

      // 4. Update time restrictions if provided
      if (updates.timeRestrictions) {
        // Get existing sequence_time_restrictions
        const { data: existingLinks, error: linksError } = await supabase
          .from('sequence_time_restrictions')
          .select('*')
          .eq('sequence_id', id);
          
        if (linksError) throw linksError;
        
        // Get existing local restrictions
        const { data: existingLocalRestrictions, error: localError } = await supabase
          .from('sequence_local_restrictions')
          .select('*')
          .eq('sequence_id', id);
          
        if (localError) throw localError;
        
        // Extract global and local restrictions
        const globalRestrictions = updates.timeRestrictions.filter(r => r.isGlobal);
        const localRestrictions = updates.timeRestrictions.filter(r => !r.isGlobal);
        
        // Update global restriction links
        const existingGlobalIds = existingLinks?.map(link => link.time_restriction_id) || [];
        const updatedGlobalIds = globalRestrictions.map(r => r.id);
        
        // Remove links that are no longer present
        const linksToRemove = existingLinks?.filter(link => 
          !updatedGlobalIds.includes(link.time_restriction_id)
        ) || [];
        
        if (linksToRemove.length > 0) {
          const { error: removeLinkError } = await supabase
            .from('sequence_time_restrictions')
            .delete()
            .in('id', linksToRemove.map(link => link.id));
            
          if (removeLinkError) throw removeLinkError;
        }
        
        // Add new links
        const linksToAdd = globalRestrictions
          .filter(r => !existingGlobalIds.includes(r.id))
          .map(r => ({
            sequence_id: id,
            time_restriction_id: r.id
          }));
          
        if (linksToAdd.length > 0) {
          const { error: addLinkError } = await supabase
            .from('sequence_time_restrictions')
            .insert(linksToAdd);
            
          if (addLinkError) throw addLinkError;
        }
        
        // Handle local restrictions
        
        // Delete local restrictions that are no longer present
        const existingLocalIds = existingLocalRestrictions?.map(r => r.id) || [];
        const updatedLocalIds = localRestrictions
          .map(r => r.id)
          .filter(Boolean) as string[];
          
        const localToDelete = existingLocalIds.filter(id => !updatedLocalIds.includes(id));
        
        if (localToDelete.length > 0) {
          const { error: deleteLocalError } = await supabase
            .from('sequence_local_restrictions')
            .delete()
            .in('id', localToDelete);
            
          if (deleteLocalError) throw deleteLocalError;
        }
        
        // Update existing local restrictions
        for (const restriction of localRestrictions) {
          if (restriction.id && existingLocalIds.includes(restriction.id)) {
            const { error: updateLocalError } = await supabase
              .from('sequence_local_restrictions')
              .update({
                name: restriction.name,
                active: restriction.active,
                days: restriction.days,
                start_hour: restriction.startHour,
                start_minute: restriction.startMinute,
                end_hour: restriction.endHour,
                end_minute: restriction.endMinute
              })
              .eq('id', restriction.id);
              
            if (updateLocalError) throw updateLocalError;
          } else if (!restriction.id) {
            // Insert new local restriction
            const { error: insertLocalError } = await supabase
              .from('sequence_local_restrictions')
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
              
            if (insertLocalError) throw insertLocalError;
          }
        }
      }

      // Reload the sequences to reflect changes
      const instanceId = (await supabase
        .from('sequences')
        .select('instance_id')
        .eq('id', id)
        .single()).data?.instance_id;
        
      if (instanceId) {
        await loadSequences(instanceId);
      }
      
      toast.success("Sequence updated successfully");
      return { success: true };
    } catch (error: any) {
      console.error("SequenceContext: Error updating sequence:", error);
      setLoadingState({ isLoading: false, error: error.message });
      toast.error("Error updating sequence: " + error.message);
      return { success: false, error: error.message };
    } finally {
      setLoadingState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, [user, loadSequences]);

  // Function to delete a sequence
  const deleteSequence = useCallback(async (id: string) => {
    if (!user) {
      toast.error("You must be logged in to delete sequences");
      return;
    }

    setLoadingState({ isLoading: true, error: null });
    console.log("SequenceContext: Deleting sequence", { id });

    try {
      // Get the instance ID before deleting (for reloading purposes)
      const { data: sequenceData, error: getError } = await supabase
        .from('sequences')
        .select('instance_id')
        .eq('id', id)
        .single();

      if (getError) throw getError;
      const instanceId = sequenceData.instance_id;

      // Delete the sequence (cascades to stages, restrictions, etc.)
      const { error: deleteError } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Reload sequences to reflect changes
      await loadSequences(instanceId);
      toast.success("Sequence deleted successfully");
    } catch (error: any) {
      console.error("SequenceContext: Error deleting sequence:", error);
      setLoadingState({ isLoading: false, error: error.message });
      toast.error("Error deleting sequence: " + error.message);
    } finally {
      setLoadingState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, [user, loadSequences]);

  const contextValue: SequenceContextType = {
    sequences,
    loadingState,
    loadSequences,
    addSequence,
    updateSequence,
    deleteSequence,
  };

  return (
    <SequenceContext.Provider value={contextValue}>
      {children}
    </SequenceContext.Provider>
  );
};

// Custom hook to use the Sequence context
export const useSequence = (): SequenceContextType => {
  const context = useContext(SequenceContext);
  if (!context) {
    throw new Error("useSequence must be used within a SequenceProvider");
  }
  return context;
};
