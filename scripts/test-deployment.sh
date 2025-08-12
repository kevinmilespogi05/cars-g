#!/bin/bash

# Cars-G Deployment Testing Script for Linux/Mac
# This script tests all deployment components: Vercel, Render, Supabase, and Cloudinary

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="https://cars-g.vercel.app/"
BACKEND_URL="https://cars-g-api.onrender.com"
SUPABASE_URL="https://mffuqdwqjdxbwpbhuxby.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnVxZHdxamR4YndwYmh1eGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MTI4NzMsImV4cCI6MjA1OTQ4ODg3M30.3ALtkwlAO-V_98e-Y263l9pYSWjW1h1AY3qhqSTMkW0"
CLOUDINARY_CLOUD_NAME="dzqtdl5aa"

# Test results tracking
declare -A test_results
declare -A test_counts

# Initialize test counts
test_counts[frontend_passed]=0
test_counts[frontend_failed]=0
test_counts[backend_passed]=0
test_counts[backend_failed]=0
test_counts[database_passed]=0
test_counts[database_failed]=0
test_counts[cloudinary_passed]=0
test_counts[cloudinary_failed]=0
test_counts[performance_passed]=0
test_counts[performance_failed]=0

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_test() {
    local test_name="$1"
    local passed="$2"
    local message="$3"
    
    if [ "$passed" = "true" ]; then
        echo -e "${GREEN}✅ $test_name: $message${NC}"
    else
        echo -e "${RED}❌ $test_name: $message${NC}"
    fi
}

# Function to make HTTP requests
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local headers="${3:-}"
    local body="${4:-}"
    
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response_body"
    
    if [ "$method" != "GET" ]; then
        curl_cmd="$curl_cmd -X $method"
    fi
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi
    
    if [ -n "$body" ]; then
        curl_cmd="$curl_cmd -d '$body'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local status_code=$(eval $curl_cmd)
    local response_body=$(cat /tmp/response_body 2>/dev/null || echo "")
    
    echo "$status_code|$response_body"
}

# Function to test frontend
test_frontend() {
    print_status "Testing Frontend (Vercel)..."
    
    # Test 1: Frontend accessibility
    local result=$(make_request "$FRONTEND_URL")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2-)
    
    local passed1=false
    if [ "$status_code" = "200" ]; then
        passed1=true
        ((test_counts[frontend_passed]++))
    else
        ((test_counts[frontend_failed]++))
    fi
    
    print_test "Frontend Accessibility" "$passed1" "Status: $status_code"
    
    # Test 2: Frontend response time
    local start_time=$(date +%s%3N)
    make_request "$FRONTEND_URL" > /dev/null 2>&1
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    local passed2=false
    if [ $response_time -lt 3000 ]; then
        passed2=true
        ((test_counts[frontend_passed]++))
    else
        ((test_counts[frontend_failed]++))
    fi
    
    print_test "Frontend Response Time" "$passed2" "Response time: ${response_time}ms"
    
    # Test 3: Check for common frontend errors
    if [ "$status_code" = "200" ]; then
        local has_errors=false
        if echo "$response_body" | grep -i "error\|exception" > /dev/null; then
            has_errors=true
        fi
        
        local passed3=false
        if [ "$has_errors" = "false" ]; then
            passed3=true
            ((test_counts[frontend_passed]++))
        else
            ((test_counts[frontend_failed]++))
        fi
        
        print_test "Frontend Error Check" "$passed3" "No obvious errors found"
    fi
}

# Function to test backend
test_backend() {
    print_status "Testing Backend (Render)..."
    
    # Test 1: Backend health endpoint
    local result=$(make_request "$BACKEND_URL/health")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    
    local passed1=false
    if [ "$status_code" = "200" ]; then
        passed1=true
        ((test_counts[backend_passed]++))
    else
        ((test_counts[backend_failed]++))
    fi
    
    print_test "Backend Health" "$passed1" "Status: $status_code"
    
    # Test 2: Backend API endpoint
    local result2=$(make_request "$BACKEND_URL/api/reports")
    local status_code2=$(echo "$result2" | cut -d'|' -f1)
    
    local passed2=false
    if [ "$status_code2" = "200" ]; then
        passed2=true
        ((test_counts[backend_passed]++))
    else
        ((test_counts[backend_failed]++))
    fi
    
    print_test "Backend API" "$passed2" "Status: $status_code2"
    
    # Test 3: Backend response time
    local start_time=$(date +%s%3N)
    make_request "$BACKEND_URL/health" > /dev/null 2>&1
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    local passed3=false
    if [ $response_time -lt 5000 ]; then
        passed3=true
        ((test_counts[backend_passed]++))
    else
        ((test_counts[backend_failed]++))
    fi
    
    print_test "Backend Response Time" "$passed3" "Response time: ${response_time}ms"
}

# Function to test database
test_database() {
    print_status "Testing Database (Supabase)..."
    
    local headers="apikey: $SUPABASE_ANON_KEY, Authorization: Bearer $SUPABASE_ANON_KEY"
    
    # Test 1: Database connection
    local result=$(make_request "$SUPABASE_URL/rest/v1/" "GET" "$headers")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    
    local passed1=false
    if [ "$status_code" = "200" ]; then
        passed1=true
        ((test_counts[database_passed]++))
    else
        ((test_counts[database_failed]++))
    fi
    
    print_test "Database Connection" "$passed1" "Status: $status_code"
    
    # Test 2: Database tables access
    local result2=$(make_request "$SUPABASE_URL/rest/v1/reports?select=*&limit=1" "GET" "$headers")
    local status_code2=$(echo "$result2" | cut -d'|' -f1)
    
    local passed2=false
    if [ "$status_code2" = "200" ]; then
        passed2=true
        ((test_counts[database_passed]++))
    else
        ((test_counts[database_failed]++))
    fi
    
    print_test "Database Tables" "$passed2" "Status: $status_code2"
    
    # Test 3: Database response time
    local start_time=$(date +%s%3N)
    make_request "$SUPABASE_URL/rest/v1/" "GET" "$headers" > /dev/null 2>&1
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    local passed3=false
    if [ $response_time -lt 2000 ]; then
        passed3=true
        ((test_counts[database_passed]++))
    else
        ((test_counts[database_failed]++))
    fi
    
    print_test "Database Response Time" "$passed3" "Response time: ${response_time}ms"
}

# Function to test Cloudinary
test_cloudinary() {
    print_status "Testing Cloudinary..."
    
    # Test 1: Cloudinary CDN accessibility
    local result=$(make_request "https://res.cloudinary.com/$CLOUDINARY_CLOUD_NAME")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    
    local passed1=false
    if [ "$status_code" = "200" ]; then
        passed1=true
        ((test_counts[cloudinary_passed]++))
    else
        ((test_counts[cloudinary_failed]++))
    fi
    
    print_test "Cloudinary CDN" "$passed1" "Status: $status_code"
    
    # Test 2: Cloudinary API accessibility (expect 404 for unauthenticated access)
    local result2=$(make_request "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME")
    local status_code2=$(echo "$result2" | cut -d'|' -f1)
    
    local passed2=false
    if [ "$status_code2" = "200" ] || [ "$status_code2" = "401" ] || [ "$status_code2" = "404" ]; then
        passed2=true
        ((test_counts[cloudinary_passed]++))
    else
        ((test_counts[cloudinary_failed]++))
    fi
    
    print_test "Cloudinary API" "$passed2" "API accessible (Status: $status_code2)"
    
    # Test 3: Cloudinary upload preset accessibility (expect 400 for missing parameters)
    local result3=$(make_request "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/image/upload")
    local status_code3=$(echo "$result3" | cut -d'|' -f1)
    
    local passed3=false
    if [ "$status_code3" = "400" ] || [ "$status_code3" = "401" ]; then
        passed3=true
        ((test_counts[cloudinary_passed]++))
    else
        ((test_counts[cloudinary_failed]++))
    fi
    
    print_test "Cloudinary Upload" "$passed3" "Upload endpoint accessible (Status: $status_code3)"
}

# Function to test performance
test_performance() {
    print_status "Testing Performance..."
    
    # Test 1: Frontend load time
    local start_time=$(date +%s%3N)
    make_request "$FRONTEND_URL" > /dev/null 2>&1
    local end_time=$(date +%s%3N)
    local load_time=$((end_time - start_time))
    
    local passed1=false
    if [ $load_time -lt 3000 ]; then
        passed1=true
        ((test_counts[performance_passed]++))
    else
        ((test_counts[performance_failed]++))
    fi
    
    print_test "Frontend Load Time" "$passed1" "Load time: ${load_time}ms"
    
    # Test 2: Backend API response time
    local start_time2=$(date +%s%3N)
    make_request "$BACKEND_URL/health" > /dev/null 2>&1
    local end_time2=$(date +%s%3N)
    local api_time=$((end_time2 - start_time2))
    
    local passed2=false
    if [ $api_time -lt 1000 ]; then
        passed2=true
        ((test_counts[performance_passed]++))
    else
        ((test_counts[performance_failed]++))
    fi
    
    print_test "API Response Time" "$passed2" "Response time: ${api_time}ms"
}

# Function to generate test report
print_test_report() {
    echo -e "\n${CYAN}📊 Test Results Summary${NC}"
    echo -e "${CYAN}========================${NC}\n"
    
    local total_passed=0
    local total_failed=0
    
    # Frontend results
    echo -e "${YELLOW}Frontend Tests:${NC}"
    echo -e "  ${GREEN}✅ Passed: ${test_counts[frontend_passed]}${NC}"
    echo -e "  ${RED}❌ Failed: ${test_counts[frontend_failed]}${NC}\n"
    total_passed=$((total_passed + test_counts[frontend_passed]))
    total_failed=$((total_failed + test_counts[frontend_failed]))
    
    # Backend results
    echo -e "${YELLOW}Backend Tests:${NC}"
    echo -e "  ${GREEN}✅ Passed: ${test_counts[backend_passed]}${NC}"
    echo -e "  ${RED}❌ Failed: ${test_counts[backend_failed]}${NC}\n"
    total_passed=$((total_passed + test_counts[backend_passed]))
    total_failed=$((total_failed + test_counts[backend_failed]))
    
    # Database results
    echo -e "${YELLOW}Database Tests:${NC}"
    echo -e "  ${GREEN}✅ Passed: ${test_counts[database_passed]}${NC}"
    echo -e "  ${RED}❌ Failed: ${test_counts[database_failed]}${NC}\n"
    total_passed=$((total_passed + test_counts[database_passed]))
    total_failed=$((total_failed + test_counts[database_failed]))
    
    # Cloudinary results
    echo -e "${YELLOW}Cloudinary Tests:${NC}"
    echo -e "  ${GREEN}✅ Passed: ${test_counts[cloudinary_passed]}${NC}"
    echo -e "  ${RED}❌ Failed: ${test_counts[cloudinary_failed]}${NC}\n"
    total_passed=$((total_passed + test_counts[cloudinary_passed]))
    total_failed=$((total_failed + test_counts[cloudinary_failed]))
    
    # Performance results
    echo -e "${YELLOW}Performance Tests:${NC}"
    echo -e "  ${GREEN}✅ Passed: ${test_counts[performance_passed]}${NC}"
    echo -e "  ${RED}❌ Failed: ${test_counts[performance_failed]}${NC}\n"
    total_passed=$((total_passed + test_counts[performance_passed]))
    total_failed=$((total_failed + test_counts[performance_failed]))
    
    echo -e "${YELLOW}Overall Results:${NC}"
    echo -e "  ${GREEN}✅ Total Passed: $total_passed${NC}"
    echo -e "  ${RED}❌ Total Failed: $total_failed${NC}"
    
    if [ $((total_passed + total_failed)) -gt 0 ]; then
        local success_rate=$(echo "scale=1; $total_passed * 100 / ($total_passed + $total_failed)" | bc -l 2>/dev/null || echo "0")
        echo -e "  ${CYAN}📊 Success Rate: ${success_rate}%${NC}"
    fi
    
    # Overall assessment
    if [ $total_failed -eq 0 ]; then
        print_success "🎉 All tests passed! Your deployment is working correctly."
    elif [ $total_failed -le 2 ]; then
        print_warning "⚠️  Most tests passed. Check the failed tests above."
    else
        print_error "❌ Multiple tests failed. Please review your deployment configuration."
    fi
}

# Parse command line arguments
SKIP_FRONTEND=false
SKIP_BACKEND=false
SKIP_DATABASE=false
SKIP_CLOUDINARY=false
SKIP_PERFORMANCE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --skip-database)
            SKIP_DATABASE=true
            shift
            ;;
        --skip-cloudinary)
            SKIP_CLOUDINARY=true
            shift
            ;;
        --skip-performance)
            SKIP_PERFORMANCE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-frontend] [--skip-backend] [--skip-database] [--skip-cloudinary] [--skip-performance] [--verbose]"
            exit 1
            ;;
    esac
done

# Main execution
echo -e "${CYAN}🧪 Starting Cars-G Deployment Testing...${NC}"

# Check if curl is available
if ! command -v curl &> /dev/null; then
    print_error "curl is required but not installed. Please install curl first."
    exit 1
fi

# Check if bc is available for calculations
if ! command -v bc &> /dev/null; then
    print_warning "bc is not installed. Success rate calculation will be skipped."
fi

# Run tests
if [ "$SKIP_FRONTEND" = "false" ]; then
    test_frontend
fi

if [ "$SKIP_BACKEND" = "false" ]; then
    test_backend
fi

if [ "$SKIP_DATABASE" = "false" ]; then
    test_database
fi

if [ "$SKIP_CLOUDINARY" = "false" ]; then
    test_cloudinary
fi

if [ "$SKIP_PERFORMANCE" = "false" ]; then
    test_performance
fi

print_test_report

echo -e "\n${CYAN}🔗 Quick Links:${NC}"
echo -e "  Frontend: $FRONTEND_URL"
echo -e "  Backend: $BACKEND_URL"
echo -e "  Database: $SUPABASE_URL"
echo -e "  Cloudinary: https://res.cloudinary.com/$CLOUDINARY_CLOUD_NAME"

echo -e "\n${CYAN}📝 Next Steps:${NC}"
echo -e "  1. Review any failed tests above"
echo -e "  2. Check deployment logs in Vercel/Render dashboards"
echo -e "  3. Verify environment variables are set correctly"
echo -e "  4. Test manual user workflows in the browser"

# Clean up temporary files
rm -f /tmp/response_body 