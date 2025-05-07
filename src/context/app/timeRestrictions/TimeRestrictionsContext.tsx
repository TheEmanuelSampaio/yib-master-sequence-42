
import { createContext, useContext, useState } from "react";
import { TimeRestriction } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface TimeRestrictionsContextType {
  timeRestrictions: TimeRestriction[];
  setTimeRestrictions: (restrictions: TimeRestriction[]) => void;
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id">) => Promise<void>;
  updateTimeRestriction: (id: string, restriction: Partial<TimeRestriction>) => Promise<void>;
  deleteTimeRestriction: (id: string) => Promise<void>;
  refreshTimeRestrictions: () => Promise<void>;
}

const TimeRestrictionsContext = createContext<TimeRestrictionsContextType | undefined>(undefined);

export const TimeRestrictionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);

  const refreshTimeRestrictions = async () => {
    try {
      if (!currentUser) return;
      
      const { data: restrictionsData, error: restrictionsError } = await supabase
        .from('time_restrictions')
        .select('*');
      
      if (restrictionsError) throw restrictionsError;
      
      const typedRestrictions = restrictionsData.map(restriction => ({
        id: restriction.id,
        name: restriction.name,
        active: restriction.active,
        days: restriction.days,
        startHour: restriction.start_hour,
        startMinute: restriction.start_minute,
        endHour: restriction.end_hour,
        endMinute: restriction.end_minute,
        isGlobal: true // All restrictions from this table are global
      }));
      
      setTimeRestrictions(typedRestrictions);
    } catch (error: any) {
      console.error("Error fetching time restrictions:", error);
      toast.error(`Erro ao carregar restrições de horário: ${error.message}`);
    }
  };

  const addTimeRestriction = async (restrictionData: Omit<TimeRestriction, "id">) => {
    try {
      if (!currentUser) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert({
          name: restrictionData.name,
          days: restrictionData.days,
          start_hour: restrictionData.startHour,
          start_minute: restrictionData.startMinute,
          end_hour: restrictionData.endHour,
          end_minute: restrictionData.endMinute,
          active: restrictionData.active,
          created_by: currentUser.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newRestriction: TimeRestriction = {
        id: data.id,
        name: data.name,
        active: data.active,
        days: data.days,
        startHour: data.start_hour,
        startMinute: data.start_minute,
        endHour: data.end_hour,
        endMinute: data.end_minute,
        isGlobal: true // Mark as global restriction
      };
      
      setTimeRestrictions(prev => [...prev, newRestriction]);
      toast.success("Restrição de horário criada com sucesso");
    } catch (error: any) {
      console.error("Error creating time restriction:", error);
      toast.error(`Erro ao criar restrição de horário: ${error.message}`);
    }
  };

  const updateTimeRestriction = async (id: string, restrictionData: Partial<TimeRestriction>) => {
    try {
      const updateData: any = {};
      
      if (restrictionData.name !== undefined) updateData.name = restrictionData.name;
      if (restrictionData.active !== undefined) updateData.active = restrictionData.active;
      if (restrictionData.days !== undefined) updateData.days = restrictionData.days;
      if (restrictionData.startHour !== undefined) updateData.start_hour = restrictionData.startHour;
      if (restrictionData.startMinute !== undefined) updateData.start_minute = restrictionData.startMinute;
      if (restrictionData.endHour !== undefined) updateData.end_hour = restrictionData.endHour;
      if (restrictionData.endMinute !== undefined) updateData.end_minute = restrictionData.endMinute;
      
      const { error } = await supabase
        .from('time_restrictions')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => 
        prev.map(restriction => 
          restriction.id === id ? { ...restriction, ...restrictionData } : restriction
        )
      );
      
      toast.success("Restrição de horário atualizada com sucesso");
    } catch (error: any) {
      console.error("Error updating time restriction:", error);
      toast.error(`Erro ao atualizar restrição de horário: ${error.message}`);
    }
  };

  const deleteTimeRestriction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRestrictions(prev => prev.filter(restriction => restriction.id !== id));
      toast.success("Restrição de horário excluída com sucesso");
    } catch (error: any) {
      console.error("Error deleting time restriction:", error);
      toast.error(`Erro ao excluir restrição de horário: ${error.message}`);
    }
  };

  return (
    <TimeRestrictionsContext.Provider value={{
      timeRestrictions,
      setTimeRestrictions,
      addTimeRestriction,
      updateTimeRestriction,
      deleteTimeRestriction,
      refreshTimeRestrictions
    }}>
      {children}
    </TimeRestrictionsContext.Provider>
  );
};

export const useTimeRestrictions = () => {
  const context = useContext(TimeRestrictionsContext);
  if (context === undefined) {
    throw new Error("useTimeRestrictions must be used within a TimeRestrictionsProvider");
  }
  return context;
};
