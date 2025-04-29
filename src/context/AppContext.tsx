
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser] = useState<User>(user);
  const [instancesList, setInstancesList] = useState<Instance[]>(instances);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(
    instances.length > 0 ? instances[0] : null
  );
  const [sequencesList, setSequencesList] = useState<Sequence[]>(sequences);
  const [contactsList, setContactsList] = useState<Contact[]>(contacts);
  const [tagsList] = useState<string[]>(tags);
  const [timeRestrictionsList] = useState<TimeRestriction[]>(globalTimeRestrictions);
  
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
        removeTagFromContact
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
