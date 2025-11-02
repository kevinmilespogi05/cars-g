# Cars-G Product Specification Document

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Target Audience](#target-audience)
4. [Core Features](#core-features)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Technical Architecture](#technical-architecture)
7. [User Experience & Interface](#user-experience--interface)
8. [Feature Specifications](#feature-specifications)
9. [Integration & APIs](#integration--apis)
10. [Security & Compliance](#security--compliance)
11. [Performance Requirements](#performance-requirements)
12. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**Product Name:** Cars-G  
**Version:** 1.0.0  
**Type:** Progressive Web Application (PWA)  
**Primary Purpose:** Community-driven incident reporting and management system for traffic, infrastructure, and public safety issues

Cars-G is a comprehensive civic engagement platform that empowers citizens to report, track, and resolve community issues. The system facilitates real-time communication between residents, patrol officers, and administrators to improve response times and community safety.

---

## Product Overview

### Vision
To create a transparent, efficient, and accessible platform that bridges the gap between community members and local authorities, enabling faster response times and better resource allocation for public safety and infrastructure issues.

### Mission
Provide a user-friendly, real-time reporting system that:
- Empowers citizens to report incidents instantly
- Enables efficient case management for authorities
- Promotes accountability through transparent tracking
- Builds community engagement through gamification
- Ensures accessibility across all devices

### Value Proposition
- **For Citizens:** Easy reporting, real-time updates, anonymous options, achievement system
- **For Patrol Officers:** Efficient job assignment, navigation assistance, progress tracking, gamified experience system
- **For Administrators:** Comprehensive dashboard, analytics, user management, announcement system

---

## Target Audience

### Primary Users

#### 1. **Citizens/Reporters**
- Age: 18-65+
- Tech proficiency: Basic to Advanced
- Needs: Quick incident reporting, status tracking, community safety awareness
- Pain points: Lack of visibility on reported issues, slow response times

#### 2. **Patrol Officers**
- Age: 25-55
- Tech proficiency: Intermediate
- Needs: Real-time job assignments, route navigation, case documentation
- Pain points: Inefficient job allocation, poor communication tools

#### 3. **Administrators**
- Age: 30-60
- Tech proficiency: Advanced
- Needs: Oversight, analytics, user management, system configuration
- Pain points: Lack of comprehensive data, manual verification processes

### Secondary Users
- Municipal officials
- Community leaders
- Emergency responders

---

## Core Features

### 1. **Incident Reporting System**
- Multi-step report creation with location mapping
- Image upload (up to 5 images per report)
- AI-powered image analysis for automatic categorization
- Anonymous reporting option
- Offline capability with automatic sync

### 2. **Real-Time Dashboard**
- Interactive map with live incident markers
- Status-based filtering and clustering
- Real-time updates via WebSocket
- Mobile-optimized interface

### 3. **Case Management**
- Ticketing system with unique case numbers
- Priority-based assignment (1-5 scale)
- Group-based task allocation
- Status workflow: Verifying → Pending → In Progress → Resolved/Declined
- Comment threads with nested replies

### 4. **User Authentication & Profiles**
- Email/username-based registration
- Google OAuth integration
- ID verification system (admin-reviewed)
- Customizable avatars
- Profile statistics and achievements

### 5. **Gamification System**
- Points-based rewards
- Achievement badges
- Leaderboard (all-time, monthly, weekly, daily)
- Experience levels for patrol officers
- Reporting streaks

### 6. **Admin Portal**
- Comprehensive statistics dashboard
- User management with role assignment
- Verification queue for ID submissions
- Announcement management system
- Real-time map dashboard
- Historical data export (CSV, PDF)

### 7. **Communication System**
- One-on-one chat with administrators
- Real-time messaging via Socket.IO
- Typing indicators and read receipts
- Notification system (push, email)

### 8. **Navigation & Routing**
- Turn-by-turn navigation for patrol officers
- OpenStreetMap integration
- Waypoint routing
- Current location tracking

### 9. **PWA Capabilities**
- Installable on mobile and desktop
- Offline functionality
- Push notifications
- Background sync
- Service worker caching

---

## User Roles & Permissions

### Role: **User** (Default)
**Permissions:**
- Create, view, and manage own reports
- View all public reports
- Like and comment on reports
- Chat with administrators
- View leaderboard
- Earn achievements and points
- Update own profile
- Cancel own pending reports

**Restrictions:**
- Cannot view other users' private information
- Cannot modify report status
- Cannot access admin features
- Cannot assign patrol officers

### Role: **Patrol**
**All User permissions, plus:**
- Accept assigned jobs
- View assigned reports on map
- Mark reports as resolved with proof
- Update report priority levels
- Assign reports to groups
- Navigate to incident locations
- Earn experience points
- View patrol-specific statistics
- Access patrol dashboard

**Restrictions:**
- Cannot access admin-only features
- Cannot manage users
- Cannot approve verifications
- Cannot create announcements

### Role: **Admin**
**All Patrol and User permissions, plus:**
- Full CRUD operations on all reports
- User management (ban, role assignment)
- ID verification approval/denial
- Announcement creation and management
- Access to admin statistics dashboard
- View comprehensive analytics
- Export system data
- Manage duty schedules
- Configure system settings
- View all user chat conversations
- Assign patrol officers to reports

**Special Abilities:**
- Override report status
- Delete any report or comment
- Access admin map with full controls
- View sensitive user information
- Manage verification requests

---

## Technical Architecture

### Frontend Stack
- **Framework:** React 18.3 with TypeScript
- **Build Tool:** Vite 7.1
- **Routing:** React Router DOM v6
- **State Management:** Zustand
- **UI Components:** 
  - Tailwind CSS 3.4
  - Framer Motion (animations)
  - Lucide React (icons)
  - Material-UI components
- **Maps:** Leaflet with React-Leaflet
- **Charts:** Chart.js with React-Chart.js-2
- **Forms:** React Hook Form (implicit)
- **Date Handling:** date-fns

### Backend Stack
- **Runtime:** Node.js with Express 5.1
- **Database:** PostgreSQL (via Supabase)
- **Real-time:** Socket.IO 4.8
- **Authentication:** JWT + Supabase Auth
- **File Storage:** Cloudinary
- **Email Service:** Brevo (formerly Sendinblue)

### Infrastructure
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render.com
- **Database:** Supabase
- **CDN:** Cloudinary
- **Push Notifications:** Firebase Cloud Messaging

### APIs & Services
- **Google Vision AI:** Image analysis and content moderation
- **Google Maps API:** Geocoding and mapping
- **OpenStreetMap:** Map tiles and routing
- **Nominatim:** Reverse geocoding

---

## User Experience & Interface

### Design Principles
1. **Mobile-First:** Optimized for touch interfaces
2. **Accessibility:** WCAG 2.1 AA compliance target
3. **Performance:** < 3s load time on 3G
4. **Simplicity:** Maximum 3 clicks to any feature
5. **Consistency:** Unified design language

### Navigation Structure

#### Public Routes
- `/` - Landing page with features showcase
- `/login` - User authentication
- `/register` - New user registration
- `/verify-email` - Email verification

#### Protected Routes (User)
- `/reports` - Browse all reports with filters
- `/reports/:id` - Individual report details
- `/create-report` - Multi-step report creation
- `/profile/:username` - User profile and statistics
- `/leaderboard` - Global leaderboard
- `/emergency-contacts` - Emergency contact list
- `/announcements` - System announcements

#### Patrol Routes
- `/patrol` - Patrol dashboard with job management
- `/patrol/map` - Interactive map with assignments

#### Admin Routes
- `/admin` - Admin dashboard hub
- `/admin/reports` - Report management interface
- `/admin/map` - Real-time map with controls
- `/admin/users` - User management panel
- `/admin/verification` - ID verification queue
- `/admin/statistics` - Analytics dashboard
- `/admin/announcements` - Announcement management
- `/admin/settings` - System configuration
- `/admin/chat` - Admin chat interface
- `/admin/history` - Historical report data

### UI Components

#### Core Components
1. **SidebarNavigation** - Persistent navigation with role-based menu items
2. **ReportsList** - Filterable, paginated report grid/list
3. **MapDashboard** - Interactive Leaflet map with clustering
4. **ProfileTabContent** - Multi-tab profile interface
5. **AdminStatistics** - Comprehensive analytics dashboard
6. **ChatWindow** - Real-time messaging interface
7. **AchievementsPanel** - Gamification display
8. **MotivationalQuote** - Rotating motivational content

#### Reusable Elements
- **Card** - Content container with glass-morphism effect
- **Button** - Multiple variants (primary, secondary, danger, outline)
- **Badge** - Status indicators with color coding
- **Modal** - Accessible dialog system
- **Skeleton Loaders** - Loading state placeholders
- **Toast Notifications** - Success/error feedback

---

## Feature Specifications

### 1. Report Creation Flow

#### Step 1: Report Details
**Fields:**
- Title (required, 3-100 characters)
- Description (required, 10-1000 characters)
- Category (required, dropdown):
  - Traffic Incident
  - Road Damage
  - Street Light
  - Waste Management
  - Public Safety
  - Infrastructure
  - Noise Complaint
  - Other

**Validation:**
- Real-time character count
- Error messages for invalid inputs
- Auto-save draft (local storage)

#### Step 2: Location Selection
**Methods:**
1. Current Location (GPS)
2. Map Pin Drop
3. Address Search

**Features:**
- High-accuracy location (15m threshold)
- Reverse geocoding for address
- Visual confirmation on map
- Location caching (10-minute validity)

**Technical:**
```typescript
interface Location {
  lat: number;
  lng: number;
  address: string;
  accuracy?: number;
  method: 'gps' | 'manual' | 'ip';
}
```

#### Step 3: Image Upload
**Specifications:**
- Max files: 5 per report
- Supported formats: JPG, PNG, WebP
- Max size: 10MB per image
- Auto-compression: 1920px max dimension
- AI analysis for content validation

**AI Analysis Features:**
- Danger level detection (low/medium/high)
- Object detection
- Auto-description generation
- Content moderation (NSFW filter)

#### Step 4: Review & Submit
**Display:**
- Summary of all entered data
- Image thumbnails
- Location preview map
- Edit buttons for each section

**Submission:**
- Optimistic UI update
- Offline queue support
- Idempotency key (prevent duplicates)
- Success/error feedback
- Auto-redirect to report detail

---

### 2. Map Dashboard System

#### Map Features
**Layers:**
- OpenStreetMap base tiles
- Report markers (color-coded by status)
- Cluster groups for dense areas
- User location indicator
- Route visualization

**Marker Colors:**
```typescript
Status Colors:
- Verifying: 🟡 Yellow
- Pending: 🔵 Blue
- In Progress: 🟠 Orange
- Resolved: 🟢 Green
- Declined: 🔴 Red
- Cancelled: ⚫ Gray

Priority Indicators:
- High: 🔴 Red border + pulse animation
- Medium: 🟠 Orange border
- Low: 🟢 Green border
```

**Interactions:**
- Click marker → Show popup with report details
- Cluster click → Zoom to reports
- Right-click → Context menu (admin only)
- Drag → Pan map
- Scroll → Zoom

**Real-Time Updates:**
- WebSocket subscription for report changes
- Animated marker addition
- Status-based marker color updates
- Auto-refresh every 30 seconds (fallback)

#### Admin Map Controls
**Custom Controls:**
1. **Legend** - Status/priority reference (draggable)
2. **Reset View** - Return to default zoom/center
3. **Refresh** - Manual data reload
4. **Filter Panel** - Multi-criteria filtering
5. **Search** - Find reports by ID/title

**Admin Actions:**
- Change report status (inline)
- Assign to patrol officer
- Set priority level
- View full report details
- Delete report

---

### 3. Gamification System

#### Points System

**Earning Points:**
```typescript
POINTS_CONFIG = {
  REPORT_CREATED: 10,
  REPORT_VERIFIED: 25,
  REPORT_RESOLVED: 50,
  COMMENT_ADDED: 2,
  REPORT_LIKED: 1,
  DAILY_LOGIN: 5,
  STREAK_BONUS: 10, // per consecutive day
  PATROL_JOB_COMPLETED: 100,
  PATROL_JOB_VERIFIED: 150
}
```

**Points Display:**
- User profile header
- Leaderboard rankings
- Achievement progress
- Point history log

#### Achievements

**Categories:**
1. **Reporting Achievements**
   - First Report (🎉 10 pts)
   - 5 Reports (📊 25 pts)
   - 10 Reports (🌟 50 pts)
   - 25 Reports (💫 100 pts)
   - 50 Reports (🏆 200 pts)
   - 100 Reports (👑 500 pts)

2. **Engagement Achievements**
   - Active for 7 Days (📅 50 pts)
   - Active for 30 Days (🗓️ 150 pts)
   - 3-Day Streak (🔥 30 pts)
   - 7-Day Streak (🔥🔥 75 pts)

3. **Community Achievements**
   - 50 Comments (💬 40 pts)
   - 100 Likes Given (❤️ 30 pts)
   - Helped 10 Reports (🤝 80 pts)

4. **Patrol Achievements**
   - 10 Jobs Completed (🚓 150 pts)
   - 50 Jobs Completed (🚔 500 pts)
   - Fast Responder (⚡ 100 pts)

**Achievement Notifications:**
- Toast notification on unlock
- Animated badge reveal
- Sound effect (optional)
- Share to social media option

#### Leaderboard

**Views:**
- All Time
- This Month
- This Week
- Today

**Display:**
```typescript
interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  avatar_url: string;
  reports_submitted: number;
  reports_verified: number;
  reports_resolved: number;
  trend: 'up' | 'down' | 'same'; // vs previous period
}
```

**Features:**
- Top 3 highlighted (🥇🥈🥉)
- Current user always visible
- Infinite scroll pagination
- Sort by different metrics
- Filter by role (optional)

---

### 4. Verification & ID System

#### ID Verification Process

**User Submission:**
1. User uploads ID front and back during registration
2. Images stored in Cloudinary (secure folder)
3. Status set to "pending"
4. User account created but unverified

**Admin Review:**
1. Admin accesses verification queue
2. Views ID images side-by-side
3. Validates information matches profile:
   - Name
   - Photo
   - Document authenticity
4. Approves or declines with notes

**Post-Verification:**
- Approved: User gains full access
- Declined: User notified, can re-submit
- Badge displayed on verified profiles

**Security Measures:**
- Images encrypted at rest
- Admin-only access
- Audit log of verifications
- GDPR compliance for data deletion

#### AI-Assisted Verification (Optional Future)
- OCR for automatic data extraction
- Face matching
- Document validity check
- Duplicate detection

---

### 5. Communication System

#### User-Admin Chat

**Features:**
- One-on-one messaging
- Real-time delivery (Socket.IO)
- Message history persistence
- Typing indicators
- Read receipts
- Online status indicators

**Message Types:**
```typescript
type MessageType = 'text' | 'image' | 'file';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: MessageType;
  is_read: boolean;
  seen_at?: string;
  created_at: string;
}
```

**UI Components:**
1. **Chat Button** - Floating action button (FAB)
2. **Chat Window** - Expandable dialog
3. **Message List** - Scrollable conversation
4. **Input Area** - Text input + emoji picker

**Admin Chat Interface:**
- List of all user conversations
- Unread message counter
- Quick reply templates
- User profile preview
- Search conversations

**Notifications:**
- Browser push (when online)
- Email notification (when offline > 5 min)
- Badge count on chat icon

---

### 6. Announcement System

#### Announcement Types

**Priority Levels:**
- 🔴 **Urgent** - Critical system alerts
- 🟠 **High** - Important updates
- 🟡 **Normal** - General announcements
- 🔵 **Low** - Informational

**Target Audiences:**
- All Users
- Users Only (exclude patrol/admin)
- Patrol Officers Only
- Admins Only

#### Display Methods

**1. Banner** (Top of page)
- Auto-rotating carousel
- Dismissible
- Swipe gestures on mobile
- Priority-based display order

**2. Modal** (On login)
- First-time display
- Critical announcements only
- "Don't show again" option

**3. Announcements Page**
- Full list with filtering
- Search functionality
- Expired announcements (archived)

#### Admin Management

**Create/Edit:**
```typescript
interface Announcement {
  title: string; // max 100 chars
  content: string; // rich text, max 5000 chars
  image_url?: string; // optional banner image
  priority: 'urgent' | 'high' | 'normal' | 'low';
  target_audience: 'all' | 'users' | 'patrols' | 'admins';
  is_active: boolean;
  expires_at?: Date; // optional expiration
}
```

**Features:**
- Rich text editor
- Image upload (optional)
- Preview before publish
- Schedule for future
- Edit/delete existing
- View analytics (views, engagement)

---

### 7. Admin Statistics Dashboard

#### Key Metrics

**Report Statistics:**
- Total Reports (all time)
- Pending Reports (count + %)
- In Progress Reports (count + %)
- Resolved Reports (count + %)
- Declined Reports (count + %)
- Cancelled Reports (count + %)
- Verifying Reports (count + %)
- Average Resolution Time

**User Statistics:**
- Total Users (all roles)
- Active Users (last 30 days)
- New Users (this month)
- Banned Users
- Verification Pending

**Performance Metrics:**
- Reports by Category (pie chart)
- Reports by Location (bar chart)
- Reports by Time of Day (line chart)
- Reports by Day of Week (bar chart)
- Monthly Trend (line chart)
- SLA Compliance Rate

#### Visualization Types

**Charts:**
1. **Line Charts** - Trends over time
2. **Bar Charts** - Category comparisons
3. **Pie Charts** - Distribution percentages
4. **Heatmaps** - Activity patterns
5. **Tables** - Detailed data

**Filters:**
- Date range selector
- Category filter
- Status filter
- Location filter
- User group filter

#### Export Options
- **CSV** - Raw data for Excel
- **PDF** - Formatted report with charts
- **PNG** - Individual chart images
- **JSON** - API data dump

---

### 8. Ticketing & Case Management

#### Case Number Generation
**Format:** `YYYY-MM-XXXXX`
- YYYY: Year
- MM: Month
- XXXXX: Sequential number

**Example:** `2025-01-00123`

#### Priority System

**Levels (1-5):**
```typescript
Priority Mapping:
1 = Low (reported as 'low')
2-3 = Medium (reported as 'medium')
4-5 = High (reported as 'high')

Manual Override:
Admin/Patrol can set 1-5 directly
```

**Visual Indicators:**
- Color coding (red/orange/green)
- Badge display
- Sort priority in lists
- Filter by priority

#### Group Assignment

**Groups:**
- Engineering Group
- Field Group
- Maintenance Group
- Waste Management
- Barangay Police
- Other

**Assignment Flow:**
1. Report created → Auto-assigned to appropriate group (based on category)
2. Admin/Patrol can reassign
3. Patrol officers in group see in dashboard
4. Accept job → Status changes to "In Progress"
5. Complete with proof → Status changes to "Awaiting Verification"
6. Admin verifies → Status changes to "Resolved"

#### Cancellation System

**Rules:**
- Only reporter can cancel
- Only while status is "Pending" or "Verifying"
- Requires confirmation dialog
- Optional reason field
- Irreversible action
- Points not awarded for cancelled reports

---

## Integration & APIs

### External Services

#### 1. Supabase
**Purpose:** Database, Authentication, Storage

**Tables:**
- profiles (user data)
- reports (incident reports)
- report_comments (comment system)
- comment_replies (nested replies)
- likes (report likes)
- comment_likes (comment likes)
- reply_likes (reply likes)
- user_stats (gamification data)
- achievements (achievement definitions)
- user_achievements (earned achievements)
- notifications (user notifications)
- announcements (system announcements)
- duty_schedules (patrol scheduling)
- report_ratings (feedback system)
- chat_messages (messaging system)
- chat_rooms (chat sessions)
- id_verification_requests (ID verification queue)

**Real-time Subscriptions:**
- Reports changes
- Comments/replies changes
- Likes changes
- Chat messages
- Notification updates

**Storage Buckets:**
- avatars (public)
- reports (public)
- id-verifications (private)
- announcements (public)

#### 2. Cloudinary
**Purpose:** Media storage and optimization

**Folders:**
- cars-g/avatars
- cars-g/reports
- cars-g/announcements
- cars-g/id-verifications

**Transformations:**
- Auto-format (WebP)
- Quality optimization
- Responsive sizing
- Lazy loading URLs

#### 3. Google Vision AI
**Purpose:** Image analysis

**Features:**
- Object detection
- Label detection
- Safe search (NSFW)
- Text detection (OCR)
- Landmark recognition

**Usage:**
- Analyze uploaded report images
- Generate auto-descriptions
- Content moderation
- Priority suggestion

#### 4. Firebase Cloud Messaging
**Purpose:** Push notifications

**Notification Types:**
- Report status changed
- New comment on your report
- New like on your report
- Achievement unlocked
- Chat message received
- Admin announcement

#### 5. Brevo (Email)
**Purpose:** Transactional emails

**Templates:**
- Welcome email
- Email verification
- Password reset
- Report status update
- Weekly digest
- Admin notifications

#### 6. Google Maps / OpenStreetMap
**Purpose:** Mapping and geocoding

**APIs Used:**
- Geocoding API (address → coordinates)
- Reverse Geocoding (coordinates → address)
- Places API (location search)
- Directions API (routing)
- Map tiles (OpenStreetMap)

---

## Security & Compliance

### Authentication & Authorization

#### JWT Implementation
```typescript
Access Token:
- Expiry: 15 minutes
- Contains: user_id, email, role
- Storage: Memory (state)

Refresh Token:
- Expiry: 7 days
- Contains: user_id
- Storage: HttpOnly cookie
- Rotation: On each refresh

Security Headers:
- X-CSRF-Token
- X-Request-ID
- Authorization: Bearer <token>
```

#### Role-Based Access Control (RBAC)
```typescript
Permissions Matrix:
                    | User | Patrol | Admin
--------------------|------|--------|-------
Create Report       |  ✓   |   ✓    |   ✓
View Own Reports    |  ✓   |   ✓    |   ✓
View All Reports    |  ✓   |   ✓    |   ✓
Edit Own Report     |  ✓   |   ✓    |   ✓
Delete Own Report   |  ✓   |   ✓    |   ✓
Change Status       |  ✗   |   ✓    |   ✓
Assign Patrol       |  ✗   |   ✗    |   ✓
Ban User            |  ✗   |   ✗    |   ✓
View Analytics      |  ✗   |   ✗    |   ✓
Manage Announce     |  ✗   |   ✗    |   ✓
```

### Data Protection

#### Encryption
- **In Transit:** TLS 1.3
- **At Rest:** AES-256 (database)
- **Passwords:** bcrypt (12 rounds)
- **Tokens:** HMAC-SHA256

#### Privacy Features
- Anonymous reporting option
- Data export (GDPR)
- Account deletion (right to be forgotten)
- ID image auto-deletion after verification
- IP address anonymization in logs

#### Input Validation
- XSS prevention (sanitization)
- SQL injection prevention (parameterized queries)
- CSRF tokens
- Rate limiting
- File upload validation

### Compliance

#### GDPR Compliance
- Consent management
- Data portability
- Right to erasure
- Privacy policy
- Terms of service
- Cookie consent

#### Content Moderation
- AI-powered NSFW detection
- Admin review queue
- Report flagging system
- Automated suspension for violations

---

## Performance Requirements

### Loading Performance
**Targets:**
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

**Optimization Strategies:**
- Code splitting (by route and component)
- Lazy loading (images, components)
- Service worker caching
- CDN for static assets
- Image optimization (WebP, lazy load)
- Bundle size < 500KB (main chunk)

### Runtime Performance
**Targets:**
- 60 FPS animations
- < 100ms interaction response
- < 3s API response time
- < 50ms state updates

**Monitoring:**
- Lighthouse CI
- Web Vitals tracking
- Error tracking (Sentry-ready)
- Performance budgets

### Scalability
**Capacity:**
- 10,000+ concurrent users
- 100,000+ reports
- 1,000+ reports/day
- 500 req/s API throughput

**Database:**
- Indexed queries
- Connection pooling
- Read replicas (future)
- Caching layer (Redis future)

---

## Future Roadmap

### Phase 2 (Q2 2025)
- [ ] Multi-language support (English, Filipino, Spanish)
- [ ] Voice reporting
- [ ] Video upload support
- [ ] Advanced analytics dashboard
- [ ] Mobile native apps (React Native)
- [ ] Integration with 911 systems

### Phase 3 (Q3 2025)
- [ ] Machine learning for priority prediction
- [ ] Automated report categorization
- [ ] Predictive maintenance alerts
- [ ] Community voting on priorities
- [ ] Crowdfunding for community projects

### Phase 4 (Q4 2025)
- [ ] API for third-party integrations
- [ ] Webhooks system
- [ ] White-label solution for other municipalities
- [ ] Advanced reporting builder
- [ ] Business intelligence dashboard

### Continuous Improvements
- Performance optimization
- Accessibility enhancements
- Security audits
- User experience refinements
- Mobile app optimization

---

## Appendix

### A. API Endpoints

#### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/verify-email
POST   /api/auth/resend-otp
```

#### Reports
```
GET    /api/reports
GET    /api/reports/:id
POST   /api/reports
PUT    /api/reports/:id
DELETE /api/reports/:id
POST   /api/reports/:id/like
POST   /api/reports/:id/comment
PUT    /api/reports/:id/status
```

#### Admin
```
GET    /api/admin/stats
GET    /api/admin/users
PUT    /api/admin/users/:id/role
PUT    /api/admin/users/:id/ban
GET    /api/admin/verification-queue
POST   /api/admin/verify-user
```

#### Chat
```
WebSocket /socket.io
Events:
  - join_admin_chat
  - send_message
  - mark_messages_read
  - typing_start
  - typing_stop
```

### B. Database Schema

**Key Tables:**
- profiles: User accounts and metadata
- reports: Core incident reporting data
- report_comments: Comment system
- likes: Like tracking for reports
- user_stats: Gamification tracking
- achievements: Achievement definitions
- notifications: User notification queue

### C. Environment Variables
```bash
# Frontend
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_API_URL=
VITE_SOCKET_URL=
VITE_FIREBASE_CONFIG=

# Backend
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_VISION_API_KEY=
BREVO_API_KEY=
```

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Status:** Active Development  
**Next Review:** January 2026

