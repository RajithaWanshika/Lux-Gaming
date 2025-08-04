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
    
    log "✅ All Docker builds successful"
}

# Function to test Kubernetes manifests
test_k8s_manifests() {
    log "🧪 Testing Kubernetes manifests..."
    
    # Test namespace
    if kubectl apply --dry-run=client -f k8s/namespace.yaml; then
        log "✅ Namespace manifest is valid"
    else
        error "❌ Namespace manifest is invalid"
        return 1
    fi
    
    # Test configmap
    if kubectl apply --dry-run=client -f k8s/configmap.yaml; then
        log "✅ ConfigMap manifest is valid"
    else
        error "❌ ConfigMap manifest is invalid"
        return 1
    fi
    
    # Test secrets
    if kubectl apply --dry-run=client -f k8s/secret.yaml; then
        log "✅ Secret manifest is valid"
    else
        error "❌ Secret manifest is invalid"
        return 1
    fi
    
    # Test deployments
    deployments=("game-deployment.yaml" "user-deployment.yaml" "order-deployment.yaml" "frontend-deployment.yaml")
    
    for deployment in "${deployments[@]}"; do
        if kubectl apply --dry-run=client -f k8s/$deployment; then
            log "✅ $deployment is valid"
        else
            error "❌ $deployment is invalid"
            return 1
        fi
    done
    
    # Test services
    services=("game-service.yaml" "user-service.yaml" "order-service.yaml" "frontend-service.yaml")
    
    for service in "${services[@]}"; do
        if kubectl apply --dry-run=client -f k8s/$service; then
            log "✅ $service is valid"
        else
            error "❌ $service is invalid"
            return 1
        fi
    done
    
    # Test ingress
    if kubectl apply --dry-run=client -f k8s/ingress.yaml; then
        log "✅ Ingress manifest is valid"
    else
        error "❌ Ingress manifest is invalid"
        return 1
    fi
    
    log "✅ All Kubernetes manifests are valid"
}

# Function to test CloudFormation template
test_cloudformation() {
    log "🧪 Testing CloudFormation template..."
    
    if aws cloudformation validate-template --template-body file://cloudformation/eks-cluster.yaml; then
        log "✅ CloudFormation template is valid"
    else
        error "❌ CloudFormation template is invalid"
        return 1
    fi
}

# Function to test buildspec
test_buildspec() {
    log "🧪 Testing buildspec.yml..."
    
    # Check if buildspec.yml exists
    if [ ! -f buildspec.yml ]; then
        error "❌ buildspec.yml not found"
        return 1
    fi
    
    # Validate YAML syntax
    if python3 -c "import yaml; yaml.safe_load(open('buildspec.yml'))" 2>/dev/null; then
        log "✅ buildspec.yml has valid YAML syntax"
    else
        error "❌ buildspec.yml has invalid YAML syntax"
        return 1
    fi
    
    log "✅ buildspec.yml is valid"
}

# Function to test GitHub Actions workflow
test_github_actions() {
    log "🧪 Testing GitHub Actions workflow..."
    
    # Check if workflow file exists
    if [ ! -f .github/workflows/ci-cd-pipeline.yml ]; then
        error "❌ GitHub Actions workflow not found"
        return 1
    fi
    
    # Validate YAML syntax
    if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd-pipeline.yml'))" 2>/dev/null; then
        log "✅ GitHub Actions workflow has valid YAML syntax"
    else
        error "❌ GitHub Actions workflow has invalid YAML syntax"
        return 1
    fi
    
    log "✅ GitHub Actions workflow is valid"
}

# Function to test integration test script
test_integration_script() {
    log "🧪 Testing integration test script..."
    
    # Check if script exists
    if [ ! -f ci-integration-tests.sh ]; then
        error "❌ Integration test script not found"
        return 1
    fi
    
    # Check if script is executable
    if [ ! -x ci-integration-tests.sh ]; then
        warning "Integration test script is not executable, making it executable..."
        chmod +x ci-integration-tests.sh
    fi
    
    # Test script syntax
    if bash -n ci-integration-tests.sh; then
        log "✅ Integration test script has valid syntax"
    else
        error "❌ Integration test script has syntax errors"
        return 1
    fi
    
    log "✅ Integration test script is valid"
}

# Function to test deployment script
test_deployment_script() {
    log "🧪 Testing deployment script..."
    
    # Check if script exists
    if [ ! -f deploy-aws-eks.sh ]; then
        error "❌ Deployment script not found"
        return 1
    fi
    
    # Check if script is executable
    if [ ! -x deploy-aws-eks.sh ]; then
        warning "Deployment script is not executable, making it executable..."
        chmod +x deploy-aws-eks.sh
    fi
    
    # Test script syntax
    if bash -n deploy-aws-eks.sh; then
        log "✅ Deployment script has valid syntax"
    else
        error "❌ Deployment script has syntax errors"
        return 1
    fi
    
    log "✅ Deployment script is valid"
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

# Function to test Docker images
test_docker_images() {
    log "🧪 Testing Docker images..."
    
    # List all test images
    docker images | grep lux-gaming || true
    
    # Clean up test images
    log "Cleaning up test Docker images..."
    docker rmi $(docker images | grep lux-gaming:test | awk '{print $3}') 2>/dev/null || true
    
    log "✅ Docker image testing completed"
}

# Function to run security scan
run_security_scan() {
    log "🔒 Running security scan..."
    
    # Check for common security issues
    log "Checking for hardcoded secrets..."
    
    # Check for AWS keys in files
    if grep -r "AKIA[0-9A-Z]{16}" . --exclude-dir=.git --exclude=*.md; then
        warning "⚠️  Potential AWS access keys found in files"
    else
        log "✅ No hardcoded AWS keys found"
    fi
    
    # Check for passwords in files
    if grep -r "password.*=" . --exclude-dir=.git --exclude=*.md; then
        warning "⚠️  Potential hardcoded passwords found"
    else
        log "✅ No hardcoded passwords found"
    fi
    
    log "✅ Security scan completed"
}

# Function to run linting
run_linting() {
    log "🔍 Running code linting..."
    
    # Check shell scripts
    log "Linting shell scripts..."
    for script in *.sh; do
        if [ -f "$script" ]; then
            if shellcheck "$script"; then
                log "✅ $script passed shellcheck"
            else
                warning "⚠️  $script has shellcheck warnings"
            fi
        fi
    done
    
    # Check YAML files
    log "Linting YAML files..."
    for yaml_file in k8s/*.yaml cloudformation/*.yaml .github/workflows/*.yml; do
        if [ -f "$yaml_file" ]; then
            if python3 -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null; then
                log "✅ $yaml_file has valid YAML syntax"
            else
                error "❌ $yaml_file has invalid YAML syntax"
                return 1
            fi
        fi
    done
    
    log "✅ Linting completed"
}

# Main function
main() {
    log "🧪 Starting Local Deployment Tests"
    echo "================================="
    
    local failed_tests=0
    
    # Test file structure
    if ! test_file_structure; then
        ((failed_tests++))
    fi
    
    # Test Docker builds
    if ! test_docker_builds; then
        ((failed_tests++))
    fi
    
    # Test Kubernetes manifests
    if ! test_k8s_manifests; then
        ((failed_tests++))
    fi
    
    # Test CloudFormation template
    if ! test_cloudformation; then
        ((failed_tests++))
    fi
    
    # Test buildspec
    if ! test_buildspec; then
        ((failed_tests++))
    fi
    
    # Test GitHub Actions workflow
    if ! test_github_actions; then
        ((failed_tests++))
    fi
    
    # Test integration test script
    if ! test_integration_script; then
        ((failed_tests++))
    fi
    
    # Test deployment script
    if ! test_deployment_script; then
        ((failed_tests++))
    fi
    
    # Run linting
    run_linting
    
    # Run security scan
    run_security_scan
    
    # Clean up Docker images
    test_docker_images
    
    # Final results
    echo ""
    echo "================================="
    echo "🧪 Local Test Results"
    echo "================================="
    
    if [ $failed_tests -eq 0 ]; then
        log "✅ All tests passed! Ready to push to GitHub"
        echo ""
        echo "Next steps:"
        echo "1. git add ."
        echo "2. git commit -m 'Add CI/CD pipeline for Lux Gaming'"
        echo "3. git push origin main"
        echo "4. Set up GitHub Actions secrets"
        echo "5. Deploy to AWS EKS: ./deploy-aws-eks.sh"
    else
        error "❌ $failed_tests test(s) failed"
        echo "Please fix the issues before pushing to GitHub"
        exit 1
    fi
}

# Run main function
main "$@" 