
import { useContext } from "react";
import { CoreAppContext, useAppCore } from "./AppProvider";
import { useClients } from "./clients/ClientsContext";
import { useInstances } from "./instances/InstancesContext";
import { useSequences } from "./sequences/SequencesContext";
import { useContacts } from "./contacts/ContactsContext";
import { useTimeRestrictions } from "./timeRestrictions/TimeRestrictionsContext";
import { useUsers } from "./users/UsersContext";
import { useTags } from "./tags/TagsContext";
import { useStats } from "./stats/StatsContext";
import { useMessages } from "./messages/MessagesContext";
import { AppContextType } from "./types";

// Export everything from sub-contexts
export { AppContextProvider } from "./AppProvider";
export * from "./clients/ClientsContext";
export * from "./instances/InstancesContext";
export * from "./sequences/SequencesContext";
export * from "./contacts/ContactsContext";
export * from "./timeRestrictions/TimeRestrictionsContext";
export * from "./users/UsersContext";
export * from "./tags/TagsContext";
export * from "./stats/StatsContext";
export * from "./messages/MessagesContext";
export * from "./types";

// Combined hook for backward compatibility
export const useApp = (): AppContextType => {
  const coreContext = useAppCore();
  const clients = useClients();
  const instances = useInstances();
  const sequences = useSequences();
  const contacts = useContacts();
  const timeRestrictions = useTimeRestrictions();
  const users = useUsers();
  const tags = useTags();
  const stats = useStats();
  const messages = useMessages();
  
  return {
    // Core app data
    isDataInitialized: coreContext.isDataInitialized,
    refreshData: coreContext.refreshData,
    
    // Clients data and functions
    clients: clients.clients,
    addClient: clients.addClient,
    updateClient: clients.updateClient,
    deleteClient: clients.deleteClient,
    
    // Instances data and functions
    instances: instances.instances,
    currentInstance: instances.currentInstance,
    setCurrentInstance: instances.setCurrentInstance,
    addInstance: instances.addInstance,
    updateInstance: instances.updateInstance,
    deleteInstance: instances.deleteInstance,
    
    // Sequences data and functions
    sequences: sequences.sequences,
    addSequence: sequences.addSequence,
    updateSequence: sequences.updateSequence,
    deleteSequence: sequences.deleteSequence,
    
    // Contacts data and functions
    contacts: contacts.contacts,
    contactSequences: contacts.contactSequences,
    getContactSequences: contacts.getContactSequences,
    addContact: contacts.addContact,
    deleteContact: contacts.deleteContact,
    updateContact: contacts.updateContact,
    removeFromSequence: contacts.removeFromSequence,
    updateContactSequence: contacts.updateContactSequence,
    
    // Time restrictions data and functions
    timeRestrictions: timeRestrictions.timeRestrictions,
    addTimeRestriction: timeRestrictions.addTimeRestriction,
    updateTimeRestriction: timeRestrictions.updateTimeRestriction,
    deleteTimeRestriction: timeRestrictions.deleteTimeRestriction,
    
    // Users data and functions
    users: users.users,
    addUser: users.addUser,
    updateUser: users.updateUser,
    deleteUser: users.deleteUser,
    
    // Tags data and functions
    tags: tags.tags,
    addTag: tags.addTag,
    deleteTag: tags.deleteTag,
    
    // Stats data
    stats: stats.stats,
    
    // Messages data
    scheduledMessages: messages.scheduledMessages
  };
};
