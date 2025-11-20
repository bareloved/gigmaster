export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_calendar_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          sync_enabled: boolean;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: string;
          provider_calendar_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          sync_enabled?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          provider_calendar_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string;
          sync_enabled?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      calendar_sync_log: {
        Row: {
          id: string;
          connection_id: string;
          external_event_id: string;
          gig_id: string | null;
          sync_direction: string;
          synced_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          external_event_id: string;
          gig_id?: string | null;
          sync_direction: string;
          synced_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          external_event_id?: string;
          gig_id?: string | null;
          sync_direction?: string;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_sync_log_connection_id_fkey";
            columns: ["connection_id"];
            referencedRelation: "calendar_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_sync_log_gig_id_fkey";
            columns: ["gig_id"];
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          main_instrument: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          default_country_code: string | null;
          calendar_ics_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          main_instrument?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          default_country_code?: string | null;
          calendar_ics_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          main_instrument?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          default_country_code?: string | null;
          calendar_ics_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      gigs: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          date: string;
          start_time: string | null;
          end_time: string | null;
          location_name: string | null;
          location_address: string | null;
          status: string;
          currency: string;
          external_calendar_event_id: string | null;
          external_calendar_provider: string | null;
          imported_from_calendar: boolean;
          notes: string | null;
          schedule: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          date: string;
          start_time?: string | null;
          end_time?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          status?: string;
          currency?: string;
          external_calendar_event_id?: string | null;
          external_calendar_provider?: string | null;
          imported_from_calendar?: boolean;
          notes?: string | null;
          schedule?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          date?: string;
          start_time?: string | null;
          end_time?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          status?: string;
          currency?: string;
          external_calendar_event_id?: string | null;
          external_calendar_provider?: string | null;
          imported_from_calendar?: boolean;
          notes?: string | null;
          schedule?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gigs_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gigs_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      gig_roles: {
        Row: {
          id: string;
          gig_id: string;
          role_name: string;
          musician_name: string | null;
          musician_id: string | null;
          contact_id: string | null;
          invitation_status: string;
          agreed_fee: number | null;
          is_paid: boolean;
          paid_at: string | null;
          notes: string | null;
          player_notes: string | null;
          status_changed_at: string | null;
          status_changed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gig_id: string;
          role_name: string;
          musician_name?: string | null;
          musician_id?: string | null;
          contact_id?: string | null;
          invitation_status?: string;
          agreed_fee?: number | null;
          is_paid?: boolean;
          paid_at?: string | null;
          notes?: string | null;
          player_notes?: string | null;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gig_id?: string;
          role_name?: string;
          musician_name?: string | null;
          musician_id?: string | null;
          contact_id?: string | null;
          invitation_status?: string;
          agreed_fee?: number | null;
          is_paid?: boolean;
          paid_at?: string | null;
          notes?: string | null;
          player_notes?: string | null;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gig_roles_gig_id_fkey";
            columns: ["gig_id"];
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gig_roles_musician_id_fkey";
            columns: ["musician_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gig_roles_contact_id_fkey";
            columns: ["contact_id"];
            referencedRelation: "musician_contacts";
            referencedColumns: ["id"];
          }
        ];
      };
      setlist_items: {
        Row: {
          id: string;
          gig_id: string;
          position: number;
          title: string;
          key: string | null;
          bpm: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gig_id: string;
          position: number;
          title: string;
          key?: string | null;
          bpm?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gig_id?: string;
          position?: number;
          title?: string;
          key?: string | null;
          bpm?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "setlist_items_gig_id_fkey";
            columns: ["gig_id"];
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          }
        ];
      };
      gig_files: {
        Row: {
          id: string;
          gig_id: string;
          label: string;
          url: string;
          type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gig_id: string;
          label: string;
          url: string;
          type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gig_id?: string;
          label?: string;
          url?: string;
          type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gig_files_gig_id_fkey";
            columns: ["gig_id"];
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          }
        ];
      };
      gig_invitations: {
        Row: {
          id: string;
          gig_id: string;
          gig_role_id: string;
          email: string;
          status: string;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gig_id: string;
          gig_role_id: string;
          email: string;
          status?: string;
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gig_id?: string;
          gig_role_id?: string;
          email?: string;
          status?: string;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gig_invitations_gig_id_fkey";
            columns: ["gig_id"];
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gig_invitations_gig_role_id_fkey";
            columns: ["gig_role_id"];
            referencedRelation: "gig_roles";
            referencedColumns: ["id"];
          }
        ];
      };
      gig_role_status_history: {
        Row: {
          id: string;
          gig_role_id: string;
          old_status: string | null;
          new_status: string;
          changed_by: string | null;
          changed_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          gig_role_id: string;
          old_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          changed_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          gig_role_id?: string;
          old_status?: string | null;
          new_status?: string;
          changed_by?: string | null;
          changed_at?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gig_role_status_history_gig_role_id_fkey";
            columns: ["gig_role_id"];
            referencedRelation: "gig_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gig_role_status_history_changed_by_fkey";
            columns: ["changed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      musician_contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_name: string;
          email: string | null;
          phone: string | null;
          primary_instrument: string | null;
          default_roles: string[] | null;
          default_fee: number | null;
          notes: string | null;
          times_worked_together: number;
          last_worked_date: string | null;
          status: string;
          linked_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_name: string;
          email?: string | null;
          phone?: string | null;
          primary_instrument?: string | null;
          default_roles?: string[] | null;
          default_fee?: number | null;
          notes?: string | null;
          times_worked_together?: number;
          last_worked_date?: string | null;
          status?: string;
          linked_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_name?: string;
          email?: string | null;
          phone?: string | null;
          primary_instrument?: string | null;
          default_roles?: string[] | null;
          default_fee?: number | null;
          notes?: string | null;
          times_worked_together?: number;
          last_worked_date?: string | null;
          status?: string;
          linked_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "musician_contacts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "musician_contacts_linked_user_id_fkey";
            columns: ["linked_user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'invitation_received' | 'status_changed' | 'gig_updated' | 'gig_cancelled' | 'payment_received';
          title: string;
          message: string | null;
          link_url: string | null;
          read_at: string | null;
          created_at: string;
          gig_id: string | null;
          project_id: string | null;
          gig_role_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'invitation_received' | 'status_changed' | 'gig_updated' | 'gig_cancelled' | 'payment_received';
          title: string;
          message?: string | null;
          link_url?: string | null;
          read_at?: string | null;
          created_at?: string;
          gig_id?: string | null;
          project_id?: string | null;
          gig_role_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'invitation_received' | 'status_changed' | 'gig_updated' | 'gig_cancelled' | 'payment_received';
          title?: string;
          message?: string | null;
          link_url?: string | null;
          read_at?: string | null;
          created_at?: string;
          gig_id?: string | null;
          project_id?: string | null;
          gig_role_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_gig_id_fkey";
            columns: ["gig_id"];
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_gig_role_id_fkey";
            columns: ["gig_role_id"];
            referencedRelation: "gig_roles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
