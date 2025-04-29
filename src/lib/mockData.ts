import { Contact, Instance, Sequence } from "@/types";

export const users = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    avatar: "https://api.dicebear.com/7.x/ лица/svg?seed=John",
  },
];

export const instances: Instance[] = [
  {
    id: "1",
    name: "Instance 1",
    evolutionApiUrl: "https://instance1.example.com",
    apiKey: "1234567890",
    createdAt: "2024-01-01T00:00:00.000Z",
    active: true,
  },
  {
    id: "2",
    name: "Instance 2",
    evolutionApiUrl: "https://instance2.example.com",
    apiKey: "0987654321",
    createdAt: "2024-01-05T00:00:00.000Z",
    active: false,
  },
];

export const tags = [
  "novo-contato",
  "lead",
  "cliente",
  "cliente-novo",
  "cancelou",
  "inativo",
  "satisfeito",
  "insatisfeito",
  "devolveu",
];

// Update only the timeRestrictions in the sequences data
export const sequences: Sequence[] = [
  {
    id: "1",
    name: "Sequência de Boas-Vindas",
    instanceId: "1",
    startCondition: {
      type: "AND",
      tags: ["novo-contato"]
    },
    stopCondition: {
      type: "OR",
      tags: ["cliente", "cancelou"]
    },
    stages: [
      {
        id: "stage-1",
        name: "Boas-vindas",
        type: "message",
        content: "Olá ${name}! Bem-vindo(a) à nossa comunidade.",
        delay: 0,
        delayUnit: "minutes",
      },
      {
        id: "stage-2",
        name: "Material Informativo",
        type: "message",
        content: "Gostaria de receber mais informações sobre nossos serviços?",
        delay: 60,
        delayUnit: "minutes",
      },
      {
        id: "stage-3",
        name: "Imagem Produto",
        type: "pattern",
        content: "IMAGE::https://example.com/produto-xyz.jpg||TEXT::Confira todos os detalhes do nosso produto XYZ!",
        delay: 120,
        delayUnit: "minutes",
      },
      {
        id: "stage-4",
        name: "Typebot Demo",
        type: "typebot",
        content: "stg2",
        delay: 24,
        delayUnit: "hours",
        typebotStage: {
          id: 2,
          content: "stg2"
        }
      }
    ],
    timeRestrictions: [
      {
        id: "tr-1",
        name: "Noite",
        active: true,
        days: [0, 1, 2, 3, 4, 5, 6],
        startHour: 22,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
      },
      {
        id: "tr-2",
        name: "Fim de Semana",
        active: true,
        days: [0, 6],
        startHour: 0,
        startMinute: 0,
        endHour: 23,
        endMinute: 59,
      }
    ],
    status: "active",
    createdAt: "2024-01-10T15:30:00.000Z",
    updatedAt: "2024-01-10T15:30:00.000Z",
  },
  {
    id: "2",
    name: "Sequência de Acompanhamento",
    instanceId: "1",
    startCondition: {
      type: "AND",
      tags: ["lead"]
    },
    stopCondition: {
      type: "OR",
      tags: ["cliente", "cancelou", "inativo"]
    },
    stages: [
      {
        id: "stage-5",
        name: "Primeiro contato",
        type: "message",
        content: "Olá ${name}, notei que você demonstrou interesse em nossos serviços. Posso ajudar?",
        delay: 30,
        delayUnit: "minutes",
      },
      {
        id: "stage-6",
        name: "Lembrete",
        type: "message",
        content: "Só passando para lembrar que estamos à disposição para esclarecer qualquer dúvida!",
        delay: 24,
        delayUnit: "hours",
      }
    ],
    timeRestrictions: [
      {
        id: "tr-3",
        name: "Horário Comercial",
        active: true,
        days: [1, 2, 3, 4, 5],
        startHour: 18,
        startMinute: 0,
        endHour: 9,
        endMinute: 0,
      }
    ],
    status: "active",
    createdAt: "2024-01-15T10:45:00.000Z",
    updatedAt: "2024-01-15T10:45:00.000Z",
  },
  {
    id: "3",
    name: "Sequência Pós-Compra",
    instanceId: "1",
    startCondition: {
      type: "AND",
      tags: ["cliente-novo"]
    },
    stopCondition: {
      type: "OR",
      tags: ["insatisfeito", "devolveu"]
    },
    stages: [
      {
        id: "stage-7",
        name: "Agradecimento",
        type: "message",
        content: "Obrigado por sua compra, ${name}! Esperamos que você esteja aproveitando seu novo produto.",
        delay: 24,
        delayUnit: "hours",
      },
      {
        id: "stage-8",
        name: "Feedback",
        type: "message",
        content: "Como está sendo sua experiência com nosso produto até agora? Ficaríamos felizes em receber seu feedback!",
        delay: 3,
        delayUnit: "days",
      },
      {
        id: "stage-9",
        name: "Indicação",
        type: "message",
        content: "Se você está gostando do nosso produto, que tal indicar para um amigo? Ambos ganham 10% de desconto na próxima compra!",
        delay: 7,
        delayUnit: "days",
      },
      {
        id: "stage-10",
        name: "Typebot Pesquisa",
        type: "typebot",
        content: "stg3",
        delay: 14,
        delayUnit: "days",
        typebotStage: {
          id: 3,
          content: "stg3"
        }
      }
    ],
    timeRestrictions: [
      {
        id: "tr-4",
        name: "Horários de Descanso",
        active: true,
        days: [0, 1, 2, 3, 4, 5, 6],
        startHour: 21,
        startMinute: 0,
        endHour: 9,
        endMinute: 0,
      }
    ],
    status: "active",
    createdAt: "2024-01-20T09:15:00.000Z",
    updatedAt: "2024-01-20T09:15:00.000Z",
  }
];

export const contacts: Contact[] = [
  {
    id: "1",
    name: "Alice Smith",
    phoneNumber: "+15551234567",
    tags: ["cliente", "satisfeito"],
    accountId: 101,
    accountName: "Acme Corp",
    inboxId: 201,
    conversationId: 301,
  },
  {
    id: "2",
    name: "Bob Johnson",
    phoneNumber: "+15559876543",
    tags: ["lead", "inativo"],
    accountId: 102,
    accountName: "Beta Inc",
    inboxId: 202,
    conversationId: 302,
  },
  {
    id: "3",
    name: "Charlie Brown",
    phoneNumber: "+15551112222",
    tags: ["novo-contato"],
    accountId: 103,
    accountName: "Gamma Ltd",
    inboxId: 203,
    conversationId: 303,
  },
  {
    id: "4",
    name: "Diana Miller",
    phoneNumber: "+15553334444",
    tags: ["cliente-novo", "satisfeito"],
    accountId: 101,
    accountName: "Acme Corp",
    inboxId: 204,
    conversationId: 304,
  },
  {
    id: "5",
    name: "Eve Williams",
    phoneNumber: "+15555556666",
    tags: ["lead"],
    accountId: 102,
    accountName: "Beta Inc",
    inboxId: 205,
    conversationId: 305,
  },
];
