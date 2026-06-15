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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          board_problem_id: string | null
          climbing_type: Database["public"]["Enums"]["climbing_type"]
          created_at: string
          fall_height_pct: number | null
          felt_grade: string | null
          id: string
          lead_style: Database["public"]["Enums"]["lead_style"] | null
          notes: string | null
          problem_id: string | null
          result: Database["public"]["Enums"]["attempt_result"]
          session_id: string
          tries: number
        }
        Insert: {
          board_problem_id?: string | null
          climbing_type: Database["public"]["Enums"]["climbing_type"]
          created_at?: string
          fall_height_pct?: number | null
          felt_grade?: string | null
          id?: string
          lead_style?: Database["public"]["Enums"]["lead_style"] | null
          notes?: string | null
          problem_id?: string | null
          result: Database["public"]["Enums"]["attempt_result"]
          session_id: string
          tries?: number
        }
        Update: {
          board_problem_id?: string | null
          climbing_type?: Database["public"]["Enums"]["climbing_type"]
          created_at?: string
          fall_height_pct?: number | null
          felt_grade?: string | null
          id?: string
          lead_style?: Database["public"]["Enums"]["lead_style"] | null
          notes?: string | null
          problem_id?: string | null
          result?: Database["public"]["Enums"]["attempt_result"]
          session_id?: string
          tries?: number
        }
        Relationships: [
          {
            foreignKeyName: "attempts_board_problem_id_fkey"
            columns: ["board_problem_id"]
            isOneToOne: false
            referencedRelation: "board_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_participants: {
        Row: {
          battle_id: string
          joined_at: string
          team: string | null
          user_id: string
        }
        Insert: {
          battle_id: string
          joined_at?: string
          team?: string | null
          user_id: string
        }
        Update: {
          battle_id?: string
          joined_at?: string
          team?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_participants_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          battle_date: string
          battle_type: string
          color_grades: Json
          created_at: string
          created_by: string
          crew_id: string
          gym_id: string
          id: string
          opponent_crew_id: string | null
          score_visibility: string
          scoring_rules: Json
          status: string
          team_a_name: string | null
          team_b_name: string | null
          team_configs: Json
          title: string
        }
        Insert: {
          battle_date: string
          battle_type: string
          color_grades?: Json
          created_at?: string
          created_by: string
          crew_id: string
          gym_id: string
          id?: string
          opponent_crew_id?: string | null
          score_visibility?: string
          scoring_rules?: Json
          status?: string
          team_a_name?: string | null
          team_b_name?: string | null
          team_configs?: Json
          title: string
        }
        Update: {
          battle_date?: string
          battle_type?: string
          color_grades?: Json
          created_at?: string
          created_by?: string
          crew_id?: string
          gym_id?: string
          id?: string
          opponent_crew_id?: string | null
          score_visibility?: string
          scoring_rules?: Json
          status?: string
          team_a_name?: string | null
          team_b_name?: string | null
          team_configs?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "battles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "battles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_opponent_crew_id_fkey"
            columns: ["opponent_crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      board_problems: {
        Row: {
          angle: number | null
          board_type: Database["public"]["Enums"]["board_type"]
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          name: string
          official_grade: string
          setter: string | null
        }
        Insert: {
          angle?: number | null
          board_type: Database["public"]["Enums"]["board_type"]
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          name: string
          official_grade: string
          setter?: string | null
        }
        Update: {
          angle?: number | null
          board_type?: Database["public"]["Enums"]["board_type"]
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          name?: string
          official_grade?: string
          setter?: string | null
        }
        Relationships: []
      }
      climbing_shoes: {
        Row: {
          brand: string | null
          created_at: string
          fit_features: string[]
          fit_perception: string | null
          id: string
          image_url: string | null
          is_primary: boolean
          model: string
          note: string | null
          ownership_status: string | null
          purchased_at: string | null
          rating_comfort: number | null
          rating_design: number | null
          rating_durability: number | null
          rating_edging: number | null
          rating_heelhook: number | null
          rating_overall: number | null
          rating_sensitivity: number | null
          rating_smearing: number | null
          rating_toehook: number | null
          rating_value: number | null
          size: string | null
          status: string
          stiffness: string | null
          stretch: string | null
          updated_at: string
          usages: string[]
          user_id: string
          wanted_fit: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          fit_features?: string[]
          fit_perception?: string | null
          id?: string
          image_url?: string | null
          is_primary?: boolean
          model: string
          note?: string | null
          ownership_status?: string | null
          purchased_at?: string | null
          rating_comfort?: number | null
          rating_design?: number | null
          rating_durability?: number | null
          rating_edging?: number | null
          rating_heelhook?: number | null
          rating_overall?: number | null
          rating_sensitivity?: number | null
          rating_smearing?: number | null
          rating_toehook?: number | null
          rating_value?: number | null
          size?: string | null
          status?: string
          stiffness?: string | null
          stretch?: string | null
          updated_at?: string
          usages?: string[]
          user_id: string
          wanted_fit?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          fit_features?: string[]
          fit_perception?: string | null
          id?: string
          image_url?: string | null
          is_primary?: boolean
          model?: string
          note?: string | null
          ownership_status?: string | null
          purchased_at?: string | null
          rating_comfort?: number | null
          rating_design?: number | null
          rating_durability?: number | null
          rating_edging?: number | null
          rating_heelhook?: number | null
          rating_overall?: number | null
          rating_sensitivity?: number | null
          rating_smearing?: number | null
          rating_toehook?: number | null
          rating_value?: number | null
          size?: string | null
          status?: string
          stiffness?: string | null
          stretch?: string | null
          updated_at?: string
          usages?: string[]
          user_id?: string
          wanted_fit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "climbing_shoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          crew_id: string
          id: string
          pinned: boolean
          title: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          crew_id: string
          id?: string
          pinned?: boolean
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          crew_id?: string
          id?: string
          pinned?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_announcements_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_join_requests: {
        Row: {
          created_at: string
          crew_id: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_join_requests_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          crew_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          crew_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          crew_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string
          description: string | null
          home_gym_id: string | null
          id: string
          image_url: string | null
          invite_code: string
          is_recruiting: boolean
          member_count: number
          name: string
          owner_id: string
          region: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          home_gym_id?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string
          is_recruiting?: boolean
          member_count?: number
          name: string
          owner_id: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          home_gym_id?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string
          is_recruiting?: boolean
          member_count?: number
          name?: string
          owner_id?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crews_home_gym_id_fkey"
            columns: ["home_gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "crews_home_gym_id_fkey"
            columns: ["home_gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crews_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_votes: {
        Row: {
          color: string
          created_at: string
          grade: string
          gym_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          grade: string
          gym_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          grade?: string
          gym_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_votes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "grade_votes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_color_schemes: {
        Row: {
          color: string
          color_hex: string | null
          gym_id: string
          id: string
          official_label: string | null
          order_index: number
        }
        Insert: {
          color: string
          color_hex?: string | null
          gym_id: string
          id?: string
          official_label?: string | null
          order_index: number
        }
        Update: {
          color?: string
          color_hex?: string | null
          gym_id?: string
          id?: string
          official_label?: string | null
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_color_schemes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_color_schemes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_favorites: {
        Row: {
          created_at: string
          gym_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_favorites_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_favorites_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_prices: {
        Row: {
          created_at: string
          duration_days: number | null
          gym_id: string
          id: string
          is_student: boolean
          name: string
          notes: string | null
          price_krw: number
          product_type: Database["public"]["Enums"]["membership_type"]
          total_passes: number | null
        }
        Insert: {
          created_at?: string
          duration_days?: number | null
          gym_id: string
          id?: string
          is_student?: boolean
          name: string
          notes?: string | null
          price_krw: number
          product_type: Database["public"]["Enums"]["membership_type"]
          total_passes?: number | null
        }
        Update: {
          created_at?: string
          duration_days?: number | null
          gym_id?: string
          id?: string
          is_student?: boolean
          name?: string
          notes?: string | null
          price_krw?: number
          product_type?: Database["public"]["Enums"]["membership_type"]
          total_passes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_prices_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_prices_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_requests: {
        Row: {
          branch: string | null
          created_at: string
          id: string
          location_hint: string | null
          name: string
          note: string | null
          user_id: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          id?: string
          location_hint?: string | null
          name: string
          note?: string | null
          user_id: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          id?: string
          location_hint?: string | null
          name?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_submissions: {
        Row: {
          admin_notes: string | null
          changes: Json
          created_at: string
          decided_at: string | null
          decided_by: string | null
          gym_id: string | null
          id: string
          note: string | null
          status: string
          submitter_id: string
        }
        Insert: {
          admin_notes?: string | null
          changes: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          gym_id?: string | null
          id?: string
          note?: string | null
          status?: string
          submitter_id: string
        }
        Update: {
          admin_notes?: string | null
          changes?: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          gym_id?: string | null
          id?: string
          note?: string | null
          status?: string
          submitter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_submissions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_submissions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_submissions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          branch: string | null
          city: string
          closed_at: string | null
          created_at: string
          description: string | null
          district: string | null
          facilities: string[]
          floors_count: number | null
          has_auto_belay: boolean
          has_boulder: boolean
          has_kilter: boolean
          has_lead: boolean
          has_locker: boolean
          has_moonboard: boolean
          has_parking: boolean
          has_shower: boolean
          has_speed: boolean
          has_tension: boolean
          has_top_rope: boolean
          id: string
          instagram_handle: string | null
          latitude: number | null
          logo_bg_hex: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          opened_at: string | null
          parking_info: string | null
          phone: string | null
          size_pyeong: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          branch?: string | null
          city: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          facilities?: string[]
          floors_count?: number | null
          has_auto_belay?: boolean
          has_boulder?: boolean
          has_kilter?: boolean
          has_lead?: boolean
          has_locker?: boolean
          has_moonboard?: boolean
          has_parking?: boolean
          has_shower?: boolean
          has_speed?: boolean
          has_tension?: boolean
          has_top_rope?: boolean
          id?: string
          instagram_handle?: string | null
          latitude?: number | null
          logo_bg_hex?: string | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opened_at?: string | null
          parking_info?: string | null
          phone?: string | null
          size_pyeong?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          branch?: string | null
          city?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          facilities?: string[]
          floors_count?: number | null
          has_auto_belay?: boolean
          has_boulder?: boolean
          has_kilter?: boolean
          has_lead?: boolean
          has_locker?: boolean
          has_moonboard?: boolean
          has_parking?: boolean
          has_shower?: boolean
          has_speed?: boolean
          has_tension?: boolean
          has_top_rope?: boolean
          id?: string
          instagram_handle?: string | null
          latitude?: number | null
          logo_bg_hex?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opened_at?: string | null
          parking_info?: string | null
          phone?: string | null
          size_pyeong?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      meetup_participants: {
        Row: {
          joined_at: string
          post_id: string
          status: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          post_id: string
          status?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          post_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_participants_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          end_date: string | null
          gym_id: string
          gym_ids: string[]
          id: string
          membership_type: Database["public"]["Enums"]["membership_type"]
          name: string | null
          notes: string | null
          price_krw: number | null
          start_date: string
          total_passes: number | null
          used_passes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          gym_id: string
          gym_ids?: string[]
          id?: string
          membership_type: Database["public"]["Enums"]["membership_type"]
          name?: string | null
          notes?: string | null
          price_krw?: number | null
          start_date: string
          total_passes?: number | null
          used_passes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          gym_id?: string
          gym_ids?: string[]
          id?: string
          membership_type?: Database["public"]["Enums"]["membership_type"]
          name?: string | null
          notes?: string | null
          price_krw?: number | null
          start_date?: string
          total_passes?: number | null
          used_passes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          order_index: number
          poll_id: string
          vote_count: number
        }
        Insert: {
          id?: string
          label: string
          order_index?: number
          poll_id: string
          vote_count?: number
        }
        Update: {
          id?: string
          label?: string
          order_index?: number
          poll_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "post_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "post_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_polls: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          is_multi: boolean
          post_id: string
          question: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_multi?: boolean
          post_id: string
          question: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_multi?: boolean
          post_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          comment_count: number
          created_at: string
          crew_id: string | null
          gym_id: string | null
          id: string
          image_urls: string[]
          like_count: number
          meetup_at: string | null
          meetup_capacity: number | null
          meetup_location: string | null
          participant_count: number
          post_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          comment_count?: number
          created_at?: string
          crew_id?: string | null
          gym_id?: string | null
          id?: string
          image_urls?: string[]
          like_count?: number
          meetup_at?: string | null
          meetup_capacity?: number | null
          meetup_location?: string | null
          participant_count?: number
          post_type?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          comment_count?: number
          created_at?: string
          crew_id?: string | null
          gym_id?: string | null
          id?: string
          image_urls?: string[]
          like_count?: number
          meetup_at?: string | null
          meetup_capacity?: number | null
          meetup_location?: string | null
          participant_count?: number
          post_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "posts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          gym_id: string
          id: string
          photo_url: string | null
          route_grade: string | null
          setting_date: string | null
          wall_angle: Database["public"]["Enums"]["wall_angle"] | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gym_id: string
          id?: string
          photo_url?: string | null
          route_grade?: string | null
          setting_date?: string | null
          wall_angle?: Database["public"]["Enums"]["wall_angle"] | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gym_id?: string
          id?: string
          photo_url?: string | null
          route_grade?: string | null
          setting_date?: string | null
          wall_angle?: Database["public"]["Enums"]["wall_angle"] | null
        }
        Relationships: [
          {
            foreignKeyName: "problems_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problems_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "problems_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          arch_type: string | null
          avatar_url: string | null
          bio: string | null
          climbing_start_date: string | null
          created_at: string
          display_name: string | null
          featured_badge_key: string | null
          foot_length_mm: number | null
          foot_shape: string | null
          foot_width: string | null
          height_cm: number | null
          home_gym_id: string | null
          id: string
          instagram_handle: string | null
          instep_height: string | null
          is_admin: boolean
          is_private: boolean
          kakao_id: string | null
          notification_prefs: Json
          reach_cm: number | null
          shoe_size_mm: number | null
          updated_at: string
          username: string
          weight_kg: number | null
          weight_visible: boolean
        }
        Insert: {
          arch_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          climbing_start_date?: string | null
          created_at?: string
          display_name?: string | null
          featured_badge_key?: string | null
          foot_length_mm?: number | null
          foot_shape?: string | null
          foot_width?: string | null
          height_cm?: number | null
          home_gym_id?: string | null
          id: string
          instagram_handle?: string | null
          instep_height?: string | null
          is_admin?: boolean
          is_private?: boolean
          kakao_id?: string | null
          notification_prefs?: Json
          reach_cm?: number | null
          shoe_size_mm?: number | null
          updated_at?: string
          username: string
          weight_kg?: number | null
          weight_visible?: boolean
        }
        Update: {
          arch_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          climbing_start_date?: string | null
          created_at?: string
          display_name?: string | null
          featured_badge_key?: string | null
          foot_length_mm?: number | null
          foot_shape?: string | null
          foot_width?: string | null
          height_cm?: number | null
          home_gym_id?: string | null
          id?: string
          instagram_handle?: string | null
          instep_height?: string | null
          is_admin?: boolean
          is_private?: boolean
          kakao_id?: string | null
          notification_prefs?: Json
          reach_cm?: number | null
          shoe_size_mm?: number | null
          updated_at?: string
          username?: string
          weight_kg?: number | null
          weight_visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_home_gym"
            columns: ["home_gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "fk_profiles_home_gym"
            columns: ["home_gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      session_plans: {
        Row: {
          category: Database["public"]["Enums"]["session_category"] | null
          completed_session_id: string | null
          created_at: string
          gym_id: string | null
          id: string
          notes: string | null
          planned_date: string
          planned_time: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["session_category"] | null
          completed_session_id?: string | null
          created_at?: string
          gym_id?: string | null
          id?: string
          notes?: string | null
          planned_date: string
          planned_time?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["session_category"] | null
          completed_session_id?: string | null
          created_at?: string
          gym_id?: string | null
          id?: string
          notes?: string | null
          planned_date?: string
          planned_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_plans_completed_session_id_fkey"
            columns: ["completed_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "session_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          board_type: Database["public"]["Enums"]["board_type"] | null
          category: Database["public"]["Enums"]["session_category"] | null
          completed_at: string | null
          condition: number | null
          created_at: string
          duration_min: number | null
          endurance_style: Database["public"]["Enums"]["endurance_style"] | null
          gym_id: string | null
          id: string
          membership_id: string | null
          notes: string | null
          session_date: string
          user_id: string
        }
        Insert: {
          board_type?: Database["public"]["Enums"]["board_type"] | null
          category?: Database["public"]["Enums"]["session_category"] | null
          completed_at?: string | null
          condition?: number | null
          created_at?: string
          duration_min?: number | null
          endurance_style?:
            | Database["public"]["Enums"]["endurance_style"]
            | null
          gym_id?: string | null
          id?: string
          membership_id?: string | null
          notes?: string | null
          session_date: string
          user_id: string
        }
        Update: {
          board_type?: Database["public"]["Enums"]["board_type"] | null
          category?: Database["public"]["Enums"]["session_category"] | null
          completed_at?: string | null
          condition?: number | null
          created_at?: string
          duration_min?: number | null
          endurance_style?:
            | Database["public"]["Enums"]["endurance_style"]
            | null
          gym_id?: string | null
          id?: string
          membership_id?: string | null
          notes?: string | null
          session_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gym_color_grade_stats: {
        Row: {
          avg_v_grade: number | null
          avg_v_grade_label: string | null
          color: string | null
          gym_id: string | null
          median_v_grade: number | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_color_schemes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_popularity"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_color_schemes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_popularity: {
        Row: {
          favorite_count: number | null
          gym_id: string | null
        }
        Relationships: []
      }
      user_monthly_stats: {
        Row: {
          falls: number | null
          max_send_v: number | null
          month: string | null
          projects: number | null
          sends: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      crew_grade_distribution: {
        Args: { p_crew_id: string }
        Returns: {
          is_me: boolean
          member_count: number
          v_num: number
        }[]
      }
      crew_home_stats: {
        Args: { p_crew_id: string }
        Returns: {
          activity_rate: number
          avg_v_grade: string
          meetup_count_last_month: number
        }[]
      }
      gen_invite_code: { Args: never; Returns: string }
      notif_enabled: {
        Args: { p_channel: string; p_user: string }
        Returns: boolean
      }
      num_to_v_grade: { Args: { n: number }; Returns: string }
      official_label_to_v: { Args: { label: string }; Returns: number }
      profile_is_visible_to_me: { Args: { target: string }; Returns: boolean }
      v_grade_to_num: { Args: { grade: string }; Returns: number }
    }
    Enums: {
      attempt_result:
        | "onsight"
        | "flash"
        | "send"
        | "project"
        | "fall"
        | "redpoint"
      board_type: "moonboard" | "kilter" | "tension"
      climbing_type: "boulder" | "lead" | "board"
      endurance_style: "spraywall" | "overhang" | "vertical"
      lead_style: "lead" | "top_rope"
      membership_type: "monthly" | "period" | "passes" | "single"
      session_category: "boulder" | "lead" | "board" | "endurance" | "strength"
      wall_angle:
        | "slab"
        | "vertical"
        | "overhang"
        | "roof"
        | "arete"
        | "dihedral"
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
    Enums: {
      attempt_result: [
        "onsight",
        "flash",
        "send",
        "project",
        "fall",
        "redpoint",
      ],
      board_type: ["moonboard", "kilter", "tension"],
      climbing_type: ["boulder", "lead", "board"],
      endurance_style: ["spraywall", "overhang", "vertical"],
      lead_style: ["lead", "top_rope"],
      membership_type: ["monthly", "period", "passes", "single"],
      session_category: ["boulder", "lead", "board", "endurance", "strength"],
      wall_angle: ["slab", "vertical", "overhang", "roof", "arete", "dihedral"],
    },
  },
} as const
