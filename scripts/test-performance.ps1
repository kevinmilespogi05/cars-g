# Test Performance API Endpoints
# This script tests if the performance monitoring is working correctly

Write-Host "🧪 Testing Performance API Endpoints..." -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"

# Test health endpoint
Write-Host "`n📊 Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health Check: $($healthResponse.status)" -ForegroundColor Green
    Write-Host "   Uptime: $($healthResponse.uptime)s" -ForegroundColor Gray
    Write-Host "   Timestamp: $($healthResponse.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test performance endpoint
Write-Host "`n📈 Testing Performance Endpoint..." -ForegroundColor Yellow
try {
    $perfResponse = Invoke-RestMethod -Uri "$baseUrl/api/performance" -Method Get
    Write-Host "✅ Performance API: Working" -ForegroundColor Green
    Write-Host "   Uptime: $($perfResponse.uptime)s" -ForegroundColor Gray
    Write-Host "   Connections: $($perfResponse.connectionsActive)" -ForegroundColor Gray
    Write-Host "   Messages: $($perfResponse.messagesProcessed)" -ForegroundColor Gray
    Write-Host "   Avg Response: $($perfResponse.averageResponseTime)ms" -ForegroundColor Gray
    Write-Host "   Msg/sec: $($perfResponse.messagesPerSecond)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Performance API Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test if server is running
Write-Host "`n🔍 Server Status Check..." -ForegroundColor Yellow
try {
    $serverStatus = Test-NetConnection -ComputerName "localhost" -Port 3001 -InformationLevel Quiet
    if ($serverStatus) {
        Write-Host "✅ Backend server is running on port 3001" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend server is not responding on port 3001" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot connect to backend server" -ForegroundColor Red
}

Write-Host "`n💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Make sure both servers are running (use .\scripts\start-dev.ps1)" -ForegroundColor White
Write-Host "   2. Check the performance monitor in your app (blue icon bottom-right)" -ForegroundColor White
Write-Host "   3. The status should show 'Initializing...' or 'Excellent Performance'" -ForegroundColor White
