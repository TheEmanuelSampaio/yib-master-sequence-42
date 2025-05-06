export const mockTags = [
  "lead",
  "novo-cliente",
  "cliente",
  "desistente",
  "cliente-inativo",
  "3-meses-sem-compra",
  "comprou-recentemente",
  "optout",
  "tag1",
  "tag2",
  "tag3",
];

export const mockTimeRestrictions = [
  {
    id: "1",
    name: "Horário de Trabalho",
    active: true,
    days: [1, 2, 3, 4, 5],
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    isGlobal: true,
  },
  {
    id: "2",
    name: "Finais de Semana",
    active: false,
    days: [0, 6],
    startHour: 0,
    startMinute: 0,
    endHour: 23,
    endMinute: 59,
    isGlobal: true,
  },
  {
    id: "3",
    name: "Madrugada",
    active: false,
    days: [0, 1, 2, 3, 4, 5, 6],
    startHour: 0,
    startMinute: 0,
    endHour: 6,
    endMinute: 0,
    isGlobal: true,
  },
];

export const mockClients = [
  {
    id: "1",
    accountId: 123,
    accountName: "Empresa A",
    createdBy: "user1",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    creator_account_name: "User 1"
  },
  {
    id: "2",
    accountId: 456,
    accountName: "Empresa B",
    createdBy: "user2",
    createdAt: "2023-02-01T00:00:00Z",
    updatedAt: "2023-02-01T00:00:00Z",
    creator_account_name: "User 2"
  },
];

export const mockInstances = [
  {
    id: "1",
    name: "Instância 1",
    evolutionApiUrl: "https://api.evolution.com",
    apiKey: "apikey1",
    active: true,
    clientId: "1",
    createdBy: "user1",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Instância 2",
    evolutionApiUrl: "https://api.evolution.com",
    apiKey: "apikey2",
    active: false,
    clientId: "2",
    createdBy: "user2",
    createdAt: "2023-02-01T00:00:00Z",
    updatedAt: "2023-02-01T00:00:00Z",
  },
];

// Converte os dados antigos para o novo formato de condições complexas
export const mockSequences = [
  {
    id: "1",
    name: "Sequência de Boas-vindas",
    instanceId: "1",
    type: "message",
    startCondition: {
      operator: "OR",
      groups: [
        {
          operator: "AND",
          tags: ["lead", "novo-cliente"]
        }
      ]
    },
    stopCondition: {
      operator: "OR",
      groups: [
        {
          operator: "OR",
          tags: ["cliente", "desistente"]
        }
      ]
    },
    stages: [
      {
        id: "1",
        name: "Boas-vindas",
        type: "message",
        content: "Olá, seja bem-vindo à nossa empresa!",
        delay: 15,
        delayUnit: "minutes"
      },
      {
        id: "2",
        name: "Apresentação",
        type: "message",
        content: "Somos especialistas em...",
        delay: 1,
        delayUnit: "days"
      }
    ],
    timeRestrictions: [],
    status: "active",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z"
  },
  {
    id: "2",
    name: "Re-engajamento",
    instanceId: "1",
    type: "typebot",
    startCondition: {
      operator: "OR",
      groups: [
        {
          operator: "AND",
          tags: ["cliente-inativo", "3-meses-sem-compra"]
        }
      ]
    },
    stopCondition: {
      operator: "OR",
      groups: [
        {
          operator: "OR",
          tags: ["comprou-recentemente", "optout"]
        }
      ]
    },
    stages: [
      {
        id: "3",
        name: "Re-engajamento",
        type: "typebot",
        content: "https://typebot.io/flowbuilder/re-engajamento",
        typebotStage: "stg1",
        delay: 30,
        delayUnit: "minutes"
      },
      {
        id: "4",
        name: "Oferta especial",
        type: "typebot",
        content: "https://typebot.io/flowbuilder/re-engajamento",
        typebotStage: "stg2",
        delay: 2,
        delayUnit: "days"
      }
    ],
    timeRestrictions: [],
    status: "active",
    createdAt: "2023-02-01T00:00:00Z",
    updatedAt: "2023-02-01T00:00:00Z"
  }
];

export const mockContacts = [
  {
    id: "1",
    name: "João Silva",
    phoneNumber: "+5511999999999",
    clientId: "1",
    inboxId: 123,
    conversationId: 456,
    displayId: 789,
    tags: ["lead", "novo-cliente"],
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Maria Souza",
    phoneNumber: "+5521888888888",
    clientId: "2",
    inboxId: 321,
    conversationId: 654,
    displayId: 987,
    tags: ["cliente", "comprou-recentemente"],
    createdAt: "2023-02-01T00:00:00Z",
    updatedAt: "2023-02-01T00:00:00Z",
  },
];
