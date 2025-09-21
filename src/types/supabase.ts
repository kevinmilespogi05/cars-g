export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      likes: {
        Row: {
          id: string
          user_id: string
          report_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          report_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          report_id?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          email: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          role: 'user' | 'admin' | 'moderator'
          points: number
          is_banned: boolean
          created_at: string
          updated_at: string
          notification_settings: any
        }
        Insert: {
          id: string
          username: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'admin' | 'moderator'
          points?: number
          is_banned?: boolean
          created_at?: string
          updated_at?: string
          notification_settings?: any
        }
        Update: {
          id?: string
          username?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'admin' | 'moderator'
          points?: number
          is_banned?: boolean
          created_at?: string
          updated_at?: string
          notification_settings?: any
        }
      }
      reports: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          category: string
          location: string | null
          latitude: number | null
          longitude: number | null
          status: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          image_url: string | null
          video_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          category: string
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          status?: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          image_url?: string | null
          video_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          category?: string
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          status?: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          image_url?: string | null
          video_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          type: 'report_created' | 'report_resolved' | 'achievement_earned' | 'points_earned'
          description: string
          created_at: string
          metadata: Record<string, any> | null
        }
        Insert: {
          id?: string
          user_id: string
          type: 'report_created' | 'report_resolved' | 'achievement_earned' | 'points_earned'
          description: string
          created_at?: string
          metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'report_created' | 'report_resolved' | 'achievement_earned' | 'points_earned'
          description?: string
          created_at?: string
          metadata?: Record<string, any> | null
        }
      }
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          icon_url: string | null
          requirement_type: string
          requirement_value: number
          points_reward: number
          created_at: string
        }
        Insert: {
          id?: string
          name?: string
          description?: string
          icon_url?: string | null
          requirement_type?: string
          requirement_value?: number
          points_reward?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon_url?: string | null
          requirement_type?: string
          requirement_value?: number
          points_reward?: number
          created_at?: string
        }
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          earned_at?: string
        }
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          reports_submitted: number
          reports_verified: number
          reports_resolved: number
          days_active: number
          total_points: number
          last_active: string
          total_reports: number
          resolved_reports: number
          current_streak: number
          longest_streak: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reports_submitted?: number
          reports_verified?: number
          reports_resolved?: number
          days_active?: number
          total_points?: number
          last_active?: string
          total_reports?: number
          resolved_reports?: number
          current_streak?: number
          longest_streak?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reports_submitted?: number
          reports_verified?: number
          reports_resolved?: number
          days_active?: number
          total_points?: number
          last_active?: string
          total_reports?: number
          resolved_reports?: number
          current_streak?: number
          longest_streak?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}