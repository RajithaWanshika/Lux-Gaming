# 🚀 Complete Deployment Guide - Lux Gaming CI/CD Pipeline

This guide will walk you through the complete process of setting up, testing, and deploying the Lux Gaming CI/CD pipeline to GitHub and AWS EKS.

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] AWS Account with appropriate permissions
- [ ] GitHub Account
- [ ] Local development environment (macOS/Linux)
- [ ] Internet connection for downloading tools

## 🛠️ Step 1: Setup Prerequisites (5 minutes)

Run the automated setup script to install all required tools:

```bash
./setup-prerequisites.sh
```

This script will:
- ✅ Install AWS CLI, kubectl, Docker, Helm, and jq
- ✅ Configure AWS credentials
- ✅ Test all installations
- ✅ Create .gitignore file
- ✅ Initialize Git repository
- ✅ Optionally create GitHub repository

### Manual Setup (if automated script fails)

#### Install AWS CLI
```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

#### Install kubectl
```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

#### Install Docker
```bash
# macOS - Download Docker Desktop from https://www.docker.com/products/docker-desktop
# Linux
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### Configure AWS
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region (us-east-1), and output format (json)
```

## 🧪 Step 2: Test Local Deployment (10 minutes)

Run comprehensive tests to ensure everything works before pushing to GitHub:

```bash
./test-local-deployment.sh
```

This script will test:
- ✅ Docker image builds for all services
- ✅ Kubernetes manifest validation
- ✅ CloudFormation template validation
- ✅ GitHub Actions workflow syntax
- ✅ Integration test script syntax
- ✅ Security scanning for sensitive data
- ✅ Code linting and validation

### Expected Output
```
🧪 Starting Local Deployment Tests
=================================
✅ Directory k8s exists
✅ Directory cloudformation exists
✅ Directory .github/workflows exists
✅ All Docker builds successful
✅ All Kubernetes manifests are valid
✅ CloudFormation template is valid
✅ buildspec.yml is valid
✅ GitHub Actions workflow is valid
✅ All tests passed! Ready to push to GitHub
```

## 🚀 Step 3: Push to GitHub (5 minutes)

Once all tests pass, push your code to GitHub:

```bash
./push-to-github.sh
```

Or with a custom commit message:
```bash
./push-to-github.sh "Add comprehensive CI/CD pipeline for Lux Gaming"
```

This script will:
- ✅ Check for sensitive information
- ✅ Run pre-push tests
- ✅ Stage all files
- ✅ Create commit
- ✅ Push to GitHub
- ✅ Provide next steps

### Manual GitHub Setup (if needed)

If you need to set up GitHub manually:

1. **Create GitHub Repository**
   ```bash
   # Install GitHub CLI
   brew install gh
   gh auth login
   gh repo create lux-gaming-cicd --public --description "Lux Gaming CI/CD Pipeline with AWS EKS"
   ```

2. **Add Remote Repository**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/lux-gaming-cicd.git
   ```

3. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add CI/CD pipeline for Lux Gaming"
   git push origin main
   ```

## 🔐 Step 4: Configure GitHub Actions Secrets

After pushing to GitHub, set up the required secrets:

1. **Go to your GitHub repository**
2. **Navigate to Settings > Secrets and variables > Actions**
3. **Add the following secrets:**

   | Secret Name | Description | How to Get |
   |-------------|-------------|------------|
   | `AWS_ACCESS_KEY_ID` | AWS Access Key ID | AWS IAM Console |
   | `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key | AWS IAM Console |

### Creating AWS IAM User for GitHub Actions

1. **Go to AWS IAM Console**
2. **Create a new user:**
   ```bash
   aws iam create-user --user-name github-actions-lux-gaming
   ```

3. **Attach policies:**
   ```bash
   aws iam attach-user-policy --user-name github-actions-lux-gaming --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
   aws iam attach-user-policy --user-name github-actions-lux-gaming --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
   ```

4. **Create access keys:**
   ```bash
   aws iam create-access-key --user-name github-actions-lux-gaming
   ```

5. **Copy the Access Key ID and Secret Access Key to GitHub secrets**

## 🚀 Step 5: Deploy to AWS EKS (30 minutes)

Deploy your application to AWS EKS:

```bash
./deploy-aws-eks.sh
```

This script will:
- ✅ Create EKS cluster using CloudFormation
- ✅ Configure networking and security
- ✅ Install required add-ons (Load Balancer Controller, NGINX Ingress)
- ✅ Deploy all services with rolling updates
- ✅ Set up auto-scaling (HPA)
- ✅ Configure monitoring
- ✅ Run integration tests

### Expected Output
```
🚀 Starting Lux Gaming AWS EKS Deployment
=========================================
✅ AWS CLI is installed
✅ kubectl is installed
✅ AWS credentials are configured
🚀 Creating EKS cluster using CloudFormation...
✅ EKS cluster creation completed
🔧 Configuring kubectl for EKS cluster...
✅ kubectl configured for EKS cluster
📦 Installing required add-ons...
✅ Add-ons installed successfully
🚀 Deploying Lux Gaming application...
✅ Application deployed successfully
🧪 Running integration tests...
✅ All integration tests passed!
🎉 Deployment completed successfully!
```

## 📊 Step 6: Monitor and Verify Deployment

### Check Deployment Status
```bash
# Check pods
kubectl get pods -n lux-gaming

# Check services
kubectl get services -n lux-gaming

# Check ingress
kubectl get ingress -n lux-gaming

# Check auto-scaling
kubectl get hpa -n lux-gaming
```

### Run Integration Tests
```bash
./ci-integration-tests.sh
```

### Access Your Application
```bash
# Get the Load Balancer URL
kubectl get service -n lux-gaming frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Access your application
# Frontend: http://<load-balancer-url>
# API: http://<load-balancer-url>/api
```

## 🔧 Step 7: Customization and Configuration

### Update Configuration
Edit the configuration files with your specific values:

```bash
# Update configmap
kubectl apply -f k8s/configmap.yaml

# Update secrets
kubectl apply -f k8s/secret.yaml
```

### Scale Services
```bash
# Scale game service to 5 replicas
kubectl scale deployment game-deployment --replicas=5 -n lux-gaming

# Check auto-scaling
kubectl get hpa -n lux-gaming
```

### Monitor Costs
```bash
# Check resource usage
kubectl top pods -n lux-gaming
kubectl top nodes

# Monitor AWS costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. **AWS Credentials Not Configured**
```bash
aws configure
# Enter your AWS credentials
```

#### 2. **Docker Not Running**
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

#### 3. **kubectl Not Working**
```bash
# Check if kubectl is installed
kubectl version --client

# If not installed, run setup script again
./setup-prerequisites.sh
```

#### 4. **EKS Cluster Creation Fails**
```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name lux-gaming-eks

# Check for errors
aws cloudformation describe-stack-events --stack-name lux-gaming-eks
```

#### 5. **Pods Not Starting**
```bash
# Check pod status
kubectl get pods -n lux-gaming

# Check pod logs
kubectl logs <pod-name> -n lux-gaming

# Check pod description
kubectl describe pod <pod-name> -n lux-gaming
```

#### 6. **Services Not Accessible**
```bash
# Check service endpoints
kubectl get endpoints -n lux-gaming

# Check service description
kubectl describe service <service-name> -n lux-gaming
```

#### 7. **GitHub Actions Not Working**
```bash
# Check if secrets are configured
# Go to GitHub repository > Settings > Secrets and variables > Actions
# Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set
```

## 📈 Monitoring and Maintenance

### Daily Monitoring
```bash
# Check pod health
kubectl get pods -n lux-gaming

# Check service endpoints
kubectl get services -n lux-gaming

# Check resource usage
kubectl top pods -n lux-gaming
```

### Weekly Maintenance
```bash
# Update images
kubectl rollout restart deployment/game-deployment -n lux-gaming
kubectl rollout restart deployment/user-deployment -n lux-gaming
kubectl rollout restart deployment/order-deployment -n lux-gaming

# Check for updates
kubectl get pods -n lux-gaming --watch
```

### Monthly Tasks
```bash
# Review costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Update security patches
kubectl get pods -n lux-gaming -o wide
```

## 🎉 Success Checklist

After completing all steps, you should have:

- ✅ **GitHub Repository** with CI/CD pipeline
- ✅ **AWS EKS Cluster** running your application
- ✅ **Auto-scaling** configured for all services
- ✅ **Load balancing** working properly
- ✅ **Integration tests** passing
- ✅ **Monitoring** set up
- ✅ **Security** configured
- ✅ **Cost optimization** in place

## 📚 Additional Resources

- [README-CICD.md](README-CICD.md) - Complete documentation
- [QUICK-START.md](QUICK-START.md) - Quick deployment guide
- [COST-ESTIMATION.md](COST-ESTIMATION.md) - Cost breakdown
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🆘 Need Help?

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Review the logs and error messages**
3. **Run the test scripts to identify issues**
4. **Check the documentation files**
5. **Open an issue on GitHub**

---

**Total Deployment Time**: ~50 minutes  
**Monthly Cost**: ~$250-350  
**Uptime**: 99.9%+  
**Auto-scaling**: ✅ Enabled  
**Security**: ✅ Configured 