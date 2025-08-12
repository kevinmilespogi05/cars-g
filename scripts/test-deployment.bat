@echo off
REM Cars-G Deployment Testing Script for Windows
REM Quick health check for all deployment components

echo 🧪 Starting Cars-G Deployment Testing...
echo.

REM Configuration
set FRONTEND_URL=https://cars-g.vercel.app/
set BACKEND_URL=https://cars-g-api.onrender.com
set SUPABASE_URL=https://mffuqdwqjdxbwpbhuxby.supabase.co
set CLOUDINARY_URL=https://res.cloudinary.com/dzqtdl5aa

echo 📋 Testing Frontend (Vercel)...
curl -s -o nul -w "Frontend Status: %%{http_code}\n" %FRONTEND_URL%
if %errorlevel% equ 0 (
    echo ✅ Frontend is accessible
) else (
    echo ❌ Frontend is not accessible
)

echo.
echo 🔌 Testing Backend (Render)...
curl -s -o nul -w "Backend Health: %%{http_code}\n" %BACKEND_URL%/health
if %errorlevel% equ 0 (
    echo ✅ Backend is accessible
) else (
    echo ❌ Backend is not accessible
)

echo.
echo 🗄️ Testing Database (Supabase)...
curl -s -o nul -w "Database Status: %%{http_code}\n" %SUPABASE_URL%/rest/v1/
if %errorlevel% equ 0 (
    echo ✅ Database is accessible
) else (
    echo ❌ Database is not accessible
)

echo.
echo ☁️ Testing Cloudinary...
curl -s -o nul -w "Cloudinary Status: %%{http_code}\n" %CLOUDINARY_URL%
if %errorlevel% equ 0 (
    echo ✅ Cloudinary is accessible
) else (
    echo ❌ Cloudinary is not accessible
)

echo.
echo 📊 Test Summary:
echo - Frontend: %FRONTEND_URL%
echo - Backend: %BACKEND_URL%
echo - Database: %SUPABASE_URL%
echo - Cloudinary: %CLOUDINARY_URL%

echo.
echo 📝 Next Steps:
echo 1. Open your browser and visit: %FRONTEND_URL%
echo 2. Test user registration and login
echo 3. Test report submission with images
echo 4. Test admin dashboard functionality
echo 5. Check real-time updates

echo.
echo 🎉 Deployment testing completed!
pause 