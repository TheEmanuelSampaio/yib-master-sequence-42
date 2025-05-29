import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, UserWithEmail, isValidUUID, checkStagesInUse } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { 
  User, 
  Client, 
  Instance, 
  Sequence, 
  SequenceStage, 
  TimeRestriction, 
  Contact, 
  ScheduledMessage, 
  ContactSequence, 
  DailyStats,
  TagCondition 
} from "@/types";
import { toast } from "@/hooks/use-toast";

interface AppContextType {
  user: User | null;
  users: UserWithEmail[];
  clients: Client[];
  instances: Instance[];
  sequences: Sequence[];
  timeRestrictions: TimeRestriction[];
  contacts: Contact[];
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  dailyStats: DailyStats[];
  isLoading: boolean;
  fetchUsers: () => Promise<void>;
  createUser: (userData: Omit<User, 'id' | 'authToken'>) => Promise<void>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  fetchClients: () => Promise<void>;
  createClient: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (id: string, clientData: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  fetchInstances: () => Promise<void>;
  createInstance: (instanceData: Omit<Instance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInstance: (id: string, instanceData: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  fetchSequences: () => Promise<void>;
  createSequence: (sequenceData: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSequence: (id: string, updates: Partial<Sequence>) => Promise<void>;
  deleteSequence: (id: string) => Promise<void>;
  getSequenceStages: (sequenceId: string) => SequenceStage[];
  addSequenceStage: (sequenceId: string, stage: Omit<SequenceStage, 'id' | 'orderIndex'>) => Promise<void>;
  updateSequenceStage: (sequenceId: string, stageId: string, updates: Partial<SequenceStage>) => Promise<void>;
  deleteSequenceStage: (sequenceId: string, stageId: string) => Promise<void>;
  reorderSequenceStages: (sequenceId: string, stages: SequenceStage[]) => Promise<void>;
  fetchTimeRestrictions: () => Promise<void>;
  createTimeRestriction: (restrictionData: Omit<TimeRestriction, 'id'>) => Promise<void>;
  updateTimeRestriction: (id: string, restrictionData: Partial<TimeRestriction>) => Promise<void>;
  deleteTimeRestriction: (id: string) => Promise<void>;
  fetchContacts: () => Promise<void>;
  updateContact: (id: string, contactData: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  fetchScheduledMessages: () => Promise<void>;
  fetchContactSequences: () => Promise<void>;
  fetchDailyStats: () => Promise<void>;
  getInstanceById: (instanceId: string) => Instance | undefined;
  getClientById: (clientId: string) => Client | undefined;
  refreshData: () => Promise<void>;
  updateContactStage: (contactId: string, sequenceId: string, newStageIndex: number, newStageId?: string) => Promise<void>;
  removeContactFromSequence: (contactId: string, sequenceId: string, reason?: string) => Promise<void>;
  tags: string[];
  fetchTags: () => Promise<void>;
  addTag: (name: string) => Promise<void>;
  updateTag: (oldName: string, newName: string) => Promise<void>;
  deleteTag: (name: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      refreshData();
    }
  }, [authUser]);

  const fetchSequences = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('sequences')
        .select(`
          *,
          instances!inner(
            id,
            name,
            client_id,
            clients!inner(
              id,
              account_name,
              created_by
            )
          )
        `);

      if (user.role !== 'super_admin') {
        query = query.eq('instances.clients.created_by', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sequences:', error);
        toast({
          title: "Error",
          description: "Failed to fetch sequences",
          variant: "destructive",
        });
        return;
      }

      const mappedSequences: Sequence[] = data.map((sequence: any) => {
        return {
          id: sequence.id,
          name: sequence.name,
          instanceId: sequence.instance_id,
          type: sequence.type || 'message',
          startCondition: {
            type: sequence.start_condition_type,
            tags: sequence.start_condition_tags
          },
          stopCondition: {
            type: sequence.stop_condition_type,
            tags: sequence.stop_condition_tags
          },
          stages: [],
          timeRestrictions: [],
          status: sequence.status,
          createdAt: sequence.created_at,
          updatedAt: sequence.updated_at,
          createdBy: sequence.created_by,
          webhookEnabled: sequence.webhook_enabled || false,
          webhookId: sequence.webhook_id || undefined,
          inboxFilterEnabled: sequence.inbox_filter_enabled !== undefined ? sequence.inbox_filter_enabled : true
        };
      });
      
      setSequences(mappedSequences);
    } catch (error) {
      console.error('Error in fetchSequences:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch sequences",
        variant: "destructive",
      });
    }
  };

  const mapSequenceFromDB = (seq: any): Sequence => {
    return {
      id: seq.id,
      instanceId: seq.instance_id,
      name: seq.name,
      type: seq.type,
      startCondition: {
        type: seq.start_condition_type,
        tags: seq.start_condition_tags
      },
      stopCondition: {
        type: seq.stop_condition_type,
        tags: seq.stop_condition_tags
      },
      stages: [],
      timeRestrictions: [],
      status: seq.status,
      createdBy: seq.created_by,
      createdAt: seq.created_at,
      updatedAt: seq.updated_at,
      webhookEnabled: seq.webhook_enabled || false,
      webhookId: seq.webhook_id,
      inboxFilterEnabled: seq.inbox_filter_enabled !== undefined ? seq.inbox_filter_enabled : true
    };
  };

  return (
    <AppContext.Provider value={{
      user,
      users,
      clients,
      instances,
      sequences,
      timeRestrictions,
      contacts,
      scheduledMessages,
      contactSequences,
      dailyStats,
      isLoading,
      fetchUsers: async () => {},
      createUser: async (userData) => {},
      updateUser: async (id, userData) => {},
      deleteUser: async (id) => {},
      fetchClients: async () => {},
      createClient: async (clientData) => {},
      updateClient: async (id, clientData) => {},
      deleteClient: async (id) => {},
      fetchInstances: async () => {},
      createInstance: async (instanceData) => {},
      updateInstance: async (id, instanceData) => {},
      deleteInstance: async (id) => {},
      fetchSequences,
      createSequence: async (sequenceData) => {},
      updateSequence: async (id, updates) => {},
      deleteSequence: async (id) => {},
      getSequenceStages: (sequenceId) => [],
      addSequenceStage: async (sequenceId, stage) => {},
      updateSequenceStage: async (sequenceId, stageId, updates) => {},
      deleteSequenceStage: async (sequenceId, stageId) => {},
      reorderSequenceStages: async (sequenceId, stages) => {},
      fetchTimeRestrictions: async () => {},
      createTimeRestriction: async (restrictionData) => {},
      updateTimeRestriction: async (id, restrictionData) => {},
      deleteTimeRestriction: async (id) => {},
      fetchContacts: async () => {},
      updateContact: async (id, contactData) => {},
      deleteContact: async (id) => {},
      fetchScheduledMessages: async () => {},
      fetchContactSequences: async () => {},
      fetchDailyStats: async () => {},
      getInstanceById: (instanceId) => undefined,
      getClientById: (clientId) => undefined,
      refreshData: async () => {},
      updateContactStage: async (contactId, sequenceId, newStageIndex, newStageId) => {},
      removeContactFromSequence: async (contactId, sequenceId, reason) => {},
      tags: [],
      fetchTags: async () => {},
      addTag: async (name) => {},
      updateTag: async (oldName, newName) => {},
      deleteTag: async (name) => {},
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
