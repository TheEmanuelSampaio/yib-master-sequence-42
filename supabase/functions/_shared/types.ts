
export type ChatwootData = {
  accountData: {
    accountId: number;
    accountName: string;
  };
  contactData: {
    id: number | string;
    name: string;
    phoneNumber: string;
  };
  conversationData: {
    inboxId: number;
    conversationId: number;
    displayId: number;
    labels: string;
  };
};

export type TagChangeResponse = {
  success: boolean;
  message: string;
  details: {
    contactId: string;
    clientId: string;
    clientName: string;
    accountId: number;
    tagsAdded: number;
    tagsRemoved: number;
    tagsAddedSuccess: number;
    tagsAddedFail: number;
    tagErrors: Array<{tag: string, error: string}>;
    eligibleSequences: number;
    addedToSequences: number;
    removedFromSequences: number;
  };
};
