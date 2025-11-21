@echo off
echo 🚀 Starting Bantay SP Development Environment...

REM Check if servers are already running
netstat -an | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Frontend server already running on port 5173
) else (
    echo 📱 Starting frontend server (Vite) on port 5173...
    start "Frontend Server" cmd /k "npm run dev"
)

netstat -an | findstr ":3001" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Backend server already running on port 3001
) else (
    echo 🔧 Starting backend server (Node.js) on port 3001...
    start "Backend Server" cmd /k "cd server && npm start"
)

echo.
echo ✅ Development servers starting...
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:3001
echo 📊 Performance API: http://localhost:3001/api/performance
echo.
echo 💡 Tips:
echo    - Wait a few seconds for servers to start
echo    - Check the performance monitor in the bottom-right corner
echo    - Close the terminal windows to stop servers
pause
