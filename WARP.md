# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Cars-G is a comprehensive community safety platform built with React + TypeScript (frontend) and Node.js + Express (backend). The application enables residents to report safety issues, patrol officers to manage cases, and administrators to oversee operations through real-time dashboards and communication systems.

**Key Technologies:**
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Zustand (state management)
- Backend: Node.js, Express, Socket.IO (real-time chat)
- Database: Supabase (PostgreSQL with RLS)
- Maps: OpenStreetMap + Leaflet, Google Maps API
- Storage: Cloudinary for images
- Auth: Supabase Auth with OAuth (Google, Facebook)
- Deployment: Vercel (frontend), Render (backend)

## Development Commands

### Frontend Development
```bash
# Start development server (port 5173)
npm run dev

# Build for production with PWA assets
npm run build

# Preview production build
npm run preview

# Generate PWA assets and icons
npm run generate-pwa-assets
npm run generate-icons
```

### Backend Development
```bash
# Install and start chat server
npm run chat:setup
npm run chat:start

# Or manually
cd server && npm install
cd server && npm run dev
```

### Testing & Quality
```bash
# Unit tests with Jest
npm test
npm run test:watch
npm run test:coverage

# E2E tests with Cypress
npm run cypress:open
npm run cypress:run

# Linting and formatting
npm run lint
npm run format

# Deployment testing
npm run test:deployment
npm run test:deployment:frontend
npm run test:deployment:backend
```

### Deployment & Scripts
```bash
# PowerShell deployment scripts (Windows)
npm run deploy:check
npm run deploy:build
npm run deploy:full

# Health checks
npm run test:health
```

## Architecture Overview

### Frontend Structure
```
src/
├── components/          # Reusable UI components
│   ├── AdminMapDashboard.tsx    # Real-time admin map with markers
│   ├── ChatMessage.tsx          # Real-time chat components
│   ├── Navigation.tsx           # Role-based navigation
│   └── PatrolRoute.tsx          # Route protection for patrol users
├── pages/              # Route-specific page components
│   ├── AdminDashboard.tsx       # Admin analytics and management
│   ├── PatrolDashboard.tsx      # Patrol ticketing system
│   ├── Reports.tsx              # User report management
│   └── Chat.tsx                 # WebSocket chat interface
├── hooks/              # Custom React hooks
│   ├── useAuth.ts               # Authentication state
│   ├── useChatSocket.ts         # Socket.IO connection
│   └── useRealTimeReports.ts    # Live report updates
├── lib/                # Core utilities and configurations
│   ├── supabase.ts              # Database client with RLS
│   ├── firebase.ts              # Push notifications
│   ├── achievements.ts          # Gamification system
│   └── geolocation.ts           # Location services
├── store/              # Zustand state management
│   └── authStore.ts             # Global auth state
└── routes/             # React Router configuration
    └── routes.tsx               # Role-based route definitions
```

### Backend Structure
```
server/
├── server.js           # Express + Socket.IO server
├── package.json        # Backend dependencies
└── node_modules/       # Server dependencies
```

### Role-Based Architecture
The application implements three distinct user roles with different access patterns:

1. **Users (Residents):** Report issues, chat with patrol, view leaderboards
2. **Patrol Officers:** Manage cases with ticketing system, real-time communication
3. **Administrators:** Full system access, analytics dashboard, user management

### Key Architectural Patterns

#### Authentication Flow
- Supabase Auth with JWT tokens
- OAuth integration (Google, Facebook)
- Role-based access control via database profiles
- Row Level Security (RLS) policies for data protection

#### Real-Time Communication
- Socket.IO server for chat functionality
- WebSocket connections managed through custom hooks
- Real-time report updates via Supabase subscriptions
- Push notifications through Firebase

#### State Management
- Zustand for global state (auth, user data)
- React Query for server state management
- Local state for component-specific data
- Persistent storage for user preferences

#### Data Flow
1. **Reports:** User creates → Database via RLS → Real-time updates → Admin/Patrol dashboards
2. **Chat:** Socket.IO → Database persistence → Real-time delivery
3. **Authentication:** Supabase Auth → Profile creation → Role-based routing

## Development Guidelines

### Working with Reports System
- Reports use a ticketing system with 6-digit case numbers (#010001)
- Priority levels 1-5 with visual indicators
- Status flow: Pending → In Progress → Resolved/Rejected
- Real-time updates through Supabase subscriptions

### Chat Implementation
- WebSocket connections auto-reconnect on network issues
- Messages persist in database for history
- Typing indicators and online status
- File/image sharing through Cloudinary

### Map Integration
- Admin dashboard uses OpenStreetMap with Leaflet
- Real-time marker updates for new reports
- Color-coded markers based on status/priority
- Performance optimized with marker clustering

### Database Schema
- Supabase PostgreSQL with RLS policies
- Key tables: profiles, reports, chat_messages, achievements
- Foreign key relationships maintained through migrations
- Automatic user stats initialization on signup

### PWA Features
- Service worker for offline functionality
- Installable app with manifest.json
- Push notifications when authenticated
- Background sync for offline actions

## Environment Setup

### Required Environment Variables
```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-maps-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name

# Backend (server/.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIREBASE_SERVER_KEY=your-firebase-key (for push notifications)
```

### Database Migrations
SQL files in root directory handle schema updates:
- Run migration files in sequence
- Verify RLS policies after updates
- Check foreign key constraints

### OAuth Configuration
- Google OAuth: Configure in Google Cloud Console
- Facebook OAuth: Set up in Meta for Developers
- Callback URL: `https://your-domain.com/auth/callback`

## Testing Strategy

### Unit Tests
- Jest with React Testing Library
- Component testing for critical UI elements
- Utility function testing
- Mock Supabase client for database operations

### E2E Tests
- Cypress for full user workflows
- Deployment verification tests
- Cross-browser compatibility testing
- Mobile-specific test scenarios

### Performance Testing
- Bundle analysis with `npm run analyze`
- Lighthouse audits for PWA compliance
- Database query optimization
- Real-time connection stress testing

## Common Development Patterns

### Adding New Features
1. Create database schema changes (SQL files)
2. Update TypeScript types in `src/types/`
3. Implement data layer functions in `src/lib/`
4. Create components with proper error boundaries
5. Add routing if needed in `src/routes/routes.tsx`
6. Update RLS policies for security

### Working with Real-Time Data
- Use custom hooks for WebSocket connections
- Implement proper cleanup in useEffect
- Handle connection drops gracefully
- Optimize re-renders with proper dependencies

### Role-Based Features
- Check user role in components: `user?.role === 'admin'`
- Use ProtectedRoute wrapper for route protection
- Implement conditional rendering based on permissions
- Separate admin/patrol/user specific logic

## Performance Considerations

### Frontend Optimization
- Lazy loading with React.lazy() for route components
- Image optimization through Cloudinary
- PWA caching strategies via Workbox
- Bundle splitting for code optimization

### Backend Performance
- Rate limiting on API endpoints
- Connection pooling for database
- Socket.IO room-based messaging
- Compression middleware for responses

### Database Optimization
- Proper indexing on frequently queried columns
- RLS policies optimized for performance
- Connection pooling through Supabase
- Query optimization for large datasets

## Troubleshooting Common Issues

### Authentication Problems
- Check Supabase URL/keys configuration
- Verify OAuth redirect URLs
- Clear localStorage/sessionStorage for token issues
- Check RLS policies for data access

### Real-Time Connection Issues
- Verify Socket.IO server is running
- Check CORS configuration
- Monitor network connectivity
- Validate environment variables

### Database Access Errors
- Confirm RLS policies are correctly set
- Check foreign key constraints
- Verify user profile creation
- Review error logs in Supabase dashboard

### PWA Installation Issues
- Ensure HTTPS in production
- Verify manifest.json configuration
- Check service worker registration
- Validate PWA icons and screenshots

## Deployment Notes

### Frontend (Vercel)
- Automatic deployment from main branch
- Environment variables configured in dashboard
- Preview deployments for pull requests
- Analytics and performance monitoring enabled

### Backend (Render)
- Manual deployment or GitHub integration
- Health check endpoint: `/health`
- Auto-scaling based on traffic
- Log monitoring for debugging

### Database (Supabase)
- Automatic backups enabled
- Row Level Security enforced
- Real-time subscriptions configured
- API rate limiting in place
