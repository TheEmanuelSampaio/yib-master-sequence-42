import { v4 as uuidv4 } from 'uuid';
import { 
  Client, 
  Instance, 
  User, 
  Contact, 
  Sequence, 
  DailyStats, 
  SequenceStage, 
  TimeRestriction,
  ContactSequence,
  ConditionStructure,
  StageProgress
} from '@/types';

// Mock users
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    accountName: 'Admin Account',
    role: 'super_admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
  },
  {
    id: '2',
    email: 'user@example.com',
    accountName: 'User Account',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily'
  }
];

// Mock clients
export const mockClients: Client[] = [
  {
    id: '1',
    accountId: 101,
    accountName: 'Client A',
    createdBy: '1',
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2023-01-15T10:00:00Z',
    creator_account_name: 'Admin Account'
  },
  {
    id: '2',
    accountId: 102,
    accountName: 'Client B',
    createdBy: '1',
    createdAt: '2023-02-20T14:30:00Z',
    updatedAt: '2023-02-20T14:30:00Z',
    creator_account_name: 'Admin Account'
  }
];

// Mock instances
export const mockInstances: Instance[] = [
  {
    id: '1',
    name: 'Instance 1',
    evolutionApiUrl: 'https://api1.example.com',
    apiKey: 'api-key-1',
    active: true,
    clientId: '1',
    createdBy: '1',
    createdAt: '2023-03-10T09:15:00Z',
    updatedAt: '2023-03-10T09:15:00Z',
  },
  {
    id: '2',
    name: 'Instance 2',
    evolutionApiUrl: 'https://api2.example.com',
    apiKey: 'api-key-2',
    active: false,
    clientId: '2',
    createdBy: '1',
    createdAt: '2023-04-05T16:20:00Z',
    updatedAt: '2023-04-05T16:20:00Z',
  }
];

// Mock sequences with new condition structure
export const mockSequences: Sequence[] = [
  {
    id: '1',
    instanceId: '1',
    name: 'Welcome Sequence',
    type: "message",
    startCondition: {
      operator: "AND",
      groups: [
        {
          id: uuidv4(),
          operator: "OR",
          tags: ['new-lead', 'website-visitor']
        }
      ]
    },
    stopCondition: {
      operator: "OR",
      groups: [
        {
          id: uuidv4(),
          operator: "AND",
          tags: ['converted', 'do-not-contact']
        }
      ]
    },
    stages: [
      {
        id: '101',
        name: 'Welcome Message',
        type: 'message',
        content: 'Welcome to our service! We\'re glad to have you onboard.',
        delay: 30,
        delayUnit: 'minutes',
        orderIndex: 0
      },
      {
        id: '102',
        name: 'Follow-up Message',
        type: 'message',
        content: 'How are you finding our service so far?',
        delay: 2,
        delayUnit: 'days',
        orderIndex: 1
      }
    ],
    timeRestrictions: [],
    status: 'active',
    createdAt: '2023-05-12T08:45:00Z',
    updatedAt: '2023-05-12T08:45:00Z'
  },
  {
    id: '2',
    instanceId: '1',
    name: 'Re-engagement Sequence',
    type: "pattern",
    startCondition: {
      operator: "OR",
      groups: [
        {
          id: uuidv4(),
          operator: "AND",
          tags: ['inactive', '30-days']
        }
      ]
    },
    stopCondition: {
      operator: "OR",
      groups: [
        {
          id: uuidv4(),
          operator: "OR",
          tags: ['engaged', 'unsubscribed']
        }
      ]
    },
    stages: [
      {
        id: '201',
        name: 'Miss you message',
        type: 'pattern',
        content: 'We haven\'t seen you for a while! Here\'s what you\'ve been missing...',
        delay: 0,
        delayUnit: 'minutes',
        orderIndex: 0
      }
    ],
    timeRestrictions: [],
    status: 'inactive',
    createdAt: '2023-06-18T11:30:00Z',
    updatedAt: '2023-06-18T11:30:00Z'
  }
];

// Mock contacts
export const mockContacts: Contact[] = [
  {
    id: "16087",
    name: "Carlos Silva",
    phoneNumber: "5511999887766",
    tags: ["lead", "interessado", "orçamento"],
    clientId: "client-1",
    inboxId: 101,
    conversationId: 5001,
    displayId: 1001,
    createdAt: "2023-12-01T10:00:00Z",
    updatedAt: "2023-12-01T10:00:00Z"
  },
  {
    id: "16088",
    name: "Maria Oliveira",
    phoneNumber: "5511988776655",
    tags: ["cliente", "comprou"],
    clientId: "client-2",
    inboxId: 102,
    conversationId: 5002,
    displayId: 1002,
    createdAt: "2023-12-01T11:00:00Z",
    updatedAt: "2023-12-01T11:00:00Z"
  },
  {
    id: "16089",
    name: "João Santos",
    phoneNumber: "5511977665544",
    tags: ["lead", "novo"],
    clientId: "client-1",
    inboxId: 103,
    conversationId: 5003,
    displayId: 1003,
    createdAt: "2023-12-02T09:00:00Z",
    updatedAt: "2023-12-02T09:00:00Z"
  },
  {
    id: "16090",
    name: "Ana Pereira",
    phoneNumber: "5511966554433",
    tags: ["abandonou"],
    clientId: "client-1",
    inboxId: 101,
    conversationId: 5004,
    displayId: 1004,
    createdAt: "2023-12-03T14:00:00Z",
    updatedAt: "2023-12-03T14:00:00Z"
  },
  {
    id: "16091",
    name: "Lucas Costa",
    phoneNumber: "5511955443322",
    tags: ["cliente", "comprou", "retorno"],
    clientId: "client-2",
    inboxId: 102,
    conversationId: 5005,
    displayId: 1005,
    createdAt: "2023-12-04T16:00:00Z",
    updatedAt: "2023-12-04T16:00:00Z"
  }
];

// Mock time restrictions
export const mockTimeRestrictions: TimeRestriction[] = [
  {
    id: "global-1",
    name: "Horário Comercial",
    active: true,
    days: [1, 2, 3, 4, 5],
    startHour: 8,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    isGlobal: true
  },
  {
    id: "global-2",
    name: "Sábado Meio Período",
    active: true,
    days: [6],
    startHour: 9,
    startMinute: 0,
    endHour: 13,
    endMinute: 0,
    isGlobal: true
  }
];

// Mock contact sequences
export const mockContactSequences: ContactSequence[] = [
  {
    contactId: "16087",
    sequenceId: "1",
    currentStageId: "101",
    currentStageIndex: 0,
    status: "active",
    id: uuidv4(),
    startedAt: "2023-12-01T10:00:00Z",
    lastMessageAt: null,
    completedAt: null,
    removedAt: null,
    stageProgress: []
  },
  {
    contactId: "16088",
    sequenceId: "2",
    currentStageId: "201",
    currentStageIndex: 0,
    status: "active",
    id: uuidv4(),
    startedAt: "2023-12-01T11:00:00Z",
    lastMessageAt: null,
    completedAt: null,
    removedAt: null,
    stageProgress: []
  }
];

// Mock daily stats
export const mockDailyStats: DailyStats[] = [
  {
    date: "2023-12-01",
    instanceId: "instance-1",
    messagesScheduled: 25,
    messagesSent: 22,
    messagesFailed: 3,
    newContacts: 8,
    completedSequences: 2
  },
  {
    date: "2023-12-02",
    instanceId: "instance-1",
    messagesScheduled: 32,
    messagesSent: 30,
    messagesFailed: 2,
    newContacts: 12,
    completedSequences: 5
  },
  {
    date: "2023-12-03",
    instanceId: "instance-1",
    messagesScheduled: 18,
    messagesSent: 17,
    messagesFailed: 1,
    newContacts: 6,
    completedSequences: 3
  },
  {
    date: "2023-12-04",
    instanceId: "instance-1",
    messagesScheduled: 41,
    messagesSent: 38,
    messagesFailed: 3,
    newContacts: 15,
    completedSequences: 7
  },
  {
    date: "2023-12-05",
    instanceId: "instance-1",
    messagesScheduled: 29,
    messagesSent: 27,
    messagesFailed: 2,
    newContacts: 10,
    completedSequences: 4
  },
  {
    date: "2023-12-06",
    instanceId: "instance-1",
    messagesScheduled: 35,
    messagesSent: 33,
    messagesFailed: 2,
    newContacts: 9,
    completedSequences: 6
  },
  {
    date: "2023-12-07",
    instanceId: "instance-1",
    messagesScheduled: 43,
    messagesSent: 40,
    messagesFailed: 3,
    newContacts: 18,
    completedSequences: 8
  }
];
