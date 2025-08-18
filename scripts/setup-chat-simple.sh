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

echo "🔧 Chat Configuration Instructions:"
echo "================================="
echo ""
echo "1. Create a .env file in the server directory with:"
echo "   VITE_SUPABASE_URL=https://mffuqdwqjdxbwpbhuxby.supabase.co"
echo "   VITE_SUPABASE_ANON_KEY=your_anon_key_here"
echo "   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here"
echo ""
echo "2. Get your keys from:"
echo "   Supabase Dashboard → Settings → API"
echo ""
echo "3. Run the database migration:"
echo "   Copy supabase/migrations/20241201000000_create_chat_tables.sql"
echo "   Paste in Supabase SQL Editor and run"
echo ""
echo "4. Start the chat server:"
echo "   cd server && npm run dev"
echo ""
echo "5. Access chat at: http://localhost:5173/chat"
echo ""

echo "🚀 Ready to start chat server!"
echo "Run: cd server && npm run dev"
