export interface User {
  id: string;
  email: string;
  username?: string;
  first_name?: string | null;
  last_name?: string | null;
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
  status: 'verifying' | 'pending' | 'in_progress' | 'awaiting_verification' | 'resolved' | 'rejected' | 'cancelled';
  location_lat: number;
  location_lng: number;
  location_address: string;
  images?: string[];
  user_id: string;
  patrol_user_id?: string | null;
  created_at: string;
  updated_at: string;
  likes?: { count: number };
  comments?: { count: number };
  user_profile?: { username: string; avatar_url: string | null };
  patrol_profile?: { username: string; avatar_url: string | null };
  is_liked?: boolean;
  // Ticketing system fields
  case_number?: string;
  priority_level?: number; // 1-5 scale, 5 = highest
  assigned_group?: 'Engineering Group' | 'Waste Management' | 'Barangay Police' | 'Field Group' | 'Maintenance Group' | 'Other';
  assigned_patroller_name?: string;
  can_cancel?: boolean;
  comment_count?: number;
  rating_avg?: number;
  rating_count?: number;
}

export interface ReportComment {
  id: string;
  report_id: string;
  user_id: string;
  comment: string;
  comment_type: 'comment' | 'status_update' | 'assignment' | 'resolution';
  created_at: string;
  updated_at: string;
  user_profile?: { username: string; avatar_url: string | null };
  likes_count?: number;
  is_liked?: boolean;
  replies_count?: number;
  replies?: CommentReply[];
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

// Duty scheduling and ratings
export interface DutySchedule {
  id: string;
  duty_date: string; // ISO date (YYYY-MM-DD)
  shift: 'AM' | 'PM';
  dispatcher_user_id?: string | null;
  receiver_user_id?: string | null;
  group?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRating {
  id: string;
  report_id: string;
  requester_user_id: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string | null;
  created_at: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'image' | 'file';
  is_read: boolean;
  seen_at?: string | null;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
    role: string;
  };
  receiver?: {
    id: string;
    username: string;
    avatar_url: string | null;
    role: string;
  };
}

export interface AdminChat {
  id: string;
  user_id: string;
  admin_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
    email: string;
  };
  admin?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface ChatRoom {
  id: string;
  user_id: string;
  admin_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Socket.IO Events
export interface SocketEvents {
  // Client to Server
  'join_admin_chat': (data: { userId: string }) => void;
  'send_message': (data: { message: string; receiverId: string }) => void;
  'mark_messages_read': (data: { messageIds: string[] }) => void;
  'mark_messages_seen': (data: { messageIds: string[] }) => void;
  'typing_start': (data: { receiverId: string }) => void;
  'typing_stop': (data: { receiverId: string }) => void;
  
  // Server to Client
  'message_received': (message: ChatMessage) => void;
  'message_sent': (message: ChatMessage) => void;
  'messages_read': (data: { messageIds: string[] }) => void;
  'messages_seen': (data: { messageIds: string[] }) => void;
  'message_seen': (data: { messageId: string; seenAt: string; isRead: boolean }) => void;
  'user_typing': (data: { userId: string; isTyping: boolean }) => void;
  'admin_online': (data: { isOnline: boolean }) => void;
  'chat_connected': (data: { success: boolean; message?: string }) => void;
  'chat_error': (data: { error: string }) => void;
}

// Google Maps Types
declare global {
  interface Window {
    google: typeof google;
  }
}