# Start Development Servers
# This script starts both the frontend (Vite) and backend (Node.js) servers

Write-Host "🚀 Starting Bantay SP Development Environment..." -ForegroundColor Green

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Check if servers are already running
$frontendRunning = Test-Port -Port 5173
$backendRunning = Test-Port -Port 3001

if ($frontendRunning) {
    Write-Host "⚠️  Frontend server already running on port 5173" -ForegroundColor Yellow
} else {
    Write-Host "📱 Starting frontend server (Vite) on port 5173..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
}

if ($backendRunning) {
    Write-Host "⚠️  Backend server already running on port 3001" -ForegroundColor Yellow
} else {
    Write-Host "🔧 Starting backend server (Node.js) on port 3001..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/server'; npm start"
}

Write-Host ""
Write-Host "✅ Development servers starting..." -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "🔧 Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "📊 Performance API: http://localhost:3001/api/performance" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Wait a few seconds for servers to start" -ForegroundColor Gray
Write-Host "   - Check the performance monitor in the bottom-right corner" -ForegroundColor Gray
Write-Host "   - Press Ctrl+C in each terminal to stop servers" -ForegroundColor Gray
