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
  type: "message" | "pattern" | "typebot"; // Tipo movido do estágio para a sequência
  startCondition: ComplexTagCondition;
  stopCondition: ComplexTagCondition;
  stages: SequenceStage[];
  timeRestrictions: TimeRestriction[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// Nova estrutura para condições de tags complexas
export interface ComplexTagCondition {
  groups: TagConditionGroup[];
}

// Grupo de condições de tags (cada grupo é uma condição AND)
export interface TagConditionGroup {
  type: "AND";
  tags: string[];
}

// Interface antiga mantida para compatibilidade durante migração
export interface TagCondition {
  type: "AND" | "OR";
  tags: string[];
}

export interface SequenceStage {
  id: string;
  name: string;
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

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedSequence extends Sequence {
  sequence_stages?: {
    id: string;
    name: string;
    content: string;
    typebot_stage?: string;
    delay: number;
    delay_unit: string;
    order_index: number;
  }[];
  sequence_time_restrictions?: {
    time_restriction_id: string;
  }[];
}

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedClient extends Client {
  creator?: {
    id: string;
    account_name: string;
  };
  creator_account_name?: string;
}

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedInstance extends Instance {
  client?: ExtendedClient;
}

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedContact extends Contact {
  tags: string[];
}

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedContactSequence extends ContactSequence {
  stageProgress?: StageProgress[];
}

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedScheduledMessage extends ScheduledMessage {
  status: "waiting" | "pending" | "processing" | "sent" | "failed" | "persistent_error";
}

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedAppSetup extends AppSetup {
  setupCompleted: boolean;
  setupCompletedAt?: string;
}

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedTagChangePayload {
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

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedPendingMessagesResponse {
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

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedDeliveryStatusPayload {
  messageId: string;
  status: "success" | "failed";
  attempts?: number;
}

// Definição para compatibilidade com os tipos da API Supabase
export interface ExtendedDatabase {
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
