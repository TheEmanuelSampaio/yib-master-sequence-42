import React, { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, Instance, Sequence, 
  Contact, ScheduledMessage, 
  ContactSequence, DailyStats, TagCondition, TimeRestriction, StageProgressStatus 
} from '@/types';
import { instances, user, sequences, contacts, stats, tags, globalTimeRestrictions } from '@/lib/mockData';
import { toast } from 'sonner';

interface AppContextType {
  user: User;
  instances: Instance[];
  currentInstance: Instance | null;
  sequences: Sequence[];
  contacts: Contact[];
  tags: string[];
  timeRestrictions: TimeRestriction[];
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  stats: DailyStats[];
  
  setCurrentInstance: (instance: Instance) => void;
  addInstance: (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => void;
  updateInstance: (id: string, data: Partial<Omit<Instance, "id" | "createdAt" | "updatedAt">>) => void;
  deleteInstance: (id: string) => void;
  
  addSequence: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => void;
  updateSequence: (id: string, data: Partial<Omit<Sequence, "id" | "createdAt">>) => void;
  deleteSequence: (id: string) => void;
  
  addContact: (contact: Omit<Contact, "id">) => void;
  updateContact: (id: string, data: Partial<Omit<Contact, "id">>) => void;
  deleteContact: (id: string) => void;
  addTagToContact: (contactId: string, tag: string) => void;
  removeTagFromContact: (contactId: string, tag: string) => void;
  
  getContactSequences: (contactId: string) => ContactSequence[];
  
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  
  addTimeRestriction: (restriction: Omit<TimeRestriction, "id">) => void;
  updateTimeRestriction: (id: string, data: Partial<Omit<TimeRestriction, "id">>) => void;
  removeTimeRestriction: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock scheduled messages
const scheduledMessages: ScheduledMessage[] = [
  {
    id: 'msg-1',
    contactId: '16087',
    sequenceId: 'sequence-1',
    stageId: 'stage-1',
    scheduledTime: new Date(Date.now() + 3600000).toISOString(),
    scheduledAt: new Date().toISOString(),
    status: 'pending',
  },
  {
    id: 'msg-2',
    contactId: '16088',
    sequenceId: 'sequence-1',
    stageId: 'stage-2',
    scheduledTime: new Date(Date.now() - 7200000).toISOString(),
    scheduledAt: new Date(Date.now() - 86400000).toISOString(),
    sentAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'sent',
  },
  {
    id: 'msg-3',
    contactId: '16089',
    sequenceId: 'sequence-2',
    stageId: 'stage-1',
    scheduledTime: new Date(Date.now() - 3600000).toISOString(),
    scheduledAt: new Date(Date.now() - 43200000).toISOString(),
    status: 'failed',
    attempts: 3,
  }
];

// Mock contact sequences
const mockContactSequences: ContactSequence[] = [
  {
    id: 'cs-1',
    contactId: '16087',
    sequenceId: 'sequence-1',
    currentStageIndex: 1,
    currentStageId: 'stage-2',
    status: 'active',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    lastMessageAt: new Date(Date.now() - 43200000).toISOString(),
    stageProgress: [
      {
        stageId: 'stage-1',
        status: 'completed',
        completedAt: new Date(Date.now() - 43200000).toISOString(),
      }
    ]
  },
  {
    id: 'cs-2',
    contactId: '16088',
    sequenceId: 'sequence-1',
    currentStageIndex: 3,
    currentStageId: 'stage-3',
    status: 'completed',
    startedAt: new Date(Date.now() - 259200000).toISOString(),
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
    stageProgress: [
      {
        stageId: 'stage-1',
        status: 'completed',
        completedAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        stageId: 'stage-2',
        status: 'completed',
        completedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        stageId: 'stage-3',
        status: 'completed',
        completedAt: new Date(Date.now() - 86400000).toISOString(),
      }
    ]
  }
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser] = useState<User>(user);
  const [instancesList, setInstancesList] = useState<Instance[]>(instances);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(
    instances.length > 0 ? instances[0] : null
  );
  const [sequencesList, setSequencesList] = useState<Sequence[]>(sequences);
  const [contactsList, setContactsList] = useState<Contact[]>(contacts);
  const [tagsList, setTagsList] = useState<string[]>(tags);
  const [timeRestrictionsList, setTimeRestrictionsList] = useState<TimeRestriction[]>(globalTimeRestrictions);
  const [contactSequencesList] = useState<ContactSequence[]>(mockContactSequences);
  
  // Instance management
  const addInstance = (instance: Omit<Instance, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newInstance = {
      ...instance,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
    
    setInstancesList(prev => [...prev, newInstance]);
    toast.success(`Instância "${instance.name}" adicionada com sucesso!`);
    
    if (instancesList.length === 0) {
      setCurrentInstance(newInstance);
    }
  };
  
  const updateInstance = (id: string, data: Partial<Omit<Instance, "id" | "createdAt" | "updatedAt">>) => {
    const now = new Date().toISOString();
    
    setInstancesList(prev => 
      prev.map(instance => 
        instance.id === id ? { 
          ...instance, 
          ...data, 
          updatedAt: now 
        } : instance
      )
    );
    
    if (currentInstance?.id === id) {
      setCurrentInstance(prev => 
        prev ? { ...prev, ...data, updatedAt: now } : prev
      );
    }
    
    toast.success("Instância atualizada com sucesso!");
  };
  
  const deleteInstance = (id: string) => {
    const instance = instancesList.find(i => i.id === id);
    
    setInstancesList(prev => prev.filter(i => i.id !== id));
    
    if (currentInstance?.id === id) {
      const remaining = instancesList.filter(i => i.id !== id);
      setCurrentInstance(remaining.length > 0 ? remaining[0] : null);
    }
    
    toast.success(`Instância "${instance?.name}" removida com sucesso!`);
  };
  
  // Sequence management
  const addSequence = (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newSequence = {
      ...sequence,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
    
    setSequencesList(prev => [...prev, newSequence]);
    toast.success(`Sequência "${sequence.name}" adicionada com sucesso!`);
  };
  
  const updateSequence = (id: string, data: Partial<Omit<Sequence, "id" | "createdAt">>) => {
    const now = new Date().toISOString();
    
    setSequencesList(prev => 
      prev.map(sequence => 
        sequence.id === id ? { 
          ...sequence, 
          ...data, 
          updatedAt: now 
        } : sequence
      )
    );
    
    toast.success("Sequência atualizada com sucesso!");
  };
  
  const deleteSequence = (id: string) => {
    const sequence = sequencesList.find(s => s.id === id);
    setSequencesList(prev => prev.filter(s => s.id !== id));
    toast.success(`Sequência "${sequence?.name}" removida com sucesso!`);
  };
  
  // Contact management
  const addContact = (contact: Omit<Contact, "id">) => {
    const newContact = {
      ...contact,
      id: uuidv4()
    };
    
    setContactsList(prev => [...prev, newContact]);
    toast.success(`Contato "${contact.name}" adicionado com sucesso!`);
  };
  
  const updateContact = (id: string, data: Partial<Omit<Contact, "id">>) => {
    setContactsList(prev => 
      prev.map(contact => 
        contact.id === id ? { 
          ...contact, 
          ...data
        } : contact
      )
    );
    
    toast.success("Contato atualizado com sucesso!");
  };
  
  const deleteContact = (id: string) => {
    const contact = contactsList.find(c => c.id === id);
    setContactsList(prev => prev.filter(c => c.id !== id));
    toast.success(`Contato "${contact?.name}" removido com sucesso!`);
  };
  
  const addTagToContact = (contactId: string, tag: string) => {
    setContactsList(prev => 
      prev.map(contact => {
        if (contact.id === contactId) {
          if (!contact.tags.includes(tag)) {
            return {
              ...contact,
              tags: [...contact.tags, tag]
            };
          }
        }
        return contact;
      })
    );
    
    toast.success(`Tag "${tag}" adicionada com sucesso!`);
  };
  
  const removeTagFromContact = (contactId: string, tag: string) => {
    setContactsList(prev => 
      prev.map(contact => {
        if (contact.id === contactId) {
          return {
            ...contact,
            tags: contact.tags.filter(t => t !== tag)
          };
        }
        return contact;
      })
    );
    
    toast.success(`Tag "${tag}" removida com sucesso!`);
  };
  
  // Tag management
  const addTag = (tag: string) => {
    if (!tagsList.includes(tag)) {
      setTagsList(prev => [...prev, tag]);
      toast.success(`Tag "${tag}" adicionada com sucesso!`);
    } else {
      toast.error(`Tag "${tag}" já existe!`);
    }
  };
  
  const removeTag = (tag: string) => {
    setTagsList(prev => prev.filter(t => t !== tag));
    toast.success(`Tag "${tag}" removida com sucesso!`);
  };
  
  // Time restriction management
  const addTimeRestriction = (restriction: Omit<TimeRestriction, "id">) => {
    const newRestriction = {
      ...restriction,
      id: uuidv4(),
    };
    
    setTimeRestrictionsList(prev => [...prev, newRestriction]);
    toast.success(`Restrição "${restriction.name}" adicionada com sucesso!`);
  };
  
  const updateTimeRestriction = (id: string, data: Partial<Omit<TimeRestriction, "id">>) => {
    setTimeRestrictionsList(prev => 
      prev.map(restriction => 
        restriction.id === id ? { 
          ...restriction, 
          ...data
        } : restriction
      )
    );
    
    toast.success("Restrição atualizada com sucesso!");
  };
  
  const removeTimeRestriction = (id: string) => {
    const restriction = timeRestrictionsList.find(r => r.id === id);
    
    // Check if restriction is used in any sequence
    const isUsedInSequence = sequencesList.some(seq => 
      seq.timeRestrictions.some(r => r.id === id)
    );
    
    if (isUsedInSequence) {
      toast.error("Esta restrição está sendo utilizada em sequências e não pode ser removida.");
      return;
    }
    
    setTimeRestrictionsList(prev => prev.filter(r => r.id !== id));
    toast.success(`Restrição "${restriction?.name}" removida com sucesso!`);
  };
  
  // Contact sequences
  const getContactSequences = (contactId: string) => {
    return contactSequencesList.filter(cs => cs.contactId === contactId);
  };
  
  return (
    <AppContext.Provider
      value={{
        user: currentUser,
        instances: instancesList,
        currentInstance,
        sequences: sequencesList,
        contacts: contactsList,
        tags: tagsList,
        timeRestrictions: timeRestrictionsList,
        scheduledMessages,
        contactSequences: contactSequencesList,
        stats,
        
        setCurrentInstance,
        addInstance,
        updateInstance,
        deleteInstance,
        
        addSequence,
        updateSequence,
        deleteSequence,
        
        addContact,
        updateContact,
        deleteContact,
        addTagToContact,
        removeTagFromContact,
        
        getContactSequences,
        
        addTag,
        removeTag,
        
        addTimeRestriction,
        updateTimeRestriction,
        removeTimeRestriction
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
