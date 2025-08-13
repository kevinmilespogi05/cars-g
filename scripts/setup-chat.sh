#!/bin/bash

echo "🚀 Setting up Real-Time Chat for Cars-G"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing backend dependencies..."
cd server
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

echo "✅ Backend dependencies installed"

cd ..

echo "🔧 Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your actual values:"
    echo "   - VITE_API_URL"
    echo "   - VITE_CHAT_SERVER_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
else
    echo "✅ .env file already exists"
fi

echo "🗄️  Setting up database..."
echo "📋 Please run the following SQL in your Supabase project:"
echo ""
echo "1. Go to your Supabase dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the contents of: supabase/migrations/20241201000000_create_chat_tables.sql"
echo "4. Run the migration"
echo ""

echo "🚀 Starting backend server..."
echo "📱 The chat will be available at: http://localhost:3001"
echo "💬 Frontend chat page: http://localhost:5173/chat"
echo ""

cd server
echo "Starting server in development mode..."
npm run dev 