#!/bin/bash

# Cars-G Deployment Script
# This script helps deploy the Cars-G application

set -e

echo "🚀 Starting Cars-G Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

print_status "Checking Supabase CLI version..."
supabase --version

# Step 1: Apply database migrations
print_status "Step 1: Applying database migrations..."
print_warning "Make sure you're logged into Supabase CLI: supabase login"

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    print_status "Linking to Supabase project..."
    supabase link --project-ref mffuqdwqjdxbwpbhuxby
fi

print_status "Pushing database migrations..."
supabase db push

print_success "Database migrations applied successfully!"

# Step 2: Check environment variables
print_status "Step 2: Checking environment variables..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from example..."
    cp env.example .env
    print_warning "Please update .env file with your actual values"
fi

# Step 3: Build the application
print_status "Step 3: Building the application..."
npm run build

print_success "Application built successfully!"

# Step 4: Deploy to Vercel (if vercel CLI is available)
if command -v vercel &> /dev/null; then
    print_status "Step 4: Deploying to Vercel..."
    print_warning "Make sure you're logged into Vercel CLI: vercel login"
    
    read -p "Do you want to deploy to Vercel now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        vercel --prod
        print_success "Deployed to Vercel successfully!"
    fi
else
    print_warning "Vercel CLI not found. Please deploy manually through Vercel dashboard."
fi

# Step 5: Deploy to Render (if render CLI is available)
if command -v render &> /dev/null; then
    print_status "Step 5: Deploying to Render..."
    print_warning "Make sure you're logged into Render CLI: render login"
    
    read -p "Do you want to deploy to Render now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        render deploy
        print_success "Deployed to Render successfully!"
    fi
else
    print_warning "Render CLI not found. Please deploy manually through Render dashboard."
fi

print_success "Deployment process completed!"
print_status "Next steps:"
echo "1. Check your Vercel deployment: https://your-project.vercel.app"
echo "2. Check your Render deployment: https://cars-g-api.onrender.com"
echo "3. Test the application functionality"
echo "4. Verify report status updates work correctly"

print_warning "Remember to:"
echo "- Set up environment variables in Vercel and Render dashboards"
echo "- Test frontend"
echo "- Test backend"
echo "- Test file uploads (if using Cloudinary)"
echo "- Test report status updates in admin dashboard" 