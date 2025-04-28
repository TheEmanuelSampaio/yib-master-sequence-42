import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Instance, User, Sequence, Contact, ScheduledMessage, 
  ContactSequence, DailyStats, TagCondition, TimeRestriction
} from '@/types';
import { mockInstances, mockUser, mockSequences, mockContacts, mockStats } from '@/lib/mockData';
import { toast } from 'sonner';

interface AppContextType {
  user: User | null;
  instances: Instance[];
  currentInstance: Instance | null;
  setCurrentInstance: (instance: Instance) => void;
  sequences: Sequence[];
  contacts: Contact[];
  scheduledMessages: ScheduledMessage[];
  contactSequences: ContactSequence[];
  stats: DailyStats[];
  tags: string[];
  
  // Instance management
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt'>) => void;
  updateInstance: (id: string, data: Partial<Instance>) => void;
  deleteInstance: (id: string) => void;
  
  // Sequence management
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSequence: (id: string, data: Partial<Sequence>) => void;
  deleteSequence: (id: string) => void;
  
  // Tag management
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  
  // Contact sequences
  getContactSequences: (contactId: string) => ContactSequence[];
  
  // API endpoints simulation
  handleTagChange: (payload: any) => void;
  getPendingMessages: () => any[];
  handleDeliveryStatus: (messageId: string, success: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state with mock data or from localStorage
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ms_user');
    return saved ? JSON.parse(saved) : mockUser;
  });
  
  const [instances, setInstances] = useState<Instance[]>(() => {
    const saved = localStorage.getItem('ms_instances');
    return saved ? JSON.parse(saved) : mockInstances;
  });
  
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(() => {
    const savedId = localStorage.getItem('ms_current_instance_id');
    const saved = localStorage.getItem('ms_instances');
    const instanceList = saved ? JSON.parse(saved) : mockInstances;
    
    if (savedId) {
      return instanceList.find((i: Instance) => i.id === savedId) || instanceList[0];
    }
    
    return instanceList[0];
  });
  
  const [sequences, setSequences] = useState<Sequence[]>(() => {
    const saved = localStorage.getItem('ms_sequences');
    return saved ? JSON.parse(saved) : mockSequences;
  });
  
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('ms_contacts');
    return saved ? JSON.parse(saved) : mockContacts;
  });
  
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>(() => {
    const saved = localStorage.getItem('ms_scheduled_messages');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [contactSequences, setContactSequences] = useState<ContactSequence[]>(() => {
    const saved = localStorage.getItem('ms_contact_sequences');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [stats, setStats] = useState<DailyStats[]>(() => {
    const saved = localStorage.getItem('ms_stats');
    return saved ? JSON.parse(saved) : mockStats;
  });
  
  const [tags, setTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('ms_tags');
    return saved ? JSON.parse(saved) : ["lead", "google", "produto-xpto", "premium", "freemium", "newsletter", "website", "basic", "pro", "enterprise"];
  });
  
  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('ms_user', JSON.stringify(user));
  }, [user]);
  
  useEffect(() => {
    localStorage.setItem('ms_instances', JSON.stringify(instances));
  }, [instances]);
  
  useEffect(() => {
    if (currentInstance) {
      localStorage.setItem('ms_current_instance_id', currentInstance.id);
    }
  }, [currentInstance]);
  
  useEffect(() => {
    localStorage.setItem('ms_sequences', JSON.stringify(sequences));
  }, [sequences]);
  
  useEffect(() => {
    localStorage.setItem('ms_contacts', JSON.stringify(contacts));
  }, [contacts]);
  
  useEffect(() => {
    localStorage.setItem('ms_scheduled_messages', JSON.stringify(scheduledMessages));
  }, [scheduledMessages]);
  
  useEffect(() => {
    localStorage.setItem('ms_contact_sequences', JSON.stringify(contactSequences));
  }, [contactSequences]);
  
  useEffect(() => {
    localStorage.setItem('ms_stats', JSON.stringify(stats));
  }, [stats]);
  
  useEffect(() => {
    localStorage.setItem('ms_tags', JSON.stringify(tags));
  }, [tags]);
  
  // Instance management
  const addInstance = (instance: Omit<Instance, 'id' | 'createdAt'>) => {
    const newInstance = {
      ...instance,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    setInstances(prev => [...prev, newInstance]);
    if (!currentInstance) {
      setCurrentInstance(newInstance);
    }
    toast.success("Instância adicionada com sucesso!");
  };
  
  const updateInstance = (id: string, data: Partial<Instance>) => {
    setInstances(prev => 
      prev.map(instance => 
        instance.id === id ? { ...instance, ...data } : instance
      )
    );
    
    if (currentInstance?.id === id) {
      setCurrentInstance(prev => prev ? { ...prev, ...data } : prev);
    }
    toast.success("Instância atualizada com sucesso!");
  };
  
  const deleteInstance = (id: string) => {
    setInstances(prev => prev.filter(instance => instance.id !== id));
    
    if (currentInstance?.id === id) {
      setCurrentInstance(instances.find(instance => instance.id !== id) || null);
    }
    
    // Remove any sequences associated with this instance
    setSequences(prev => prev.filter(seq => seq.instanceId !== id));
    toast.success("Instância removida com sucesso!");
  };
  
  // Sequence management
  const addSequence = (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newSequence = {
      ...sequence,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    setSequences(prev => [...prev, newSequence]);
    
    // Update stats for today
    const today = new Date().toISOString().split('T')[0];
    updateDailyStats(today, { sequences: 1 });
    
    toast.success("Sequência criada com sucesso!");
  };
  
  const updateSequence = (id: string, data: Partial<Sequence>) => {
    setSequences(prev => 
      prev.map(sequence => 
        sequence.id === id ? { 
          ...sequence, 
          ...data, 
          updatedAt: new Date().toISOString() 
        } : sequence
      )
    );
    toast.success("Sequência atualizada com sucesso!");
  };
  
  const deleteSequence = (id: string) => {
    setSequences(prev => prev.filter(sequence => sequence.id !== id));
    
    // Also remove any scheduled messages and contact sequences for this sequence
    setScheduledMessages(prev => prev.filter(msg => msg.sequenceId !== id));
    setContactSequences(prev => prev.filter(seq => seq.sequenceId !== id));
    
    toast.success("Sequência removida com sucesso!");
  };
  
  // Tag management
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
  };
  
  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };
  
  // Helper to get contact sequences
  const getContactSequences = (contactId: string) => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };
  
  // Helper to update daily stats
  const updateDailyStats = (date: string, updates: Partial<{
    messagesScheduled: number;
    messagesSent: number;
    messagesFailed: number;
    newContacts: number;
    completedSequences: number;
    sequences: number;
  }>) => {
    setStats(prev => {
      const dayStats = prev.find(s => s.date === date);
      
      if (dayStats) {
        return prev.map(s => 
          s.date === date ? {
            ...s,
            messagesScheduled: s.messagesScheduled + (updates.messagesScheduled || 0),
            messagesSent: s.messagesSent + (updates.messagesSent || 0),
            messagesFailed: s.messagesFailed + (updates.messagesFailed || 0),
            newContacts: s.newContacts + (updates.newContacts || 0),
            completedSequences: s.completedSequences + (updates.completedSequences || 0),
          } : s
        );
      } else {
        return [...prev, {
          date,
          messagesScheduled: updates.messagesScheduled || 0,
          messagesSent: updates.messagesSent || 0,
          messagesFailed: updates.messagesFailed || 0,
          newContacts: updates.newContacts || 0,
          completedSequences: updates.completedSequences || 0,
        }];
      }
    });
  };
  
  // Check if contact meets the condition requirements
  const checkTagConditions = (contactTags: string[], condition: TagCondition) => {
    const { type, tags } = condition;
    
    if (type === 'AND') {
      return tags.every(tag => contactTags.includes(tag));
    } else { // OR
      return tags.some(tag => contactTags.includes(tag));
    }
  };
  
  // Calculate the next scheduled time based on delay and restrictions
  const calculateScheduledTime = (baseTime: Date, delay: number, delayUnit: string, timeRestrictions: TimeRestriction[]) => {
    // Apply delay
    const scheduledTime = new Date(baseTime);
    
    if (delayUnit === 'minutes') {
      scheduledTime.setMinutes(scheduledTime.getMinutes() + delay);
    } else if (delayUnit === 'hours') {
      scheduledTime.setHours(scheduledTime.getHours() + delay);
    } else { // days
      scheduledTime.setDate(scheduledTime.getDate() + delay);
    }
    
    // Check if the scheduled time falls within a restriction
    let finalScheduledTime = new Date(scheduledTime);
    let needsReschedule = false;
    
    do {
      needsReschedule = false;
      const dayOfWeek = finalScheduledTime.getDay();
      const hour = finalScheduledTime.getHours();
      const minute = finalScheduledTime.getMinutes();
      
      for (const restriction of timeRestrictions) {
        if (restriction.days.includes(dayOfWeek)) {
          // Check if time falls within the restricted hours
          const timeValue = hour * 60 + minute;
          const restrictionStart = restriction.startHour * 60 + restriction.startMinute;
          const restrictionEnd = restriction.endHour * 60 + restriction.endMinute;
          
          if (timeValue >= restrictionStart && timeValue <= restrictionEnd) {
            // Move to after the restriction ends
            finalScheduledTime.setHours(restriction.endHour);
            finalScheduledTime.setMinutes(restriction.endMinute + 1);
            needsReschedule = true;
            break;
          }
        }
      }
    } while (needsReschedule);
    
    return finalScheduledTime;
  };
  
  // API endpoint simulation: handle tag change
  const handleTagChange = (payload: any) => {
    console.log("Tag change received:", payload);
    const { accountId, accountName, contact: contactData, conversation } = payload.body.data;
    
    // Parse labels into tags array
    const tags = conversation.labels ? conversation.labels.split(",").map((t: string) => t.trim()) : [];
    
    // Check if contact exists, add or update
    let contact = contacts.find(c => c.id === contactData.id.toString());
    
    if (contact) {
      // Update existing contact
      setContacts(prev => 
        prev.map(c => 
          c.id === contactData.id.toString() 
            ? { ...c, tags, accountId, accountName, inboxId: conversation.inboxId, conversationId: conversation.conversationId } 
            : c
        )
      );
    } else {
      // Create new contact
      const newContact = {
        id: contactData.id.toString(),
        name: contactData.name,
        phoneNumber: contactData.phoneNumber,
        tags,
        accountId,
        accountName,
        inboxId: conversation.inboxId,
        conversationId: conversation.conversationId
      };
      
      setContacts(prev => [...prev, newContact]);
      contact = newContact;
      
      // Update stats for today - new contact
      const today = new Date().toISOString().split('T')[0];
      updateDailyStats(today, { newContacts: 1 });
    }
    
    // Check which sequences this contact should be in based on tags
    if (!currentInstance) return;
    
    const applicableSequences = sequences.filter(sequence => 
      sequence.instanceId === currentInstance.id &&
      sequence.status === 'active' &&
      checkTagConditions(tags, sequence.startCondition) &&
      !checkTagConditions(tags, sequence.stopCondition)
    );
    
    for (const sequence of applicableSequences) {
      // Check if contact is already in this sequence
      const existingSequence = contactSequences.find(
        cs => cs.contactId === contact.id && cs.sequenceId === sequence.id
      );
      
      if (existingSequence) {
        // If already exists but was removed, potentially reactivate
        if (existingSequence.status === 'removed') {
          setContactSequences(prev => 
            prev.map(cs => 
              cs.id === existingSequence.id
                ? {
                    ...cs,
                    status: 'active',
                    startedAt: new Date().toISOString(),
                    removedAt: undefined,
                    currentStageId: sequence.stages.length > 0 ? sequence.stages[0].id : undefined
                  }
                : cs
            )
          );
          
          // Schedule first message
          if (sequence.stages.length > 0) {
            const firstStage = sequence.stages[0];
            const now = new Date();
            const rawScheduledTime = calculateScheduledTime(
              now, 
              firstStage.delay, 
              firstStage.delayUnit, 
              []
            );
            
            const scheduledTime = calculateScheduledTime(
              now, 
              firstStage.delay, 
              firstStage.delayUnit, 
              sequence.timeRestrictions
            );
            
            const newMessage = {
              id: crypto.randomUUID(),
              contactId: contact.id,
              sequenceId: sequence.id,
              stageId: firstStage.id,
              rawScheduledTime: rawScheduledTime.toISOString(),
              scheduledTime: scheduledTime.toISOString(),
              status: 'pending' as const,
              attempts: 0
            };
            
            setScheduledMessages(prev => [...prev, newMessage]);
            
            // Update stats for today
            const today = new Date().toISOString().split('T')[0];
            updateDailyStats(today, { messagesScheduled: 1 });
          }
        }
      } else {
        // Create new contact sequence
        const newContactSequence = {
          id: crypto.randomUUID(),
          contactId: contact.id,
          sequenceId: sequence.id,
          status: 'active' as const,
          startedAt: new Date().toISOString(),
          currentStageId: sequence.stages.length > 0 ? sequence.stages[0].id : undefined,
          stageProgress: sequence.stages.map(stage => ({
            stageId: stage.id,
            status: 'pending' as const
          }))
        };
        
        setContactSequences(prev => [...prev, newContactSequence]);
        
        // Schedule first message
        if (sequence.stages.length > 0) {
          const firstStage = sequence.stages[0];
          const now = new Date();
          const rawScheduledTime = calculateScheduledTime(
            now, 
            firstStage.delay, 
            firstStage.delayUnit, 
            []
          );
          
          const scheduledTime = calculateScheduledTime(
            now, 
            firstStage.delay, 
            firstStage.delayUnit, 
            sequence.timeRestrictions
          );
          
          const newMessage = {
            id: crypto.randomUUID(),
            contactId: contact.id,
            sequenceId: sequence.id,
            stageId: firstStage.id,
            rawScheduledTime: rawScheduledTime.toISOString(),
            scheduledTime: scheduledTime.toISOString(),
            status: 'pending' as const,
            attempts: 0
          };
          
          setScheduledMessages(prev => [...prev, newMessage]);
          
          // Update stats for today
          const today = new Date().toISOString().split('T')[0];
          updateDailyStats(today, { messagesScheduled: 1 });
        }
      }
    }
    
    // Check if contact should be removed from any sequences
    const activeContactSequences = contactSequences.filter(
      cs => cs.contactId === contact.id && cs.status === 'active'
    );
    
    for (const contactSequence of activeContactSequences) {
      const sequence = sequences.find(s => s.id === contactSequence.sequenceId);
      
      if (sequence && checkTagConditions(tags, sequence.stopCondition)) {
        // Remove contact from sequence
        setContactSequences(prev => 
          prev.map(cs => 
            cs.id === contactSequence.id
              ? {
                  ...cs,
                  status: 'removed',
                  removedAt: new Date().toISOString()
                }
              : cs
          )
        );
        
        // Remove any pending messages for this sequence
        setScheduledMessages(prev => 
          prev.filter(msg => 
            !(msg.contactId === contact.id && 
              msg.sequenceId === sequence.id && 
              (msg.status === 'pending' || msg.status === 'processing'))
          )
        );
      }
    }
    
    return { status: 'success', message: 'Tag change processed successfully' };
  };
  
  // API endpoint simulation: get pending messages
  const getPendingMessages = () => {
    const now = new Date();
    
    // Find messages that are scheduled before now
    const pendingMessages = scheduledMessages.filter(msg => 
      (msg.status === 'pending' || msg.status === 'failed') && 
      new Date(msg.scheduledTime) <= now
    );
    
    // Mark these as processing
    setScheduledMessages(prev => 
      prev.map(msg => 
        pendingMessages.some(p => p.id === msg.id)
          ? { ...msg, status: 'processing' }
          : msg
      )
    );
    
    // Return formatted pending messages for N8N
    return pendingMessages.map(msg => {
      const contact = contacts.find(c => c.id === msg.contactId);
      const sequence = sequences.find(s => s.id === msg.sequenceId);
      const stage = sequence?.stages.find(s => s.id === msg.stageId);
      
      if (!contact || !sequence || !stage) {
        return null;
      }
      
      return {
        messageId: msg.id,
        chatwootData: {
          data: {
            accountId: contact.accountId,
            accountName: contact.accountName,
            contact: {
              id: parseInt(contact.id),
              name: contact.name,
              phoneNumber: contact.phoneNumber
            },
            conversation: {
              inboxId: contact.inboxId,
              conversationId: contact.conversationId,
              displayId: parseInt(contact.id),
              labels: contact.tags.join(", ")
            }
          }
        },
        instanceData: {
          name: currentInstance?.name,
          evolutionApiUrl: currentInstance?.evolutionApiUrl,
          apiKey: currentInstance?.apiKey
        },
        sequenceData: {
          instanceName: currentInstance?.name,
          sequenceName: sequence.name,
          type: stage.type,
          stage: {
            id: stage.id,
            content: stage.content,
            rawScheduledTime: msg.rawScheduledTime,
            scheduledTime: msg.scheduledTime
          }
        }
      };
    }).filter(Boolean);
  };
  
  // API endpoint simulation: handle delivery status
  const handleDeliveryStatus = (messageId: string, success: boolean) => {
    const message = scheduledMessages.find(msg => msg.id === messageId);
    
    if (!message) {
      return { status: 'error', message: 'Message not found' };
    }
    
    const sequence = sequences.find(s => s.id === message.sequenceId);
    const contactSequence = contactSequences.find(
      cs => cs.contactId === message.contactId && cs.sequenceId === message.sequenceId
    );
    
    if (!sequence || !contactSequence) {
      return { status: 'error', message: 'Sequence data not found' };
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    if (success) {
      // Mark message as sent
      setScheduledMessages(prev => 
        prev.map(msg => 
          msg.id === messageId
            ? { ...msg, status: 'sent', sentAt: new Date().toISOString() }
            : msg
        )
      );
      
      // Update stats
      updateDailyStats(today, { messagesSent: 1 });
      
      // Update contact sequence progress
      const updatedStageProgress = contactSequence.stageProgress.map(progress => 
        progress.stageId === message.stageId
          ? { ...progress, status: 'completed', completedAt: new Date().toISOString() }
          : progress
      );
      
      // Find the current stage index
      const currentStageIndex = sequence.stages.findIndex(s => s.id === message.stageId);
      const nextStage = sequence.stages[currentStageIndex + 1];
      
      if (nextStage) {
        // There's a next stage, schedule the next message
        setContactSequences(prev => 
          prev.map(cs => 
            cs.id === contactSequence.id
              ? { ...cs, currentStageId: nextStage.id, stageProgress: updatedStageProgress }
              : cs
          )
        );
        
        // Schedule next message
        const now = new Date();
        const rawScheduledTime = calculateScheduledTime(
          now, 
          nextStage.delay, 
          nextStage.delayUnit, 
          []
        );
        
        const scheduledTime = calculateScheduledTime(
          now, 
          nextStage.delay, 
          nextStage.delayUnit, 
          sequence.timeRestrictions
        );
        
        const newMessage = {
          id: crypto.randomUUID(),
          contactId: message.contactId,
          sequenceId: message.sequenceId,
          stageId: nextStage.id,
          rawScheduledTime: rawScheduledTime.toISOString(),
          scheduledTime: scheduledTime.toISOString(),
          status: 'pending' as const,
          attempts: 0
        };
        
        setScheduledMessages(prev => [...prev, newMessage]);
        
        // Update stats
        updateDailyStats(today, { messagesScheduled: 1 });
      } else {
        // This was the last stage, mark sequence as completed
        setContactSequences(prev => 
          prev.map(cs => 
            cs.id === contactSequence.id
              ? { 
                  ...cs, 
                  status: 'completed', 
                  completedAt: new Date().toISOString(),
                  stageProgress: updatedStageProgress 
                }
              : cs
          )
        );
        
        // Update stats
        updateDailyStats(today, { completedSequences: 1 });
      }
      
      return { status: 'success', message: 'Message delivery successful' };
    } else {
      // Message delivery failed
      const updatedAttempts = message.attempts + 1;
      const maxAttempts = 3;
      
      if (updatedAttempts >= maxAttempts) {
        // Max attempts reached, mark as persistent_error
        setScheduledMessages(prev => 
          prev.map(msg => 
            msg.id === messageId
              ? { ...msg, status: 'persistent_error', attempts: updatedAttempts }
              : msg
          )
        );
      } else {
        // Mark as failed for retry
        setScheduledMessages(prev => 
          prev.map(msg => 
            msg.id === messageId
              ? { ...msg, status: 'failed', attempts: updatedAttempts }
              : msg
          )
        );
      }
      
      // Update stats
      updateDailyStats(today, { messagesFailed: 1 });
      
      return { status: 'error', message: 'Message delivery failed' };
    }
  };
  
  // Fix for the type issues in updateContactSequence function
  const updateContactSequence = (contactId: string, sequenceId: string, updates: Partial<ContactSequence>) => {
    setContactSequences((prev) => {
      return prev.map((cs) => {
        if (cs.contactId === contactId && cs.sequenceId === sequenceId) {
          // Create a properly typed stageProgress array
          let updatedStageProgress = cs.stageProgress;
          
          if (updates.stageProgress) {
            updatedStageProgress = updates.stageProgress.map(stage => ({
              stageId: stage.stageId,
              status: stage.status as "pending" | "completed" | "skipped",
              completedAt: stage.completedAt
            }));
          }
          
          // Create a properly typed updated contact sequence
          const updatedContactSequence: ContactSequence = {
            ...cs,
            ...(updates as Omit<typeof updates, 'stageProgress'>),
            stageProgress: updatedStageProgress
          };
          
          return updatedContactSequence;
        }
        return cs;
      });
    });
  };
  
  // Fix for the type issues in completeContactSequence function
  const completeContactSequence = (contactId: string, sequenceId: string) => {
    setContactSequences((prev) => {
      return prev.map((cs) => {
        if (cs.contactId === contactId && cs.sequenceId === sequenceId) {
          // Create a properly typed completed contact sequence
          const completedContactSequence: ContactSequence = {
            ...cs,
            status: "completed",
            completedAt: new Date().toISOString()
          };
          
          return completedContactSequence;
        }
        return cs;
      });
    });
  };
  
  return (
    <AppContext.Provider value={{
      user,
      instances,
      currentInstance,
      setCurrentInstance,
      sequences,
      contacts,
      scheduledMessages,
      contactSequences,
      stats,
      tags,
      
      addInstance,
      updateInstance,
      deleteInstance,
      
      addSequence,
      updateSequence,
      deleteSequence,
      
      addTag,
      removeTag,
      
      getContactSequences,
      
      handleTagChange,
      getPendingMessages,
      handleDeliveryStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
};
