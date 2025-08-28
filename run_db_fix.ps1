# PowerShell script to run the database schema fix
# This script will help you apply the user_stats table schema fix

Write-Host "Database Schema Fix Script" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green
Write-Host ""
Write-Host "This script will help you apply the user_stats table schema fix to resolve the 400 errors."
Write-Host ""
Write-Host "To apply the fix:"
Write-Host "1. Copy the contents of 'fix_user_stats_schema_immediate.sql'"
Write-Host "2. Go to your Supabase Dashboard"
Write-Host "3. Navigate to the SQL Editor"
Write-Host "4. Paste the SQL content and run it"
Write-Host ""
Write-Host "The fix will:"
Write-Host "- Drop the existing incomplete user_stats table"
Write-Host "- Create a new user_stats table with all required columns"
Write-Host "- Set up proper RLS policies and indexes"
Write-Host "- Grant necessary permissions"
Write-Host ""

# Display the SQL content
Write-Host "SQL Content to run in Supabase:" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Get-Content "fix_user_stats_schema_immediate.sql" | ForEach-Object {
    Write-Host $_ -ForegroundColor Cyan
}

Write-Host ""
Write-Host "After running the SQL fix, the reward system should work correctly!" -ForegroundColor Green
Write-Host ""
Write-Host "Reward System Summary:" -ForegroundColor Yellow
Write-Host "- Reporters get 100 points when their report is resolved"
Write-Host "- Patrol officers get points based on priority (5-30 points)"
Write-Host "- Both rewards are given when a report moves from 'in_progress' to 'resolved'"
Write-Host ""
