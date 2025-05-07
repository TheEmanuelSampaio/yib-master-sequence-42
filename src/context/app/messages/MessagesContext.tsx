
import { createContext, useContext, useState } from "react";
import { ScheduledMessage } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface MessagesContextType {
  scheduledMessages: ScheduledMessage[];
  setScheduledMessages: (messages: ScheduledMessage[]) => void;
  refreshMessages: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);

  const refreshMessages = async () => {
    try {
      if (!currentUser) return;
      
      // Fetch scheduled messages
      const { data: scheduledMsgsData, error: scheduledMsgsError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('scheduled_time', { ascending: true });
      
      if (scheduledMsgsError) throw scheduledMsgsError;
      
      const typedScheduledMsgs = scheduledMsgsData.map(msg => ({
        id: msg.id,
        contactId: msg.contact_id,
        sequenceId: msg.sequence_id,
        stageId: msg.stage_id,
        // Ensure status is one of the valid types
        status: msg.status as "pending" | "processing" | "sent" | "failed" | "persistent_error",
        scheduledTime: msg.scheduled_time,
        rawScheduledTime: msg.raw_scheduled_time,
        sentAt: msg.sent_at,
        attempts: msg.attempts,
        scheduledAt: msg.scheduled_at,
        createdAt: msg.created_at
      }));
      
      setScheduledMessages(typedScheduledMsgs);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast.error(`Erro ao carregar mensagens: ${error.message}`);
    }
  };

  return (
    <MessagesContext.Provider value={{
      scheduledMessages,
      setScheduledMessages,
      refreshMessages
    }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
};
