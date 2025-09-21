# Chat Feature Documentation

## Overview
The chat feature allows users to send real-time messages to admin users only. It uses Socket.IO for real-time communication and includes both user and admin interfaces.

## Features

### User Features
- **Real-time messaging**: Users can send messages to admin users instantly
- **Online status**: See when admin is online/offline
- **Typing indicators**: See when admin is typing
- **Message history**: View previous messages in the chat
- **Unread count**: Track unread messages with badge
- **Responsive design**: Works on desktop and mobile

### Admin Features
- **Chat management**: View all user conversations
- **Real-time responses**: Respond to users instantly
- **User information**: See user details in chat interface
- **Message status**: Track read/unread messages
- **Multiple conversations**: Handle multiple user chats simultaneously

## Technical Implementation

### Frontend Components
- `ChatButton`: Button component for users to open chat
- `ChatWindow`: Main chat interface for users
- `AdminChatInterface`: Admin interface for managing chats
- `MessageList`: Displays chat messages
- `MessageInput`: Input component for sending messages
- `ChatHeader`: Header with connection status and controls

### Backend Implementation
- **Socket.IO Server**: Handles real-time connections
- **JWT Authentication**: Secure socket connections
- **Database Integration**: Stores messages in Supabase
- **Real-time Events**: Manages typing indicators, online status, etc.

### Database Schema
- `chat_messages`: Stores individual messages
- `admin_chats`: Tracks admin chat sessions
- `chat_rooms`: Manages chat room relationships

## Usage

### For Users
1. Click the chat button in the navigation (only visible to non-admin users)
2. Wait for connection to establish
3. Type your message and press Enter or click Send
4. See admin responses in real-time

### For Admins
1. Navigate to `/admin/chat` or click the Chat button in admin dashboard
2. Select a user conversation from the sidebar
3. View messages and respond in real-time
4. See unread message counts and user status

## Configuration

### Environment Variables
- `VITE_API_URL`: Backend server URL (default: https://cars-g-api.onrender.com in production, http://localhost:3001 in development)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for admin operations)

### Admin User Setup
The chat feature requires an admin user to be created in the database. The admin user ID should be configured in the chat components (currently set to "admin" as placeholder).

## Security
- JWT token authentication for socket connections
- Row Level Security (RLS) policies in database
- User authorization checks for message access
- Admin-only access to admin chat interface

## Real-time Events

### Client to Server
- `authenticate`: Authenticate socket connection
- `join_admin_chat`: Join admin chat room
- `send_message`: Send a message
- `mark_messages_read`: Mark messages as read
- `typing_start`: Start typing indicator
- `typing_stop`: Stop typing indicator

### Server to Client
- `authenticated`: Authentication successful
- `message_received`: New message received
- `message_sent`: Message sent confirmation
- `messages_read`: Messages marked as read
- `user_typing`: User typing status
- `admin_online`: Admin online status
- `chat_connected`: Chat connection status
- `chat_error`: Chat error messages

## Troubleshooting

### Common Issues
1. **Socket connection fails**: Check server URL and authentication
2. **Messages not sending**: Verify user permissions and admin user ID
3. **Admin not receiving messages**: Ensure admin user exists and is online
4. **Database errors**: Check Supabase configuration and RLS policies

### Debug Mode
Use the `SocketDebug` component to troubleshoot connection issues:
```tsx
import { SocketDebug } from './components/SocketDebug';

// Add to any page for debugging
<SocketDebug />
```

## Future Enhancements
- File/image sharing
- Message reactions
- Chat history search
- Push notifications
- Message encryption
- Chat analytics
- Automated responses
