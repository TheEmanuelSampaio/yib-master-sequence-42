
import { Instance, Sequence, User, Contact, DailyStats, TimeRestriction, TagCondition, ConditionStructure, ConditionGroup } from '@/types';

// User mock data
export const user: User = {
  id: "user-1",
  email: "john@example.com",
  accountName: "John Doe",
  role: "super_admin",
  avatar: "/avatar.png"
};

// Instances mock data
export const instances: Instance[] = [
  {
    id: "instance-1",
    name: "Principal",
    evolutionApiUrl: "https://api.example.com/evolution",
    apiKey: "api-key-1",
    active: true,
    clientId: "client-1",
    createdBy: "user-1",
    createdAt: "2023-12-01T10:00:00Z",
    updatedAt: "2023-12-01T10:00:00Z"
  },
  {
    id: "instance-2",
    name: "Secundária",
    evolutionApiUrl: "https://api2.example.com/evolution",
    apiKey: "api-key-2",
    active: true,
    clientId: "client-2",
    createdBy: "user-1",
    createdAt: "2023-12-15T14:30:00Z",
    updatedAt: "2023-12-15T14:30:00Z"
  }
];

// Tags mock data
export const tags: string[] = [
  "lead", "cliente", "interessado", "abandonou", "comprou", "orçamento", "novo", "retorno"
];

// Sequences mock data
export const sequences: Sequence[] = [
  {
    id: "sequence-1",
    instanceId: "instance-1",
    name: "Follow-up Inicial",
    type: "message",
    startCondition: {
      operator: "OR",
      groups: [
        {
          operator: "OR",
          tags: ["lead", "interessado", "novo"]
        }
      ]
    },
    stopCondition: {
      operator: "OR",
      groups: [
        {
          operator: "OR",
          tags: ["abandonou", "comprou"]
        }
      ]
    },
    stages: [
      {
        id: "stage-1",
        name: "Boas-vindas",
        type: "message",
        content: "Olá {{nome}}, obrigado pelo interesse nos nossos produtos! Como posso ajudar?",
        delay: 1,
        delayUnit: "hours"
      },
      {
        id: "stage-2",
        name: "Ofertas",
        type: "message",
        content: "Separei algumas ofertas especiais para você. Gostaria de conhecer?",
        delay: 1,
        delayUnit: "days"
      },
      {
        id: "stage-3",
        name: "Catálogo",
        type: "pattern",
        content: "[CATÁLOGO]",
        delay: 2,
        delayUnit: "days"
      }
    ],
    timeRestrictions: [
      {
        id: "restriction-1",
        name: "Horário comercial",
        active: true,
        days: [1, 2, 3, 4, 5],
        startHour: 8,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
        isGlobal: false
      } as TimeRestriction
    ],
    status: "active",
    createdAt: "2023-12-02T10:15:00Z",
    updatedAt: "2023-12-10T16:45:00Z"
  },
  {
    id: "sequence-2",
    instanceId: "instance-1",
    name: "Recuperação de Leads",
    type: "typebot",
    startCondition: {
      operator: "AND",
      groups: [
        {
          operator: "AND",
          tags: ["interessado", "orçamento"]
        }
      ]
    },
    stopCondition: {
      operator: "OR",
      groups: [
        {
          operator: "OR",
          tags: ["comprou", "abandonou"]
        }
      ]
    },
    stages: [
      {
        id: "stage-1",
        name: "Lembrete",
        type: "message",
        content: "Olá {{nome}}, ainda está interessado no orçamento que enviamos?",
        delay: 2,
        delayUnit: "days"
      },
      {
        id: "stage-2",
        name: "Desconto",
        type: "message",
        content: "Temos um desconto especial válido por mais 48h. Aproveite!",
        delay: 2,
        delayUnit: "days"
      },
      {
        id: "stage-3",
        name: "Typebot Retenção",
        type: "typebot",
        content: "url-do-typebot",
        typebotStage: "retenção",
        delay: 3,
        delayUnit: "days"
      }
    ],
    timeRestrictions: [
      {
        id: "restriction-2",
        name: "Dias úteis apenas",
        active: true,
        days: [1, 2, 3, 4, 5],
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
        isGlobal: false
      } as TimeRestriction
    ],
    status: "inactive",
    createdAt: "2023-12-05T09:20:00Z",
    updatedAt: "2023-12-12T11:30:00Z"
  }
];

// Global time restrictions
export const globalTimeRestrictions: TimeRestriction[] = [
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

// Contacts mock data
export const contacts: Contact[] = [
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

// Stats mock data
export const stats: DailyStats[] = [
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
