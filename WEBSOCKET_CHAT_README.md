# WebSocket Real-Time Chat Implementation

This document describes the new WebSocket-based real-time chat system that replaces the previous Supabase real-time implementation.

## Overview

The new chat system uses pure WebSocket connections for real-time communication, providing:
- **Better Performance**: Lower latency and more efficient message delivery
- **Enhanced Control**: Full control over connection management and error handling
- **Scalability**: Better handling of multiple concurrent connections
- **Reliability**: Automatic reconnection and message queuing

## Architecture

### Frontend Components

1. **WebSocketChatService** (`src/services/websocketChatService.ts`)
   - Singleton service managing WebSocket connections
   - Handles message queuing and reconnection logic
   - Provides event-based API for chat functionality

2. **WebSocketChat** (`src/components/chat/WebSocketChat.tsx`)
   - Main chat component combining list and room views
   - Manages WebSocket connection lifecycle

3. **WebSocketChatList** (`src/components/chat/WebSocketChatList.tsx`)
   - Displays list of chat rooms
   - Real-time updates for room status and last messages

4. **WebSocketChatRoom** (`src/components/chat/WebSocketChatRoom.tsx`)
   - Individual chat room interface
   - Real-time message display and input handling

5. **WebSocketConnectionStatus** (`src/components/chat/WebSocketConnectionStatus.tsx`)
   - Visual indicator for connection status
   - Shows connection errors and reconnection attempts

### Backend Components

1. **WebSocket Server** (`server/websocket.js`)
   - Handles WebSocket connections and message routing
   - Manages room subscriptions and user presence
   - Integrates with Supabase for data persistence

## Features

### Real-Time Messaging
- Instant message delivery across all connected clients
- Message persistence in Supabase database
- Support for message reactions and typing indicators

### Connection Management
- Automatic reconnection with exponential backoff
- Connection status monitoring and visual feedback
- Message queuing during connection interruptions

### Room Management
- Create and join chat rooms
- Direct message support
- Room participant management

### User Presence
- Real-time online/offline status
- Typing indicators
- User join/leave notifications

### Message Reactions
- Emoji reactions on messages
- Real-time reaction count updates
- Persistent reaction storage

## Setup Instructions

### Environment Configuration

Add the following to your `.env` file:

```env
# WebSocket Configuration
VITE_WS_URL=ws://localhost:3001
WS_PORT=3001

# For production
VITE_WS_URL=wss://your-domain.com
```

### Server Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the WebSocket server:
```bash
npm run server
```

3. For development, start both frontend and backend:
```bash
npm run start
```

### Frontend Integration

1. Import the WebSocket chat components:
```tsx
import { WebSocketChat } from './components/chat/WebSocketChat';
```

2. Use in your app:
```tsx
<WebSocketChat />
```

## API Reference

### WebSocketChatService

#### Connection Management
```typescript
// Connect to WebSocket server
await websocketChatService.connect();

// Disconnect
websocketChatService.disconnect();

// Get connection status
const status = websocketChatService.getConnectionStatus();
```

#### Room Management
```typescript
// Subscribe to a room
await websocketChatService.subscribeToRoom(roomId);

// Unsubscribe from a room
websocketChatService.unsubscribeFromRoom(roomId);
```

#### Messaging
```typescript
// Send a message
await websocketChatService.sendMessage(roomId, content);

// Send typing indicator
await websocketChatService.sendTypingIndicator(roomId, true);

// Send reaction
await websocketChatService.sendReaction(messageId, roomId, reaction);
```

#### Event Listeners
```typescript
// Listen for new messages
const unsubscribe = websocketChatService.onMessage(roomId, (message) => {
  console.log('New message:', message);
});

// Listen for typing indicators
const unsubscribeTyping = websocketChatService.onTyping(roomId, (userId, isTyping) => {
  console.log(`${userId} is ${isTyping ? 'typing' : 'not typing'}`);
});

// Listen for connection status changes
const unsubscribeStatus = websocketChatService.onConnectionStatus((status) => {
  console.log('Connection status:', status);
});
```

### WebSocket Message Types

```typescript
interface WebSocketMessage {
  type: 'message' | 'typing' | 'reaction' | 'presence' | 'join' | 'leave' | 'error' | 'ping' | 'pong';
  roomId?: string;
  data?: any;
  timestamp: number;
  userId?: string;
}
```

## Error Handling

The WebSocket service includes comprehensive error handling:

1. **Connection Errors**: Automatic reconnection with exponential backoff
2. **Message Queuing**: Messages are queued during connection interruptions
3. **Rate Limiting**: Built-in rate limiting to prevent abuse
4. **Graceful Degradation**: Falls back to polling if WebSocket fails

## Performance Considerations

1. **Connection Pooling**: Efficient management of multiple room subscriptions
2. **Message Batching**: Messages are batched for optimal performance
3. **Heartbeat Monitoring**: Regular heartbeat to detect connection issues
4. **Memory Management**: Proper cleanup of event listeners and connections

## Security

1. **Authentication**: WebSocket connections require valid user authentication
2. **Rate Limiting**: Prevents message spam and abuse
3. **Input Validation**: All messages are validated before processing
4. **Room Access Control**: Users can only access rooms they're participants in

## Migration from Supabase Real-Time

To migrate from the old Supabase real-time implementation:

1. Replace `realTimeChatService` imports with `websocketChatService`
2. Update component imports to use WebSocket versions
3. Update environment variables to include WebSocket URL
4. Start the WebSocket server alongside your application

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check WebSocket server is running
   - Verify `VITE_WS_URL` environment variable
   - Check firewall settings

2. **Messages Not Delivered**
   - Verify room subscription
   - Check connection status
   - Review server logs for errors

3. **High Memory Usage**
   - Ensure proper cleanup of event listeners
   - Check for memory leaks in message queues
   - Monitor connection count

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=websocket:*
```

## Future Enhancements

1. **Message Encryption**: End-to-end encryption for messages
2. **File Sharing**: Real-time file upload and sharing
3. **Voice Messages**: Audio message support
4. **Video Calls**: WebRTC integration for video calls
5. **Message Search**: Full-text search across messages
6. **Message Threading**: Reply threads and conversations
7. **Push Notifications**: Mobile push notifications for messages
8. **Message Editing**: Edit and delete message support
9. **Read Receipts**: Message read status tracking
10. **Message Pinning**: Pin important messages in rooms

## Contributing

When contributing to the WebSocket chat implementation:

1. Follow the existing code style and patterns
2. Add comprehensive error handling
3. Include unit tests for new features
4. Update documentation for API changes
5. Test with multiple concurrent users
6. Verify reconnection behavior
7. Check memory usage and cleanup 