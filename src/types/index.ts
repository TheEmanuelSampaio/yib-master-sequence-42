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
