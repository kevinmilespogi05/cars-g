# Cars-G Deployment Testing Script for Windows
# This script tests all deployment components: Vercel, Render, Supabase, and Cloudinary

param(
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$SkipDatabase,
    [switch]$SkipCloudinary,
    [switch]$SkipPerformance,
    [switch]$Verbose
)

Write-Host "Starting Cars-G Deployment Testing..." -ForegroundColor Cyan

# Configuration
$FRONTEND_URL = "https://cars-g.vercel.app/"
$BACKEND_URL = "https://cars-g-api.onrender.com"
$SUPABASE_URL = "https://mffuqdwqjdxbwpbhuxby.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnVxZHdxamR4YndwYmh1eGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MTI4NzMsImV4cCI6MjA1OTQ4ODg3M30.3ALtkwlAO-V_98e-Y263l9pYSWjW1h1AY3qhqSTMkW0"
$CLOUDINARY_CLOUD_NAME = "dzqtdl5aa"

# Test results tracking
$TestResults = @{
    Frontend = @{ Passed = 0; Failed = 0; Tests = @() }
    Backend = @{ Passed = 0; Failed = 0; Tests = @() }
    Database = @{ Passed = 0; Failed = 0; Tests = @() }
    Cloudinary = @{ Passed = 0; Failed = 0; Tests = @() }
    Performance = @{ Passed = 0; Failed = 0; Tests = @() }
}

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

function Write-Test {
    param([string]$TestName, [bool]$Passed, [string]$Message)
    if ($Passed) {
        Write-Host "[PASS] $TestName`: $Message" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $TestName`: $Message" -ForegroundColor Red
    }
}

# Function to make HTTP requests
function Invoke-TestRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            TimeoutSec = 30
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params
        return @{ Success = $true; StatusCode = $response.StatusCode; Content = $response.Content }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Function to test frontend
function Test-Frontend {
    Write-Status "Testing Frontend (Vercel)..."
    
    # Test 1: Frontend accessibility
    $test1 = Invoke-TestRequest -Url $FRONTEND_URL
    $passed1 = $test1.Success -and $test1.StatusCode -eq 200
    Write-Test "Frontend Accessibility" $passed1 "Status: $($test1.StatusCode)"
    
    if ($passed1) {
        $TestResults.Frontend.Passed++
    } else {
        $TestResults.Frontend.Failed++
    }
    $TestResults.Frontend.Tests += @{ Name = "Frontend Accessibility"; Passed = $passed1 }
    
    # Test 2: Frontend response time
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $test2 = Invoke-TestRequest -Url $FRONTEND_URL
    $stopwatch.Stop()
    $responseTime = $stopwatch.ElapsedMilliseconds
    $passed2 = $responseTime -lt 3000  # Less than 3 seconds
    Write-Test "Frontend Response Time" $passed2 "Response time: ${responseTime}ms"
    
    if ($passed2) {
        $TestResults.Frontend.Passed++
    } else {
        $TestResults.Frontend.Failed++
    }
    $TestResults.Frontend.Tests += @{ Name = "Frontend Response Time"; Passed = $passed2; Metric = "${responseTime}ms" }
    
    # Test 3: Check for common frontend errors
    if ($test2.Success) {
        $content = $test2.Content
        $hasErrors = $content -match "error|Error|ERROR" -or $content -match "exception|Exception|EXCEPTION"
        $passed3 = -not $hasErrors
        Write-Test "Frontend Error Check" $passed3 "No obvious errors found"
        
        if ($passed3) {
            $TestResults.Frontend.Passed++
        } else {
            $TestResults.Frontend.Failed++
        }
        $TestResults.Frontend.Tests += @{ Name = "Frontend Error Check"; Passed = $passed3 }
    }
}

# Function to test backend
function Test-Backend {
    Write-Status "Testing Backend (Render)..."
    
    # Test 1: Backend health endpoint
    $test1 = Invoke-TestRequest -Url "$BACKEND_URL/health"
    $passed1 = $test1.Success -and $test1.StatusCode -eq 200
    Write-Test "Backend Health" $passed1 "Status: $($test1.StatusCode)"
    
    if ($passed1) {
        $TestResults.Backend.Passed++
    } else {
        $TestResults.Backend.Failed++
    }
    $TestResults.Backend.Tests += @{ Name = "Backend Health"; Passed = $passed1 }
    
    # Test 2: Backend API endpoint
    $test2 = Invoke-TestRequest -Url "$BACKEND_URL/api/reports"
    $passed2 = $test2.Success -and $test2.StatusCode -eq 200
    Write-Test "Backend API" $passed2 "Status: $($test2.StatusCode)"
    
    if ($passed2) {
        $TestResults.Backend.Passed++
    } else {
        $TestResults.Backend.Failed++
    }
    $TestResults.Backend.Tests += @{ Name = "Backend API"; Passed = $passed2 }
    
    # Test 3: Backend response time
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $test3 = Invoke-TestRequest -Url "$BACKEND_URL/health"
    $stopwatch.Stop()
    $responseTime = $stopwatch.ElapsedMilliseconds
    $passed3 = $responseTime -lt 5000  # Less than 5 seconds
    Write-Test "Backend Response Time" $passed3 "Response time: ${responseTime}ms"
    
    if ($passed3) {
        $TestResults.Backend.Passed++
    } else {
        $TestResults.Backend.Failed++
    }
    $TestResults.Backend.Tests += @{ Name = "Backend Response Time"; Passed = $passed3; Metric = "${responseTime}ms" }
}

# Function to test database
function Test-Database {
    Write-Status "Testing Database (Supabase)..."
    
    # Test 1: Database connection
    $headers = @{
        "apikey" = $SUPABASE_ANON_KEY
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    }
    
    $test1 = Invoke-TestRequest -Url "$SUPABASE_URL/rest/v1/" -Headers $headers
    $passed1 = $test1.Success -and $test1.StatusCode -eq 200
    Write-Test "Database Connection" $passed1 "Status: $($test1.StatusCode)"
    
    if ($passed1) {
        $TestResults.Database.Passed++
    } else {
        $TestResults.Database.Failed++
    }
    $TestResults.Database.Tests += @{ Name = "Database Connection"; Passed = $passed1 }
    
    # Test 2: Database tables access
    $test2 = Invoke-TestRequest -Url "$SUPABASE_URL/rest/v1/reports?select=*&limit=1" -Headers $headers
    $passed2 = $test2.Success -and $test2.StatusCode -eq 200
    Write-Test "Database Tables" $passed2 "Status: $($test2.StatusCode)"
    
    if ($passed2) {
        $TestResults.Database.Passed++
    } else {
        $TestResults.Database.Failed++
    }
    $TestResults.Database.Tests += @{ Name = "Database Tables"; Passed = $passed2 }
    
    # Test 3: Database response time
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $test3 = Invoke-TestRequest -Url "$SUPABASE_URL/rest/v1/" -Headers $headers
    $stopwatch.Stop()
    $responseTime = $stopwatch.ElapsedMilliseconds
    $passed3 = $responseTime -lt 2000  # Less than 2 seconds
    Write-Test "Database Response Time" $passed3 "Response time: ${responseTime}ms"
    
    if ($passed3) {
        $TestResults.Database.Passed++
    } else {
        $TestResults.Database.Failed++
    }
    $TestResults.Database.Tests += @{ Name = "Database Response Time"; Passed = $passed3; Metric = "${responseTime}ms" }
}

# Function to test Cloudinary
function Test-Cloudinary {
    Write-Status "Testing Cloudinary..."
    
    # Test 1: Cloudinary CDN accessibility
    $test1 = Invoke-TestRequest -Url "https://res.cloudinary.com/$CLOUDINARY_CLOUD_NAME"
    $passed1 = $test1.Success -and $test1.StatusCode -eq 200
    Write-Test "Cloudinary CDN" $passed1 "Status: $($test1.StatusCode)"
    
    if ($passed1) {
        $TestResults.Cloudinary.Passed++
    } else {
        $TestResults.Cloudinary.Failed++
    }
    $TestResults.Cloudinary.Tests += @{ Name = "Cloudinary CDN"; Passed = $passed1 }
    
    # Test 2: Cloudinary API accessibility (expect 404 for unauthenticated access)
    $test2 = Invoke-TestRequest -Url "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME"
    $passed2 = $test2.Success -and ($test2.StatusCode -eq 404 -or $test2.StatusCode -eq 401 -or $test2.StatusCode -eq 200)
    Write-Test "Cloudinary API" $passed2 "API accessible (Status: $($test2.StatusCode))"
    
    if ($passed2) {
        $TestResults.Cloudinary.Passed++
    } else {
        $TestResults.Cloudinary.Failed++
    }
    $TestResults.Cloudinary.Tests += @{ Name = "Cloudinary API"; Passed = $passed2 }
    
    # Test 3: Cloudinary upload preset accessibility (expect 400 for missing parameters)
    $test3 = Invoke-TestRequest -Url "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/image/upload"
    $passed3 = $test3.Success -and ($test3.StatusCode -eq 400 -or $test3.StatusCode -eq 401)
    Write-Test "Cloudinary Upload" $passed3 "Upload endpoint accessible (Status: $($test3.StatusCode))"
    
    if ($passed3) {
        $TestResults.Cloudinary.Passed++
    } else {
        $TestResults.Cloudinary.Failed++
    }
    $TestResults.Cloudinary.Tests += @{ Name = "Cloudinary Upload"; Passed = $passed3 }
}

# Function to test performance
function Test-Performance {
    Write-Status "Testing Performance..."
    
    # Test 1: Frontend load time
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $test1 = Invoke-TestRequest -Url $FRONTEND_URL
    $stopwatch.Stop()
    $loadTime = $stopwatch.ElapsedMilliseconds
    $passed1 = $loadTime -lt 3000  # Less than 3 seconds
    Write-Test "Frontend Load Time" $passed1 "Load time: ${loadTime}ms"
    
    if ($passed1) {
        $TestResults.Performance.Passed++
    } else {
        $TestResults.Performance.Failed++
    }
    $TestResults.Performance.Tests += @{ Name = "Frontend Load Time"; Passed = $passed1; Metric = "${loadTime}ms" }
    
    # Test 2: Backend API response time
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $test2 = Invoke-TestRequest -Url "$BACKEND_URL/health"
    $stopwatch.Stop()
    $apiTime = $stopwatch.ElapsedMilliseconds
    $passed2 = $apiTime -lt 1000  # Less than 1 second
    Write-Test "API Response Time" $passed2 "Response time: ${apiTime}ms"
    
    if ($passed2) {
        $TestResults.Performance.Passed++
    } else {
        $TestResults.Performance.Failed++
    }
    $TestResults.Performance.Tests += @{ Name = "API Response Time"; Passed = $passed2; Metric = "${apiTime}ms" }
}

# Function to generate test report
function Write-TestReport {
    Write-Host "`nTest Results Summary" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    
    $totalPassed = 0
    $totalFailed = 0
    
    foreach ($category in $TestResults.Keys) {
        $categoryData = $TestResults[$category]
        $totalPassed += $categoryData.Passed
        $totalFailed += $categoryData.Failed
        
        Write-Host "$category Tests:" -ForegroundColor Yellow
        Write-Host "  [PASS] Passed: $($categoryData.Passed)" -ForegroundColor Green
        Write-Host "  [FAIL] Failed: $($categoryData.Failed)" -ForegroundColor Red
        
        if ($Verbose -and $categoryData.Tests.Count -gt 0) {
            foreach ($test in $categoryData.Tests) {
                $status = if ($test.Passed) { "[PASS]" } else { "[FAIL]" }
                $metric = if ($test.Metric) { " ($($test.Metric))" } else { "" }
                Write-Host "    $status $($test.Name)$metric" -ForegroundColor $(if ($test.Passed) { "Green" } else { "Red" })
            }
        }
        Write-Host ""
    }
    
    Write-Host "Overall Results:" -ForegroundColor Yellow
    Write-Host "  [PASS] Total Passed: $totalPassed" -ForegroundColor Green
    Write-Host "  [FAIL] Total Failed: $totalFailed" -ForegroundColor Red
    Write-Host "  Success Rate: $([math]::Round(($totalPassed / ($totalPassed + $totalFailed)) * 100, 1))%" -ForegroundColor Cyan
    
    # Overall assessment
    if ($totalFailed -eq 0) {
        Write-Success "All tests passed! Your deployment is working correctly."
    } elseif ($totalFailed -le 2) {
        Write-Warning "Most tests passed. Check the failed tests above."
    } else {
        Write-Error "Multiple tests failed. Please review your deployment configuration."
    }
}

# Main execution
try {
    if (-not $SkipFrontend) {
        Test-Frontend
    }
    
    if (-not $SkipBackend) {
        Test-Backend
    }
    
    if (-not $SkipDatabase) {
        Test-Database
    }
    
    if (-not $SkipCloudinary) {
        Test-Cloudinary
    }
    
    if (-not $SkipPerformance) {
        Test-Performance
    }
    
    Write-TestReport
    
} catch {
    Write-Error "Test execution failed: $($_.Exception.Message)"
    exit 1
}

Write-Host "`nQuick Links:" -ForegroundColor Cyan
Write-Host "  Frontend: $FRONTEND_URL" -ForegroundColor White
Write-Host "  Backend: $BACKEND_URL" -ForegroundColor White
Write-Host "  Database: $SUPABASE_URL" -ForegroundColor White
Write-Host "  Cloudinary: https://res.cloudinary.com/$CLOUDINARY_CLOUD_NAME" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Review any failed tests above" -ForegroundColor White
Write-Host "  2. Check deployment logs in Vercel/Render dashboards" -ForegroundColor White
Write-Host "  3. Verify environment variables are set correctly" -ForegroundColor White
Write-Host "  4. Test manual user workflows in the browser" -ForegroundColor White 