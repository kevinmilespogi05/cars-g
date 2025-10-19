# Cars-G Community Safety Platform - Complete System Replication Prompt

## 🎯 System Overview

Create a comprehensive community safety platform called **Cars-G** that enables residents to report safety issues, patrol officers to manage cases, and administrators to oversee operations through real-time dashboards and communication systems.

## 🏗️ Technical Architecture

### Frontend Stack (React)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with PWA support
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand for global state
- **Routing**: React Router with role-based access
- **Maps**: Leaflet + OpenStreetMap
- **Charts**: Chart.js with React Chart.js 2
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **PWA**: Vite PWA plugin with Workbox

### Backend Stack (Node.js + Express)
- **Runtime**: Node.js with Express.js
- **Real-time**: Socket.IO for chat functionality
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Joi or Zod for request validation
- **Middleware**: CORS, helmet, morgan for security and logging
- **File Upload**: Multer for handling file uploads
- **Email**: Nodemailer with Gmail SMTP
- **Push Notifications**: Firebase Cloud Messaging

### Database (MongoDB)
- **Database**: MongoDB with Mongoose ODM
- **Collections**: Users, Reports, Messages, Points, Achievements
- **Indexing**: Optimized queries with proper indexes
- **Aggregation**: Complex analytics with MongoDB aggregation pipeline
- **GridFS**: File storage for images and documents

### Deployment
- **Frontend**: Vercel 
- **Backend**: Render
- **Database**: MongoDB Atlas (cloud) or self-hosted MongoDB
- **File Storage**: Cloudinary

## 👥 User Roles & Permissions

### 1. Users (Residents)
**Capabilities:**
- Submit safety reports with photos and location
- Anonymous reporting option (no points awarded)
- Real-time chat with admin users
- View personal reports and status
- Earn points and achievements
- View leaderboards and community stats
- Profile management with avatar upload

**Key Features:**
- Report creation with 6-digit case numbers (#010001)
- Priority levels (1-5) with visual indicators
- Status tracking: Pending → In Progress → Resolved/Rejected
- Points system: 25 points for verified reports, 100 points for resolved
- Anonymous reporting with privacy protection

### 2. Patrol Officers
**Capabilities:**
- Manage assigned cases with ticketing system
- Real-time communication with users and admins
- Case assignment and status updates
- Proof upload for case resolution
- Priority-based reward system
- Dashboard with case statistics

**Key Features:**
- Case management with 6-digit case numbers
- Priority-based rewards: High (50 pts), Medium (25 pts), Low (10 pts)
- Proof upload system for case verification
- Real-time case updates and notifications
- Patrol-specific dashboard with statistics

### 3. Administrators
**Capabilities:**
- Full system access and user management
- Advanced analytics dashboard
- Real-time map with report markers
- Chat management with all users
- User role management and banning
- System configuration and announcements

**Key Features:**
- Real-time admin map with color-coded markers
- Advanced statistics with filters and trends
- User management with role assignment
- Chat interface for all user conversations
- Announcement management system
- Duty schedule management

## 🔧 Core Features Implementation

### 1. Authentication System
```typescript
// JWT-based authentication with MongoDB
- User registration and login with bcrypt password hashing
- JWT token generation and validation
- OAuth integration (Google, Facebook) with Passport.js
- Role-based access control via user documents
- Refresh token implementation for security
- Password reset functionality with email tokens
```

### 2. Reporting System
```typescript
interface Report {
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
  is_anonymous?: boolean;
  case_number?: string;
  priority_level?: number; // 1-5 scale
  assigned_group?: 'Engineering Group' | 'Waste Management' | 'Barangay Police' | 'Field Group' | 'Maintenance Group' | 'Other';
  assigned_patroller_name?: string;
  can_cancel?: boolean;
  comment_count?: number;
  rating_avg?: number;
  rating_count?: number;
}
```

### 3. Real-Time Chat System
```typescript
// Socket.IO implementation with MongoDB
- User-to-Admin chat only
- Real-time messaging with typing indicators
- Online/offline status tracking
- Message persistence in MongoDB
- Push notifications for new messages
- File/image sharing through GridFS or Cloudinary
- Message encryption for security
```

### 4. Gamification System
```typescript
// Points and achievements
const POINTS_CONFIG = {
  REPORT_SUBMITTED: 0,    // No points for submitting
  REPORT_VERIFIED: 25,    // Points when verified by admin
  REPORT_RESOLVED: 100,   // Points when issue resolved
  DAILY_LOGIN: 5,         // Daily engagement points
  PROFILE_COMPLETED: 25,  // Profile completion bonus
  PATROL_HIGH: 50,        // High priority patrol reward
  PATROL_MEDIUM: 25,      // Medium priority patrol reward
  PATROL_LOW: 10,         // Low priority patrol reward
};
```

### 5. PWA Implementation
```typescript
// Progressive Web App features
- Web App Manifest with proper icons
- Service Worker with Workbox
- Offline support with fallback pages
- Install prompts for mobile and desktop
- Push notifications via Firebase
- Network status detection
- Update management with user prompts
```

## 🗄️ Database Schema (MongoDB Collections)

### Core Collections
```javascript
// User collection with roles
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'patrol'], default: 'user' },
  points: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  avatarUrl: { type: String },
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    bio: String
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    theme: { type: String, default: 'light' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Reports collection with ticketing system
const ReportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { 
    type: String, 
    enum: ['verifying', 'pending', 'in_progress', 'awaiting_verification', 'resolved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  images: [{ type: String }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patrolUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAnonymous: { type: Boolean, default: false },
  caseNumber: { type: String, unique: true },
  priorityLevel: { type: Number, min: 1, max: 5 },
  assignedGroup: { 
    type: String, 
    enum: ['Engineering Group', 'Waste Management', 'Barangay Police', 'Field Group', 'Maintenance Group', 'Other']
  },
  assignedPatrollerName: { type: String },
  canCancel: { type: Boolean, default: true },
  commentCount: { type: Number, default: 0 },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Chat messages collection
const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

// Points history collection
const PointsHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, required: true },
  reason: { type: String, required: true },
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  createdAt: { type: Date, default: Date.now }
});

// User statistics collection
const UserStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  reportsSubmitted: { type: Number, default: 0 },
  reportsVerified: { type: Number, default: 0 },
  reportsResolved: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  daysActive: { type: Number, default: 0 },
  reportingStreak: { type: Number, default: 0 },
  lastActiveDate: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

// Achievements collection
const AchievementSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  points: { type: Number, required: true },
  requirements: {
    reportsSubmitted: { type: Number, default: 0 },
    reportsVerified: { type: Number, default: 0 },
    reportsResolved: { type: Number, default: 0 },
    daysActive: { type: Number, default: 0 },
    reportingStreak: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
```

## 🎨 UI/UX Design System

### Design Principles
- **Edge-to-edge layout** for modern mobile experience
- **Role-based navigation** with different menus per user type
- **Real-time updates** with optimistic UI patterns
- **Responsive design** optimized for mobile and desktop
- **Accessibility** with proper ARIA labels and keyboard navigation

### Component Architecture
```
src/
├── components/          # Reusable UI components
│   ├── AdminMapDashboard.tsx    # Real-time admin map
│   ├── ChatMessage.tsx          # Chat components
│   ├── Navigation.tsx           # Role-based navigation
│   ├── PatrolRoute.tsx          # Route protection
│   ├── PWAPrompt.tsx           # PWA installation
│   └── UserManagement.tsx       # Admin user management
├── pages/              # Route-specific pages
│   ├── AdminDashboard.tsx       # Admin analytics
│   ├── PatrolDashboard.tsx      # Patrol ticketing
│   ├── Reports.tsx              # User reports
│   ├── Chat.tsx                 # Chat interface
│   └── Profile.tsx              # User profile
├── hooks/              # Custom React hooks
│   ├── useAuth.ts               # Authentication
│   ├── useChatSocket.ts         # Socket.IO
│   ├── usePWA.ts                # PWA functionality
│   └── useRealTimeReports.ts    # Live updates
├── lib/                # Core utilities
│   ├── database.ts              # MongoDB connection
│   ├── firebase.ts              # Push notifications
│   ├── achievements.ts          # Gamification
│   └── cloudinary.ts            # File uploads
├── store/              # Zustand state
│   └── authStore.ts             # Global auth state
└── services/          # API services
    ├── reportsService.ts        # Report operations
    ├── adminService.ts          # Admin operations
    └── commentsService.ts       # Comments system
```

## 🚀 Deployment Configuration

### Environment Variables
```bash
# Frontend (Vercel/Netlify)
VITE_API_URL=https://your-backend-url.com
VITE_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cars-g
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
VITE_CLOUDINARY_API_KEY=your_cloudinary_key
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Backend (Railway/Render/DigitalOcean)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cars-g
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FCM_PROJECT_ID=your_firebase_project_id
GMAIL_APP_PASSWORD=your_gmail_app_password
NODE_ENV=production
PORT=3001
```

### Build Configuration
```typescript
// vite.config.ts
VitePWA({
  strategies: 'generateSW',
  registerType: 'prompt',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
    navigateFallback: '/offline.html',
    runtimeCaching: [
      // Map tiles caching
      { urlPattern: /^https:\/\/(?:[a-c])\.tile\.openstreetmap\.org\//, handler: 'StaleWhileRevalidate' },
      // API caching
      { urlPattern: /^https:\/\/your-backend-url\.com\/api/, handler: 'NetworkFirst' },
      // Image caching
      { urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/, handler: 'CacheFirst' }
    ]
  }
})
```

## 🔄 Real-Time Features

### Socket.IO Events
```typescript
// Client to Server
- authenticate: Socket authentication
- join_admin_chat: Join admin chat room
- send_message: Send chat message
- mark_messages_read: Mark messages as read
- typing_start/stop: Typing indicators

// Server to Client
- authenticated: Authentication success
- message_received: New message
- user_typing: Typing status
- admin_online: Admin status
- chat_connected: Connection status
```

### MongoDB Change Streams
```typescript
// Real-time report updates with MongoDB Change Streams
const changeStream = db.collection('reports').watch();
changeStream.on('change', (change) => {
  if (change.operationType === 'insert' || change.operationType === 'update') {
    io.emit('report_updated', change.fullDocument);
  }
});
```

## 📱 PWA Features

### Service Worker
- **Caching Strategy**: Network-first for API, Cache-first for assets
- **Offline Support**: Fallback pages and cached resources
- **Update Management**: Graceful app updates with user prompts
- **Background Sync**: Offline action queuing

### Manifest Configuration
```json
{
  "name": "Cars-G",
  "short_name": "Cars-G",
  "description": "Community safety platform",
  "theme_color": "#800000",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## 🧪 Testing & Quality

### Testing Strategy
```bash
# Unit tests with Jest
npm test
npm run test:watch
npm run test:coverage

# E2E tests with Cypress
npm run cypress:open
npm run cypress:run

# Deployment testing
npm run test:deployment
npm run test:health
```

### Code Quality
- **ESLint**: TypeScript and React rules
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Commitlint**: Conventional commits

## 🔐 Security Implementation

### Authentication Flow
1. **JWT Authentication** with bcrypt password hashing
2. **OAuth integration** (Google, Facebook) with Passport.js
3. **Role-based access control** via MongoDB user documents
4. **MongoDB security** with proper indexing and validation
5. **JWT token management** with refresh tokens and secure storage

### Data Protection
- **MongoDB Security**: Proper indexing, validation, and access control
- **Input Validation**: Joi or Zod schemas for all inputs
- **File Upload Security**: Multer with file type validation and Cloudinary
- **Rate Limiting**: Express rate limiting middleware
- **CORS Configuration**: Proper origin handling with helmet.js
- **Password Security**: bcrypt hashing with salt rounds

## 📊 Analytics & Monitoring

### Admin Dashboard Features
- **Advanced Filters**: Multi-dimensional filtering
- **Comparative Trends**: Period-over-period analysis
- **SLA Performance**: Service level agreement monitoring
- **User Engagement**: Activity and retention metrics
- **Anomaly Detection**: Unusual pattern identification
- **Export Capabilities**: CSV and PDF reports

### Real-Time Monitoring
- **Live Map**: OpenStreetMap with real-time markers
- **Case Statistics**: Live updates on case counts
- **User Activity**: Real-time user engagement
- **System Health**: API and database monitoring

## 🎯 Key Implementation Requirements

1. **Create a complete React + TypeScript frontend** with Vite build system
2. **Implement role-based authentication** with JWT and MongoDB
3. **Build real-time chat system** with Socket.IO
4. **Create comprehensive reporting system** with ticketing workflow
5. **Implement PWA features** with offline support
6. **Set up gamification system** with points and achievements
7. **Build admin dashboard** with analytics and user management
8. **Implement patrol dashboard** with case management
9. **Create responsive design** optimized for mobile
10. **Set up deployment pipeline** for Vercel/Netlify and Railway/Render

## 🚀 Getting Started

1. **Initialize project** with Vite + React + TypeScript
2. **Set up MongoDB** database with Mongoose ODM
3. **Configure authentication** with JWT and OAuth providers
4. **Implement core features** (reports, chat, admin)
5. **Add PWA capabilities** with service worker
6. **Deploy to production** with proper environment variables
7. **Set up monitoring** and analytics
8. **Test thoroughly** with automated and manual testing

## 📦 MERN Stack Dependencies

### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.3",
    "axios": "^1.6.0",
    "zustand": "^4.5.2",
    "socket.io-client": "^4.8.1",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "chart.js": "^4.5.0",
    "react-chartjs-2": "^5.3.0",
    "framer-motion": "^11.0.8",
    "lucide-react": "^0.358.0",
    "tailwindcss": "^3.4.1",
    "firebase": "^12.2.1"
  }
}
```

### Backend Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "socket.io": "^4.8.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "passport-facebook": "^3.0.0",
    "multer": "^1.4.5",
    "nodemailer": "^6.9.0",
    "joi": "^17.11.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.0",
    "dotenv": "^16.3.0"
  }
}
```

This system should be a comprehensive, production-ready community safety platform with all the features and capabilities described above.
