# Script to remove duplicate API functions to stay under Vercel Hobby limit (12 functions)

Write-Host "Removing duplicate API functions..." -ForegroundColor Yellow

# List of duplicate functions to remove
$functionsToRemove = @(
    "api/auth/register-otp-express.js",
    "api/auth/verify-otp-express.js",
    "api/auth/resend-otp-express.js",
    "api/auth/upload-id-simple.js",
    "api/auth/upload-id-documents.js",
    "api/auth/upload-id.js",
    "api/auth/verify-email.js",
    "api/upload/id-images.js",
    "api/background/process-verifications.js"
)

$removed = 0
$notFound = 0

foreach ($file in $functionsToRemove) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed: $file" -ForegroundColor Green
        $removed++
    } else {
        Write-Host "Not found: $file" -ForegroundColor Red
        $notFound++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Removed: $removed files" -ForegroundColor Green
Write-Host "  Not found: $notFound files" -ForegroundColor Yellow

# Count remaining API functions
$remaining = (Get-ChildItem -Path api -Recurse -Filter "*.js" -File | Where-Object { $_.FullName -notmatch "node_modules" }).Count
Write-Host ""
Write-Host "Remaining API functions: $remaining" -ForegroundColor Cyan

if ($remaining -le 12) {
    Write-Host "Under Vercel Hobby limit (12 functions)!" -ForegroundColor Green
} else {
    Write-Host "Still over limit. Need to remove $($remaining - 12) more functions." -ForegroundColor Yellow
}
