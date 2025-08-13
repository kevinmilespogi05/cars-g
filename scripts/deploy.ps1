# Cars-G Deployment Script for Windows
# This script helps deploy the Cars-G application

param(
    [switch]$SkipMigrations,
    [switch]$SkipBuild,
    [switch]$SkipDeploy
)

Write-Host "🚀 Starting Cars-G Deployment..." -ForegroundColor Cyan

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

# Check if Supabase CLI is installed
try {
    $supabaseVersion = supabase --version
    Write-Status "Supabase CLI version: $supabaseVersion"
} catch {
    Write-Error "Supabase CLI is not installed. Please install it first:"
    Write-Host "npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Step 1: Apply database migrations
if (-not $SkipMigrations) {
    Write-Status "Step 1: Applying database migrations..."
    Write-Warning "Make sure you're logged into Supabase CLI: supabase login"

    # Check if project is linked
    if (-not (Test-Path ".supabase/config.toml")) {
        Write-Status "Linking to Supabase project..."
        supabase link --project-ref mffuqdwqjdxbwpbhuxby
    }

    Write-Status "Pushing database migrations..."
    supabase db push

    Write-Success "Database migrations applied successfully!"
} else {
    Write-Warning "Skipping database migrations..."
}

# Step 2: Check environment variables
Write-Status "Step 2: Checking environment variables..."

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Warning ".env file not found. Creating from example..."
    Copy-Item "env.example" ".env"
    Write-Warning "Please update .env file with your actual values"
}

# Step 3: Build the application
if (-not $SkipBuild) {
    Write-Status "Step 3: Building the application..."
    npm run build

    Write-Success "Application built successfully!"
} else {
    Write-Warning "Skipping build..."
}

# Step 4: Deploy to Vercel (if vercel CLI is available)
if (-not $SkipDeploy) {
    try {
        $vercelVersion = vercel --version
        Write-Status "Step 4: Deploying to Vercel..."
        Write-Warning "Make sure you're logged into Vercel CLI: vercel login"
        
        $response = Read-Host "Do you want to deploy to Vercel now? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            vercel --prod
            Write-Success "Deployed to Vercel successfully!"
        }
    } catch {
        Write-Warning "Vercel CLI not found. Please deploy manually through Vercel dashboard."
    }
} else {
    Write-Warning "Skipping Vercel deployment..."
}

# Step 5: Deploy to Render (if render CLI is available)
if (-not $SkipDeploy) {
    try {
        $renderVersion = render --version
        Write-Status "Step 5: Deploying to Render..."
        Write-Warning "Make sure you're logged into Render CLI: render login"
        
        $response = Read-Host "Do you want to deploy to Render now? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            render deploy
            Write-Success "Deployed to Render successfully!"
        }
    } catch {
        Write-Warning "Render CLI not found. Please deploy manually through Render dashboard."
    }
} else {
    Write-Warning "Skipping Render deployment..."
}

Write-Success "Deployment process completed!"
Write-Status "Next steps:"
Write-Host "1. Check your Vercel deployment: https://your-project.vercel.app" -ForegroundColor White
Write-Host "2. Check your Render deployment: https://cars-g-api.onrender.com" -ForegroundColor White
Write-Host "3. Test the application functionality" -ForegroundColor White
Write-Host "4. Verify report status updates work correctly" -ForegroundColor White

Write-Warning "Remember to:"
Write-Host "- Set up environment variables in Vercel and Render dashboards" -ForegroundColor White
Write-Host "- Test frontend" -ForegroundColor White
Write-Host "- Test backend" -ForegroundColor White
Write-Host "- Test file uploads (if using Cloudinary)" -ForegroundColor White
Write-Host "- Test report status updates in admin dashboard" -ForegroundColor White 