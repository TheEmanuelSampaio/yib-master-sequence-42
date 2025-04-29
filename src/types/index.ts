
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Instance {
  id: string;
  name: string;
  evolutionApiUrl: string;
  apiKey: string;
  active: boolean;
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
}

// Add missing types
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

export interface ScheduledMessage {
  id: string;
  contactId: string;
  sequenceId: string;
  stageId: string;
  scheduledAt: string;
  sentAt?: string;
  status: "scheduled" | "sent" | "failed";
}

export interface ContactSequence {
  id: string;
  contactId: string;
  sequenceId: string;
  currentStageIndex: number;
  status: "active" | "completed" | "paused";
  startedAt: string;
  lastMessageAt?: string;
}

export interface DailyStats {
  date: string;
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
