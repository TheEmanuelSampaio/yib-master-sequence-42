
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Instance, User, Sequence, Contact, ScheduledMessage, 
  ContactSequence, DailyStats, TagCondition, TimeRestriction, StageProgressStatus
} from '@/types';
import { mockInstances, mockUser, mockSequences, mockContacts, mockStats } from '@/lib/mockData';
import { toast } from 'sonner';

// Utility functions
const checkTagConditions = (contactTags: string[], condition: TagCondition): boolean => {
  if (condition.tags.length === 0) return false;
  
  if (condition.type === 'AND') {
    return condition.tags.every(tag => contactTags.includes(tag));
  } else {
    return condition.tags.some(tag => contactTags.includes(tag));
  }
};

const calculateScheduledTime = (
  base: Date, 
  delay: number, 
  delayUnit: 'minutes' | 'hours' | 'days',
  timeRestrictions: TimeRestriction[]
): Date => {
  const result = new Date(base);
  
  // Add delay
  switch (delayUnit) {
    case 'minutes':
      result.setMinutes(result.getMinutes() + delay);
      break;
    case 'hours':
      result.setHours(result.getHours() + delay);
      break;
    case 'days':
      result.setDate(result.getDate() + delay);
      break;
  }
  
  // If no time restrictions, return the calculated time
  if (!timeRestrictions || timeRestrictions.length === 0) {
    return result;
  }
  
  // Check if the time falls within any of the restrictions
  const day = result.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = result.getHours();
  const minute = result.getMinutes();
  
  // Find applicable time restrictions for the current day
  const applicableRestrictions = timeRestrictions.filter(tr => tr.days.includes(day));
  
  if (applicableRestrictions.length === 0) {
    // No restrictions for this day
    return result;
  }
  
  // Check if the time falls outside any of the restrictions
  for (const restriction of applicableRestrictions) {
    const startMinutes = restriction.startHour * 60 + restriction.startMinute;
    const endMinutes = restriction.endHour * 60 + restriction.endMinute;
    const currentMinutes = hour * 60 + minute;
    
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      // Time is outside restriction, move to the next available time
      const nextDay = new Date(result);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(restriction.startHour);
      nextDay.setMinutes(restriction.startMinute);
      nextDay.setSeconds(0);
      
      return nextDay;
    }
  }
  
  return result;
};

const updateDailyStats = (date: string, updates: Partial<Record<keyof Omit<DailyStats, 'date'>, number>>) => {
  const updatedStats = (prevStats: DailyStats[]) => {
    let stats = [...prevStats];
    const existingStatIndex = stats.findIndex(s => s.date === date);
    
    if (existingStatIndex >= 0) {
      // Update existing stats
      stats[existingStatIndex] = {
        ...stats[existingStatIndex],
        ...Object.fromEntries(Object.entries(updates).map(([key, value]) => [
          key, 
          (stats[existingStatIndex][key as keyof Omit<DailyStats, 'date'>] as number) + value
        ]))
      };
    } else {
      // Create new stats for the day
      stats.push({
        date,
        messagesScheduled: updates.messagesScheduled || 0,
        messagesSent: updates.messagesSent || 0,
        messagesFailed: updates.messagesFailed || 0,
        newContacts: updates.newContacts || 0,
        completedSequences: updates.completedSequences || 0
      });
    }
    
    return stats;
  };
  
  return updatedStats;
};

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
  
  addInstance: (instance: Omit<Instance, 'id' | 'createdAt'>) => void;
  updateInstance: (id: string, data: Partial<Instance>) => void;
  deleteInstance: (id: string) => void;
  
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSequence: (id: string, data: Partial<Sequence>) => void;
  deleteSequence: (id: string) => void;
  
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  
  getContactSequences: (contactId: string) => ContactSequence[];
  
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
    
    setSequences(prev => prev.filter(seq => seq.instanceId !== id));
    toast.success("Instância removida com sucesso!");
  };
  
  const addSequence = (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newSequence = {
      ...sequence,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    setSequences(prev => [...prev, newSequence]);
    
    const today = new Date().toISOString().split('T')[0];
    setStats(updateDailyStats(today, { completedSequences: 1 }));
    
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
    
    setScheduledMessages(prev => prev.filter(msg => msg.sequenceId !== id));
    setContactSequences(prev => prev.filter(seq => seq.sequenceId !== id));
    
    toast.success("Sequência removida com sucesso!");
  };
  
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
  };
  
  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };
  
  const getContactSequences = (contactId: string) => {
    return contactSequences.filter(cs => cs.contactId === contactId);
  };
  
  const handleTagChange = (payload: any) => {
    console.log("Tag change received:", payload);
    const { accountId, accountName, contact: contactData, conversation } = payload.body.data;
    
    const tags = conversation.labels ? conversation.labels.split(",").map((t: string) => t.trim()) : [];
    
    let contact = contacts.find(c => c.id === contactData.id.toString());
    
    if (contact) {
      setContacts(prev => 
        prev.map(c => 
          c.id === contactData.id.toString() 
            ? { ...c, tags, accountId, accountName, inboxId: conversation.inboxId, conversationId: conversation.conversationId } 
            : c
        )
      );
    } else {
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
      
      const today = new Date().toISOString().split('T')[0];
      setStats(updateDailyStats(today, { newContacts: 1 }));
    }
    
    const applicableSequences = sequences.filter(sequence => 
      sequence.instanceId === currentInstance!.id &&
      sequence.status === 'active' &&
      checkTagConditions(tags, sequence.startCondition) &&
      !checkTagConditions(tags, sequence.stopCondition)
    );
    
    for (const sequence of applicableSequences) {
      const existingSequence = contactSequences.find(
        cs => cs.contactId === contact.id && cs.sequenceId === sequence.id
      );
      
      if (existingSequence) {
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
          
          const now = new Date();
          const rawScheduledTime = calculateScheduledTime(
            now, 
            sequence.stages[0].delay, 
            sequence.stages[0].delayUnit, 
            []
          );
          
          const scheduledTime = calculateScheduledTime(
            now, 
            sequence.stages[0].delay, 
            sequence.stages[0].delayUnit, 
            sequence.timeRestrictions
          );
          
          const newMessage = {
            id: crypto.randomUUID(),
            contactId: contact.id,
            sequenceId: sequence.id,
            stageId: sequence.stages[0].id,
            rawScheduledTime: rawScheduledTime.toISOString(),
            scheduledTime: scheduledTime.toISOString(),
            status: 'pending' as const,
            attempts: 0
          };
          
          setScheduledMessages(prev => [...prev, newMessage]);
          
          const today = new Date().toISOString().split('T')[0];
          setStats(updateDailyStats(today, { messagesScheduled: 1 }));
        }
      } else {
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
        
        const now = new Date();
        const rawScheduledTime = calculateScheduledTime(
          now, 
          sequence.stages[0].delay, 
          sequence.stages[0].delayUnit, 
          []
        );
        
        const scheduledTime = calculateScheduledTime(
          now, 
          sequence.stages[0].delay, 
          sequence.stages[0].delayUnit, 
          sequence.timeRestrictions
        );
        
        const newMessage = {
          id: crypto.randomUUID(),
          contactId: contact.id,
          sequenceId: sequence.id,
          stageId: sequence.stages[0].id,
          rawScheduledTime: rawScheduledTime.toISOString(),
          scheduledTime: scheduledTime.toISOString(),
          status: 'pending' as const,
          attempts: 0
        };
        
        setScheduledMessages(prev => [...prev, newMessage]);
        
        const today = new Date().toISOString().split('T')[0];
        setStats(updateDailyStats(today, { messagesScheduled: 1 }));
      }
    }
    
    // Get active contact sequences for this contact
    const activeContactSequences = contactSequences.filter(
      cs => cs.contactId === contact.id && cs.status === 'active'
    );
    
    for (const contactSequence of activeContactSequences) {
      const sequence = sequences.find(s => s.id === contactSequence.sequenceId);
      
      if (sequence && checkTagConditions(tags, sequence.stopCondition)) {
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
  
  const getPendingMessages = () => {
    const now = new Date();
    
    const pendingMessages = scheduledMessages.filter(msg => 
      (msg.status === 'pending' || msg.status === 'failed') && 
      new Date(msg.scheduledTime) <= now
    );
    
    setScheduledMessages(prev => 
      prev.map(msg => 
        pendingMessages.some(p => p.id === msg.id)
          ? { ...msg, status: 'processing' }
          : msg
      )
    );
    
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
      setScheduledMessages(prev => 
        prev.map(msg => 
          msg.id === messageId
            ? { ...msg, status: 'sent', sentAt: new Date().toISOString() }
            : msg
        )
      );
      
      setStats(updateDailyStats(today, { messagesSent: 1 }));
      
      const updatedStageProgress = contactSequence.stageProgress.map(progress => 
        progress.stageId === message.stageId
          ? { 
              ...progress, 
              status: 'completed' as StageProgressStatus, 
              completedAt: new Date().toISOString() 
            }
          : progress
      );
      
      const currentStageIndex = sequence.stages.findIndex(s => s.id === message.stageId);
      const nextStage = sequence.stages[currentStageIndex + 1];
      
      if (nextStage) {
        setContactSequences(prev => 
          prev.map(cs => 
            cs.id === contactSequence.id
              ? { 
                  ...cs, 
                  currentStageId: nextStage.id, 
                  stageProgress: updatedStageProgress 
                }
              : cs
          )
        );
        
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
        
        setStats(updateDailyStats(today, { messagesScheduled: 1 }));
      } else {
        setContactSequences(prev => 
          prev.map(cs => 
            cs.id === contactSequence.id
              ? { 
                  ...cs, 
                  status: 'completed' as const, 
                  completedAt: new Date().toISOString(),
                  stageProgress: updatedStageProgress 
                }
              : cs
          )
        );
        
        setStats(updateDailyStats(today, { completedSequences: 1 }));
      }
      
      return { status: 'success', message: 'Message delivery successful' };
    } else {
      const updatedAttempts = message.attempts + 1;
      const maxAttempts = 3;
      
      if (updatedAttempts >= maxAttempts) {
        setScheduledMessages(prev => 
          prev.map(msg => 
            msg.id === messageId
              ? { ...msg, status: 'persistent_error', attempts: updatedAttempts }
              : msg
          )
        );
      } else {
        setScheduledMessages(prev => 
          prev.map(msg => 
            msg.id === messageId
              ? { ...msg, status: 'failed', attempts: updatedAttempts }
              : msg
          )
        );
      }
      
      setStats(updateDailyStats(today, { messagesFailed: 1 }));
      
      return { status: 'error', message: 'Message delivery failed' };
    }
  };
  
  const updateContactSequence = (contactId: string, sequenceId: string, updates: Partial<ContactSequence>) => {
    setContactSequences((prev) => {
      return prev.map((cs): ContactSequence => {
        if (cs.contactId === contactId && cs.sequenceId === sequenceId) {
          const updatedStageProgress = updates.stageProgress 
            ? updates.stageProgress.map(stage => ({
                stageId: stage.stageId,
                status: stage.status as StageProgressStatus,
                completedAt: stage.completedAt
              }))
            : cs.stageProgress;
          
          return {
            ...cs,
            ...updates,
            stageProgress: updatedStageProgress
          };
        }
        return cs;
      });
    });
  };
  
  const completeContactSequence = (contactId: string, sequenceId: string) => {
    setContactSequences((prev) => {
      return prev.map((cs): ContactSequence => {
        if (cs.contactId === contactId && cs.sequenceId === sequenceId) {
          return {
            ...cs,
            status: "completed" as const,
            completedAt: new Date().toISOString()
          };
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
