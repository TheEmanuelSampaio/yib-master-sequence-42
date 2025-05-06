import { Client, Contact, Instance, Sequence, TimeRestriction } from "@/types";

export const mockClients: Client[] = [
  {
    id: '1',
    accountId: 12345,
    accountName: 'TechCorp',
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    accountId: 67890,
    accountName: 'MediPlus',
    createdBy: 'user2',
    createdAt: '2023-02-15T00:00:00Z',
    updatedAt: '2023-02-15T00:00:00Z',
  },
];

export const mockInstances: Instance[] = [
  {
    id: '1',
    name: 'TechCorp WhatsApp',
    evolutionApiUrl: 'https://api.evolution.com/techcorp',
    apiKey: 'techcorp_api_key',
    active: true,
    clientId: '1',
    createdBy: 'user1',
    createdAt: '2023-01-05T00:00:00Z',
    updatedAt: '2023-01-05T00:00:00Z',
  },
  {
    id: '2',
    name: 'MediPlus WhatsApp',
    evolutionApiUrl: 'https://api.evolution.com/mediplus',
    apiKey: 'mediplus_api_key',
    active: false,
    clientId: '2',
    createdBy: 'user2',
    createdAt: '2023-02-20T00:00:00Z',
    updatedAt: '2023-02-20T00:00:00Z',
  },
];

export const mockSequences: Sequence[] = [
  {
    id: '1',
    name: 'Sequência de Boas-vindas',
    type: "message",
    instanceId: '1',
    startCondition: {
      groups: [
        {
          type: "AND",
          tags: ['lead', 'novo']
        }
      ]
    },
    stopCondition: {
      groups: [
        {
          type: "AND",
          tags: ['compra', 'cliente']
        }
      ]
    },
    stages: [
      {
        id: '101',
        name: 'Mensagem de Boas-vindas',
        content: 'Olá {{name}}, bem-vindo(a) à nossa empresa! Estamos muito felizes em ter você aqui.',
        delay: 30,
        delayUnit: 'minutes',
        orderIndex: 0
      },
      {
        id: '102',
        name: 'Apresentação de Produtos',
        content: 'Temos uma variedade de produtos que podem te interessar. Gostaria de conhecer mais?',
        delay: 1,
        delayUnit: 'days',
        orderIndex: 1
      },
      {
        id: '103',
        name: 'Follow-up',
        content: 'E então, o que achou dos nossos produtos? Posso ajudar com alguma dúvida?',
        delay: 2,
        delayUnit: 'days',
        orderIndex: 2
      }
    ],
    timeRestrictions: [],
    status: 'active',
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2023-01-16T14:30:00Z'
  },
  {
    id: '2',
    name: 'Recuperação de Abandono',
    type: "typebot",
    instanceId: '1',
    startCondition: {
      groups: [
        {
          type: "AND",
          tags: ['carrinho-abandonado']
        },
        {
          type: "AND",
          tags: ['lead', 'interesse-produto']
        }
      ]
    },
    stopCondition: {
      groups: []
    },
    stages: [
      {
        id: '201',
        name: 'Lembrete de Carrinho',
        content: 'https://typebot.io/carrinho-abandono',
        typebotStage: 'stg1',
        delay: 1,
        delayUnit: 'hours',
        orderIndex: 0
      },
      {
        id: '202',
        name: 'Oferta Especial',
        content: 'https://typebot.io/carrinho-abandono',
        typebotStage: 'stg2',
        delay: 24,
        delayUnit: 'hours',
        orderIndex: 1
      },
      {
        id: '203',
        name: 'Última Chance',
        content: 'https://typebot.io/carrinho-abandono',
        typebotStage: 'stg3',
        delay: 48,
        delayUnit: 'hours',
        orderIndex: 2
      }
    ],
    timeRestrictions: [],
    status: 'active',
    createdAt: '2023-02-10T15:20:00Z',
    updatedAt: '2023-02-12T09:45:00Z'
  }
];

export const mockTimeRestrictions: TimeRestriction[] = [
  {
    id: '1',
    name: 'Horário Comercial',
    active: true,
    days: [1, 2, 3, 4, 5],
    startHour: 9,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    isGlobal: true
  },
  {
    id: '2',
    name: 'Finais de Semana',
    active: false,
    days: [6, 0],
    startHour: 10,
    startMinute: 0,
    endHour: 16,
    endMinute: 0,
    isGlobal: true
  },
];

export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'John Doe',
    phoneNumber: '+15551234567',
    clientId: '1',
    inboxId: 1,
    conversationId: 101,
    displayId: 201,
    tags: ['lead', 'novo'],
    createdAt: '2023-01-10T00:00:00Z',
    updatedAt: '2023-01-10T00:00:00Z',
  },
  {
    id: '2',
    name: 'Jane Smith',
    phoneNumber: '+15557654321',
    clientId: '1',
    inboxId: 2,
    conversationId: 102,
    displayId: 202,
    tags: ['carrinho-abandonado', 'lead'],
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2023-02-01T00:00:00Z',
  },
];
