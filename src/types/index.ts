
import { Database } from "@/integrations/supabase/types";

export type User = Database['public']['Tables']['profiles']['Row'] & {
  accountName?: string;
  email?: string;
};

export type DailyStats = {
  messages_sent: number;
  messages_scheduled: number;
  messages_failed: number;
  new_contacts: number;
  completed_sequences: number;
  date: string;
  id: string;
  instance_id?: string;
  // Camel case aliases for frontend
  messagesSent?: number;
  messagesScheduled?: number;
  messagesFailed?: number;
  newContacts?: number;
  completedSequences?: number;
  instanceId?: string;
};

export type Contact = Database['public']['Tables']['contacts']['Row'] & {
  tags: string[];
  // Camel case aliases for frontend
  phoneNumber?: string;
};

export type Instance = Database['public']['Tables']['instances']['Row'] & {
  // Camel case aliases for frontend
  evolutionApiUrl?: string;
};

export type TimeRestriction = {
  id: string;
  name: string;
  active: boolean;
  days: number[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isGlobal: boolean;
};

export type Condition = {
  type: 'AND' | 'OR';
  tags: string[];
};

export type TagCondition = Condition;

export type SequenceStage = {
  id: string;
  name: string;
  type: 'message' | 'pattern' | 'typebot';
  content: string;
  delay: number;
  delay_unit: string;
  typebot_stage?: string;
  sequence_id: string;
  order_index: number;
  created_at: string;
  // Camel case aliases for frontend
  delayUnit?: string;
  typebotStage?: string;
  sequenceId?: string;
  orderIndex?: number;
  createdAt?: string;
};

export type Sequence = Database['public']['Tables']['sequences']['Row'] & {
  stages: SequenceStage[];
  startCondition: Condition;
  stopCondition: Condition;
  timeRestrictions?: TimeRestriction[];
  // Camel case aliases
  instanceId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
};

export type StageProgress = Database['public']['Tables']['stage_progress']['Row'] & {
  // Camel case aliases
  stageId?: string;
  contactSequenceId?: string;
  completedAt?: string;
};

export type ContactSequence = Database['public']['Tables']['contact_sequences']['Row'] & {
  sequence?: Sequence;
  contact?: Contact;
  stageProgress?: StageProgress[];
  // Camel case aliases
  contactId?: string;
  sequenceId?: string;
  currentStageId?: string;
  currentStageIndex?: number;
  startedAt?: string;
  lastMessageAt?: string;
  completedAt?: string;
  removedAt?: string;
};

export interface AuthContextType {
  session: any;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  isSignedIn: boolean;
  setupCompleted?: boolean | null;
  logout?: () => Promise<void>;
  isSuper?: boolean;
}

export type AppContextType = {
  user: any;
  session: any;
  profile: any;
  loading: boolean;
  instances: Instance[];
  sequences: Sequence[];
  contacts: Contact[];
  contactSequences: ContactSequence[];
  currentInstance: Instance | null;
  isDataInitialized: boolean;
  isSuperAdmin: boolean;
  stats: DailyStats[];
  tags: string[];
  timeRestrictions: TimeRestriction[];
  
  // Actions and setters
  setLoading: (loading: boolean) => void;
  refreshData: () => Promise<void>;
  fetchInstances: () => Promise<void>;
  addInstance: (instance: Omit<Instance, "id" | "created_at" | "updated_at">) => Promise<void>;
  updateInstance: (id: string, updates: any) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, "id" | "created_at" | "updated_at">) => Promise<void>;
  updateSequence: (id: string, data: Partial<Sequence>) => Promise<{success: boolean}>;
  deleteSequence: (id: string) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
  updateContact: (contactId: string, data: Partial<Omit<Contact, "id">>) => Promise<void>;
  addTag: (tag: string) => void;
  setCurrentInstance: (instance: Instance) => void;

  // Temporary placeholders for read-only components
  clients?: any[];
  addClient?: (client: any) => Promise<void>;
  updateClient?: (id: string, updates: any) => Promise<void>;
  deleteClient?: (id: string) => Promise<void>;
  deleteTag?: (tagId: string) => Promise<void>;
  addTimeRestriction?: (restriction: any) => Promise<void>;
  updateTimeRestriction?: (id: string, updates: any) => Promise<void>; 
  deleteTimeRestriction?: (id: string) => Promise<void>;
  users?: any[];
  addUser?: (user: any) => Promise<void>;
  updateUser?: (id: string, updates: any) => Promise<void>;
  deleteUser?: (id: string) => Promise<void>;
};
