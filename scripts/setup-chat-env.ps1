# Chat Server Environment Setup Script
# This script helps set up the chat server environment and starts the server

Write-Host "🚀 Setting up Chat Server Environment..." -ForegroundColor Green

# Check if .env file exists in server directory
$serverEnvPath = "server\.env"
if (-not (Test-Path $serverEnvPath)) {
    Write-Host "📝 Creating .env file in server directory..." -ForegroundColor Yellow
    
    # Create .env content
    $envContent = @"
# Supabase Configuration
VITE_SUPABASE_URL=https://mffuqdwqjdxbwpbhuxby.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnVxZHdxamR4YndwYmh1eGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MTI4NzMsImV4cCI6MjA1OTQ4ODg3M30.3ALtkwlAO-V_98e-Y263l9pYSWjW1h1AY3qhqSTMkW0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnVxZHdxamR4YndwYmh1eGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMjg3MywiZXhwIjoyMDU5NDg4ODczfQ.VK8WhHWV1kElmQ-CvfqBhyzxO29MoBLz1peHCixb4dw

# API Configuration
VITE_API_URL=https://cars-g-api.onrender.com
VITE_CHAT_SERVER_URL=https://cars-g-api.onrender.com

# Frontend URL (for CORS)
FRONTEND_URL=https://cars-g.vercel.app/

# Backend Configuration
PORT=3001
NODE_ENV=development
WS_PORT=3001

# Firebase (FCM) Web Client Configuration
VITE_FIREBASE_API_KEY=AIzaSyBaDNk0l_Hveq0r4xp15-K_Zm2uFwhkIPs
VITE_FIREBASE_AUTH_DOMAIN=carsg-d5bed.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=carsg-d5bed
VITE_FIREBASE_MESSAGING_SENDER_ID=672452977686
VITE_FIREBASE_APP_ID=1:672452977686:web:109661be796952ddbf8137
VITE_FIREBASE_VAPID_KEY=BIwpimX2-4_1EwjnCHpGnNVRca-5dqETfdBOzl2ajY6lm5hqOk0pkj1RDI8QTpK20QOIxi16ietGrwsIxqe6lUo
FIREBASE_SERVER_KEY=your_firebase_server_key_here
"@
    
    # Write to server/.env file
    Set-Content -Path $serverEnvPath -Value $envContent -Encoding UTF8
    Write-Host "✅ .env file created successfully!" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists in server directory" -ForegroundColor Green
}

# Check if server dependencies are installed
Write-Host "📦 Checking server dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "server\node_modules")) {
    Write-Host "📥 Installing server dependencies..." -ForegroundColor Yellow
    Set-Location server
    npm install
    Set-Location ..
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✅ Server dependencies already installed" -ForegroundColor Green
}

# Check if frontend dependencies are installed
Write-Host "📦 Checking frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend dependencies already installed" -ForegroundColor Green
}

Write-Host "`n🎯 Environment setup complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the chat server: cd server && npm run dev" -ForegroundColor White
Write-Host "2. Start the frontend: npm run dev" -ForegroundColor White
Write-Host "3. Open your browser and navigate to the chat page" -ForegroundColor White
Write-Host "`n🔧 If you encounter issues:" -ForegroundColor Yellow
Write-Host "- Check that the server is running on port 3001" -ForegroundColor White
Write-Host "- Verify your Supabase credentials in server/.env" -ForegroundColor White
Write-Host "- Check the browser console for connection errors" -ForegroundColor White

Write-Host "`n🚀 Ready to start the chat server!" -ForegroundColor Green
