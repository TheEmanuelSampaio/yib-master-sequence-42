// User related types
export interface User {
  id: string;
  accountName: string;
  email: string;
  role: 'super_admin' | 'admin';
  avatar?: string;
}

export interface Client {
  id: string;
  accountId: number;
  accountName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    account_name: string;
  };
  creator_account_name?: string;
}

export interface Instance {
  id: string;
  name: string;
  evolutionApiUrl: string;
  apiKey: string;
  active: boolean;
  clientId: string;
  client?: Client;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sequence {
  id: string;
  instanceId: string;
  name: string;
  startCondition: TagCondition;
  stopCondition: TagCondition;
  stages: SequenceStage[];
  timeRestrictions: TimeRestriction[];
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagCondition {
  type: "AND" | "OR";
  tags: string[];
}

export interface SequenceStage {
  id: string;
  name: string;
  type: "message" | "pattern" | "typebot";
  content: string;
  typebotStage?: string;
  delay: number;
  delayUnit: "minutes" | "hours" | "days";
  orderIndex?: number;
  sequenceId?: string;
  createdAt?: string;
}

export interface TimeRestriction {
  id: string;
  name: string;
  active: boolean;
  days: number[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isGlobal: boolean; // Indica se é uma restrição global ou local
  createdBy?: string;
  createdAt?: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  clientId: string;
  inboxId: number;
  conversationId: number;
  displayId: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledMessage {
  id: string;
  contactId: string;
  sequenceId: string;
  stageId: string;
  scheduledTime: string;
  scheduledAt: string;
  sentAt?: string;
  status: "pending" | "processing" | "sent" | "failed" | "persistent_error";
  attempts?: number;
}

export interface ContactSequence {
  id: string;
  contactId: string;
  sequenceId: string;
  currentStageIndex: number;
  currentStageId?: string;
  status: "active" | "completed" | "paused" | "removed";
  startedAt: string;
  lastMessageAt?: string;
  completedAt?: string;
  removedAt?: string;
  stageProgress?: StageProgress[];
}

export interface StageProgress {
  stageId: string;
  status: "pending" | "completed" | "skipped";
  completedAt?: string;
}

export interface DailyStats {
  date: string;
  instanceId: string;
  messagesScheduled: number;
  messagesSent: number;
  messagesFailed: number;
  newContacts: number;
  completedSequences: number;
}

export interface StageProgressStatus {
  id: string;
  sequenceId: string;
  stageId: string;
  contactsReached: number;
  contactsResponded: number;
  clicksCount: number;
}

export interface AppSetup {
  id: string;
  setupCompleted: boolean;
  setupCompletedAt?: string;
}

// Modified Tag interface to support both string and object type
export interface Tag {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export type TagString = string;

// New interface for Profile
export interface Profile {
  id: string;
  accountName: string;
  role: "super_admin" | "admin";
  createdAt: string;
}

// API Payload types
export interface TagChangePayload {
  data: {
    accountId: number;
    accountName: string;
    contact: {
      id: number | string;
      name: string;
      phoneNumber: string;
    };
    conversation: {
      inboxId: number;
      conversationId: number;
      displayId: number;
      labels: string;
    }
  }
}

export interface PendingMessagesResponse {
  id: string;
  chatwootData: {
    accountData: {
      accountId: number;
      accountName: string;
    };
    contactData: {
      id: number | string;
      name: string;
      phoneNumber: string;
    };
    conversation: {
      inboxId: number;
      conversationId: number;
      displayId: number;
      labels: string;
    };
  };
  instanceData: {
    id: string;
    name: string;
    evolutionApiUrl: string;
    apiKey: string;
  };
  sequenceData: {
    instanceName: string;
    sequenceName: string;
    type: "message" | "pattern" | "typebot";
    stage: {
      [key: string]: {
        id: string;
        content: string;
        rawScheduledTime: string;
        scheduledTime: string;
      }
    }
  };
}

export interface DeliveryStatusPayload {
  messageId: string;
  status: "success" | "failed";
  attempts?: number;
}

// Update AppContextType to include missing properties
export interface AppContextType {
  currentInstance: Instance | null;
  instances: Instance[];
  sequences: Sequence[];
  contacts: Contact[];
  contactSequences: ContactSequence[];
  timeRestrictions: TimeRestriction[];
  scheduledMessages: ScheduledMessage[];
  tags: TagString[];
  stats: DailyStats[];
  isDataInitialized: boolean;
  setCurrentInstance: (instance: Instance | null) => void;
  refreshData: () => Promise<{ success: boolean, error?: any }>;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean, error?: any }>;
  updateInstance: (id: string, instance: Partial<Instance>) => Promise<{ success: boolean, error?: any }>;
  deleteInstance: (id: string) => Promise<{ success: boolean, error?: any }>;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean, error?: any }>;
  updateSequence: (id: string, data: Partial<Sequence>) => Promise<{ success: boolean, error?: any }>;
  deleteSequence: (id: string) => Promise<{ success: boolean, error?: any }>;
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean, error?: any }>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<{ success: boolean, error?: any }>;
  deleteContact: (id: string) => Promise<{ success: boolean, error?: any }>;
  addTag: (name: string) => Promise<{ success: boolean, error?: any }>;
  deleteTag: (name: string) => Promise<{ success: boolean, error?: any }>;
  
  // Properties missing from AppContextType
  clients?: any[];
  users?: any[];
  addClient?: (client: any) => Promise<any>;
  updateClient?: (id: string, client: any) => Promise<any>;
  deleteClient?: (id: string) => Promise<any>;
  addUser?: (user: any) => Promise<any>;
  updateUser?: (id: string, user: any) => Promise<any>;
  deleteUser?: (id: string) => Promise<any>;
  addTimeRestriction?: (restriction: any) => Promise<any>;
  updateTimeRestriction?: (id: string, restriction: any) => Promise<any>;
  deleteTimeRestriction?: (id: string) => Promise<any>;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          account_name: string;
          role: "super_admin" | "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          account_name: string;
          role?: "super_admin" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          account_name?: string;
          role?: "super_admin" | "admin";
          created_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          account_id: number;
          account_name: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: number;
          account_name: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: number;
          account_name?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      instances: {
        Row: {
          id: string;
          name: string;
          evolution_api_url: string;
          api_key: string;
          active: boolean;
          client_id: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          evolution_api_url: string;
          api_key: string;
          active?: boolean;
          client_id: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          evolution_api_url?: string;
          api_key?: string;
          active?: boolean;
          client_id?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      app_setup: {
        Row: {
          id: string;
          setup_completed: boolean;
          setup_completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          setup_completed?: boolean;
          setup_completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          setup_completed?: boolean;
          setup_completed_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
