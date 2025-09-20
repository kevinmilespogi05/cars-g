# Fix Report Ratings RLS Policy Script
# This script applies the missing UPDATE policy for report_ratings table

Write-Host "🔧 Fixing Report Ratings RLS Policy..." -ForegroundColor Cyan

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

# Apply just our specific migration using SQL
Write-Status "Applying report_ratings UPDATE policy fix..."

$sql = @"
-- Fix report_ratings RLS policy to allow UPDATE operations for upsert functionality
-- The current policy only allows INSERT, but upsert operations need both INSERT and UPDATE

-- Add UPDATE policy for report_ratings
DO $$ 
BEGIN
  -- Check if the update policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'report_ratings' 
    AND policyname = 'report_ratings_update_owner'
  ) THEN
    -- Create UPDATE policy for owners to update their own ratings
    CREATE POLICY report_ratings_update_owner ON public.report_ratings 
    FOR UPDATE 
    USING (requester_user_id = auth.uid())
    WITH CHECK (requester_user_id = auth.uid());
  END IF;
END $$;
"@

# Write SQL to temporary file
$tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
$sql | Out-File -FilePath $tempFile -Encoding UTF8

try {
    # Execute the SQL
    supabase db reset --db-url "postgresql://postgres:[password]@db.mffuqdwqjdxbwpbhuxby.supabase.co:5432/postgres" --file $tempFile
    Write-Success "Report ratings UPDATE policy applied successfully!"
} catch {
    Write-Warning "Direct SQL execution failed. Please apply the following SQL manually in your Supabase dashboard:"
    Write-Host ""
    Write-Host $sql -ForegroundColor White
    Write-Host ""
    Write-Warning "Steps:"
    Write-Host "1. Go to your Supabase dashboard" -ForegroundColor White
    Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
    Write-Host "3. Copy and paste the SQL above" -ForegroundColor White
    Write-Host "4. Run the query" -ForegroundColor White
} finally {
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile
    }
}

Write-Status "The report_ratings upsert operation should now work correctly."
Write-Warning "Test the rating functionality to confirm the fix is working."
