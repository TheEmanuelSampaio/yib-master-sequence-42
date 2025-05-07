
import { supabase } from "@/integrations/supabase/client";
import { ExtendedSequence } from "./types";
import { Sequence, SequenceStage, TimeRestriction } from "@/types";

// Helper function to transform sequences from database format to application format
export const transformSequence = (sequence: ExtendedSequence): Sequence => {
  // Ensure types are properly cast
  const startType = (sequence.start_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR";
  const stopType = (sequence.stop_condition_type === "AND" ? "AND" : "OR") as "AND" | "OR";
  
  // Transform stages and time restrictions
  const stages = sequence.sequence_stages
    ?.sort((a: any, b: any) => a.order_index - b.order_index)
    .map((stage: any) => ({
      id: stage.id,
      name: stage.name,
      type: stage.type,
      content: stage.content,
      typebotStage: stage.typebot_stage,
      delay: stage.delay,
      delayUnit: stage.delay_unit
    })) || [];
    
  // Transform global time restrictions
  const globalTimeRestrictions = sequence.sequence_time_restrictions
    ?.map((str: any) => str.time_restrictions)
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
    })) || [];
  
  // Combine global and local time restrictions
  const allTimeRestrictions = [
    ...globalTimeRestrictions,
    ...(sequence.localTimeRestrictions || [])
  ];
  
  // Ensure status is "active" or "inactive"
  const status = sequence.status === "active" ? "active" : "inactive";
  
  // Determine sequence type based on stages or use default
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
      type: startType,
      tags: sequence.start_condition_tags || []
    },
    stopCondition: {
      type: stopType,
      tags: sequence.stop_condition_tags || []
    },
    status: status as "active" | "inactive",
    stages,
    timeRestrictions: allTimeRestrictions,
    createdAt: sequence.created_at,
    updatedAt: sequence.updated_at,
    createdBy: sequence.created_by,
    webhookEnabled: sequence.webhook_enabled || false,
    webhookId: sequence.webhook_id || undefined
  };
};

export const isValidArray = <T>(data: T[] | null | undefined): data is T[] => {
  return Array.isArray(data);
};
