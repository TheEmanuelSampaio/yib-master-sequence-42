export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_setup: {
        Row: {
          created_at: string | null
          id: string
          setup_completed: boolean
          setup_completed_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setup_completed?: boolean
          setup_completed_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setup_completed?: boolean
          setup_completed_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          account_id: number
          account_name: string
          created_at: string | null
          created_by: string
          id: string
          updated_at: string | null
        }
        Insert: {
          account_id: number
          account_name: string
          created_at?: string | null
          created_by: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: number
          account_name?: string
          created_at?: string | null
          created_by?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_sequences: {
        Row: {
          completed_at: string | null
          contact_id: string
          current_stage_id: string | null
          current_stage_index: number
          id: string
          last_message_at: string | null
          removed_at: string | null
          sequence_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          current_stage_id?: string | null
          current_stage_index?: number
          id?: string
          last_message_at?: string | null
          removed_at?: string | null
          sequence_id: string
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          current_stage_id?: string | null
          current_stage_index?: number
          id?: string
          last_message_at?: string | null
          removed_at?: string | null
          sequence_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_sequences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sequences_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "sequence_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sequences_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          tag_name: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          tag_name: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          conversation_id: number
          created_at: string | null
          display_id: number
          id: string
          inbox_id: number
          name: string
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          conversation_id: number
          created_at?: string | null
          display_id: number
          id: string
          inbox_id: number
          name: string
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          conversation_id?: number
          created_at?: string | null
          display_id?: number
          id?: string
          inbox_id?: number
          name?: string
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stats: {
        Row: {
          completed_sequences: number
          date: string
          id: string
          instance_id: string | null
          messages_failed: number
          messages_scheduled: number
          messages_sent: number
          new_contacts: number
        }
        Insert: {
          completed_sequences?: number
          date?: string
          id?: string
          instance_id?: string | null
          messages_failed?: number
          messages_scheduled?: number
          messages_sent?: number
          new_contacts?: number
        }
        Update: {
          completed_sequences?: number
          date?: string
          id?: string
          instance_id?: string | null
          messages_failed?: number
          messages_scheduled?: number
          messages_sent?: number
          new_contacts?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_stats_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          active: boolean
          api_key: string
          client_id: string
          created_at: string | null
          created_by: string
          evolution_api_url: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          api_key: string
          client_id: string
          created_at?: string | null
          created_by: string
          evolution_api_url: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          api_key?: string
          client_id?: string
          created_at?: string | null
          created_by?: string
          evolution_api_url?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_name: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          account_name: string
          created_at?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          account_name?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          attempts: number | null
          contact_id: string
          created_at: string | null
          id: string
          raw_scheduled_time: string
          scheduled_at: string | null
          scheduled_time: string
          sent_at: string | null
          sequence_id: string
          stage_id: string
          status: string
        }
        Insert: {
          attempts?: number | null
          contact_id: string
          created_at?: string | null
          id?: string
          raw_scheduled_time: string
          scheduled_at?: string | null
          scheduled_time: string
          sent_at?: string | null
          sequence_id: string
          stage_id: string
          status?: string
        }
        Update: {
          attempts?: number | null
          contact_id?: string
          created_at?: string | null
          id?: string
          raw_scheduled_time?: string
          scheduled_at?: string | null
          scheduled_time?: string
          sent_at?: string | null
          sequence_id?: string
          stage_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sequence_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_stages: {
        Row: {
          content: string
          created_at: string | null
          delay: number
          delay_unit: string
          id: string
          name: string
          order_index: number
          sequence_id: string
          type: string
          typebot_stage: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          delay: number
          delay_unit: string
          id?: string
          name: string
          order_index: number
          sequence_id: string
          type: string
          typebot_stage?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          delay?: number
          delay_unit?: string
          id?: string
          name?: string
          order_index?: number
          sequence_id?: string
          type?: string
          typebot_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_stages_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_time_restrictions: {
        Row: {
          id: string
          sequence_id: string
          time_restriction_id: string
        }
        Insert: {
          id?: string
          sequence_id: string
          time_restriction_id: string
        }
        Update: {
          id?: string
          sequence_id?: string
          time_restriction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_time_restrictions_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_time_restrictions_time_restriction_id_fkey"
            columns: ["time_restriction_id"]
            isOneToOne: false
            referencedRelation: "time_restrictions"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          instance_id: string
          name: string
          start_condition_tags: string[]
          start_condition_type: string
          status: string
          stop_condition_tags: string[]
          stop_condition_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          instance_id: string
          name: string
          start_condition_tags: string[]
          start_condition_type: string
          status?: string
          stop_condition_tags: string[]
          stop_condition_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          instance_id?: string
          name?: string
          start_condition_tags?: string[]
          start_condition_type?: string
          status?: string
          stop_condition_tags?: string[]
          stop_condition_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequences_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_progress: {
        Row: {
          completed_at: string | null
          contact_sequence_id: string
          id: string
          stage_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          contact_sequence_id: string
          id?: string
          stage_id: string
          status: string
        }
        Update: {
          completed_at?: string | null
          contact_sequence_id?: string
          id?: string
          stage_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_progress_contact_sequence_id_fkey"
            columns: ["contact_sequence_id"]
            isOneToOne: false
            referencedRelation: "contact_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_progress_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sequence_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      time_restrictions: {
        Row: {
          active: boolean
          created_at: string | null
          created_by: string
          days: number[]
          end_hour: number
          end_minute: number
          id: string
          name: string
          start_hour: number
          start_minute: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          created_by: string
          days: number[]
          end_hour: number
          end_minute: number
          id?: string
          name: string
          start_hour: number
          start_minute: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          created_by?: string
          days?: number[]
          end_hour?: number
          end_minute?: number
          id?: string
          name?: string
          start_hour?: number
          start_minute?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: "super_admin" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["super_admin", "admin"],
    },
  },
} as const
