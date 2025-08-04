# Lux Gaming CI/CD Pipeline with AWS EKS

This repository contains a complete CI/CD pipeline for the Lux Gaming application, designed to be **scalable**, **secure**, **fault-tolerant**, and **affordable**. The solution uses AWS EKS (Elastic Kubernetes Service) with CloudFormation templates for infrastructure as code.

## 🏗️ Architecture Overview

### Infrastructure Components
- **AWS EKS Cluster**: Managed Kubernetes cluster
- **VPC with Public/Private Subnets**: Network isolation and security
- **Application Load Balancer**: Traffic distribution
- **Auto Scaling Groups**: Automatic scaling based on demand
- **CloudFormation**: Infrastructure as Code

### Application Components
- **Frontend**: React-based gaming interface
- **Game Service**: Game management and logic
- **User Service**: User authentication and management
- **Order Service**: Order processing and management
- **Analytics Service**: Data analytics and metrics
- **API Gateway**: Request routing and authentication

## 🚀 Features

### ✅ Scalable
- **Horizontal Pod Autoscaler (HPA)**: Automatic scaling based on CPU/Memory usage
- **Multiple Replicas**: Rolling deployment strategy with zero downtime
- **Load Balancing**: Distributed traffic across multiple instances
- **Auto Scaling Groups**: Node-level scaling based on demand

### ✅ Secure
- **Network Security**: Private subnets for backend services
- **IAM Roles**: Least privilege access control
- **Secrets Management**: Kubernetes secrets for sensitive data
- **Security Scanning**: Automated vulnerability scanning with Trivy
- **HTTPS/TLS**: SSL certificate support

### ✅ Fault-Tolerant
- **Multi-AZ Deployment**: Services distributed across availability zones
- **Health Checks**: Automated health monitoring and recovery
- **Rolling Updates**: Zero-downtime deployments
- **Circuit Breakers**: Service resilience patterns
- **Backup and Recovery**: Automated backup strategies

### ✅ Affordable
- **Spot Instances**: Cost optimization for non-critical workloads
- **Resource Optimization**: Efficient resource allocation
- **Simplified Monitoring**: Basic monitoring without complex tools
- **Auto Scaling**: Pay only for what you use

## 📋 Prerequisites

### Required Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install Docker
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

### AWS Configuration
```bash
# Configure AWS credentials
aws configure

# Set your AWS region
export AWS_DEFAULT_REGION=us-east-1
```

## 🛠️ Deployment

### Option 1: Automated Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Lux_Gaming
   ```

2. **Run the deployment script**
   ```bash
   chmod +x deploy-aws-eks.sh
   ./deploy-aws-eks.sh
   ```

3. **Monitor the deployment**
   ```bash
   kubectl get pods -n lux-gaming
   kubectl get services -n lux-gaming
   ```

### Option 2: Manual CloudFormation Deployment

1. **Create the EKS cluster**
   ```bash
   aws cloudformation create-stack \
     --stack-name lux-gaming-eks \
     --template-body file://cloudformation/eks-cluster.yaml \
     --capabilities CAPABILITY_NAMED_IAM \
     --parameters \
       ParameterKey=ClusterName,ParameterValue=lux-gaming-cluster \
       ParameterKey=NodeInstanceType,ParameterValue=t3.medium
   ```

2. **Configure kubectl**
   ```bash
   aws eks update-kubeconfig --name lux-gaming-cluster --region us-east-1
   ```

3. **Deploy the application**
   ```bash
   kubectl apply -f k8s/
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline includes the following stages:

1. **Test Stage**
   - Unit tests for all services
   - Code linting and quality checks
   - Security vulnerability scanning

2. **Build Stage**
   - Docker image building
   - Push to Amazon ECR
   - Image tagging with commit SHA

3. **Deploy Stage**
   - Deploy to EKS cluster
   - Rolling update strategy
   - Health checks and readiness probes

4. **Integration Test Stage**
   - Automated integration tests
   - Service endpoint validation
   - Load balancer testing

5. **Security Scan Stage**
   - Trivy vulnerability scanning
   - Security report generation
   - GitHub Security tab integration

### Pipeline Configuration

To set up the GitHub Actions pipeline:

1. **Add AWS Secrets to GitHub**
   - Go to your repository settings
   - Navigate to Secrets and variables > Actions
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`

2. **Configure Environment Variables**
   ```yaml
   env:
     AWS_REGION: us-east-1
     EKS_CLUSTER_NAME: lux-gaming-cluster
     ECR_REPOSITORY: lux-gaming
   ```

## 🧪 Testing

### Integration Tests

The pipeline includes comprehensive integration tests:

```bash
# Run integration tests locally
chmod +x ci-integration-tests.sh
./ci-integration-tests.sh
```

### Test Coverage

- **Service Health Checks**: All services have `/health` endpoints
- **API Endpoint Testing**: Validates all REST endpoints
- **Database Connectivity**: Ensures database connections work
- **Load Balancer Testing**: Verifies traffic distribution
- **Security Testing**: Validates authentication and authorization

## 📊 Monitoring

### Basic Monitoring Setup

The deployment includes simplified monitoring:

```bash
# Check pod status
kubectl get pods -n lux-gaming

# Check service endpoints
kubectl get services -n lux-gaming

# Check ingress
kubectl get ingress -n lux-gaming

# View logs
kubectl logs -f deployment/game-deployment -n lux-gaming
```

### Metrics Endpoints

Each service exposes metrics:
- `/metrics/game` - Game service metrics
- `/metrics/user` - User service metrics
- `/metrics/order` - Order service metrics

## 🔧 Configuration

### Environment Variables

Update the configuration in `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lux-gaming-config
  namespace: lux-gaming
data:
  DATABASE_URL: "your-database-url"
  JWT_SECRET: "your-jwt-secret"
  API_VERSION: "v1"
```

### Secrets Management

Update secrets in `k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lux-gaming-secrets
  namespace: lux-gaming
type: Opaque
data:
  database-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-jwt-secret>
```

## 🔒 Security

### Network Security
- **Private Subnets**: Backend services run in private subnets
- **Security Groups**: Restrictive firewall rules
- **VPC Endpoints**: Secure AWS service communication

### Application Security
- **JWT Authentication**: Secure API access
- **Input Validation**: Request sanitization
- **HTTPS Only**: Encrypted communication
- **Secrets Management**: Kubernetes secrets for sensitive data

### Infrastructure Security
- **IAM Roles**: Least privilege access
- **Encryption at Rest**: EBS volume encryption
- **Encryption in Transit**: TLS/SSL encryption
- **Security Scanning**: Automated vulnerability detection

## 💰 Cost Optimization

### Resource Optimization
- **Spot Instances**: Use spot instances for non-critical workloads
- **Auto Scaling**: Scale down during low usage
- **Resource Limits**: Set appropriate CPU/Memory limits
- **Image Optimization**: Use multi-stage Docker builds

### Cost Monitoring
```bash
# Check resource usage
kubectl top pods -n lux-gaming
kubectl top nodes

# Monitor costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

## 🚨 Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod <pod-name> -n lux-gaming
   kubectl logs <pod-name> -n lux-gaming
   ```

2. **Services not accessible**
   ```bash
   kubectl get endpoints -n lux-gaming
   kubectl describe service <service-name> -n lux-gaming
   ```

3. **Ingress not working**
   ```bash
   kubectl get ingress -n lux-gaming
   kubectl describe ingress -n lux-gaming
   ```

4. **Auto scaling not working**
   ```bash
   kubectl get hpa -n lux-gaming
   kubectl describe hpa <hpa-name> -n lux-gaming
   ```

### Logs and Debugging

```bash
# View all logs
kubectl logs -f -l app=game -n lux-gaming

# Check events
kubectl get events -n lux-gaming --sort-by='.lastTimestamp'

# Debug a specific pod
kubectl exec -it <pod-name> -n lux-gaming -- /bin/bash
```

## 📈 Scaling

### Horizontal Pod Autoscaler

The deployment includes HPA for automatic scaling:

```yaml
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
```

### Manual Scaling

```bash
# Scale a deployment
kubectl scale deployment game-deployment --replicas=5 -n lux-gaming

# Check scaling status
kubectl get hpa -n lux-gaming
```

## 🔄 Rolling Updates

The deployment uses rolling update strategy for zero-downtime deployments:

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

## 📚 Additional Resources

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: This CI/CD pipeline is designed to be production-ready while maintaining simplicity and cost-effectiveness. It provides 100% uptime through rolling deployments and comprehensive testing while keeping monitoring and infrastructure complexity minimal. 