# Deployment script for Cars-G (PowerShell)

Write-Host "🚀 Deploying Cars-G to production..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Build the frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend built successfully" -ForegroundColor Green

# Deploy to Vercel
Write-Host "🌐 Deploying frontend to Vercel..." -ForegroundColor Yellow
npx vercel --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Vercel deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend deployed to Vercel" -ForegroundColor Green

# Deploy backend to Render
Write-Host "🔧 Deploying backend to Render..." -ForegroundColor Yellow
Write-Host "Note: Backend deployment to Render requires manual deployment through Render dashboard" -ForegroundColor Cyan
Write-Host "Please visit: https://dashboard.render.com" -ForegroundColor Cyan
Write-Host "And trigger a manual deployment for the cars-g-api service" -ForegroundColor Cyan

Write-Host "🎉 Deployment process completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Find the 'cars-g-api' service" -ForegroundColor White
Write-Host "3. Click 'Manual Deploy' to deploy the latest backend code" -ForegroundColor White
Write-Host "4. Wait for deployment to complete" -ForegroundColor White
Write-Host "5. Test the application at https://cars-g.vercel.app" -ForegroundColor White
