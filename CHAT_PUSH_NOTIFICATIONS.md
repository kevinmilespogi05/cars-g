# Chat Push Notifications Implementation

## Overview

This document describes the implementation of push notifications for the chat system between users and admins. The feature ensures that both users and admins receive real-time push notifications when they receive new chat messages, even when the application is not in focus.

## Features

### Core Functionality
- **Real-time push notifications** for chat messages
- **User-to-Admin notifications** when users send messages to admins
- **Admin-to-User notifications** when admins respond to users
- **Smart notification handling** with different behaviors for chat vs. other notifications
- **Interactive notifications** with Reply and View actions
- **Background and foreground** notification support

### Notification Types
- **Chat notifications**: Special handling with vibration, longer display time, and chat-specific actions
- **Regular notifications**: Standard notification behavior for other app notifications

## Technical Implementation

### Backend (Server)

#### 1. Chat Message Handler Enhancement
**File**: `server/server.js`

The `send_message` socket event handler has been enhanced to trigger push notifications:

```javascript
// Send push notification for chat message
try {
  await sendChatPushNotification(newMessage, socket.userRole);
} catch (pushError) {
  console.warn('Failed to send chat push notification:', pushError);
}
```

#### 2. Chat Push Notification Service
**Function**: `sendChatPushNotification(message, senderRole)`

This function handles the logic for sending chat-specific push notifications:

- **Target Identification**: Always sends notifications to the receiver (not sender)
- **Role-based Messaging**: Different titles and links based on sender role
- **Database Integration**: Creates notification records in the database
- **FCM Integration**: Sends push notifications via Firebase Cloud Messaging

**Key Features**:
- Prevents self-notifications (sender doesn't get notified of their own messages)
- Role-aware link generation (`/admin/chat` for admins, `/chat` for users)
- Comprehensive error handling and logging

### Frontend

#### 1. Enhanced Push Notification Hook
**File**: `src/hooks/usePushNotifications.ts`

The hook has been enhanced to handle chat notifications differently:

**Chat Notification Features**:
- **Special vibration pattern**: `[200, 100, 200]` for chat notifications
- **Longer display time**: 10 seconds vs 5 seconds for regular notifications
- **Interactive actions**: Reply and View Chat buttons
- **Require interaction**: Chat notifications require user interaction
- **Special tagging**: Uses 'chat' tag for better notification management

#### 2. Firebase Messaging Service Worker
**File**: `public/firebase-messaging-sw.js`

Enhanced to provide better chat notification handling:

**Background Message Handling**:
- Detects chat notifications by type or title content
- Applies chat-specific notification options
- Provides interactive actions for chat notifications

**Push Event Handling**:
- Normalizes payload structure for different notification sources
- Applies chat-specific behaviors (vibration, actions, interaction requirements)

**Notification Click Handling**:
- Smart navigation based on notification type
- Reply action focuses on chat input
- View action navigates to appropriate chat interface

## Database Schema

### Notifications Table
The existing `notifications` table is used with a new `type` field:

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- 'chat' for chat notifications
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Push Subscriptions Table
The existing `push_subscriptions` table stores FCM tokens:

```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Configuration

### Environment Variables
The following environment variables are required:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# FCM Configuration (Server)
FCM_PROJECT_ID=your_firebase_project_id
FCM_PRIVATE_KEY=your_firebase_private_key
FCM_CLIENT_EMAIL=your_firebase_client_email
```

## Usage

### For Users
1. **Grant Permission**: Users must grant notification permissions when prompted
2. **Receive Notifications**: Users receive push notifications when admins send messages
3. **Interactive Actions**: Users can tap "Reply" to quickly respond or "View Chat" to open the chat interface
4. **Background Support**: Notifications work even when the app is closed

### For Admins
1. **Admin Interface**: Admins receive notifications when users send messages
2. **Quick Actions**: Admins can use notification actions to quickly respond
3. **Multiple Conversations**: Notifications help admins manage multiple user conversations

## Testing

### Test Script
A comprehensive test script is available at `scripts/test-chat-push-notifications.js`:

```bash
node scripts/test-chat-push-notifications.js
```

This script:
- Creates test chat messages between users and admins
- Verifies notification creation in the database
- Checks push subscription status
- Provides detailed logging for debugging

### Manual Testing Steps
1. **Setup**: Ensure Firebase and Supabase are properly configured
2. **Permissions**: Grant notification permissions in the browser
3. **User Test**: Send a message from user to admin, verify admin receives notification
4. **Admin Test**: Send a message from admin to user, verify user receives notification
5. **Background Test**: Close the app and send messages, verify notifications still work
6. **Action Test**: Test notification actions (Reply, View Chat)

## Troubleshooting

### Common Issues

#### 1. Notifications Not Received
- **Check permissions**: Ensure notification permissions are granted
- **Verify FCM setup**: Check Firebase configuration and VAPID key
- **Check tokens**: Verify push subscription tokens are registered
- **Browser support**: Ensure browser supports push notifications

#### 2. Notifications Not Interactive
- **Service worker**: Ensure Firebase messaging service worker is registered
- **Action support**: Check if browser supports notification actions
- **Click handlers**: Verify notification click handlers are properly set up

#### 3. Wrong Navigation
- **Link generation**: Check if notification links are correctly generated
- **Role detection**: Verify user roles are properly detected
- **Route handling**: Ensure frontend routes handle notification navigation

### Debug Mode
Enable debug logging by checking browser console for:
- Push notification registration logs
- Message sending logs
- Notification creation logs
- Service worker logs

## Security Considerations

### Data Privacy
- **User consent**: Users must explicitly grant notification permissions
- **Token management**: FCM tokens are securely stored and managed
- **Message content**: Only message previews are shown in notifications

### Access Control
- **Role-based notifications**: Notifications respect user roles and permissions
- **Message authorization**: Only authorized users can send messages
- **Notification filtering**: Users only receive notifications intended for them

## Performance Considerations

### Optimization
- **Efficient queries**: Database queries are optimized for notification creation
- **Batch processing**: Multiple notifications can be processed efficiently
- **Error handling**: Failed notifications don't block message sending
- **Resource management**: Service workers are properly managed and cleaned up

### Scalability
- **FCM limits**: Firebase Cloud Messaging handles high-volume notifications
- **Database indexing**: Proper indexing on notification queries
- **Caching**: Push subscription tokens are cached for performance

## Future Enhancements

### Planned Features
- **Rich notifications**: Support for images and rich content in notifications
- **Notification preferences**: User-configurable notification settings
- **Group notifications**: Batch multiple messages into single notifications
- **Offline support**: Queue notifications when offline
- **Analytics**: Track notification engagement and effectiveness

### Integration Opportunities
- **Email fallback**: Send email notifications when push notifications fail
- **SMS integration**: SMS notifications for critical messages
- **Desktop notifications**: Native desktop app notifications
- **Mobile app**: Native mobile app push notifications

## Support

For issues or questions regarding chat push notifications:
1. Check the troubleshooting section above
2. Review browser console logs
3. Test with the provided test script
4. Verify Firebase and Supabase configuration
5. Check notification permissions and browser support
