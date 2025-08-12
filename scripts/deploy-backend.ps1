# Cars-G Backend Deployment Script for Render
# This script helps deploy the updated backend to Render

Write-Host "🚀 Starting Cars-G Backend Deployment to Render..." -ForegroundColor Cyan

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Step 1: Check if we're in the right directory
Write-Status "Step 1: Checking project structure..."
if (-not (Test-Path "server/api.js")) {
    Write-Error "server/api.js not found. Please run this script from the project root."
    exit 1
}

if (-not (Test-Path "server/package.json")) {
    Write-Error "server/package.json not found. Please run this script from the project root."
    exit 1
}

Write-Success "Project structure verified!"

# Step 2: Check if render.yaml exists and update it
Write-Status "Step 2: Checking render.yaml configuration..."
if (Test-Path "render.yaml") {
    Write-Success "render.yaml found. Configuration is ready."
} else {
    Write-Warning "render.yaml not found. Creating one..."
    
    $renderConfig = @"
services:
  - type: web
    name: cars-g-api
    env: node
    plan: starter
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
      - key: FRONTEND_URL
        sync: false
    healthCheckPath: /health
    autoDeploy: true
"@
    
    $renderConfig | Out-File -FilePath "render.yaml" -Encoding UTF8
    Write-Success "render.yaml created!"
}

# Step 3: Check server dependencies
Write-Status "Step 3: Checking server dependencies..."
$serverPackage = Get-Content "server/package.json" | ConvertFrom-Json

$requiredDeps = @(
    "express",
    "cors", 
    "dotenv",
    "@supabase/supabase-js",
    "ws"
)

$missingDeps = @()
foreach ($dep in $requiredDeps) {
    if (-not $serverPackage.dependencies.$dep) {
        $missingDeps += $dep
    }
}

if ($missingDeps.Count -gt 0) {
    Write-Warning "Missing dependencies: $($missingDeps -join ', ')"
    Write-Status "Installing missing dependencies..."
    
    $depsString = $missingDeps -join " "
    Set-Location server
    npm install $depsString
    Set-Location ..
    Write-Success "Dependencies installed!"
} else {
    Write-Success "All required dependencies are present!"
}

# Step 4: Test the backend locally
Write-Status "Step 4: Testing backend locally..."
Write-Warning "Make sure your .env file is configured with the correct values."

$response = Read-Host "Do you want to test the backend locally first? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Status "Starting local server test..."
    Set-Location server
    
    # Start server in background
    $job = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm start
    }
    
    # Wait a bit for server to start
    Start-Sleep -Seconds 5
    
    # Test health endpoint
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 10
        if ($healthResponse.StatusCode -eq 200) {
            Write-Success "Local health check passed!"
        } else {
            Write-Warning "Local health check returned status: $($healthResponse.StatusCode)"
        }
    } catch {
        Write-Warning "Could not test local server: $($_.Exception.Message)"
    }
    
    # Stop the background job
    Stop-Job $job
    Remove-Job $job
    Set-Location ..
}

# Step 5: Git operations
Write-Status "Step 5: Preparing for deployment..."

# Check if git is available
try {
    $gitVersion = git --version
    Write-Success "Git is available: $gitVersion"
} catch {
    Write-Error "Git is not installed or not in PATH. Please install Git first."
    exit 1
}

# Check git status
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Warning "You have uncommitted changes:"
    Write-Host $gitStatus -ForegroundColor Yellow
    
    $response = Read-Host "Do you want to commit these changes before deploying? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        git add .
        $commitMessage = Read-Host "Enter commit message (or press Enter for default)"
        if (-not $commitMessage) {
            $commitMessage = "Update backend API with reports endpoints"
        }
        git commit -m $commitMessage
        Write-Success "Changes committed!"
    }
}

# Step 6: Push to remote
Write-Status "Step 6: Pushing to remote repository..."
try {
    git push origin main
    Write-Success "Code pushed to remote repository!"
} catch {
    Write-Error "Failed to push to remote: $($_.Exception.Message)"
    Write-Warning "Please check your git remote configuration and try again."
    exit 1
}

# Step 7: Deployment instructions
Write-Host "`n📋 Deployment Instructions:" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

Write-Host "`n1. Go to your Render dashboard:" -ForegroundColor White
Write-Host "   https://dashboard.render.com" -ForegroundColor Yellow

Write-Host "`n2. Find your 'cars-g-api' service or create a new one:" -ForegroundColor White
Write-Host "   - Click 'New' → 'Web Service'" -ForegroundColor Yellow
Write-Host "   - Connect your GitHub repository" -ForegroundColor Yellow
Write-Host "   - Name: cars-g-api" -ForegroundColor Yellow

Write-Host "`n3. Configure the service:" -ForegroundColor White
Write-Host "   - Environment: Node" -ForegroundColor Yellow
Write-Host "   - Build Command: cd server && npm install" -ForegroundColor Yellow
Write-Host "   - Start Command: cd server && npm start" -ForegroundColor Yellow
Write-Host "   - Plan: Starter (free)" -ForegroundColor Yellow

Write-Host "`n4. Set environment variables:" -ForegroundColor White
Write-Host "   - NODE_ENV: production" -ForegroundColor Yellow
Write-Host "   - VITE_SUPABASE_URL: https://mffuqdwqjdxbwpbhuxby.supabase.co" -ForegroundColor Yellow
Write-Host "   - VITE_SUPABASE_ANON_KEY: [your-anon-key]" -ForegroundColor Yellow
Write-Host "   - FRONTEND_URL: https://cars-g.vercel.app" -ForegroundColor Yellow

Write-Host "`n5. Deploy:" -ForegroundColor White
Write-Host "   - Click 'Create Web Service'" -ForegroundColor Yellow
Write-Host "   - Wait for deployment to complete" -ForegroundColor Yellow

Write-Host "`n6. Test the deployment:" -ForegroundColor White
Write-Host "   - Health check: https://your-service.onrender.com/health" -ForegroundColor Yellow
Write-Host "   - API status: https://your-service.onrender.com/api/status" -ForegroundColor Yellow
Write-Host "   - Reports API: https://your-service.onrender.com/api/reports" -ForegroundColor Yellow

Write-Host "`n🔗 Quick Test Commands:" -ForegroundColor Cyan
Write-Host "curl https://your-service.onrender.com/health" -ForegroundColor White
Write-Host "curl https://your-service.onrender.com/api/reports" -ForegroundColor White

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Deploy to Render using the instructions above" -ForegroundColor White
Write-Host "2. Update your frontend environment variables with the new API URL" -ForegroundColor White
Write-Host "3. Test the complete application workflow" -ForegroundColor White
Write-Host "4. Run the deployment tests again" -ForegroundColor White

Write-Success "Backend deployment preparation completed!"
Write-Host "`nRemember to update your frontend environment variables after deployment!" -ForegroundColor Yellow 