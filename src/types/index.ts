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
  type: "message" | "pattern" | "typebot"; 
  startCondition: TagCondition;
  stopCondition: TagCondition;
  stages: SequenceStage[];
  timeRestrictions: TimeRestriction[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  
  // Novas propriedades para condições avançadas
  useAdvancedStartCondition?: boolean;
  useAdvancedStopCondition?: boolean;
  advancedStartCondition?: AdvancedCondition;
  advancedStopCondition?: AdvancedCondition;
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
      
      sequence_condition_groups: {
        Row: {
          id: string;
          sequence_id: string;
          type: string; // 'start' ou 'stop'
          group_index: number;
          group_operator: string; // 'AND' ou 'OR'
          condition_operator: string; // 'AND' ou 'OR'
          created_at: string;
        };
        Insert: {
          id?: string;
          sequence_id: string;
          type: string;
          group_index: number;
          group_operator: string;
          condition_operator: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sequence_id?: string;
          type?: string;
          group_index?: number;
          group_operator?: string;
          condition_operator?: string;
          created_at?: string;
        };
      };
      
      sequence_condition_tags: {
        Row: {
          id: string;
          group_id: string;
          tag_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          tag_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          tag_name?: string;
          created_at?: string;
        };
      };
      
      sequences: {
        Row: {
          id: string;
          name: string;
          type: "message" | "pattern" | "typebot";
          start_condition: TagCondition;
          stop_condition: TagCondition;
          stages: SequenceStage[];
          time_restrictions: TimeRestriction[];
          status: "active" | "inactive";
          use_advanced_start_condition: boolean;
          use_advanced_stop_condition: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: "message" | "pattern" | "typebot";
          start_condition?: TagCondition;
          stop_condition?: TagCondition;
          stages?: SequenceStage[];
          time_restrictions?: TimeRestriction[];
          status?: "active" | "inactive";
          use_advanced_start_condition?: boolean;
          use_advanced_stop_condition?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: "message" | "pattern" | "typebot";
          start_condition?: TagCondition;
          stop_condition?: TagCondition;
          stages?: SequenceStage[];
          time_restrictions?: TimeRestriction[];
          status?: "active" | "inactive";
          use_advanced_start_condition?: boolean;
          use_advanced_stop_condition?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Importar tipos de condições avançadas
import { AdvancedCondition, ConditionGroup } from './conditionTypes';
export type { AdvancedCondition, ConditionGroup };
