#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Lux Gaming Full Deployment${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed. Please install kubectl and try again.${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "k8s" ]; then
    echo -e "${RED}❌ k8s directory not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Checking current cluster status...${NC}"
kubectl cluster-info

# Clean up existing deployments (optional - uncomment if you want to start fresh)
echo -e "${YELLOW}🧹 Cleaning up existing deployments...${NC}"
kubectl delete namespace lux-gaming --ignore-not-found=true
sleep 5

# Apply namespace first
echo -e "${YELLOW}🔧 Creating namespace...${NC}"
kubectl apply -f k8s/namespace.yaml

# Apply configmap and secrets
echo -e "${YELLOW}🔧 Applying configmap and secrets...${NC}"
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Apply all deployments
echo -e "${YELLOW}🔧 Deploying all services...${NC}"

echo -e "${BLUE}📦 Deploying Frontend Service...${NC}"
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

echo -e "${BLUE}📦 Deploying Game Service...${NC}"
kubectl apply -f k8s/game-deployment.yaml
kubectl apply -f k8s/game-service.yaml

echo -e "${BLUE}📦 Deploying Order Service...${NC}"
kubectl apply -f k8s/order-deployment.yaml
kubectl apply -f k8s/order-service.yaml

echo -e "${BLUE}📦 Deploying User Service...${NC}"
kubectl apply -f k8s/user-deployment.yaml
kubectl apply -f k8s/user-service.yaml

# Apply ingress
echo -e "${BLUE}📦 Applying Ingress...${NC}"
kubectl apply -f k8s/ingress.yaml

echo -e "${GREEN}✅ All Kubernetes resources applied successfully${NC}"

# Wait for deployments to be ready
echo -e "${YELLOW}⏳ Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/frontend-service -n lux-gaming
kubectl wait --for=condition=available --timeout=300s deployment/game-service -n lux-gaming
kubectl wait --for=condition=available --timeout=300s deployment/order-service -n lux-gaming
kubectl wait --for=condition=available --timeout=300s deployment/user-service -n lux-gaming

echo -e "${GREEN}✅ All deployments are ready!${NC}"

# Show the status
echo -e "${YELLOW}📊 Deployment Status:${NC}"
echo -e "${BLUE}📦 Pods:${NC}"
kubectl get pods -n lux-gaming

echo -e "${BLUE}📦 Services:${NC}"
kubectl get services -n lux-gaming

echo -e "${BLUE}📦 Ingress:${NC}"
kubectl get ingress -n lux-gaming

# Show logs for verification
echo -e "${YELLOW}📋 Recent logs from frontend service:${NC}"
kubectl logs -n lux-gaming deployment/frontend-service --tail=10

echo -e "${GREEN}🎉 Full deployment completed successfully!${NC}"
echo -e "${YELLOW}🌐 Access your application at: http://lugx.yourdomain.com${NC}"
echo -e "${YELLOW}📝 Note: Make sure to update your DNS or hosts file to point lugx.yourdomain.com to your cluster IP${NC}"
echo -e "${BLUE}🔍 To check ingress IP: kubectl get ingress -n lux-gaming${NC}" 