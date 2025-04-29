
import { User, Instance, Sequence, Contact, DailyStats, TimeRestriction } from '@/types';

// Mock user
export const user: User = {
  id: 'user-1',
  name: 'Usuário Demo',
  email: 'demo@example.com',
  avatar: 'https://i.pravatar.cc/150?img=68',
};

// Mock instances
export const instances: Instance[] = [
  {
    id: 'instance-1',
    name: 'Instância Principal',
    evolutionApiUrl: 'https://evolution-api.example.com',
    apiKey: 'api-key-12345',
    createdAt: new Date(2023, 0, 15).toISOString(),
    updatedAt: new Date(2023, 0, 15).toISOString(),
    active: true,
  },
  {
    id: 'instance-2',
    name: 'Instância Secundária',
    evolutionApiUrl: 'https://evolution-api2.example.com',
    apiKey: 'api-key-67890',
    createdAt: new Date(2023, 2, 10).toISOString(),
    updatedAt: new Date(2023, 2, 10).toISOString(),
    active: true,
  },
];

// Mock sequences
export const sequences: Sequence[] = [
  {
    id: 'sequence-1',
    name: 'Sequência de Boas-vindas',
    instanceId: 'instance-1',
    startCondition: {
      type: 'AND',
      tags: ['lead', 'website'],
    },
    stopCondition: {
      type: 'OR',
      tags: ['premium', 'unsubscribe'],
    },
    stages: [
      {
        id: 'stage-1',
        name: 'Boas-vindas',
        type: 'message',
        content: 'Olá ${name}, bem-vindo à nossa comunidade! Estamos felizes em te ter aqui.',
        delay: 20,
        delayUnit: 'minutes',
      },
      {
        id: 'stage-2',
        name: 'Conteúdo Educativo',
        type: 'message',
        content: 'Já conhece nosso produto principal? Veja este vídeo: https://example.com/video',
        delay: 1,
        delayUnit: 'days',
      },
      {
        id: 'stage-3',
        name: 'Oferta',
        type: 'message',
        content: 'Que tal experimentar nosso produto com 30% de desconto? Use o código WELCOME30',
        delay: 2,
        delayUnit: 'days',
      },
    ],
    timeRestrictions: [
      {
        id: 'restriction-1',
        name: 'Fim de semana',
        active: true,
        days: [0, 6], // Weekend
        startHour: 0,
        startMinute: 0,
        endHour: 23,
        endMinute: 59,
      },
      {
        id: 'restriction-2',
        name: 'Noturno dias úteis',
        active: true,
        days: [1, 2, 3, 4, 5], // Weekdays
        startHour: 22,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
      },
    ],
    status: 'active',
    createdAt: new Date(2023, 1, 1).toISOString(),
    updatedAt: new Date(2023, 2, 15).toISOString(),
  },
  {
    id: 'sequence-2',
    name: 'Re-engajamento',
    instanceId: 'instance-1',
    startCondition: {
      type: 'AND',
      tags: ['lead', 'inactive'],
    },
    stopCondition: {
      type: 'OR',
      tags: ['premium', 'unsubscribe'],
    },
    stages: [
      {
        id: 'stage-1',
        name: 'Reativação',
        type: 'message',
        content: 'Ei ${name}, sentimos sua falta! O que podemos fazer para ajudá-lo?',
        delay: 1,
        delayUnit: 'days',
      },
      {
        id: 'stage-2',
        name: 'Desconto Especial',
        type: 'message',
        content: 'Preparamos um desconto especial para você voltar: 50% OFF! Código: COMEBACK50',
        delay: 3,
        delayUnit: 'days',
      },
    ],
    timeRestrictions: [
      {
        id: 'restriction-1',
        name: 'Noturno dias úteis',
        active: true,
        days: [1, 2, 3, 4, 5], // Weekdays
        startHour: 22,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
      },
    ],
    status: 'inactive',
    createdAt: new Date(2023, 2, 1).toISOString(),
    updatedAt: new Date(2023, 3, 10).toISOString(),
  },
  {
    id: 'sequence-3',
    name: 'Produto XYZ - Lançamento',
    instanceId: 'instance-1',
    startCondition: {
      type: 'OR',
      tags: ['produto-xpto', 'interesse-xyz'],
    },
    stopCondition: {
      type: 'OR',
      tags: ['comprou-xyz', 'unsubscribe'],
    },
    stages: [
      {
        id: 'stage-1',
        name: 'Anúncio',
        type: 'message',
        content: '${name}, temos novidades! Nosso produto XYZ será lançado em breve.',
        delay: 10,
        delayUnit: 'minutes',
      },
      {
        id: 'stage-2',
        name: 'Detalhes',
        type: 'pattern',
        content: 'IMAGE::https://example.com/produto-xyz.jpg||TEXT::Confira todos os detalhes e funcionalidades exclusivas!',
        delay: 1,
        delayUnit: 'hours',
      },
      {
        id: 'stage-3',
        name: 'Typebot Demo',
        type: 'typebot',
        content: 'https://typebot.io/produto-xyz-demo',
        delay: 1,
        delayUnit: 'days',
      },
    ],
    timeRestrictions: [],
    status: 'active',
    createdAt: new Date(2023, 3, 5).toISOString(),
    updatedAt: new Date(2023, 3, 5).toISOString(),
  },
  {
    id: 'sequence-4',
    name: 'Onboarding Básico',
    instanceId: 'instance-2',
    startCondition: {
      type: 'AND',
      tags: ['basic'],
    },
    stopCondition: {
      type: 'OR',
      tags: ['unsubscribe'],
    },
    stages: [
      {
        id: 'stage-1',
        name: 'Boas-vindas',
        type: 'message',
        content: 'Olá ${name}, bem-vindo ao plano Básico!',
        delay: 5,
        delayUnit: 'minutes',
      },
      {
        id: 'stage-2',
        name: 'Tutorial',
        type: 'message',
        content: 'Aqui está um guia rápido para começar: https://example.com/tutorial',
        delay: 1,
        delayUnit: 'days',
      },
    ],
    timeRestrictions: [],
    status: 'active',
    createdAt: new Date(2023, 4, 10).toISOString(),
    updatedAt: new Date(2023, 4, 10).toISOString(),
  },
];

// Mock contacts
export const contacts: Contact[] = [
  {
    id: '16087',
    name: 'Emanuel Years In Box',
    phoneNumber: '+5511937474703',
    tags: ['lead', 'google', 'produto-xpto'],
    accountId: 1,
    accountName: 'Years In Box',
    inboxId: 46,
    conversationId: 23266,
  },
  {
    id: '16088',
    name: 'Maria Silva',
    phoneNumber: '+5511987654321',
    tags: ['lead', 'website'],
    accountId: 1,
    accountName: 'Years In Box',
    inboxId: 46,
    conversationId: 23267,
  },
  {
    id: '16089',
    name: 'João Oliveira',
    phoneNumber: '+5511912345678',
    tags: ['lead', 'inactive'],
    accountId: 1,
    accountName: 'Years In Box',
    inboxId: 46,
    conversationId: 23268,
  },
  {
    id: '16090',
    name: 'Ana Costa',
    phoneNumber: '+5511955443322',
    tags: ['premium'],
    accountId: 1,
    accountName: 'Years In Box',
    inboxId: 46,
    conversationId: 23269,
  },
  {
    id: '16091',
    name: 'Carlos Ferreira',
    phoneNumber: '+5511977889900',
    tags: ['basic', 'website'],
    accountId: 1,
    accountName: 'Years In Box',
    inboxId: 47,
    conversationId: 23270,
  },
];

// Available tags for contacts and sequences
export const tags = [
  'lead',
  'website',
  'inactive',
  'premium',
  'basic',
  'google',
  'produto-xpto',
  'interesse-xyz',
  'comprou-xyz',
  'unsubscribe'
];

// Global time restrictions
export const globalTimeRestrictions: TimeRestriction[] = [
  {
    id: 'global-restriction-1',
    name: 'Fim de semana',
    active: true,
    days: [0, 6], // Weekend
    startHour: 0,
    startMinute: 0,
    endHour: 23,
    endMinute: 59,
  },
  {
    id: 'global-restriction-2',
    name: 'Noturno dias úteis',
    active: true,
    days: [1, 2, 3, 4, 5], // Weekdays
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
  },
  {
    id: 'global-restriction-3',
    name: 'Horário de almoço',
    active: true,
    days: [1, 2, 3, 4, 5], // Weekdays
    startHour: 12,
    startMinute: 0,
    endHour: 14,
    endMinute: 0,
  }
];

// Mock daily stats for a week
export const stats: DailyStats[] = [
  {
    date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    messagesScheduled: 24,
    messagesSent: 20,
    messagesFailed: 4,
    newContacts: 5,
    completedSequences: 2,
  },
  {
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    messagesScheduled: 18,
    messagesSent: 17,
    messagesFailed: 1,
    newContacts: 3,
    completedSequences: 1,
  },
  {
    date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    messagesScheduled: 32,
    messagesSent: 28,
    messagesFailed: 4,
    newContacts: 7,
    completedSequences: 3,
  },
  {
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    messagesScheduled: 27,
    messagesSent: 25,
    messagesFailed: 2,
    newContacts: 4,
    completedSequences: 2,
  },
  {
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    messagesScheduled: 19,
    messagesSent: 18,
    messagesFailed: 1,
    newContacts: 6,
    completedSequences: 1,
  },
  {
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    messagesScheduled: 22,
    messagesSent: 21,
    messagesFailed: 1,
    newContacts: 5,
    completedSequences: 3,
  },
  {
    date: new Date().toISOString().split('T')[0],
    messagesScheduled: 15,
    messagesSent: 12,
    messagesFailed: 0,
    newContacts: 3,
    completedSequences: 1,
  },
];
