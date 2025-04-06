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
      points_history: {
        Row: {
          id: string
          created_at: string
          user_id: string
          points: number
          reason: string
          report_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          points: number
          reason: string
          report_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          points?: number
          reason?: string
          report_id?: string | null
        }
      }
    }
  }
}