
import { Contact, Instance, Sequence, User, DailyStats } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Mock User
export const mockUser: User = {
  id: "1",
  created_at: new Date().toISOString(),
  account_name: "Master Sequence Testing",
  role: "admin"
};

// Mock Instances
export const mockInstances: Instance[] = [
  {
    id: "1",
    name: "Instance 1",
    active: true,
    api_key: "api_key_1",
    client_id: "client_1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "1",
    evolution_api_url: "https://evolution-api-1.example.com",
  },
  {
    id: "2",
    name: "Instance 2",
    active: true,
    api_key: "api_key_2",
    client_id: "client_2",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "1",
    evolution_api_url: "https://evolution-api-2.example.com",
  }
];

// Mock Contacts
export const mockContacts: Contact[] = [
  {
    id: "1",
    name: "John Doe",
    phone_number: "+5511999999999",
    client_id: "1",
    conversation_id: 123,
    display_id: 1,
    inbox_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ["lead", "product-a", "interested"]
  },
  {
    id: "2",
    name: "Jane Smith",
    phone_number: "+5511888888888",
    client_id: "1",
    conversation_id: 124,
    display_id: 2,
    inbox_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ["lead", "product-b"]
  },
  {
    id: "3",
    name: "Bob Johnson",
    phone_number: "+5511777777777",
    client_id: "1",
    conversation_id: 125,
    display_id: 3,
    inbox_id: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ["lead", "inactive"]
  }
];

// Stats for dashboard
export const mockStats: DailyStats[] = [
  {
    id: "1",
    date: new Date().toISOString().split("T")[0],
    messages_sent: 50,
    messages_scheduled: 15,
    messages_failed: 2,
    new_contacts: 5,
    completed_sequences: 3,
    instance_id: "1"
  },
  {
    id: "2",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    messages_sent: 45,
    messages_scheduled: 12,
    messages_failed: 1,
    new_contacts: 3,
    completed_sequences: 2,
    instance_id: "1"
  }
];

// Mock Sequences
export const createMockSequences = (instanceId: string): Sequence[] => {
  const sequenceId1 = uuidv4();
  const sequenceId2 = uuidv4();
  
  return [
    {
      id: sequenceId1,
      name: "Welcome Sequence",
      status: "active",
      instance_id: instanceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "1",
      start_condition_type: "OR",
      start_condition_tags: ["lead"],
      stop_condition_type: "OR",
      stop_condition_tags: ["unsubscribed"],
      startCondition: {
        type: "OR",
        tags: ["lead"]
      },
      stopCondition: {
        type: "OR",
        tags: ["unsubscribed"]
      },
      stages: [
        {
          id: uuidv4(),
          name: "Welcome Message",
          type: "message",
          content: "Hello ${name}, welcome to our service!",
          delay: 5,
          delay_unit: "minutes",
          sequence_id: sequenceId1,
          order_index: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          name: "Follow-up",
          type: "message",
          content: "How are you doing today? Any questions?",
          delay: 1,
          delay_unit: "days",
          sequence_id: sequenceId1,
          order_index: 1,
          created_at: new Date().toISOString(),
        }
      ]
    },
    {
      id: sequenceId2,
      name: "Product Promotion",
      status: "inactive",
      instance_id: instanceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "1",
      start_condition_type: "AND",
      start_condition_tags: ["lead", "interested"],
      stop_condition_type: "OR",
      stop_condition_tags: ["purchased", "unsubscribed"],
      startCondition: {
        type: "AND",
        tags: ["lead", "interested"]
      },
      stopCondition: {
        type: "OR",
        tags: ["purchased", "unsubscribed"]
      },
      stages: [
        {
          id: uuidv4(),
          name: "Product Introduction",
          type: "message",
          content: "Check out our new product!",
          delay: 1,
          delay_unit: "hours",
          sequence_id: sequenceId2,
          order_index: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          name: "Product Details",
          type: "pattern",
          content: "IMAGE::https://example.com/product.jpg||TEXT::Here are all the details!",
          delay: 2,
          delay_unit: "days",
          sequence_id: sequenceId2,
          order_index: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          name: "Interactive Demo",
          type: "typebot",
          content: "https://typebot.io/product-demo",
          typebot_stage: "stg1",
          delay: 3,
          delay_unit: "days",
          sequence_id: sequenceId2,
          order_index: 2,
          created_at: new Date().toISOString(),
        }
      ]
    }
  ];
};
