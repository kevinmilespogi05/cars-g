# 🔧 Chat System Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. Chat Server Won't Start

**Problem**: Server fails to start with environment variable errors

**Solution**:
```bash
# Create .env file in server directory
cd server
# Create .env file with:
VITE_SUPABASE_URL=https://mffuqdwqjdxbwpbhuxby.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Quick Fix**: Run the setup script
```bash
npm run chat:setup
```

### 2. "Chat service temporarily unavailable" Error

**Problem**: API endpoints return 503 errors

**Cause**: Missing `SUPABASE_SERVICE_ROLE_KEY` environment variable

**Solution**:
1. Go to Supabase Dashboard → Settings → API
2. Copy the `service_role` key (not the anon key)
3. Add to server/.env file:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. WebSocket Connection Fails

**Problem**: Chat shows "Disconnected" status

**Solutions**:
1. **Check server is running**:
   ```bash
   cd server && npm run dev
   ```

2. **Verify server URL in frontend**:
   - Check `src/lib/config.ts` for correct API URL
   - Ensure `VITE_CHAT_SERVER_URL` is set correctly

3. **Check CORS settings**:
   - Server allows: `http://localhost:5173`, `https://cars-g.vercel.app`
   - Add your domain if different

### 4. Database Connection Issues

**Problem**: "Failed to connect to Supabase" errors

**Solutions**:
1. **Verify Supabase URL and keys**:
   ```env
   VITE_SUPABASE_URL=https://mffuqdwqjdxbwpbhuxby.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. **Check database tables exist**:
   - Run migration: `supabase/migrations/20241201000000_create_chat_tables.sql`
   - Verify tables: `chat_conversations`, `chat_messages`, `chat_participants`

3. **Check RLS policies**:
   - Ensure RLS is enabled on chat tables
   - Verify policies allow authenticated users

### 5. Messages Not Sending

**Problem**: Messages appear to send but don't save

**Solutions**:
1. **Check WebSocket connection status**:
   - Look for green "Connected" indicator
   - Check browser console for connection errors

2. **Verify user authentication**:
   - User must be logged in
   - Check `useAuthStore` has valid user data

3. **Check database permissions**:
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
   - Verify RLS policies allow message insertion

### 6. Conversations Not Loading

**Problem**: Chat shows "No conversations" or loading errors

**Solutions**:
1. **Check API endpoints**:
   - Test: `GET /api/chat/conversations/:userId`
   - Verify server is running and accessible

2. **Check user ID**:
   - Ensure `user?.id` exists in auth store
   - Verify user is properly authenticated

3. **Check database data**:
   - Verify conversations exist in database
   - Check user is participant in conversations

## 🛠️ Debugging Steps

### 1. Check Server Logs
```bash
cd server && npm run dev
# Look for connection, authentication, and database errors
```

### 2. Check Browser Console
- Open DevTools → Console
- Look for WebSocket connection errors
- Check for API request failures

### 3. Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Test chat endpoints (replace USER_ID)
curl http://localhost:3001/api/chat/conversations/USER_ID
```

### 4. Verify Environment Variables
```bash
# Check if .env file exists
ls -la server/.env

# Verify variables are loaded
cd server && node -e "require('dotenv').config(); console.log(process.env.VITE_SUPABASE_URL)"
```

## 🔧 Quick Fixes

### Reset Chat System
```bash
# Stop server
Ctrl+C

# Clear node modules and reinstall
cd server
rm -rf node_modules package-lock.json
npm install

# Restart server
npm run dev
```

### Test Database Connection
```bash
# Test Supabase connection
cd server
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('profiles').select('count').limit(1).then(console.log).catch(console.error);
"
```

### Check WebSocket Status
```javascript
// In browser console
// Check if socket.io is loaded
console.log(window.io);

// Check connection status
// Look for green/red connection indicator in chat UI
```

## 📋 Environment Checklist

- [ ] `VITE_SUPABASE_URL` set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` set correctly  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set correctly
- [ ] Server running on correct port (3001)
- [ ] Database tables created
- [ ] RLS policies configured
- [ ] User authenticated in frontend
- [ ] CORS settings allow your domain

## 🆘 Still Having Issues?

1. **Check the logs**: Server and browser console
2. **Verify setup**: Run `npm run chat:setup`
3. **Test step by step**: Start with health check, then API, then WebSocket
4. **Check Supabase**: Verify project is active and accessible
5. **Review RLS policies**: Ensure chat tables have correct permissions

## 📞 Getting Help

- Check server logs for specific error messages
- Verify all environment variables are set
- Test database connection independently
- Ensure user authentication is working
- Check WebSocket connection status in UI
