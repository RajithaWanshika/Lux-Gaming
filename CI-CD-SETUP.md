# 🚀 CI/CD Pipeline Setup Guide

## 📋 Overview

This guide will help you set up a complete CI/CD pipeline for your Lux Gaming platform using GitHub Actions. The pipeline includes:

- **🔄 Automatic Deployment**: Deploy to EKS when code is pushed
- **🧪 Testing**: Run tests on pull requests
- **🔒 Security Scanning**: Vulnerability scanning and security checks
- **📊 Monitoring**: Health checks and metrics monitoring
- **🔄 Rollback**: Manual rollback functionality

## 🛠️ Prerequisites

### **1. GitHub Repository Setup**
- Push your code to a GitHub repository
- Enable GitHub Actions in your repository settings

### **2. AWS Credentials**
You need to create an IAM user with the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:DescribeCluster",
                "eks:ListClusters",
                "eks:AccessKubernetesApi"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ],
            "Resource": "*"
        }
    ]
}
```

### **3. Docker Hub Account**
- Create a Docker Hub account
- Create an access token for automated pushes

## 🔐 GitHub Secrets Setup

Add the following secrets to your GitHub repository:

### **AWS Credentials:**
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

### **Docker Hub Credentials:**
- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Your Docker Hub access token

### **How to Add Secrets:**
1. Go to your GitHub repository
2. Click on "Settings"
3. Click on "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with the appropriate name and value

## 📁 Repository Structure

Your repository should have this structure:

```
Lux_Gaming/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # Main deployment workflow
│       ├── test.yml           # Testing workflow
│       ├── security.yml       # Security scanning
│       ├── rollback.yml       # Rollback functionality
│       └── monitor.yml        # Monitoring workflow
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── user-deployment.yaml
│   ├── user-service.yaml
│   ├── game-deployment.yaml
│   ├── game-service.yaml
│   ├── order-deployment.yaml
│   ├── order-service.yaml
│   └── ingress.yaml
├── lux-frontend/
│   └── Dockerfile
└── lugx-backend/
    └── services/
        ├── user/
        │   └── Dockerfile
        ├── game/
        │   └── Dockerfile
        └── order/
            └── Dockerfile
```

## 🚀 Workflow Details

### **1. Main Deployment Workflow (`deploy.yml`)**

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**Steps:**
1. **📥 Checkout code**
2. **🔧 Setup Node.js 18**
3. **🔐 Configure AWS credentials**
4. **🔗 Configure kubectl for EKS**
5. **🐳 Setup Docker Buildx**
6. **🔐 Login to Docker Hub**
7. **🏗️ Build and push Docker images** (all 4 services)
8. **🔄 Update Kubernetes manifests** with new image tags
9. **🚀 Deploy to EKS** (apply all YAML files)
10. **✅ Verify deployment** (check pods, services, ingress)
11. **🧪 Run health checks** (test all services)
12. **📊 Generate deployment summary**

### **2. Testing Workflow (`test.yml`)**

**Triggers:**
- Pull requests to `main` or `develop` branches

**Steps:**
1. **📥 Checkout code**
2. **🔧 Setup Node.js 18**
3. **📦 Install dependencies** (all services)
4. **🧪 Run tests** (unit tests for all services)
5. **🔍 Lint code** (code quality checks)
6. **🐳 Build Docker images** (without pushing)
7. **✅ Generate test summary**

### **3. Security Scanning (`security.yml`)**

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` branch
- Scheduled (every Monday at 2 AM)

**Steps:**
1. **📥 Checkout code**
2. **🔍 Run Trivy vulnerability scanner**
3. **🔍 Run Trivy container scan**
4. **📊 Upload results to GitHub Security tab**
5. **🔍 Run Bandit security linter**
6. **🔍 Run Semgrep static analysis**
7. **🔍 Run npm audit** (dependency vulnerabilities)
8. **✅ Generate security summary**

### **4. Rollback Workflow (`rollback.yml`)**

**Triggers:**
- Manual workflow dispatch

**Inputs:**
- `deployment_name`: Which deployment to rollback
- `rollback_revision`: Which revision to rollback to

**Steps:**
1. **🔐 Configure AWS credentials**
2. **🔗 Configure kubectl**
3. **📋 Check current deployment status**
4. **🔄 Rollback deployment**
5. **✅ Verify rollback**
6. **🧪 Health check after rollback**
7. **📊 Generate rollback summary**

### **5. Monitoring Workflow (`monitor.yml`)**

**Triggers:**
- Scheduled (every 15 minutes)
- Manual workflow dispatch

**Steps:**
1. **🔐 Configure AWS credentials**
2. **🔗 Configure kubectl**
3. **📊 Check cluster health**
4. **🧪 Run health checks**
5. **📈 Check metrics**
6. **🚨 Check for issues**
7. **📊 Generate monitoring report**

## 🔄 Deployment Process

### **Automatic Deployment:**
1. **Code Push**: When you push code to `main` or `develop`
2. **Build Images**: Docker images are built for all services
3. **Push to Registry**: Images are pushed to Docker Hub with commit SHA tags
4. **Update Manifests**: Kubernetes YAML files are updated with new image tags
5. **Deploy to EKS**: All manifests are applied to your EKS cluster
6. **Health Checks**: Services are tested to ensure they're working
7. **Summary**: Deployment summary is generated

### **Manual Rollback:**
1. **Go to Actions**: Navigate to GitHub Actions tab
2. **Select Rollback**: Choose the "Rollback" workflow
3. **Configure**: Select deployment and revision
4. **Execute**: Run the workflow
5. **Verify**: Check that rollback was successful

## 📊 Monitoring and Alerts

### **Health Checks:**
- **Frontend**: `http://localhost:8080/`
- **User Service**: `http://localhost:8081/health/user`
- **Game Service**: `http://localhost:8082/health/game`
- **Order Service**: `http://localhost:8083/health/order`

### **Metrics Endpoints:**
- **User Service**: `http://localhost:8081/metrics/user`
- **Game Service**: `http://localhost:8082/metrics/game`
- **Order Service**: `http://localhost:8083/metrics/order`

### **Monitoring Schedule:**
- **Every 15 minutes**: Automatic health checks
- **Every Monday**: Security scans
- **On every deployment**: Health verification

## 🚨 Troubleshooting

### **Common Issues:**

1. **Docker Build Failures:**
   - Check Dockerfile syntax
   - Verify build context paths
   - Ensure all dependencies are included

2. **Kubernetes Deployment Failures:**
   - Check YAML syntax
   - Verify image names and tags
   - Check resource limits and requests

3. **Health Check Failures:**
   - Verify service endpoints
   - Check application logs
   - Ensure database connectivity

4. **AWS Authentication Issues:**
   - Verify AWS credentials
   - Check IAM permissions
   - Ensure EKS cluster is accessible

### **Debugging Steps:**

1. **Check Workflow Logs:**
   - Go to Actions tab in GitHub
   - Click on the failed workflow
   - Review step-by-step logs

2. **Check EKS Cluster:**
   ```bash
   kubectl get pods -n lux-gaming
   kubectl describe pod <pod-name> -n lux-gaming
   kubectl logs <pod-name> -n lux-gaming
   ```

3. **Check Service Health:**
   ```bash
   kubectl port-forward -n lux-gaming service/frontend-service 8080:80
   curl http://localhost:8080
   ```

## 🎯 Best Practices

### **Code Organization:**
- Keep Dockerfiles in service directories
- Use consistent naming conventions
- Include proper health check endpoints

### **Security:**
- Use secrets for sensitive data
- Regularly update dependencies
- Run security scans frequently

### **Monitoring:**
- Set up proper logging
- Use structured logging format
- Monitor application metrics

### **Deployment:**
- Use semantic versioning
- Tag images with commit SHA
- Implement proper rollback procedures

## 🚀 Getting Started

1. **Fork/Clone** this repository structure
2. **Add GitHub Secrets** as described above
3. **Push your code** to trigger the first deployment
4. **Monitor the Actions** tab for deployment progress
5. **Test the deployment** using the health check endpoints
6. **Set up monitoring** for ongoing health checks

**Your CI/CD pipeline is now ready to automatically deploy your Lux Gaming platform to EKS!** 🎮 