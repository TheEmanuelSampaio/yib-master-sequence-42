// User related types
export interface User {
  id: string;
  accountName: string;
  email: string;
  role: 'super_admin' | 'admin';
  avatar?: string;
  authToken?: string; // Adicionado global token para usuários
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
  inboxId?: number; // Added inbox filter field
}

export interface Sequence {
  id: string;
  instanceId: string;
  name: string;
  type: "message" | "pattern" | "typebot"; 
  startCondition: TagCondition;
  stopCondition: TagCondition;
  stages: SequenceStage[];
  timeRestrictions: TimeRestriction[];
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  webhookEnabled: boolean; // New field for webhook support
  webhookId?: string; // New field for webhook ID
  inboxFilterEnabled: boolean; // New field for inbox filter toggle
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
  clientName?: string; // Added for display in UI
  adminId?: string;    // Added for filtering by admin
  adminName?: string;  // Added for display in UI
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
  status: "waiting" | "pending" | "processing" | "sent" | "failed" | "persistent_error" | "removed" | "stopped";
  attempts?: number;
  variables?: Record<string, string>; 
  processedContent?: string; // Add processed content field with variables replaced
  removedAt?: string; // Added removed timestamp
}

export interface ContactSequence {
  id: string;
  contactId: string;
  sequenceId: string;
  currentStageIndex: number;
  currentStageId?: string;
  status: "active" | "completed" | "paused" | "removed" | "stopped"; // Added 'stopped' status
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
    adminId?: string; // Added admin ID for client identification
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

export interface PendingMessagesPayload {
  adminId?: string; // Added admin ID for filtering messages
  authToken: string; // Admin auth token
}

// Atualizado: Removido objeto dinâmico "stgN" e colocado propriedades diretamente no objeto stage
export interface PendingMessagesResponse {
  id: string;
  chatwootData: {
    accountData: {
      accountId: number;
      accountName: string;
      adminId?: string; // Added admin ID reference
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
      id: string;
      content: string;
      rawScheduledTime: string;
      scheduledTime: string;
    }
  };
}

export interface DeliveryStatusPayload {
  messageId: string;
  status: "success" | "failed";
  attempts?: number;
  authToken: string; // Added auth token for authentication
  adminId?: string; // Added admin ID for security
}

export interface WebhookTriggerPayload {
  webhookId: string;
  accountData: {
    accountId: number;
    adminId?: string;
  };
  contactData: {
    name: string;
    phoneNumber: string;
  };
  variables?: Record<string, string | number>; 
  authToken: string;
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
          inbox_id: number | null; // Added inbox_id field
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
          inbox_id?: number | null; // Added inbox_id field
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
          inbox_id?: number | null; // Added inbox_id field
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
