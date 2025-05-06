
import { Client, Contact, ContactSequence, Instance, Sequence, SequenceStage, TimeRestriction, ScheduledMessage, DailyStats, User } from "@/types";
import { v4 as uuidv4 } from 'uuid';

// Current date for reference
const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);

// Mock client data
export const mockClients: Client[] = [
  {
    id: uuidv4(),
    accountId: 1,
    accountName: "Years In Box",
    createdBy: uuidv4(),
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  }
];

// Mock instance data
export const mockInstances: Instance[] = [
  {
    id: uuidv4(),
    name: "Instância Principal",
    evolutionApiUrl: "https://api.example.com",
    apiKey: "api-key-1234567890",
    active: true,
    clientId: mockClients[0].id,
    client: mockClients[0],
    createdBy: uuidv4(),
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  }
];

// Mock sequence data
export const mockSequences: Sequence[] = [
  {
    id: uuidv4(),
    instanceId: mockInstances[0].id,
    name: "Sequência de Boas-vindas",
    startCondition: {
      groups: [
        {
          type: "AND",
          tags: ["lead", "novo"]
        },
        {
          type: "AND",
          tags: ["website"]
        }
      ]
    },
    stopCondition: {
      groups: [
        {
          type: "OR",
          tags: ["cliente", "desistiu"]
        }
      ]
    },
    status: "active",
    type: "message",
    stages: [
      {
        id: uuidv4(),
        name: "Boas-vindas",
        content: "Olá ${name}, bem-vindo à nossa empresa! Estamos felizes em te receber.",
        delay: 15,
        delayUnit: "minutes",
        orderIndex: 0
      },
      {
        id: uuidv4(),
        name: "Nossos produtos",
        content: "Gostaríamos de apresentar nossos produtos principais. Qual deles te interessa mais?",
        delay: 1,
        delayUnit: "days",
        orderIndex: 1
      },
      {
        id: uuidv4(),
        name: "Acompanhamento",
        content: "Olá ${name}, só passando para saber se você precisa de mais alguma informação sobre nossos produtos?",
        delay: 3,
        delayUnit: "days",
        orderIndex: 2
      }
    ],
    timeRestrictions: [],
    createdAt: "2023-01-02T00:00:00Z",
    updatedAt: "2023-01-02T00:00:00Z",
  },
  {
    id: uuidv4(),
    instanceId: mockInstances[0].id,
    name: "Sequência de Pós-venda",
    startCondition: {
      groups: [
        {
          type: "AND",
          tags: ["cliente"]
        }
      ]
    },
    stopCondition: {
      groups: [
        {
          type: "OR",
          tags: ["inativo"]
        }
      ]
    },
    status: "inactive",
    type: "typebot",
    stages: [
      {
        id: uuidv4(),
        name: "Pesquisa de Satisfação",
        content: "https://typebot.io/satisfaction-survey",
        typebotStage: "stg1",
        delay: 2,
        delayUnit: "days",
        orderIndex: 0
      },
      {
        id: uuidv4(),
        name: "Ofertas Especiais",
        content: "https://typebot.io/special-offers",
        typebotStage: "stg2",
        delay: 7,
        delayUnit: "days",
        orderIndex: 1
      },
      {
        id: uuidv4(),
        name: "Fidelização",
        content: "https://typebot.io/loyalty-program",
        typebotStage: "stg3",
        delay: 30,
        delayUnit: "days",
        orderIndex: 2
      }
    ],
    timeRestrictions: [],
    createdAt: "2023-01-03T00:00:00Z",
    updatedAt: "2023-01-03T00:00:00Z",
  }
];

// Mock time restrictions
export const mockTimeRestrictions: TimeRestriction[] = [
  {
    id: uuidv4(),
    name: "Horário Noturno",
    active: true,
    days: [0, 1, 2, 3, 4, 5, 6], // Todos os dias da semana
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
    isGlobal: true
  },
  {
    id: uuidv4(),
    name: "Final de Semana",
    active: true,
    days: [0, 6], // Domingo e sábado
    startHour: 0,
    startMinute: 0,
    endHour: 23,
    endMinute: 59,
    isGlobal: true
  }
];

// Mock contacts
export const mockContacts: Contact[] = [
  {
    id: "1",
    name: "João Silva",
    phoneNumber: "+5511987654321",
    clientId: mockClients[0].id,
    inboxId: 1,
    conversationId: 1001,
    displayId: 1,
    tags: ["lead", "website"],
    createdAt: "2023-03-01T10:00:00Z",
    updatedAt: "2023-03-01T10:00:00Z"
  },
  {
    id: "2",
    name: "Maria Oliveira",
    phoneNumber: "+5511976543210",
    clientId: mockClients[0].id,
    inboxId: 1,
    conversationId: 1002,
    displayId: 2,
    tags: ["lead", "instagram"],
    createdAt: "2023-03-02T14:30:00Z",
    updatedAt: "2023-03-02T14:30:00Z"
  },
  {
    id: "3",
    name: "Carlos Santos",
    phoneNumber: "+5511965432109",
    clientId: mockClients[0].id,
    inboxId: 1,
    conversationId: 1003,
    displayId: 3,
    tags: ["cliente"],
    createdAt: "2023-02-15T09:15:00Z",
    updatedAt: "2023-02-15T09:15:00Z"
  }
];

// Mock scheduled messages
export const mockScheduledMessages: ScheduledMessage[] = [
  {
    id: uuidv4(),
    contactId: mockContacts[0].id,
    sequenceId: mockSequences[0].id,
    stageId: mockSequences[0].stages[0].id,
    scheduledTime: new Date(now.getTime() + 30 * 60000).toISOString(), // 30 minutes from now
    scheduledAt: now.toISOString(),
    status: "waiting"
  },
  {
    id: uuidv4(),
    contactId: mockContacts[1].id,
    sequenceId: mockSequences[0].id,
    stageId: mockSequences[0].stages[1].id,
    scheduledTime: new Date(now.getTime() - 15 * 60000).toISOString(), // 15 minutes ago
    scheduledAt: yesterday.toISOString(),
    status: "pending"
  },
  {
    id: uuidv4(),
    contactId: mockContacts[2].id,
    sequenceId: mockSequences[1].id,
    stageId: mockSequences[1].stages[0].id,
    scheduledTime: yesterday.toISOString(), // Yesterday
    sentAt: yesterday.toISOString(),
    scheduledAt: new Date(yesterday.getTime() - 24 * 60 * 60000).toISOString(),
    status: "sent"
  },
  {
    id: uuidv4(),
    contactId: mockContacts[0].id,
    sequenceId: mockSequences[0].id,
    stageId: mockSequences[0].stages[2].id,
    scheduledTime: new Date(now.getTime() - 45 * 60000).toISOString(), // 45 minutes ago
    scheduledAt: yesterday.toISOString(),
    status: "failed",
    attempts: 1
  },
  {
    id: uuidv4(),
    contactId: mockContacts[1].id,
    sequenceId: mockSequences[1].id,
    stageId: mockSequences[1].stages[1].id,
    scheduledTime: new Date(now.getTime() - 90 * 60000).toISOString(), // 90 minutes ago
    scheduledAt: yesterday.toISOString(),
    status: "persistent_error",
    attempts: 3
  }
];

// Mock contact sequences
export const mockContactSequences: ContactSequence[] = [
  {
    id: uuidv4(),
    contactId: mockContacts[0].id,
    sequenceId: mockSequences[0].id,
    currentStageIndex: 2,
    currentStageId: mockSequences[0].stages[2].id,
    status: "active",
    startedAt: "2023-03-05T10:00:00Z",
    lastMessageAt: "2023-03-07T14:30:00Z"
  },
  {
    id: uuidv4(),
    contactId: mockContacts[1].id,
    sequenceId: mockSequences[0].id,
    currentStageIndex: 1,
    currentStageId: mockSequences[0].stages[1].id,
    status: "active",
    startedAt: "2023-03-06T09:15:00Z",
    lastMessageAt: "2023-03-06T09:15:00Z"
  },
  {
    id: uuidv4(),
    contactId: mockContacts[2].id,
    sequenceId: mockSequences[1].id,
    currentStageIndex: 2,
    currentStageId: null,
    status: "completed",
    startedAt: "2023-02-20T11:30:00Z",
    lastMessageAt: "2023-03-22T15:45:00Z",
    completedAt: "2023-03-22T15:45:00Z"
  }
];

// Mock daily stats
export const mockDailyStats: DailyStats[] = [
  {
    id: uuidv4(),
    date: "2023-03-01",
    instanceId: mockInstances[0].id,
    messagesScheduled: 15,
    messagesSent: 12,
    messagesFailed: 3,
    newContacts: 4,
    completedSequences: 1
  },
  {
    id: uuidv4(),
    date: "2023-03-02",
    instanceId: mockInstances[0].id,
    messagesScheduled: 18,
    messagesSent: 16,
    messagesFailed: 2,
    newContacts: 7,
    completedSequences: 2
  },
  {
    id: uuidv4(),
    date: "2023-03-03",
    instanceId: mockInstances[0].id,
    messagesScheduled: 25,
    messagesSent: 22,
    messagesFailed: 3,
    newContacts: 5,
    completedSequences: 4
  },
  {
    id: uuidv4(),
    date: "2023-03-04",
    instanceId: mockInstances[0].id,
    messagesScheduled: 20,
    messagesSent: 19,
    messagesFailed: 1,
    newContacts: 3,
    completedSequences: 2
  },
  {
    id: uuidv4(),
    date: "2023-03-05",
    instanceId: mockInstances[0].id,
    messagesScheduled: 22,
    messagesSent: 20,
    messagesFailed: 2,
    newContacts: 6,
    completedSequences: 3
  }
];

// Mock users
export const mockUsers: User[] = [
  {
    id: uuidv4(),
    accountName: "Admin User",
    email: "admin@example.com",
    role: "super_admin",
    avatar: ""
  },
  {
    id: uuidv4(),
    accountName: "Regular User",
    email: "user@example.com",
    role: "admin",
    avatar: ""
  }
];

export const mockTags: string[] = [
  "lead",
  "cliente",
  "website",
  "instagram",
  "facebook",
  "desistiu",
  "inativo",
  "novo",
  "produto-a",
  "produto-b",
  "produto-c",
  "alto-valor",
  "baixo-valor",
  "prioritario",
  "atendimento-pendente"
];
