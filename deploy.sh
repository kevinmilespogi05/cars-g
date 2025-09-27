#!/bin/bash
# Deployment script for Cars-G

echo "🚀 Deploying Cars-G to production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Build the frontend
echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend built successfully"

# Deploy to Vercel
echo "🌐 Deploying frontend to Vercel..."
npx vercel --prod

if [ $? -ne 0 ]; then
    echo "❌ Vercel deployment failed"
    exit 1
fi

echo "✅ Frontend deployed to Vercel"

# Deploy backend to Render
echo "🔧 Deploying backend to Render..."
echo "Note: Backend deployment to Render requires manual deployment through Render dashboard"
echo "Please visit: https://dashboard.render.com"
echo "And trigger a manual deployment for the cars-g-api service"

echo "🎉 Deployment process completed!"
echo ""
echo "Next steps:"
echo "1. Visit https://dashboard.render.com"
echo "2. Find the 'cars-g-api' service"
echo "3. Click 'Manual Deploy' to deploy the latest backend code"
echo "4. Wait for deployment to complete"
echo "5. Test the application at https://cars-g.vercel.app"
