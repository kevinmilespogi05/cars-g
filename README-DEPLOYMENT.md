# 🚀 Quick Deployment Guide

This is a quick reference for deploying Cars-G to production.

## Prerequisites

- GitHub repository with your code
- Accounts on: [Vercel](https://vercel.com), [Render](https://render.com), [Supabase](https://supabase.com)
- Optional: [Cloudinary](https://cloudinary.com) for file storage

## Quick Start

### 1. Pre-deployment Check
```bash
npm run deploy:full
```

### 2. Database Setup (Supabase)
1. Create project at [Supabase Dashboard](https://app.supabase.com)
2. Get project URL and anon key from Settings → API
3. Run migrations:
   ```bash
   supabase db push
   ```

### 3. Backend Deployment (Render)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create new Web Service
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
5. Set environment variables:
   ```
   NODE_ENV=production
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

### 4. Frontend Deployment (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repo
3. Configure as Vite project
4. Set environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_API_URL=https://your-render-api.onrender.com
   VITE_WS_URL=wss://your-render-api.onrender.com
   ```

### 5. Optional: Cloudinary Setup
1. Create account at [Cloudinary](https://cloudinary.com)
2. Get credentials from dashboard
3. Add to environment variables:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_API_KEY=your_api_key
   VITE_CLOUDINARY_API_SECRET=your_api_secret
   ```

## Useful Commands

```bash
# Check deployment readiness
npm run deploy:check

# Install all dependencies
npm run deploy:install

# Build for production
npm run deploy:build

# Show deployment checklist
npm run deploy:checklist

# Run full pre-deployment check
npm run deploy:full

# Server management
npm run server:install
npm run server:start
npm run server:dev
```

## Environment Variables

Copy `env.example` to `.env` and update with your values:

```bash
cp env.example .env
```

Required variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (after backend deployment)
- `VITE_WS_URL` (after backend deployment)

## Health Checks

- **Backend**: `https://your-api.onrender.com/health`
- **Frontend**: Vercel provides automatic monitoring

## Troubleshooting

### Common Issues

1. **Backend won't start**: Check environment variables in Render
2. **Frontend build fails**: Check environment variables in Vercel
3. **WebSocket issues**: Verify `VITE_WS_URL` is correct
4. **Database connection**: Ensure Supabase project is active

### Support

- [Full Deployment Guide](DEPLOYMENT.md)
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Supabase Docs](https://supabase.com/docs)

## Quick Deploy Checklist

- [ ] Supabase project created and migrations run
- [ ] Backend deployed to Render with env vars
- [ ] Frontend deployed to Vercel with env vars
- [ ] WebSocket connections tested
- [ ] File uploads tested (if using Cloudinary)
- [ ] All features working correctly

Your app should now be live! 🎉 