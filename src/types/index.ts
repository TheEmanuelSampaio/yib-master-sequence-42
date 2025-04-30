
import { Database } from "@/integrations/supabase/types";

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
    stats: any[];
    tags: string[];
    timeRestrictions: TimeRestriction[];
    
    // Actions and setters
    setLoading: (loading: boolean) => void;
    refreshData: () => Promise<void>;
    fetchInstances: () => Promise<void>;
    addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => Promise<void>;
    updateInstance: (id: string, updates: any) => Promise<void>;
    deleteInstance: (id: string) => Promise<void>;
    addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
    updateSequence: (id: string, data: Partial<Sequence>) => Promise<{success: boolean}>;
    deleteSequence: (id: string) => Promise<void>;
    deleteContact: (contactId: string) => Promise<void>;
    updateContact: (contactId: string, data: Partial<Omit<Contact, "id">>) => Promise<void>;
    addTag: (tag: string) => void;
};
