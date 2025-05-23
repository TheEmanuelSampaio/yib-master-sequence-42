
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

// ContactContext Types
export interface ContactContextState {
  contacts: Contact[];
  contactSequences: ContactSequence[];
  stats: DailyStats[];
  scheduledMessages: ScheduledMessage[];
  isLoading: boolean;
  lastError: string | null;
}

export interface ContactContextActions {
  loadContacts: () => Promise<void>;
  loadContactSequences: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadScheduledMessages: () => Promise<void>;
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean, error?: string, data?: any }>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<{ success: boolean, error?: string }>;
  deleteContact: (id: string) => Promise<{ success: boolean, error?: string }>;
  updateContactSequence: (id: string, updates: Partial<ContactSequence>) => Promise<{ success: boolean, error?: string }>;
  removeFromSequence: (contactSequenceId: string) => Promise<{ success: boolean, error?: string }>;
  refreshContactData: () => Promise<void>;
}

export interface ContactContextType extends ContactContextState, ContactContextActions {}

// ConfigContext Types
export interface ConfigContextState {
  clients: Client[];
  users: User[];
  tags: Tag[];
  timeRestrictions: TimeRestriction[];
  isLoading: boolean;
}

export interface ConfigContextActions {
  addClient: (client: Omit<Client, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean, error?: string, data?: any }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<{ success: boolean, error?: string }>;
  deleteClient: (id: string) => Promise<{ success: boolean, error?: string }>;
  addUser: (user: Omit<User, "id">) => Promise<{ success: boolean, error?: string, data?: any }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean, error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean, error?: string }>;
  addTag: (name: string) => Promise<{ success: boolean, error?: string, data?: any }>;
  deleteTag: (id: string) => Promise<{ success: boolean, error?: string }>;
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean, error?: string, data?: any }>;
  updateTimeRestriction: (id: string, updates: Partial<TimeRestriction>) => Promise<{ success: boolean, error?: string }>;
  deleteTimeRestriction: (id: string) => Promise<{ success: boolean, error?: string }>;
  refreshConfigData: () => Promise<void>;
}

export interface ConfigContextType extends ConfigContextState, ConfigContextActions {}

// Add Tag interface since it's referenced in ConfigContextState
export interface Tag {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}
