export interface User {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string | null;
  points?: number;
  role?: string;
  created_at?: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'verifying' | 'pending' | 'in_progress' | 'awaiting_verification' | 'resolved' | 'rejected';
  location_lat: number;
  location_lng: number;
  location_address: string;
  images?: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
  likes?: { count: number };
  comments?: { count: number };
  user_profile?: { username: string; avatar_url: string | null };
  is_liked?: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  points: number;
}

export interface Activity {
  id: string;
  user_id: string;
  type: 'report_created' | 'report_resolved' | 'achievement_earned' | 'points_earned';
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
  user_id: string;
  earned_at: string;
  progress?: number;
}

// Chat Types
export interface ChatConversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  participants?: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'location';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface ChatUser {
  id: string;
  username: string;
  avatar_url: string | null;
  is_online?: boolean;
  last_seen?: string;
}

export interface LikeDetail {
  id: string;
  user_id: string;
  report_id?: string;
  comment_id?: string;
  reply_id?: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
}

export interface CommentReply {
  id: string;
  parent_comment_id?: string;
  parent_reply_id?: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
  replies?: CommentReply[];
  reply_depth?: number;
  likes_count?: number;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
  likes_count?: number;
  replies_count?: number;
  is_liked?: boolean;
  replies?: CommentReply[];
}