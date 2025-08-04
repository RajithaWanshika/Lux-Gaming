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

# Function to install AWS CLI
install_aws_cli() {
    log "Installing AWS CLI..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install awscli
        else
            curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
            sudo installer -pkg AWSCLIV2.pkg -target /
        fi
    else
        # Linux
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
    fi
    
    log "✅ AWS CLI installed successfully"
}

# Function to install kubectl
install_kubectl() {
    log "Installing kubectl..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install kubectl
        else
            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
            chmod +x kubectl
            sudo mv kubectl /usr/local/bin/
        fi
    else
        # Linux
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        sudo mv kubectl /usr/local/bin/
    fi
    
    log "✅ kubectl installed successfully"
}

# Function to install Docker
install_docker() {
    log "Installing Docker..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command_exists docker; then
            warning "Please install Docker Desktop for macOS from https://www.docker.com/products/docker-desktop"
            warning "After installation, start Docker Desktop and run this script again"
            exit 1
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

# Function to install Helm
install_helm() {
    log "Installing Helm..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install helm
        else
            curl https://get.helm.sh/helm-v3.12.0-darwin-amd64.tar.gz -o helm.tar.gz
            tar -xzf helm.tar.gz
            sudo mv darwin-amd64/helm /usr/local/bin/
            rm -rf darwin-amd64 helm.tar.gz
        fi
    else
        # Linux
        curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz -o helm.tar.gz
        tar -xzf helm.tar.gz
        sudo mv linux-amd64/helm /usr/local/bin/
        rm -rf linux-amd64 helm.tar.gz
    fi
    
    log "✅ Helm installed successfully"
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

# Function to configure AWS
configure_aws() {
    log "Configuring AWS..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        warning "AWS credentials not configured. Please run 'aws configure'"
        echo "You'll need to provide:"
        echo "- AWS Access Key ID"
        echo "- AWS Secret Access Key"
        echo "- Default region (e.g., us-east-1)"
        echo "- Default output format (json)"
        echo ""
        read -p "Press Enter to continue with aws configure..."
        aws configure
    fi
    
    log "✅ AWS configured successfully"
}

# Function to test installations
test_installations() {
    log "Testing installations..."
    
    # Test AWS CLI
    if aws --version &> /dev/null; then
        log "✅ AWS CLI is working"
    else
        error "❌ AWS CLI is not working"
        exit 1
    fi
    
    # Test kubectl
    if kubectl version --client &> /dev/null; then
        log "✅ kubectl is working"
    else
        error "❌ kubectl is not working"
        exit 1
    fi
    
    # Test Docker
    if docker --version &> /dev/null; then
        log "✅ Docker is working"
    else
        error "❌ Docker is not working"
        exit 1
    fi
    
    # Test Helm
    if helm version &> /dev/null; then
        log "✅ Helm is working"
    else
        error "❌ Helm is not working"
        exit 1
    fi
    
    # Test jq
    if jq --version &> /dev/null; then
        log "✅ jq is working"
    else
        error "❌ jq is not working"
        exit 1
    fi
    
    log "✅ All tools are working correctly"
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

# Terraform
*.tfstate
*.tfstate.*
.terraform/

# Secrets
secrets.yaml
*.pem
*.key
*.crt
EOF

    log "✅ .gitignore created"
}

# Function to create initial commit
setup_git() {
    log "Setting up Git repository..."
    
    # Initialize git if not already done
    if [ ! -d .git ]; then
        git init
    fi
    
    # Add all files
    git add .
    
    # Create initial commit
    git commit -m "Initial commit: Lux Gaming CI/CD Pipeline with AWS EKS"
    
    log "✅ Git repository initialized"
}

# Main function
main() {
    log "🚀 Setting up Lux Gaming CI/CD Pipeline Prerequisites"
    echo "=================================================="
    
    # Install required tools
    install_aws_cli
    install_kubectl
    install_docker
    install_helm
    install_jq
    
    # Configure AWS
    configure_aws
    
    # Test installations
    test_installations
    
    # Setup Git
    create_gitignore
    setup_git
    
    # Setup GitHub repository (optional)
    if setup_github_repo; then
        log "✅ GitHub repository setup completed"
    else
        warning "GitHub repository setup skipped. You can create it manually later."
    fi
    
    log "🎉 Prerequisites setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Test the deployment locally: ./test-local-deployment.sh"
    echo "2. Deploy to AWS EKS: ./deploy-aws-eks.sh"
    echo "3. Push to GitHub: git push origin main"
    echo ""
    echo "For GitHub Actions setup:"
    echo "1. Add AWS secrets to your GitHub repository"
    echo "2. Configure the workflow in .github/workflows/ci-cd-pipeline.yml"
}

# Run main function
main "$@" 