# Cars-G Deployment Guide

This guide explains how to deploy the Cars-G application to production.

## Architecture

- **Frontend**: Deployed on Vercel (https://cars-g.vercel.app)
- **Backend API**: Deployed on Render (https://cars-g-api.onrender.com)
- **Database**: Supabase (https://mffuqdwqjdxbwpbhuxby.supabase.co)
- **File Storage**: Supabase Storage + Cloudinary

## Environment Configuration

### Frontend (Vercel)
The frontend automatically uses the production API URL when deployed to Vercel.

### Backend (Render)
The backend is configured via `render.yaml` with the following environment variables:

- `SUPABASE_SERVICE_ROLE_KEY`: Required for admin operations
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `JWT_SECRET`: Secret key for JWT tokens
- `FCM_PROJECT_ID`: Firebase project ID for push notifications
- `VITE_CLOUDINARY_*`: Cloudinary configuration for file uploads

## Deployment Process

### Automatic Deployment (Recommended)

1. **Frontend**: Automatically deploys when you push to the main branch
2. **Backend**: Requires manual deployment through Render dashboard

### Manual Deployment

#### Option 1: Using Deployment Scripts

**Windows (PowerShell):**
```powershell
.\deploy.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option 2: Manual Steps

1. **Deploy Frontend:**
   ```bash
   npm run build
   npx vercel --prod
   ```

2. **Deploy Backend:**
   - Visit https://dashboard.render.com
   - Find the 'cars-g-api' service
   - Click 'Manual Deploy'
   - Wait for deployment to complete

## Avatar Upload Functionality

The avatar upload system has robust fallback mechanisms:

1. **Primary**: Backend API upload (`/api/upload/avatar`)
2. **Fallback 1**: Direct Supabase upload
3. **Fallback 2**: Profile update via `/api/auth/me`
4. **Fallback 3**: Profile update via `/api/auth/profile`
5. **Final Fallback**: Direct Supabase profile update

This ensures avatar uploads work even if the backend API is temporarily unavailable.

## Testing Deployment

After deployment, test the following:

1. **Health Check**: https://cars-g-api.onrender.com/health
2. **Frontend**: https://cars-g.vercel.app
3. **Avatar Upload**: Try uploading an avatar in the app
4. **Authentication**: Test login/logout functionality
5. **API Endpoints**: Test various API endpoints

## Troubleshooting

### Common Issues

1. **Backend API 404 Errors**: The backend needs to be redeployed with latest code
2. **Avatar Upload 500 Errors**: Check if `SUPABASE_SERVICE_ROLE_KEY` is set
3. **CORS Issues**: Verify frontend URL is in backend CORS configuration
4. **JWT Token Errors**: Ensure `JWT_SECRET` is consistent between environments

### Debugging

1. **Check Render Logs**: Visit Render dashboard → cars-g-api → Logs
2. **Check Vercel Logs**: Visit Vercel dashboard → Functions → Logs
3. **Test API Endpoints**: Use curl or Postman to test endpoints directly

## Environment Variables Reference

### Required for Backend (Render)
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `FCM_PROJECT_ID`

### Required for Frontend (Vercel)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FIREBASE_*` (for push notifications)
- `VITE_CLOUDINARY_*` (for file uploads)

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique JWT secrets in production
- Regularly rotate API keys and secrets
- Monitor API usage and implement rate limiting

## Support

If you encounter issues during deployment:

1. Check the logs in Render and Vercel dashboards
2. Verify all environment variables are set correctly
3. Test the API endpoints individually
4. Check the browser console for frontend errors
