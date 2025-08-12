# Cars-G Deployment Script for Windows
# This script helps with the deployment process

param(
    [string]$Command = ""
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

Write-Host "🚀 Cars-G Deployment Helper" -ForegroundColor $White
Write-Host "==========================" -ForegroundColor $White

# Check if required tools are installed
function Check-Dependencies {
    Write-Status "Checking dependencies..."
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    }
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm is not installed. Please install npm"
        exit 1
    }
    
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error "git is not installed. Please install git"
        exit 1
    }
    
    Write-Success "All dependencies are installed"
}

# Install dependencies
function Install-Dependencies {
    Write-Status "Installing frontend dependencies..."
    npm install
    
    Write-Status "Installing backend dependencies..."
    Push-Location server
    npm install
    Pop-Location
    
    Write-Success "Dependencies installed successfully"
}

# Build the project
function Build-Project {
    Write-Status "Building frontend..."
    npm run build
    
    Write-Success "Frontend built successfully"
}

# Check environment variables
function Check-Environment {
    Write-Status "Checking environment variables..."
    
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Please create one based on env.example"
        Write-Status "Copying env.example to .env..."
        Copy-Item "env.example" ".env"
        Write-Warning "Please update .env with your actual values"
    } else {
        Write-Success ".env file found"
    }
}

# Run tests
function Run-Tests {
    Write-Status "Running tests..."
    
    try {
        npm test
        Write-Success "Tests passed"
    } catch {
        Write-Error "Tests failed"
        exit 1
    }
}

# Show deployment checklist
function Show-Checklist {
    Write-Host ""
    Write-Host "📋 Deployment Checklist" -ForegroundColor $White
    Write-Host "======================" -ForegroundColor $White
    Write-Host ""
    Write-Host "1. Database (Supabase):"
    Write-Host "   ☐ Create Supabase project"
    Write-Host "   ☐ Get project URL and anon key"
    Write-Host "   ☐ Run migrations: supabase db push"
    Write-Host ""
    Write-Host "2. Backend (Render):"
    Write-Host "   ☐ Deploy to Render"
    Write-Host "   ☐ Set environment variables"
    Write-Host "   ☐ Test health endpoint: https://your-api.onrender.com/health"
    Write-Host ""
    Write-Host "3. Frontend (Vercel):"
    Write-Host "   ☐ Deploy to Vercel"
    Write-Host "   ☐ Set environment variables"
    Write-Host "   ☐ Update API URLs"
    Write-Host ""
    Write-Host "4. Optional (Cloudinary):"
    Write-Host "   ☐ Create Cloudinary account"
    Write-Host "   ☐ Get credentials"
    Write-Host "   ☐ Set environment variables"
    Write-Host ""
    Write-Host "5. Post-deployment:"
    Write-Host "   ☐ Test WebSocket connections"
    Write-Host "   ☐ Test file uploads"
    Write-Host "   ☐ Verify CORS settings"
    Write-Host "   ☐ Check all features work"
    Write-Host ""
}

# Show useful commands
function Show-Commands {
    Write-Host ""
    Write-Host "🔧 Useful Commands" -ForegroundColor $White
    Write-Host "=================" -ForegroundColor $White
    Write-Host ""
    Write-Host "Local Development:"
    Write-Host "  npm run dev          # Start frontend dev server"
    Write-Host "  npm run server       # Start backend server"
    Write-Host "  npm run start        # Start both frontend and backend"
    Write-Host ""
    Write-Host "Testing:"
    Write-Host "  npm test             # Run tests"
    Write-Host "  npm run test:watch   # Run tests in watch mode"
    Write-Host "  npm run cypress:open # Open Cypress"
    Write-Host ""
    Write-Host "Building:"
    Write-Host "  npm run build        # Build for production"
    Write-Host "  npm run preview      # Preview production build"
    Write-Host ""
    Write-Host "Database:"
    Write-Host "  supabase db push     # Push migrations to Supabase"
    Write-Host "  supabase db reset    # Reset database (careful!)"
    Write-Host ""
    Write-Host "Deployment:"
    Write-Host "  git add . && git commit -m 'Deploy to production'"
    Write-Host "  git push origin main"
    Write-Host ""
}

# Main menu
function Show-Menu {
    Write-Host ""
    Write-Host "What would you like to do?" -ForegroundColor $White
    Write-Host "1. Check dependencies"
    Write-Host "2. Install dependencies"
    Write-Host "3. Build project"
    Write-Host "4. Check environment"
    Write-Host "5. Run tests"
    Write-Host "6. Show deployment checklist"
    Write-Host "7. Show useful commands"
    Write-Host "8. Full pre-deployment check"
    Write-Host "9. Exit"
    Write-Host ""
    $choice = Read-Host "Enter your choice (1-9)"
    
    switch ($choice) {
        "1" { Check-Dependencies }
        "2" { Install-Dependencies }
        "3" { Build-Project }
        "4" { Check-Environment }
        "5" { Run-Tests }
        "6" { Show-Checklist }
        "7" { Show-Commands }
        "8" { 
            Check-Dependencies
            Install-Dependencies
            Check-Environment
            Run-Tests
            Build-Project
            Show-Checklist
        }
        "9" { 
            Write-Success "Goodbye!"
            exit 0
        }
        default { 
            Write-Error "Invalid choice"
            Show-Menu
        }
    }
}

# Main execution
if ($Command -eq "") {
    Show-Menu
} else {
    switch ($Command.ToLower()) {
        "check" { Check-Dependencies }
        "install" { Install-Dependencies }
        "build" { Build-Project }
        "env" { Check-Environment }
        "test" { Run-Tests }
        "checklist" { Show-Checklist }
        "commands" { Show-Commands }
        "full" { 
            Check-Dependencies
            Install-Dependencies
            Check-Environment
            Run-Tests
            Build-Project
            Show-Checklist
        }
        default { 
            Write-Error "Unknown command: $Command"
            Write-Host "Usage: .\deploy.ps1 [check|install|build|env|test|checklist|commands|full]"
            exit 1
        }
    }
} 