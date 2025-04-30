
import { Database } from "@/integrations/supabase/types";

export type User = Database['public']['Tables']['profiles']['Row'];

export type DailyStats = {
  messages_sent: number;
  messages_scheduled: number;
  messages_failed: number;
  new_contacts: number;
  completed_sequences: number;
  date: string;
  id: string;
  instance_id?: string;
};

export type Contact = Database['public']['Tables']['contacts']['Row'] & {
  tags: string[];
};

export type Instance = Database['public']['Tables']['instances']['Row'];

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
};

export type Sequence = Database['public']['Tables']['sequences']['Row'] & {
  stages: SequenceStage[];
  startCondition: Condition;
  stopCondition: Condition;
  timeRestrictions?: TimeRestriction[];
};

export type StageProgress = Database['public']['Tables']['stage_progress']['Row'];

export type ContactSequence = Database['public']['Tables']['contact_sequences']['Row'] & {
  sequence?: Sequence;
  contact?: Contact;
  stageProgress?: StageProgress[];
};

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
};
