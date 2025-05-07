
import { 
  Client, 
  Instance, 
  Sequence, 
  Contact, 
  TimeRestriction,
  ScheduledMessage, 
  ContactSequence,
  User,
  DailyStats
} from "@/types";

// Define the combined application context type
export interface AppContextType {
  // Core app data
  isDataInitialized: boolean;
  refreshData: () => Promise<void>;
  
  // Clients data and functions
  clients: Client[];
  addClient: (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  
  // Instances data and functions
  instances: Instance[];
  currentInstance: Instance | null;
  setCurrentInstance: (instance: Instance) => void;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<void>;
  updateInstance: (id: string, instance: Partial<Instance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  
  // Sequences data and functions
  sequences: Sequence[];
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSequence: (id: string, sequence: Partial<Sequence>) => Promise<{ success: boolean, error?: string }>;
  deleteSequence: (id: string) => Promise<void>;
  
  // Contacts data and functions
  contacts: Contact[];
  contactSequences: ContactSequence[];
  getContactSequences: (contactId: string) => ContactSequence[];
  addContact: (contact: Contact) => void;
  deleteContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  updateContact: (contactId: string, data: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
  removeFromSequence: (contactSequenceId: string) => Promise<{ success: boolean; error?: string }>;
  updateContactSequence: (
    contactSequenceId: string, 
    data: { sequenceId?: string; currentStageId?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  
  // Time restrictions data and functions
  timeRestrictions: TimeRestriction[];
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id">) => Promise<void>;
  updateTimeRestriction: (id: string, restriction: Partial<TimeRestriction>) => Promise<void>;
  deleteTimeRestriction: (id: string) => Promise<void>;
  
  // Users data and functions
  users: User[];
  addUser: (user: { email: string; password: string; accountName: string, isAdmin?: boolean }) => Promise<void>;
  updateUser: (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  // Tags data and functions
  tags: string[];
  addTag: (tagName: string) => Promise<void>;
  deleteTag: (tagName: string) => Promise<void>;
  
  // Stats data
  stats: DailyStats[];
  
  // Messages data
  scheduledMessages: ScheduledMessage[];
}
