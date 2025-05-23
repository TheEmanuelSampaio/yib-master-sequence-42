
import { Client, Contact, ContactSequence, DailyStats, Instance, ScheduledMessage, Sequence, TimeRestriction, User } from "./index";

export interface AppContextState {
  currentInstance: Instance | null;
  isDataInitialized: boolean;
  isLoadingData: boolean;
}

export interface AppContextActions {
  setCurrentInstance: (instance: Instance | null) => void;
  refreshBasicData: () => Promise<void>;
}

export interface AppContextType extends AppContextState, AppContextActions {}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface SequenceContextState {
  sequences: Sequence[];
  loadingState: LoadingState;
}

export interface SequenceContextActions {
  loadSequences: (instanceId?: string) => Promise<void>;
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSequence: (id: string, updates: Partial<Sequence>) => Promise<{ success: boolean, error?: string }>;
  deleteSequence: (id: string) => Promise<void>;
}

export interface SequenceContextType extends SequenceContextState, SequenceContextActions {}
