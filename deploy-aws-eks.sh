#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="lux-gaming-eks"
CLUSTER_NAME="lux-gaming-cluster"
REGION="us-east-1"  # Change this to your preferred region

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

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    log "✅ AWS CLI is installed"
}

# Function to check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install it first."
        exit 1
    fi
    log "✅ kubectl is installed"
}

# Function to check AWS credentials
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    log "✅ AWS credentials are configured"
}

# Function to create EKS cluster using CloudFormation
create_eks_cluster() {
    log "🚀 Creating EKS cluster using CloudFormation..."
    
    # Check if stack already exists
    if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null; then
        warning "Stack $STACK_NAME already exists. Updating..."
        aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://cloudformation/eks-cluster.yaml \
            --parameters \
                ParameterKey=ClusterName,ParameterValue=$CLUSTER_NAME \
                ParameterKey=NodeInstanceType,ParameterValue=t3.medium \
                ParameterKey=NodeGroupMinSize,ParameterValue=2 \
                ParameterKey=NodeGroupMaxSize,ParameterValue=4 \
                ParameterKey=NodeGroupDesiredSize,ParameterValue=2 \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        
        log "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION
    else
        log "Creating new stack $STACK_NAME..."
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://cloudformation/eks-cluster.yaml \
            --parameters \
                ParameterKey=ClusterName,ParameterValue=$CLUSTER_NAME \
                ParameterKey=NodeInstanceType,ParameterValue=t3.medium \
                ParameterKey=NodeGroupMinSize,ParameterValue=2 \
                ParameterKey=NodeGroupMaxSize,ParameterValue=4 \
                ParameterKey=NodeGroupDesiredSize,ParameterValue=2 \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        
        log "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
    fi
    
    log "✅ EKS cluster creation completed"
}

# Function to configure kubectl for the cluster
configure_kubectl() {
    log "🔧 Configuring kubectl for EKS cluster..."
    
    aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION
    
    # Wait for cluster to be ready
    log "Waiting for cluster to be ready..."
    kubectl wait --for=condition=ready nodes --all --timeout=600s
    
    log "✅ kubectl configured for EKS cluster"
}

# Function to install required add-ons
install_addons() {
    log "📦 Installing required add-ons..."
    
    # Install AWS Load Balancer Controller
    log "Installing AWS Load Balancer Controller..."
    kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update
    helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller
    
    # Install NGINX Ingress Controller
    log "Installing NGINX Ingress Controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml
    
    # Wait for ingress controller to be ready
    log "Waiting for NGINX Ingress Controller to be ready..."
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    log "✅ Add-ons installed successfully"
}

# Function to deploy application
deploy_application() {
    log "🚀 Deploying Lux Gaming application..."
    
    # Create namespace
    kubectl apply -f k8s/namespace.yaml
    
    # Apply configurations
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secret.yaml
    
    # Deploy services with rolling update strategy
    log "Deploying services with rolling update strategy..."
    
    # Deploy backend services
    kubectl apply -f k8s/game-deployment.yaml
    kubectl apply -f k8s/game-service.yaml
    
    kubectl apply -f k8s/user-deployment.yaml
    kubectl apply -f k8s/user-service.yaml
    
    kubectl apply -f k8s/order-deployment.yaml
    kubectl apply -f k8s/order-service.yaml
    
    # Deploy frontend
    kubectl apply -f k8s/frontend-deployment.yaml
    kubectl apply -f k8s/frontend-service.yaml
    
    # Deploy ingress
    kubectl apply -f k8s/ingress.yaml
    
    # Wait for deployments to be ready
    log "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=600s deployment/game-deployment -n lux-gaming
    kubectl wait --for=condition=available --timeout=600s deployment/user-deployment -n lux-gaming
    kubectl wait --for=condition=available --timeout=600s deployment/order-deployment -n lux-gaming
    kubectl wait --for=condition=available --timeout=600s deployment/frontend-deployment -n lux-gaming
    
    log "✅ Application deployed successfully"
}

# Function to run integration tests
run_integration_tests() {
    log "🧪 Running integration tests..."
    
    # Make the test script executable
    chmod +x ci-integration-tests.sh
    
    # Run integration tests
    if ./ci-integration-tests.sh; then
        log "✅ All integration tests passed!"
    else
        error "❌ Some integration tests failed"
        exit 1
    fi
}

# Function to display deployment information
display_deployment_info() {
    log "📊 Deployment Information"
    echo "======================================="
    
    # Get cluster information
    echo "Cluster Name: $CLUSTER_NAME"
    echo "Region: $REGION"
    echo "Stack Name: $STACK_NAME"
    
    # Get service URLs
    echo ""
    echo "Service Endpoints:"
    kubectl get services -n lux-gaming
    
    echo ""
    echo "Ingress Information:"
    kubectl get ingress -n lux-gaming
    
    echo ""
    echo "Pod Status:"
    kubectl get pods -n lux-gaming
    
    echo ""
    echo "🔗 Access your application at:"
    echo "Frontend: http://your-load-balancer-url"
    echo "API Gateway: http://your-load-balancer-url/api"
    
    log "✅ Deployment completed successfully!"
}

# Function to setup monitoring (simplified)
setup_monitoring() {
    log "📈 Setting up simplified monitoring..."
    
    # Create a simple monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy a simple metrics server (if not already installed)
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    # Create basic monitoring dashboard
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: monitoring-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Lux Gaming Dashboard",
        "panels": [
          {
            "title": "Pod Status",
            "type": "stat",
            "targets": []
          }
        ]
      }
    }
EOF
    
    log "✅ Basic monitoring setup completed"
}

# Function to setup auto-scaling
setup_autoscaling() {
    log "⚡ Setting up auto-scaling..."
    
    # Create HPA for services
    cat <<EOF | kubectl apply -f -
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: game-hpa
  namespace: lux-gaming
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: game-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF
    
    cat <<EOF | kubectl apply -f -
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-hpa
  namespace: lux-gaming
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF
    
    cat <<EOF | kubectl apply -f -
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-hpa
  namespace: lux-gaming
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF
    
    log "✅ Auto-scaling configured"
}

# Main deployment function
main() {
    log "🚀 Starting Lux Gaming AWS EKS Deployment"
    echo "======================================="
    
    # Pre-deployment checks
    check_aws_cli
    check_kubectl
    check_aws_credentials
    
    # Deploy infrastructure
    create_eks_cluster
    configure_kubectl
    install_addons
    
    # Deploy application
    deploy_application
    
    # Setup additional features
    setup_monitoring
    setup_autoscaling
    
    # Run integration tests
    run_integration_tests
    
    # Display deployment information
    display_deployment_info
    
    log "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Configure your domain name in the ingress"
    echo "2. Set up SSL certificates"
    echo "3. Configure monitoring alerts"
    echo "4. Set up backup and disaster recovery"
}

# Run main function
main "$@" 