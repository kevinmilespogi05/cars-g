#!/bin/bash

# Cars-G Deployment Script
# This script helps with the deployment process

set -e

echo "🚀 Cars-G Deployment Helper"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "git is not installed. Please install git"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    npm install
    
    print_status "Installing backend dependencies..."
    cd server && npm install && cd ..
    
    print_success "Dependencies installed successfully"
}

# Build the project
build_project() {
    print_status "Building frontend..."
    npm run build
    
    print_success "Frontend built successfully"
}

# Check environment variables
check_env() {
    print_status "Checking environment variables..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Please create one based on env.example"
        print_status "Copying env.example to .env..."
        cp env.example .env
        print_warning "Please update .env with your actual values"
    else
        print_success ".env file found"
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if npm test; then
        print_success "Tests passed"
    else
        print_error "Tests failed"
        exit 1
    fi
}

# Check Supabase connection
check_supabase() {
    print_status "Checking Supabase connection..."
    
    # This would require a more complex setup to actually test
    print_warning "Please manually verify your Supabase connection"
    print_status "You can test this by running your app locally"
}

# Show deployment checklist
show_checklist() {
    echo ""
    echo "📋 Deployment Checklist"
    echo "======================"
    echo ""
    echo "1. Database (Supabase):"
    echo "   ☐ Create Supabase project"
    echo "   ☐ Get project URL and anon key"
    echo "   ☐ Run migrations: supabase db push"
    echo ""
    echo "2. Backend (Render):"
    echo "   ☐ Deploy to Render"
    echo "   ☐ Set environment variables"
    echo "   ☐ Test health endpoint: https://your-api.onrender.com/health"
    echo ""
    echo "3. Frontend (Vercel):"
    echo "   ☐ Deploy to Vercel"
    echo "   ☐ Set environment variables"
    echo "   ☐ Update API URLs"
    echo ""
    echo "4. Optional (Cloudinary):"
    echo "   ☐ Create Cloudinary account"
    echo "   ☐ Get credentials"
    echo "   ☐ Set environment variables"
    echo ""
    echo "5. Post-deployment:"
    echo "   ☐ Test WebSocket connections"
    echo "   ☐ Test file uploads"
    echo "   ☐ Verify CORS settings"
    echo "   ☐ Check all features work"
    echo ""
}

# Show useful commands
show_commands() {
    echo ""
    echo "🔧 Useful Commands"
    echo "================="
    echo ""
    echo "Local Development:"
    echo "  npm run dev          # Start frontend dev server"
    echo "  npm run server       # Start backend server"
    echo "  npm run start        # Start both frontend and backend"
    echo ""
    echo "Testing:"
    echo "  npm test             # Run tests"
    echo "  npm run test:watch   # Run tests in watch mode"
    echo "  npm run cypress:open # Open Cypress"
    echo ""
    echo "Building:"
    echo "  npm run build        # Build for production"
    echo "  npm run preview      # Preview production build"
    echo ""
    echo "Database:"
    echo "  supabase db push     # Push migrations to Supabase"
    echo "  supabase db reset    # Reset database (careful!)"
    echo ""
    echo "Deployment:"
    echo "  git add . && git commit -m 'Deploy to production'"
    echo "  git push origin main"
    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo "1. Check dependencies"
    echo "2. Install dependencies"
    echo "3. Build project"
    echo "4. Check environment"
    echo "5. Run tests"
    echo "6. Show deployment checklist"
    echo "7. Show useful commands"
    echo "8. Full pre-deployment check"
    echo "9. Exit"
    echo ""
    read -p "Enter your choice (1-9): " choice
    
    case $choice in
        1) check_dependencies ;;
        2) install_dependencies ;;
        3) build_project ;;
        4) check_env ;;
        5) run_tests ;;
        6) show_checklist ;;
        7) show_commands ;;
        8) 
            check_dependencies
            install_dependencies
            check_env
            run_tests
            build_project
            show_checklist
            ;;
        9) 
            print_success "Goodbye!"
            exit 0
            ;;
        *) 
            print_error "Invalid choice"
            show_menu
            ;;
    esac
}

# Check if script is run with arguments
if [ $# -eq 0 ]; then
    show_menu
else
    case $1 in
        "check") check_dependencies ;;
        "install") install_dependencies ;;
        "build") build_project ;;
        "env") check_env ;;
        "test") run_tests ;;
        "checklist") show_checklist ;;
        "commands") show_commands ;;
        "full") 
            check_dependencies
            install_dependencies
            check_env
            run_tests
            build_project
            show_checklist
            ;;
        *) 
            print_error "Unknown command: $1"
            echo "Usage: $0 [check|install|build|env|test|checklist|commands|full]"
            exit 1
            ;;
    esac
fi 