
import { createContext, useContext, useState } from "react";
import { DailyStats } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface StatsContextType {
  stats: DailyStats[];
  setStats: (stats: DailyStats[]) => void;
  refreshStats: () => Promise<void>;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const StatsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState<DailyStats[]>([]);

  const refreshStats = async () => {
    try {
      if (!currentUser) return;
      
      // Fetch daily stats
      const { data: statsData, error: statsError } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: false });
        
      if (statsError) throw statsError;
      
      const typedStats = statsData.map(stat => ({
        id: stat.id,
        instanceId: stat.instance_id,
        date: stat.date,
        messagesSent: stat.messages_sent,
        messagesScheduled: stat.messages_scheduled,
        messagesFailed: stat.messages_failed,
        newContacts: stat.new_contacts,
        completedSequences: stat.completed_sequences
      }));
      
      setStats(typedStats);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast.error(`Erro ao carregar estatísticas: ${error.message}`);
    }
  };

  return (
    <StatsContext.Provider value={{
      stats,
      setStats,
      refreshStats
    }}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = () => {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error("useStats must be used within a StatsProvider");
  }
  return context;
};
