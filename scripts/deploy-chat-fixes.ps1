# Deploy Chat Fixes to Render
Write-Host "🚀 Deploying Chat Fixes to Render..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "server/server.js")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Summary of fixes applied:" -ForegroundColor Yellow
Write-Host "   ✅ Fixed CORS configuration for Vercel deployment" -ForegroundColor White
Write-Host "   ✅ Added CORS preflight handling" -ForegroundColor White
Write-Host "   ✅ Improved WebSocket connection handling" -ForegroundColor White
Write-Host "   ✅ Added better error logging and debugging" -ForegroundColor White
Write-Host "   ✅ Created render.yaml configuration" -ForegroundColor White
Write-Host "   ✅ Added health check endpoints" -ForegroundColor White

Write-Host "`n🔧 Next steps:" -ForegroundColor Cyan
Write-Host "1. Commit and push your changes to GitHub:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Fix chat CORS and WebSocket issues'" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray

Write-Host "`n2. Deploy to Render:" -ForegroundColor White
Write-Host "   - Go to https://dashboard.render.com" -ForegroundColor Gray
Write-Host "   - Find your 'cars-g-api' service" -ForegroundColor Gray
Write-Host "   - Click 'Manual Deploy' → 'Deploy latest commit'" -ForegroundColor Gray

Write-Host "`n3. Set environment variables in Render (if not already set):" -ForegroundColor White
Write-Host "   - FRONTEND_URL=https://cars-g.vercel.app" -ForegroundColor Gray
Write-Host "   - VITE_SUPABASE_URL=https://mffuqdwqjdxbwpbhuxby.supabase.co" -ForegroundColor Gray
Write-Host "   - VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." -ForegroundColor Gray
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." -ForegroundColor Gray

Write-Host "`n4. Test the deployment:" -ForegroundColor White
Write-Host "   - Health check: https://cars-g-api.onrender.com/health" -ForegroundColor Gray
Write-Host "   - WebSocket health: https://cars-g-api.onrender.com/ws-health" -ForegroundColor Gray

Write-Host "`n5. Test your chat functionality:" -ForegroundColor White
Write-Host "   - Open https://cars-g.vercel.app" -ForegroundColor Gray
Write-Host "   - Try to open the chat" -ForegroundColor Gray
Write-Host "   - Check browser console for any remaining errors" -ForegroundColor Gray

Write-Host "`n✅ All fixes have been applied! Deploy when ready." -ForegroundColor Green
