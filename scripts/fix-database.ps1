# Quick Database Fix Script
# This script applies the migration to fix the reports status constraint issue

Write-Host "🔧 Fixing Database Constraint Issue..." -ForegroundColor Cyan

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

# Check if logged in
Write-Status "Checking Supabase login status..."
try {
    supabase projects list | Out-Null
    Write-Success "Logged into Supabase"
} catch {
    Write-Warning "Not logged into Supabase. Please login first:"
    Write-Host "supabase login" -ForegroundColor Yellow
    exit 1
}

# Link to project if not already linked
if (-not (Test-Path ".supabase/config.toml")) {
    Write-Status "Linking to Supabase project..."
    supabase link --project-ref mffuqdwqjdxbwpbhuxby
    Write-Success "Linked to project"
} else {
    Write-Status "Already linked to project"
}

# Apply the migration
Write-Status "Applying database migration to fix reports status constraint..."
supabase db push

Write-Success "Database migration applied successfully!"
Write-Status "The reports status constraint has been fixed."
Write-Status "Valid status values are now: pending, in_progress, resolved, rejected"

Write-Warning "Next steps:"
Write-Host "1. Test the admin dashboard status updates" -ForegroundColor White
Write-Host "2. Verify that all status transitions work correctly" -ForegroundColor White
Write-Host "3. Check that the error no longer occurs" -ForegroundColor White 