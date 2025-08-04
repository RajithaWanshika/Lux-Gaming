#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Function to check if git is initialized
check_git() {
    if [ ! -d .git ]; then
        error "Git repository not initialized. Please run setup-prerequisites.sh first."
        exit 1
    fi
    
    log "✅ Git repository is initialized"
}

# Function to check git status
check_git_status() {
    log "Checking git status..."
    
    # Check if there are changes to commit
    if git diff --quiet && git diff --cached --quiet; then
        warning "No changes to commit"
        return 1
    else
        log "✅ Changes detected, ready to commit"
        return 0
    fi
}

# Function to check for sensitive information
check_sensitive_info() {
    log "🔒 Checking for sensitive information..."
    
    # Check for AWS keys
    if grep -r "AKIA[0-9A-Z]{16}" . --exclude-dir=.git --exclude=*.md --exclude=*.txt; then
        error "❌ AWS access keys found in files. Please remove them before pushing."
        exit 1
    fi
    
    # Check for AWS secret keys
    if grep -r "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" . --exclude-dir=.git --exclude=*.md --exclude=*.txt; then
        error "❌ AWS secret keys found in files. Please remove them before pushing."
        exit 1
    fi
    
    # Check for database passwords
    if grep -r "password.*=.*[a-zA-Z0-9]" . --exclude-dir=.git --exclude=*.md --exclude=*.txt; then
        warning "⚠️  Potential passwords found in files. Please review before pushing."
    fi
    
    log "✅ No sensitive information detected"
}

# Function to run pre-push tests
run_pre_push_tests() {
    log "🧪 Running pre-push tests..."
    
    # Run local deployment tests
    if ./test-local-deployment.sh; then
        log "✅ Pre-push tests passed"
    else
        error "❌ Pre-push tests failed. Please fix issues before pushing."
        exit 1
    fi
}

# Function to stage files
stage_files() {
    log "📁 Staging files..."
    
    # Add all files except those in .gitignore
    git add .
    
    # Show what will be committed
    log "Files to be committed:"
    git status --porcelain
    
    log "✅ Files staged successfully"
}

# Function to create commit
create_commit() {
    log "💾 Creating commit..."
    
    # Get commit message from user or use default
    if [ -n "$1" ]; then
        commit_message="$1"
    else
        commit_message="Add CI/CD pipeline for Lux Gaming with AWS EKS deployment"
    fi
    
    if git commit -m "$commit_message"; then
        log "✅ Commit created successfully"
    else
        error "❌ Failed to create commit"
        exit 1
    fi
}

# Function to check remote repository
check_remote() {
    log "🌐 Checking remote repository..."
    
    if ! git remote get-url origin &> /dev/null; then
        warning "No remote repository configured. Please add your GitHub repository:"
        echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
        return 1
    fi
    
    log "✅ Remote repository configured: $(git remote get-url origin)"
}

# Function to push to GitHub
push_to_github() {
    log "🚀 Pushing to GitHub..."
    
    # Check if we're on main branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        warning "Not on main branch. Current branch: $current_branch"
        read -p "Do you want to push to $current_branch? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Switching to main branch..."
            git checkout main
        fi
    fi
    
    # Push to GitHub
    if git push origin main; then
        log "✅ Successfully pushed to GitHub"
    else
        error "❌ Failed to push to GitHub"
        echo "Please check your GitHub credentials and try again."
        exit 1
    fi
}

# Function to setup GitHub Actions secrets
setup_github_secrets() {
    log "🔐 Setting up GitHub Actions secrets..."
    
    echo "To enable GitHub Actions, you need to add the following secrets to your repository:"
    echo ""
    echo "1. Go to your GitHub repository"
    echo "2. Click on Settings > Secrets and variables > Actions"
    echo "3. Add the following secrets:"
    echo ""
    echo "   AWS_ACCESS_KEY_ID"
    echo "   AWS_SECRET_ACCESS_KEY"
    echo ""
    echo "You can get these from your AWS IAM console."
    echo ""
    read -p "Press Enter when you've added the secrets..."
    
    log "✅ GitHub Actions secrets setup instructions provided"
}

# Function to show next steps
show_next_steps() {
    log "🎉 Successfully pushed to GitHub!"
    echo ""
    echo "📋 Next Steps:"
    echo "=============="
    echo ""
    echo "1. 🔐 Set up GitHub Actions secrets (if not done already):"
    echo "   - Go to your repository Settings > Secrets and variables > Actions"
    echo "   - Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    echo ""
    echo "2. 🚀 Deploy to AWS EKS:"
    echo "   ./deploy-aws-eks.sh"
    echo ""
    echo "3. 📊 Monitor the deployment:"
    echo "   kubectl get pods -n lux-gaming"
    echo "   kubectl get services -n lux-gaming"
    echo ""
    echo "4. 🧪 Run integration tests:"
    echo "   ./ci-integration-tests.sh"
    echo ""
    echo "5. 📈 Monitor costs:"
    echo "   aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31"
    echo ""
    echo "🔗 Your repository: $(git remote get-url origin)"
    echo ""
    echo "📚 Documentation:"
    echo "   - README-CICD.md - Complete documentation"
    echo "   - QUICK-START.md - Quick deployment guide"
    echo "   - COST-ESTIMATION.md - Cost breakdown"
}

# Function to create a summary of changes
create_summary() {
    log "📝 Creating change summary..."
    
    echo ""
    echo "📋 Changes Summary:"
    echo "=================="
    echo ""
    
    # Show files added/modified
    echo "Files added/modified:"
    git diff --cached --name-status
    
    echo ""
    echo "Total files: $(git diff --cached --name-only | wc -l)"
    echo ""
}

# Main function
main() {
    log "🚀 Pushing Lux Gaming CI/CD Pipeline to GitHub"
    echo "============================================="
    
    # Check prerequisites
    check_git
    
    # Check for sensitive information
    check_sensitive_info
    
    # Run pre-push tests
    run_pre_push_tests
    
    # Check git status
    if ! check_git_status; then
        warning "No changes to commit. Repository is up to date."
        exit 0
    fi
    
    # Stage files
    stage_files
    
    # Create commit
    create_commit "$1"
    
    # Check remote repository
    if ! check_remote; then
        error "Please configure your remote repository first."
        exit 1
    fi
    
    # Push to GitHub
    push_to_github
    
    # Setup GitHub Actions secrets
    setup_github_secrets
    
    # Create summary
    create_summary
    
    # Show next steps
    show_next_steps
}

# Check if help is requested
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [commit_message]"
    echo ""
    echo "This script will:"
    echo "1. Check for sensitive information"
    echo "2. Run pre-push tests"
    echo "3. Stage all files"
    echo "4. Create a commit"
    echo "5. Push to GitHub"
    echo "6. Provide next steps"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use default commit message"
    echo "  $0 'Add CI/CD pipeline for Lux Gaming' # Use custom commit message"
    exit 0
fi

# Run main function
main "$@" 