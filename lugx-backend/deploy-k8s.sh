#!/bin/bash

# Kubernetes Deployment Script for Lux Gaming
# Creates all resources from scratch

echo "🚀 Deploying Lux Gaming to Kubernetes"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    fi
}

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_status "ERROR" "kubectl is not installed or not in PATH"
        exit 1
    fi
    print_status "SUCCESS" "kubectl is available"
}

# Function to check if minikube is running
check_minikube() {
    if ! minikube status | grep -q "Running"; then
        print_status "WARNING" "minikube is not running. Starting minikube..."
        minikube start
    else
        print_status "SUCCESS" "minikube is running"
    fi
}

# Function to apply Kubernetes manifests
apply_manifest() {
    local file=$1
    local description=$2
    
    print_status "INFO" "Applying $description..."
    if kubectl apply -f k8s/$file; then
        print_status "SUCCESS" "$description applied successfully"
    else
        print_status "ERROR" "Failed to apply $description"
        return 1
    fi
}

# Function to wait for deployment
wait_for_deployment() {
    local deployment=$1
    local namespace=$2
    
    print_status "INFO" "Waiting for $deployment to be ready..."
    if kubectl wait --for=condition=available --timeout=300s deployment/$deployment -n $namespace; then
        print_status "SUCCESS" "$deployment is ready"
    else
        print_status "ERROR" "$deployment failed to become ready"
        return 1
    fi
}

# Function to check service endpoints
check_service() {
    local service=$1
    local namespace=$2
    
    print_status "INFO" "Checking $service endpoints..."
    kubectl get endpoints $service -n $namespace
}

# Main deployment process
main() {
    echo ""
    print_status "INFO" "Starting Kubernetes deployment..."
    
    # Check prerequisites
    check_kubectl
    check_minikube
    
    echo ""
    print_status "INFO" "Creating namespace..."
    apply_manifest "namespace.yaml" "namespace"
    
    echo ""
    print_status "INFO" "Creating secrets and configmaps..."
    apply_manifest "secret.yaml" "secrets"
    apply_manifest "configmap.yaml" "configmaps"
    
    echo ""
    print_status "INFO" "Deploying services..."
    apply_manifest "game-service.yaml" "game service"
    apply_manifest "order-service.yaml" "order service"
    apply_manifest "user-service.yaml" "user service"
    
    echo ""
    print_status "INFO" "Deploying applications..."
    apply_manifest "game-deployment.yaml" "game deployment"
    apply_manifest "order-deployment.yaml" "order deployment"
    apply_manifest "user-deployment.yaml" "user deployment"
    
    echo ""
    print_status "INFO" "Deploying ingress..."
    apply_manifest "ingress.yaml" "ingress"
    
    echo ""
    print_status "INFO" "Waiting for deployments to be ready..."
    wait_for_deployment "game-service" "lux-gaming"
    wait_for_deployment "order-service" "lux-gaming"
    wait_for_deployment "user-service" "lux-gaming"
    
    echo ""
    print_status "INFO" "Checking service endpoints..."
    check_service "game-service" "lux-gaming"
    check_service "order-service" "lux-gaming"
    check_service "user-service" "lux-gaming"
    
    echo ""
    print_status "SUCCESS" "Deployment completed!"
    
    # Show final status
    echo ""
    print_status "INFO" "Final deployment status:"
    kubectl get all -n lux-gaming
    
    echo ""
    print_status "INFO" "Ingress status:"
    kubectl get ingress -n lux-gaming
    
    echo ""
    print_status "INFO" "Services:"
    kubectl get services -n lux-gaming
    
    echo ""
    print_status "INFO" "Pods:"
    kubectl get pods -n lux-gaming
    
    echo ""
    print_status "INFO" "To access the services:"
    echo "  - Game Service: kubectl port-forward -n lux-gaming service/game-service 8080:80"
    echo "  - Order Service: kubectl port-forward -n lux-gaming service/order-service 8081:80"
    echo "  - User Service: kubectl port-forward -n lux-gaming service/user-service 8082:80"
    echo ""
    print_status "INFO" "To test the services, run: ./test-k8s-services.sh"
}

# Run main function
main "$@" 