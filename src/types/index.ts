import { Database } from "@/integrations/supabase/types";

export type Contact = Database['public']['Tables']['contacts']['Row'] & {
    tags: string[];
};

export type Sequence = Database['public']['Tables']['sequences']['Row'] & {
    stages: SequenceStage[];
    startCondition: Condition;
    stopCondition: Condition;
};

export type SequenceStage = Database['public']['Tables']['sequence_stages']['Row'];
export type ContactSequence = Database['public']['Tables']['contact_sequences']['Row'] & {
    sequence: Sequence;
    contact: Contact;
    stageProgress?: StageProgress[];
}

export type StageProgress = Database['public']['Tables']['stage_progress']['Row'];

export type Condition = {
    type: 'AND' | 'OR';
    tags: string[];
};

export type AppContextType = {
    user: any;
    session: any;
    profile: any;
    loading: boolean;
    instances: any[];
    sequences: Sequence[];
    contacts: Contact[];
    contactSequences: ContactSequence[];
    currentInstance: any;
    isDataInitialized: boolean;
    setLoading: (loading: boolean) => void;
    refreshData: () => Promise<void>;
    fetchInstances: () => Promise<void>;
    addInstance: (instance: any) => Promise<void>;
    updateInstance: (id: string, updates: any) => Promise<void>;
    deleteInstance: (id: string) => Promise<void>;
    addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
    updateSequence: (id: string, data: Partial<Sequence>) => Promise<Promise<{
        success: boolean;
    }>>;
    deleteSequence: (id: string) => Promise<void>;
    contacts: Contact[];
    deleteContact: (contactId: string) => Promise<void>;
    updateContact: (contactId: string, data: Partial<Omit<Contact, "id">>) => Promise<void>;
}
