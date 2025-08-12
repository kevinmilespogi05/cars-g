# Cars-G Deployment Guide

This guide will help you deploy your Cars-G application to the following platforms:
- **Frontend (React)**: Vercel
- **Backend (Node.js/Express API)**: Render
- **Database**: Supabase (PostgreSQL)
- **File Storage (Optional)**: Cloudinary

## Prerequisites

1. **GitHub Account**: Your code should be in a GitHub repository
2. **Vercel Account**: [Sign up here](https://vercel.com)
3. **Render Account**: [Sign up here](https://render.com)
4. **Supabase Account**: [Sign up here](https://supabase.com)
5. **Cloudinary Account (Optional)**: [Sign up here](https://cloudinary.com)

## 1. Database Setup (Supabase)

### Step 1: Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `cars-g-db`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

### Step 2: Get Project Credentials
1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon Public Key** (starts with `eyJ...`)

### Step 3: Run Database Migrations
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Run migrations:
   ```bash
   supabase db push
   ```

## 2. Backend Deployment (Render)

### Step 1: Prepare Backend
1. Ensure your backend code is in the `server/` directory
2. The `server/api.js` file should be the main entry point
3. The `server/package.json` should have the correct dependencies

### Step 2: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `cars-g-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Choose based on your needs (Starter is free)

### Step 3: Set Environment Variables
In Render dashboard, go to **Environment** tab and add:
```
NODE_ENV=production
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Copy the service URL (e.g., `https://cars-g-api.onrender.com`)

## 3. Frontend Deployment (Vercel)

### Step 1: Prepare Frontend
1. Ensure your React app is in the root directory
2. The `vercel.json` file should be configured correctly
3. Update environment variables for production

### Step 2: Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Set Environment Variables
In Vercel dashboard, go to **Settings** → **Environment Variables** and add:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://your-render-api-url.onrender.com
VITE_WS_URL=wss://your-render-api-url.onrender.com
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_API_KEY=your_cloudinary_api_key
VITE_CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Your app will be available at `https://your-project.vercel.app`

## 4. Optional: File Storage (Cloudinary)

### Step 1: Create Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com)
2. Sign up for a free account
3. Go to **Dashboard** to get your credentials

### Step 2: Get Cloudinary Credentials
From your Cloudinary dashboard, copy:
- **Cloud Name**
- **API Key**
- **API Secret**

### Step 3: Configure Upload Preset
1. Go to **Settings** → **Upload**
2. Scroll to **Upload presets**
3. Create a new preset:
   - **Name**: `cars-g-upload`
   - **Signing Mode**: `Unsigned`
   - **Folder**: `cars-g`

### Step 4: Add Environment Variables
Add these to both Vercel and Render:
```
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_API_KEY=your_cloudinary_api_key
VITE_CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## 5. Post-Deployment Configuration

### Step 1: Update CORS Settings
1. In your Render service, ensure the `FRONTEND_URL` environment variable is set to your Vercel domain
2. The backend will automatically allow CORS from this domain

### Step 2: Test WebSocket Connection
1. Open your deployed frontend
2. Check browser console for WebSocket connection status
3. Ensure real-time features are working

### Step 3: Test File Uploads
1. If using Cloudinary, test image/video uploads
2. Verify files are being stored correctly
3. Check that optimized URLs are working

## 6. Monitoring and Maintenance

### Health Checks
- **Backend**: `https://your-api.onrender.com/health`
- **Frontend**: Vercel provides automatic monitoring

### Logs
- **Render**: View logs in the Render dashboard
- **Vercel**: View logs in the Vercel dashboard
- **Supabase**: View logs in the Supabase dashboard

### Scaling
- **Render**: Upgrade plan for more resources
- **Vercel**: Automatic scaling based on traffic
- **Supabase**: Upgrade plan for more database resources

## 7. Troubleshooting

### Common Issues

#### Backend Not Starting
- Check environment variables in Render
- Verify `server/package.json` has correct dependencies
- Check logs in Render dashboard

#### Frontend Build Failing
- Check environment variables in Vercel
- Verify all dependencies are in `package.json`
- Check build logs in Vercel dashboard

#### WebSocket Connection Issues
- Ensure `VITE_WS_URL` is set correctly
- Check CORS settings in backend
- Verify WebSocket server is running

#### Database Connection Issues
- Verify Supabase credentials
- Check network connectivity
- Ensure database is not paused (free tier)

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

## 8. Security Considerations

### Environment Variables
- Never commit `.env` files to Git
- Use environment variables for all sensitive data
- Rotate API keys regularly

### CORS Configuration
- Only allow necessary origins
- Use HTTPS in production
- Validate all incoming requests

### Database Security
- Use Row Level Security (RLS) in Supabase
- Implement proper authentication
- Regular security audits

## 9. Performance Optimization

### Frontend
- Enable Vercel's edge caching
- Optimize images with Cloudinary
- Use lazy loading for components

### Backend
- Implement proper caching
- Use connection pooling
- Monitor response times

### Database
- Create proper indexes
- Optimize queries
- Use Supabase's built-in caching

---

## Quick Deploy Checklist

- [ ] Supabase project created and migrations run
- [ ] Backend deployed to Render with environment variables
- [ ] Frontend deployed to Vercel with environment variables
- [ ] WebSocket connections tested
- [ ] File uploads tested (if using Cloudinary)
- [ ] CORS configured correctly
- [ ] Health checks passing
- [ ] Monitoring set up
- [ ] Documentation updated

Your Cars-G application should now be fully deployed and accessible online! 🚀 