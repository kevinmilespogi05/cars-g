# Real-Time Chat Implementation for Cars-G

## Overview
This document describes the implementation of real-time chat functionality using WebSockets (Socket.IO) for the Cars-G application.

## Architecture

### Backend (Node.js + Express + Socket.IO)
- **Location**: `server/` directory
- **Main File**: `server/server.js`
- **Dependencies**: Express, Socket.IO, Supabase client, CORS, Helmet, Compression

### Frontend (React + TypeScript)
- **Socket Client**: `socket.io-client` (already installed)
- **Components**: Chat components in `src/components/`
- **Hooks**: Custom WebSocket hook in `src/hooks/useChatSocket.ts`
- **Services**: Chat API service in `src/services/chatService.ts`

### Database (Supabase PostgreSQL)
- **Tables**: `chat_conversations`, `chat_messages`, `chat_participants`
- **Migration**: `supabase/migrations/20241201000000_create_chat_tables.sql`

## Features Implemented

### 1. Real-Time Messaging
- ✅ WebSocket connections using Socket.IO
- ✅ Instant message delivery
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Message persistence in Supabase

### 2. Chat Management
- ✅ Create conversations between users
- ✅ Join/leave conversation rooms
- ✅ Message history loading
- ✅ Unread message tracking
- ✅ Conversation list with last message preview

### 3. Message Types
- ✅ Text messages
- ✅ Image sharing (placeholder)
- ✅ File sharing (placeholder)
- ✅ Location sharing (placeholder)

### 4. User Experience
- ✅ Responsive design (mobile + desktop)
- ✅ Real-time typing indicators
- ✅ Message timestamps
- ✅ Avatar support
- ✅ Connection status indicators

## Setup Instructions

### 1. Backend Setup
```bash
cd server
npm install
npm start
```

### 2. Database Setup
Run the SQL migration in your Supabase project:
```sql
-- Run the contents of supabase/migrations/20241201000000_create_chat_tables.sql
```

### 3. Environment Variables
Add these to your `.env` file:
```env
VITE_API_URL=https://your-backend-url.com
VITE_CHAT_SERVER_URL=https://your-backend-url.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Frontend
The chat components are already integrated. Access at `/chat` route.

## API Endpoints

### REST API
- `GET /api/chat/conversations/:userId` - Get user conversations
- `GET /api/chat/messages/:conversationId` - Get conversation messages
- `POST /api/chat/conversations` - Create new conversation

### WebSocket Events
- `authenticate` - User authentication
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `send_message` - Send new message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

## Database Schema

### chat_conversations
- `id` (UUID, Primary Key)
- `participant1_id` (UUID, Foreign Key to auth.users)
- `participant2_id` (UUID, Foreign Key to auth.users)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `last_message_at` (Timestamp)

### chat_messages
- `id` (UUID, Primary Key)
- `conversation_id` (UUID, Foreign Key to chat_conversations)
- `sender_id` (UUID, Foreign Key to auth.users)
- `content` (Text)
- `message_type` (Text: 'text', 'image', 'file', 'location')
- `metadata` (JSONB)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### chat_participants
- `id` (UUID, Primary Key)
- `conversation_id` (UUID, Foreign Key to chat_conversations)
- `user_id` (UUID, Foreign Key to auth.users)
- `joined_at` (Timestamp)
- `last_read_at` (Timestamp)

## Security Features

### Row Level Security (RLS)
- Users can only access their own conversations
- Users can only send messages in conversations they're part of
- Users can only view participants in their conversations

### Authentication
- WebSocket connections require user authentication
- User verification against Supabase profiles table
- Service role key for backend operations

## Performance Optimizations

### Database Indexes
- Conversation participants lookup
- Message conversation + timestamp
- Participant conversation + user

### WebSocket Optimization
- Room-based message broadcasting
- Efficient user connection tracking
- Typing indicator debouncing

## Future Enhancements

### 1. File Upload
- Integrate with Supabase Storage
- Support for images, documents, videos
- File size limits and type validation

### 2. Push Notifications
- Browser push notifications for offline users
- Mobile app notifications
- Email notifications for important messages

### 3. Advanced Features
- Message reactions (like, heart, etc.)
- Message editing and deletion
- Group conversations
- Message search functionality
- Message encryption

### 4. Analytics
- Message delivery tracking
- User engagement metrics
- Chat performance monitoring

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check backend server is running
   - Verify CORS settings
   - Check network connectivity

2. **Messages Not Sending**
   - Verify user authentication
   - Check conversation exists
   - Verify user is participant

3. **Database Errors**
   - Run migration scripts
   - Check RLS policies
   - Verify table structure

### Debug Mode
Enable debug logging in the backend:
```javascript
const io = new Server(server, {
  cors: { /* ... */ },
  debug: true
});
```

## Testing

### Manual Testing
1. Start backend server
2. Open chat page in browser
3. Send messages between users
4. Test typing indicators
5. Verify real-time updates

### Automated Testing
```bash
# Run existing tests
npm test

# Test chat functionality
npm run test:chat
```

## Deployment

### Backend (Render)
- Deploy to Render with Node.js environment
- Set environment variables
- Enable auto-deploy

### Frontend (Vercel)
- Build and deploy React app
- Set environment variables
- Verify WebSocket connections

### Database (Supabase)
- Run migrations in production
- Verify RLS policies
- Test with production data

## Support

For issues or questions:
1. Check this documentation
2. Review console logs
3. Check network tab for errors
4. Verify environment variables
5. Test with minimal setup

---

**Note**: This implementation provides a solid foundation for real-time chat. The placeholder features (file upload, image sharing) can be enhanced by integrating with Supabase Storage and implementing proper file handling. 