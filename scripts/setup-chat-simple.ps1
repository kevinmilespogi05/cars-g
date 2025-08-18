# Simple Chat Setup Script for Cars-G
# This script helps set up the chat system with basic configuration

Write-Host "🚀 Setting up Real-Time Chat for Cars-G" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location server
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

Set-Location ..

Write-Host "🔧 Chat Configuration Instructions:" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Create a .env file in the server directory with:" -ForegroundColor White
Write-Host "   VITE_SUPABASE_URL=https://mffuqdwqjdxbwpbhuxby.supabase.co" -ForegroundColor Cyan
Write-Host "   VITE_SUPABASE_ANON_KEY=your_anon_key_here" -ForegroundColor Cyan
Write-Host "   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Get your keys from:" -ForegroundColor White
Write-Host "   Supabase Dashboard → Settings → API" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Run the database migration:" -ForegroundColor White
Write-Host "   Copy supabase/migrations/20241201000000_create_chat_tables.sql" -ForegroundColor Cyan
Write-Host "   Paste in Supabase SQL Editor and run" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Start the chat server:" -ForegroundColor White
Write-Host "   cd server && npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Access chat at: http://localhost:5173/chat" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Ready to start chat server!" -ForegroundColor Green
Write-Host "Run: cd server && npm run dev" -ForegroundColor Cyan
