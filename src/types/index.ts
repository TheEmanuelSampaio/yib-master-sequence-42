// User related types
export interface User {
  id: string;
  email: string;
  accountName: string;
  role: string;
  avatar: string;
  authToken?: string;
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
  authToken?: string;
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
  type: "message" | "pattern" | "typebot"; // Make type required
  startCondition: TagCondition;
  stopCondition: TagCondition;
  stages: SequenceStage[];
  timeRestrictions: TimeRestriction[]; // Make timeRestrictions required
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string; // This is required
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
  status: "waiting" | "pending" | "processing" | "sent" | "failed" | "persistent_error";
  attempts?: number;
  variables?: Record<string, string>; // Add variables field
  processedContent?: string; // Add processed content field with variables replaced
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
  status: "pending" | "completed" | "skipped" | "removed";
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

// API Payload types
export interface TagChangePayload {
  accountData: {
    accountId: number;
    accountName: string;
  };
  contactData: {
    id: number | string;
    name: string;
    phoneNumber: string;
  };
  conversationData: {
    inboxId: number;
    conversationId: number;
    displayId: number;
    labels: string;
  };
  variables?: Record<string, string>; 
  authToken: string; // Token de autenticação (agora obrigatório)
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
    conversationData: {
      inboxId: number;
      conversationId: number;
      displayId: number;
      labels: string;
    };
    variables?: Record<string, string>; // Add variables field
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

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isSuper: boolean;
  setupCompleted: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, accountName: string, isSuper: boolean) => Promise<void>;
  logout: () => Promise<void>;
  completeSetup: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}
