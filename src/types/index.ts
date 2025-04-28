
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Instance {
  id: string;
  name: string;
  evolutionApiUrl: string;
  apiKey: string;
  createdAt: string;
  active: boolean;
}

export type ConditionType = 'AND' | 'OR';

export interface TagCondition {
  type: ConditionType;
  tags: string[];
}

export interface TimeRestriction {
  id: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export type SequenceStageType = 'message' | 'pattern' | 'typebot';

export interface SequenceStage {
  id: string;
  name: string;
  type: SequenceStageType;
  content: string;
  delay: number;
  delayUnit: 'minutes' | 'hours' | 'days';
}

export type SequenceStatus = 'active' | 'inactive';

export interface Sequence {
  id: string;
  name: string;
  instanceId: string;
  startCondition: TagCondition;
  stopCondition: TagCondition;
  stages: SequenceStage[];
  timeRestrictions: TimeRestriction[];
  status: SequenceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  tags: string[];
  accountId: number;
  accountName: string;
  inboxId: number;
  conversationId: number;
}

export type MessageStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'persistent_error';

export interface ScheduledMessage {
  id: string;
  contactId: string;
  sequenceId: string;
  stageId: string;
  rawScheduledTime: string;
  scheduledTime: string;
  status: MessageStatus;
  attempts: number;
  sentAt?: string;
}

export interface ContactSequence {
  id: string;
  contactId: string;
  sequenceId: string;
  status: 'active' | 'completed' | 'removed';
  startedAt: string;
  completedAt?: string;
  removedAt?: string;
  currentStageId?: string;
  stageProgress: {
    stageId: string;
    status: 'pending' | 'completed' | 'skipped';
    completedAt?: string;
  }[];
}

export interface DailyStats {
  date: string;
  messagesScheduled: number;
  messagesSent: number;
  messagesFailed: number;
  newContacts: number;
  completedSequences: number;
}
