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
          created_at: string
          username: string
          avatar_url: string | null
          points: number
          role: 'user' | 'admin'
        }
        Insert: {
          id: string
          created_at?: string
          username: string
          avatar_url?: string | null
          points?: number
          role?: 'user' | 'admin'
        }
        Update: {
          id?: string
          created_at?: string
          username?: string
          avatar_url?: string | null
          points?: number
          role?: 'user' | 'admin'
        }
      }
      reports: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          description: string
          category: string
          location_lat: number
          location_lng: number
          location_address: string
          status: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          priority: 'low' | 'medium' | 'high'
          images: string[]
          points_awarded: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          title: string
          description: string
          category: string
          location_lat: number
          location_lng: number
          location_address: string
          status?: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          priority: 'low' | 'medium' | 'high'
          images?: string[]
          points_awarded?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          title?: string
          description?: string
          category?: string
          location_lat?: number
          location_lng?: number
          location_address?: string
          status?: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          priority?: 'low' | 'medium' | 'high'
          images?: string[]
          points_awarded?: number | null
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
          icon: string
          points: number
          criteria: string
          requirement_type: 'reports_submitted' | 'reports_verified' | 'reports_resolved' | 'days_active' | 'points_earned'
          requirement_count: number
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          points: number
          criteria: string
          requirement_type: 'reports_submitted' | 'reports_verified' | 'reports_resolved' | 'days_active' | 'points_earned'
          requirement_count: number
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          points?: number
          criteria?: string
          requirement_type?: 'reports_submitted' | 'reports_verified' | 'reports_resolved' | 'days_active' | 'points_earned'
          requirement_count?: number
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
        }
      }
    }
  }
}