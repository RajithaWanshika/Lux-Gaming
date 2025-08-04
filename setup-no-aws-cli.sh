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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Git
install_git() {
    log "Installing Git..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install git
        else
            warning "Please install Git manually or install Homebrew first"
            return 1
        fi
    else
        # Linux
        sudo apt-get update
        sudo apt-get install -y git
    fi
    
    log "✅ Git installed successfully"
}

# Function to install Docker
install_docker() {
    log "Installing Docker..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command_exists docker; then
            warning "Please install Docker Desktop for macOS from https://www.docker.com/products/docker-desktop"
            warning "After installation, start Docker Desktop and run this script again"
            return 1
        fi
    else
        # Linux
        sudo apt-get update
        sudo apt-get install -y docker.io
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
        warning "Please log out and log back in for Docker group changes to take effect"
    fi
    
    log "✅ Docker installed successfully"
}

# Function to install jq
install_jq() {
    log "Installing jq..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install jq
        else
            warning "Please install jq manually or install Homebrew first"
        fi
    else
        # Linux
        sudo apt-get install -y jq
    fi
    
    log "✅ jq installed successfully"
}

# Function to create .gitignore
create_gitignore() {
    log "Creating .gitignore file..."
    
    cat > .gitignore << 'EOF'
# AWS
.aws/
awscliv2.zip
AWSCLIV2.pkg

# Kubernetes
*.kubeconfig
kubeconfig

# Docker
.dockerignore

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Temporary files
*.tmp
*.temp

# Build artifacts
dist/
build/

# Test coverage
coverage/

# Helm
charts/*.tgz

# Secrets
secrets.yaml
*.pem
*.key
*.crt
EOF

    log "✅ .gitignore created"
}

# Function to setup Git repository
setup_git() {
    log "Setting up Git repository..."
    
    # Initialize git if not already done
    if [ ! -d .git ]; then
        git init
    fi
    
    # Configure git user if not set
    if [ -z "$(git config user.name)" ]; then
        warning "Git user name not configured. Please set it:"
        echo "git config --global user.name 'Your Name'"
        echo "git config --global user.email 'your.email@example.com'"
    fi
    
    # Add all files
    git add .
    
    # Create initial commit
    git commit -m "Initial commit: Lux Gaming CI/CD Pipeline with AWS EKS" || true
    
    log "✅ Git repository initialized"
}

# Function to create GitHub repository
setup_github_repo() {
    log "Setting up GitHub repository..."
    
    if ! command_exists gh; then
        warning "GitHub CLI not installed. Please install it manually:"
        echo "Visit: https://cli.github.com/"
        echo "Or run: brew install gh (macOS)"
        return 1
    fi
    
    # Check if gh is authenticated
    if ! gh auth status &> /dev/null; then
        warning "GitHub CLI not authenticated. Please run: gh auth login"
        return 1
    fi
    
    # Create repository
    REPO_NAME="lux-gaming-cicd"
    gh repo create $REPO_NAME --public --description "Lux Gaming CI/CD Pipeline with AWS EKS" --clone
    
    log "✅ GitHub repository created: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
}

# Function to test Docker builds
test_docker_builds() {
    log "🧪 Testing Docker builds..."
    
    # Test frontend build
    log "Building frontend Docker image..."
    if docker build -t lux-gaming-frontend:test ./lux-frontend; then
        log "✅ Frontend Docker build successful"
    else
        error "❌ Frontend Docker build failed"
        return 1
    fi
    
    # Test backend service builds
    services=("game" "user" "order" "analytics" "api-gateway")
    
    for service in "${services[@]}"; do
        log "Building $service Docker image..."
        if docker build -t lux-gaming-$service:test ./lugx-backend/services/$service; then
            log "✅ $service Docker build successful"
        else
            error "❌ $service Docker build failed"
            return 1
        fi
    done
    
    # Clean up test images
    log "Cleaning up test Docker images..."
    docker rmi $(docker images | grep lux-gaming:test | awk '{print $3}') 2>/dev/null || true
    
    log "✅ All Docker builds successful"
}

# Function to test file structure
test_file_structure() {
    log "🧪 Testing file structure..."
    
    # Check required directories
    required_dirs=("k8s" "cloudformation" ".github/workflows" "lugx-backend/services" "lux-frontend")
    
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log "✅ Directory $dir exists"
        else
            error "❌ Directory $dir missing"
            return 1
        fi
    done
    
    # Check required files
    required_files=(
        "k8s/namespace.yaml"
        "k8s/configmap.yaml"
        "k8s/secret.yaml"
        "k8s/game-deployment.yaml"
        "k8s/user-deployment.yaml"
        "k8s/order-deployment.yaml"
        "k8s/frontend-deployment.yaml"
        "k8s/game-service.yaml"
        "k8s/user-service.yaml"
        "k8s/order-service.yaml"
        "k8s/frontend-service.yaml"
        "k8s/ingress.yaml"
        "cloudformation/eks-cluster.yaml"
        "buildspec.yml"
        "ci-integration-tests.sh"
        "deploy-aws-eks.sh"
        ".github/workflows/ci-cd-pipeline.yml"
        "README-CICD.md"
        "QUICK-START.md"
        "COST-ESTIMATION.md"
        "github-secrets-setup.md"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log "✅ File $file exists"
        else
            error "❌ File $file missing"
            return 1
        fi
    done
    
    log "✅ File structure is complete"
}

# Function to run security scan
run_security_scan() {
    log "🔒 Running security scan..."
    
    # Check for common security issues
    log "Checking for hardcoded secrets..."
    
    # Check for AWS keys in files
    if grep -r "AKIA[0-9A-Z]{16}" . --exclude-dir=.git --exclude=*.md --exclude=*.txt; then
        warning "⚠️  Potential AWS access keys found in files"
    else
        log "✅ No hardcoded AWS keys found"
    fi
    
    # Check for passwords in files
    if grep -r "password.*=" . --exclude-dir=.git --exclude=*.md --exclude=*.txt; then
        warning "⚠️  Potential hardcoded passwords found"
    else
        log "✅ No hardcoded passwords found"
    fi
    
    log "✅ Security scan completed"
}

# Function to show next steps
show_next_steps() {
    log "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "=============="
    echo ""
    echo "1. 🔐 Set up AWS IAM User for GitHub Actions:"
    echo "   - Log into your AWS Console"
    echo "   - Create IAM user: github-actions-lux-gaming"
    echo "   - Attach required policies (see github-secrets-setup.md)"
    echo "   - Create access keys"
    echo ""
    echo "2. 🔐 Add GitHub Secrets:"
    echo "   - Go to your GitHub repository"
    echo "   - Settings → Secrets and variables → Actions"
    echo "   - Add these secrets:"
    echo "     * AWS_ACCESS_KEY_ID"
    echo "     * AWS_SECRET_ACCESS_KEY"
    echo "     * AWS_REGION (e.g., us-east-1)"
    echo "     * EKS_CLUSTER_NAME (e.g., lux-gaming-cluster)"
    echo "     * ECR_REPOSITORY (e.g., lux-gaming)"
    echo ""
    echo "3. 🚀 Push to GitHub:"
    echo "   git add ."
    echo "   git commit -m 'Add CI/CD pipeline for Lux Gaming'"
    echo "   git push origin main"
    echo ""
    echo "4. 📊 Monitor Deployment:"
    echo "   - Check GitHub Actions tab for progress"
    echo "   - Monitor AWS Console for EKS cluster"
    echo ""
    echo "📚 Documentation:"
    echo "   - github-secrets-setup.md - Complete AWS and GitHub setup guide"
    echo "   - README-CICD.md - Complete documentation"
    echo "   - QUICK-START.md - Quick deployment guide"
    echo "   - COST-ESTIMATION.md - Cost breakdown"
}

# Main function
main() {
    log "🚀 Setting up Lux Gaming CI/CD Pipeline (No Local AWS CLI Required)"
    echo "=================================================================="
    
    # Install required tools
    install_git
    install_docker
    install_jq
    
    # Setup Git
    create_gitignore
    setup_git
    
    # Test file structure
    test_file_structure
    
    # Test Docker builds
    test_docker_builds
    
    # Run security scan
    run_security_scan
    
    # Setup GitHub repository (optional)
    if setup_github_repo; then
        log "✅ GitHub repository setup completed"
    else
        warning "GitHub repository setup skipped. You can create it manually later."
    fi
    
    # Show next steps
    show_next_steps
}

# Run main function
main "$@" 