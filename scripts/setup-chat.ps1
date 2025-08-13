# Real-Time Chat Setup Script for Cars-G
# Run this script from the project root directory

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

Write-Host "🔧 Setting up environment variables..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item env.example .env
    Write-Host "⚠️  Please edit .env file with your actual values:" -ForegroundColor Yellow
    Write-Host "   - VITE_API_URL" -ForegroundColor White
    Write-Host "   - VITE_CHAT_SERVER_URL" -ForegroundColor White
    Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
Write-Host "📋 Please run the following SQL in your Supabase project:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to your Supabase dashboard" -ForegroundColor White
Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of: supabase/migrations/20241201000000_create_chat_tables.sql" -ForegroundColor White
Write-Host "4. Run the migration" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow
Write-Host "📱 The chat will be available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host "💬 Frontend chat page: http://localhost:5173/chat" -ForegroundColor Cyan
Write-Host ""

Set-Location server
Write-Host "Starting server in development mode..." -ForegroundColor Yellow
npm run dev 