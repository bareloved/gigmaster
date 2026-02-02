export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bands: {
        Row: {
          accent_color: string | null
          band_logo_url: string | null
          created_at: string | null
          default_lineup: Json | null
          description: string | null
          hero_image_url: string | null
          id: string
          name: string
          owner_id: string
          poster_skin: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          band_logo_url?: string | null
          created_at?: string | null
          default_lineup?: Json | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          owner_id: string
          poster_skin?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          band_logo_url?: string | null
          created_at?: string | null
          default_lineup?: Json | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          owner_id?: string
          poster_skin?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          last_synced_at: string | null
          provider: string
          provider_calendar_id: string
          refresh_token: string
          sync_enabled: boolean | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string
          provider_calendar_id: string
          refresh_token: string
          sync_enabled?: boolean | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string
          provider_calendar_id?: string
          refresh_token?: string
          sync_enabled?: boolean | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_sync_log: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          provider: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gig_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          gig_id: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          gig_id: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          gig_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_activity_log_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_drafts: {
        Row: {
          created_at: string | null
          form_data: Json
          id: string
          owner_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          form_data: Json
          id?: string
          owner_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          form_data?: Json
          id?: string
          owner_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gig_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          gig_id: string
          gig_role_id: string
          id: string
          status: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          gig_id: string
          gig_role_id: string
          id?: string
          status?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          gig_id?: string
          gig_role_id?: string
          id?: string
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_invitations_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_invitations_gig_role_id_fkey"
            columns: ["gig_role_id"]
            isOneToOne: false
            referencedRelation: "gig_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_materials: {
        Row: {
          gig_id: string
          id: string
          kind: string
          label: string
          sort_order: number | null
          url: string
        }
        Insert: {
          gig_id: string
          id?: string
          kind: string
          label: string
          sort_order?: number | null
          url: string
        }
        Update: {
          gig_id?: string
          id?: string
          kind?: string
          label?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_materials_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_packing_items: {
        Row: {
          gig_id: string
          id: string
          label: string
          sort_order: number | null
        }
        Insert: {
          gig_id: string
          id?: string
          label: string
          sort_order?: number | null
        }
        Update: {
          gig_id?: string
          id?: string
          label?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_packing_items_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_readiness: {
        Row: {
          charts_ready: boolean | null
          created_at: string | null
          gear_packed: boolean | null
          gig_id: string
          id: string
          musician_id: string
          notes: string | null
          songs_learned: number | null
          songs_total: number | null
          sounds_ready: boolean | null
          travel_checked: boolean | null
          updated_at: string | null
        }
        Insert: {
          charts_ready?: boolean | null
          created_at?: string | null
          gear_packed?: boolean | null
          gig_id: string
          id?: string
          musician_id: string
          notes?: string | null
          songs_learned?: number | null
          songs_total?: number | null
          sounds_ready?: boolean | null
          travel_checked?: boolean | null
          updated_at?: string | null
        }
        Update: {
          charts_ready?: boolean | null
          created_at?: string | null
          gear_packed?: boolean | null
          gig_id?: string
          id?: string
          musician_id?: string
          notes?: string | null
          songs_learned?: number | null
          songs_total?: number | null
          sounds_ready?: boolean | null
          travel_checked?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_readiness_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_role_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          gig_role_id: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          gig_role_id: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          gig_role_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: []
      }
      gig_roles: {
        Row: {
          agreed_fee: number | null
          contact_id: string | null
          currency: string | null
          gig_id: string
          id: string
          invitation_status: string | null
          is_paid: boolean | null
          musician_id: string | null
          musician_name: string | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_status: string | null
          personal_earnings_amount: number | null
          personal_earnings_currency: string | null
          personal_earnings_notes: string | null
          personal_earnings_paid_at: string | null
          player_notes: string | null
          role_name: string | null
          sort_order: number | null
          status: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          user_id: string | null
        }
        Insert: {
          agreed_fee?: number | null
          contact_id?: string | null
          currency?: string | null
          gig_id: string
          id?: string
          invitation_status?: string | null
          is_paid?: boolean | null
          musician_id?: string | null
          musician_name?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_status?: string | null
          personal_earnings_amount?: number | null
          personal_earnings_currency?: string | null
          personal_earnings_notes?: string | null
          personal_earnings_paid_at?: string | null
          player_notes?: string | null
          role_name?: string | null
          sort_order?: number | null
          status?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          user_id?: string | null
        }
        Update: {
          agreed_fee?: number | null
          contact_id?: string | null
          currency?: string | null
          gig_id?: string
          id?: string
          invitation_status?: string | null
          is_paid?: boolean | null
          musician_id?: string | null
          musician_name?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_status?: string | null
          personal_earnings_amount?: number | null
          personal_earnings_currency?: string | null
          personal_earnings_notes?: string | null
          personal_earnings_paid_at?: string | null
          player_notes?: string | null
          role_name?: string | null
          sort_order?: number | null
          status?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_roles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "musician_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_roles_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_schedule_items: {
        Row: {
          gig_id: string
          id: string
          label: string
          sort_order: number | null
          time: string
        }
        Insert: {
          gig_id: string
          id?: string
          label: string
          sort_order?: number | null
          time: string
        }
        Update: {
          gig_id?: string
          id?: string
          label?: string
          sort_order?: number | null
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_schedule_items_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_shares: {
        Row: {
          created_at: string | null
          expires_at: string | null
          gig_id: string
          is_active: boolean | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          gig_id: string
          is_active?: boolean | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          gig_id?: string
          is_active?: boolean | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_shares_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          accent_color: string | null
          backline_notes: string | null
          band_id: string | null
          band_logo_url: string | null
          band_name: string | null
          call_time: string | null
          client_fee: number | null
          cover_image_path: string | null
          created_at: string | null
          currency: string | null
          date: string
          dress_code: string | null
          end_time: string | null
          external_calendar_event_id: string | null
          external_calendar_provider: string | null
          external_event_url: string | null
          gig_type: string | null
          hero_image_url: string | null
          id: string
          imported_from_calendar: boolean
          internal_notes: string | null
          is_external: boolean
          location_address: string | null
          location_name: string | null
          notes: string | null
          on_stage_time: string | null
          owner_id: string | null
          parking_notes: string | null
          payment_notes: string | null
          poster_skin: string | null
          project_id: string | null
          schedule: string | null
          schedule_notes: Json | null
          setlist: string | null
          setlist_pdf_url: string | null
          start_time: string | null
          status: string | null
          theme: string | null
          title: string
          updated_at: string | null
          venue_address: string | null
          venue_maps_url: string | null
          venue_name: string | null
        }
        Insert: {
          accent_color?: string | null
          backline_notes?: string | null
          band_id?: string | null
          band_logo_url?: string | null
          band_name?: string | null
          call_time?: string | null
          client_fee?: number | null
          cover_image_path?: string | null
          created_at?: string | null
          currency?: string | null
          date: string
          dress_code?: string | null
          end_time?: string | null
          external_calendar_event_id?: string | null
          external_calendar_provider?: string | null
          external_event_url?: string | null
          gig_type?: string | null
          hero_image_url?: string | null
          id?: string
          imported_from_calendar?: boolean
          internal_notes?: string | null
          is_external?: boolean
          location_address?: string | null
          location_name?: string | null
          notes?: string | null
          on_stage_time?: string | null
          owner_id?: string | null
          parking_notes?: string | null
          payment_notes?: string | null
          poster_skin?: string | null
          project_id?: string | null
          schedule?: string | null
          schedule_notes?: Json | null
          setlist?: string | null
          setlist_pdf_url?: string | null
          start_time?: string | null
          status?: string | null
          theme?: string | null
          title: string
          updated_at?: string | null
          venue_address?: string | null
          venue_maps_url?: string | null
          venue_name?: string | null
        }
        Update: {
          accent_color?: string | null
          backline_notes?: string | null
          band_id?: string | null
          band_logo_url?: string | null
          band_name?: string | null
          call_time?: string | null
          client_fee?: number | null
          cover_image_path?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string
          dress_code?: string | null
          end_time?: string | null
          external_calendar_event_id?: string | null
          external_calendar_provider?: string | null
          external_event_url?: string | null
          gig_type?: string | null
          hero_image_url?: string | null
          id?: string
          imported_from_calendar?: boolean
          internal_notes?: string | null
          is_external?: boolean
          location_address?: string | null
          location_name?: string | null
          notes?: string | null
          on_stage_time?: string | null
          owner_id?: string | null
          parking_notes?: string | null
          payment_notes?: string | null
          poster_skin?: string | null
          project_id?: string | null
          schedule?: string | null
          schedule_notes?: Json | null
          setlist?: string | null
          setlist_pdf_url?: string | null
          start_time?: string | null
          status?: string | null
          theme?: string | null
          title?: string
          updated_at?: string | null
          venue_address?: string | null
          venue_maps_url?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gigs_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gigs_owner_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      musician_contacts: {
        Row: {
          contact_name: string
          created_at: string | null
          default_fee: number | null
          default_roles: string[] | null
          email: string | null
          id: string
          last_worked_date: string | null
          linked_user_id: string | null
          notes: string | null
          phone: string | null
          primary_instrument: string | null
          status: string | null
          times_worked_together: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_name: string
          created_at?: string | null
          default_fee?: number | null
          default_roles?: string[] | null
          email?: string | null
          id?: string
          last_worked_date?: string | null
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          primary_instrument?: string | null
          status?: string | null
          times_worked_together?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_name?: string
          created_at?: string | null
          default_fee?: number | null
          default_roles?: string[] | null
          email?: string | null
          id?: string
          last_worked_date?: string | null
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          primary_instrument?: string | null
          status?: string | null
          times_worked_together?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "musician_contacts_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "musician_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          gig_id: string | null
          gig_role_id: string | null
          id: string
          link: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gig_id?: string | null
          gig_role_id?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          gig_id?: string | null
          gig_role_id?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_gig_role_id_fkey"
            columns: ["gig_role_id"]
            isOneToOne: false
            referencedRelation: "gig_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          calendar_ics_token: string | null
          created_at: string
          default_country_code: string | null
          email: string | null
          id: string
          main_instrument: string | null
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          calendar_ics_token?: string | null
          created_at?: string
          default_country_code?: string | null
          email?: string | null
          id: string
          main_instrument?: string | null
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          calendar_ics_token?: string | null
          created_at?: string
          default_country_code?: string | null
          email?: string | null
          id?: string
          main_instrument?: string | null
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          accent_color: string | null
          band_logo_url: string | null
          cover_image_url: string | null
          created_at: string
          default_lineup: Json | null
          description: string | null
          hero_image_url: string | null
          id: string
          name: string
          owner_id: string
          poster_skin: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          band_logo_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_lineup?: Json | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          owner_id: string
          poster_skin?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          band_logo_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_lineup?: Json | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          owner_id?: string
          poster_skin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      setlist_items: {
        Row: {
          artist: string | null
          id: string
          is_medley: boolean | null
          key: string | null
          notes: string | null
          reference_url: string | null
          section_id: string
          sort_order: number | null
          tempo: string | null
          title: string
        }
        Insert: {
          artist?: string | null
          id?: string
          is_medley?: boolean | null
          key?: string | null
          notes?: string | null
          reference_url?: string | null
          section_id: string
          sort_order?: number | null
          tempo?: string | null
          title: string
        }
        Update: {
          artist?: string | null
          id?: string
          is_medley?: boolean | null
          key?: string | null
          notes?: string | null
          reference_url?: string | null
          section_id?: string
          sort_order?: number | null
          tempo?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlist_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "setlist_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_learning_status: {
        Row: {
          created_at: string
          difficulty: string | null
          id: string
          last_practiced_at: string | null
          learned: boolean
          musician_id: string
          notes: string | null
          practice_count: number
          priority: string | null
          setlist_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          id?: string
          last_practiced_at?: string | null
          learned?: boolean
          musician_id: string
          notes?: string | null
          practice_count?: number
          priority?: string | null
          setlist_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          id?: string
          last_practiced_at?: string | null
          learned?: boolean
          musician_id?: string
          notes?: string | null
          practice_count?: number
          priority?: string | null
          setlist_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlist_learning_status_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_learning_status_setlist_item_id_fkey"
            columns: ["setlist_item_id"]
            isOneToOne: false
            referencedRelation: "setlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_sections: {
        Row: {
          gig_id: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          gig_id: string
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          gig_id?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "setlist_sections_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_or_update_notification: {
        Args: {
          p_gig_id?: string
          p_gig_role_id?: string
          p_link?: string
          p_message?: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      expire_old_invitations: { Args: never; Returns: undefined }
      fn_can_update_gig_role: {
        Args: {
          check_gig_id: string
          check_musician_id: string
          check_role_id: string
        }
        Returns: boolean
      }
      fn_is_gig_musician: { Args: { check_gig_id: string }; Returns: boolean }
      fn_is_gig_owner: { Args: { check_gig_id: string }; Returns: boolean }
      fn_user_is_in_gig: { Args: { gig_id_param: string }; Returns: boolean }
      get_user_activity_since: {
        Args: { p_since: string; p_user_id: string }
        Returns: {
          activity_type: string
          created_at: string
          id: string
        }[]
      }
      list_dashboard_gigs: {
        Args: {
          p_from_date: string
          p_limit?: number
          p_offset?: number
          p_to_date: string
          p_user_id: string
        }
        Returns: {
          date: string
          end_time: string
          gig_id: string
          gig_title: string
          gig_type: string
          hero_image_url: string
          host_id: string
          host_name: string
          invitation_status: string
          is_manager: boolean
          is_player: boolean
          location_name: string
          payment_status: string
          player_gig_role_id: string
          player_role_name: string
          role_stats: Json
          start_time: string
          status: string
          total_count: number
        }[]
      }
      list_past_gigs: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          date: string
          end_time: string
          gig_id: string
          gig_title: string
          gig_type: string
          hero_image_url: string
          host_id: string
          host_name: string
          invitation_status: string
          is_manager: boolean
          is_player: boolean
          location_name: string
          payment_status: string
          player_gig_role_id: string
          player_role_name: string
          start_time: string
          status: string
          total_count: number
        }[]
      }
      save_gig_pack: {
        Args: {
          p_gig: Json
          p_gig_id?: string
          p_is_editing?: boolean
          p_materials?: Json
          p_packing?: Json
          p_roles?: Json
          p_schedule?: Json
          p_setlist?: Json
          p_share_token?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
