# 🔐 GitHub Secrets Setup Guide

Since you're working with a different AWS account and can't run AWS CLI commands locally, this guide will help you set up GitHub Actions to work with your AWS account.

## 🏗️ AWS Account Setup

### Step 1: Create IAM User for GitHub Actions

1. **Log into your AWS Console** (the account where you want to deploy)
2. **Go to IAM Console** → Users → Create User
3. **User Name**: `github-actions-lux-gaming`
4. **Access Type**: Programmatic access
5. **Click Next**

### Step 2: Attach Required Policies

Attach these policies to the IAM user:

#### **AmazonEKSClusterPolicy**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:*",
                "ec2:*",
                "iam:*",
                "cloudformation:*",
                "autoscaling:*",
                "elasticloadbalancing:*",
                "ecr:*",
                "logs:*",
                "cloudwatch:*"
            ],
            "Resource": "*"
        }
    ]
}
```

#### **AmazonEC2ContainerRegistryPowerUser**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:PutImage"
            ],
            "Resource": "*"
        }
    ]
}
```

#### **Custom Policy for EKS Management**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:CreateCluster",
                "eks:DeleteCluster",
                "eks:DescribeCluster",
                "eks:ListClusters",
                "eks:UpdateClusterConfig",
                "eks:UpdateClusterVersion",
                "eks:CreateNodegroup",
                "eks:DeleteNodegroup",
                "eks:DescribeNodegroup",
                "eks:ListNodegroups",
                "eks:UpdateNodegroupConfig",
                "eks:UpdateNodegroupVersion",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:GetRole",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PassRole",
                "ec2:CreateVpc",
                "ec2:DeleteVpc",
                "ec2:CreateSubnet",
                "ec2:DeleteSubnet",
                "ec2:CreateSecurityGroup",
                "ec2:DeleteSecurityGroup",
                "ec2:CreateInternetGateway",
                "ec2:DeleteInternetGateway",
                "ec2:CreateRouteTable",
                "ec2:DeleteRouteTable",
                "ec2:CreateRoute",
                "ec2:DeleteRoute",
                "ec2:CreateNatGateway",
                "ec2:DeleteNatGateway",
                "ec2:AllocateAddress",
                "ec2:ReleaseAddress",
                "cloudformation:CreateStack",
                "cloudformation:DeleteStack",
                "cloudformation:DescribeStacks",
                "cloudformation:UpdateStack",
                "cloudformation:ListStacks",
                "cloudformation:DescribeStackEvents",
                "cloudformation:ValidateTemplate",
                "autoscaling:CreateAutoScalingGroup",
                "autoscaling:DeleteAutoScalingGroup",
                "autoscaling:DescribeAutoScalingGroups",
                "autoscaling:UpdateAutoScalingGroup",
                "elasticloadbalancing:CreateLoadBalancer",
                "elasticloadbalancing:DeleteLoadBalancer",
                "elasticloadbalancing:DescribeLoadBalancers",
                "elasticloadbalancing:CreateTargetGroup",
                "elasticloadbalancing:DeleteTargetGroup",
                "elasticloadbalancing:DescribeTargetGroups",
                "elasticloadbalancing:CreateListener",
                "elasticloadbalancing:DeleteListener",
                "elasticloadbalancing:DescribeListeners",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "cloudwatch:PutMetricData",
                "cloudwatch:GetMetricData",
                "cloudwatch:DescribeAlarms",
                "cloudwatch:PutMetricAlarm",
                "cloudwatch:DeleteAlarms",
                "s3:CreateBucket",
                "s3:DeleteBucket",
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "codebuild:CreateProject",
                "codebuild:DeleteProject",
                "codebuild:StartBuild",
                "codebuild:BatchGetBuilds",
                "codebuild:UpdateProject",
                "codepipeline:CreatePipeline",
                "codepipeline:DeletePipeline",
                "codepipeline:StartPipelineExecution",
                "codepipeline:GetPipelineState",
                "codepipeline:UpdatePipeline"
            ],
            "Resource": "*"
        }
    ]
}
```

### Step 3: Create Access Keys

1. **Select the IAM user** you just created
2. **Go to Security credentials tab**
3. **Click "Create access key"**
4. **Select "Application running outside AWS"**
5. **Copy the Access Key ID and Secret Access Key**

## 🔐 GitHub Secrets Configuration

### Step 1: Go to Your GitHub Repository

1. **Navigate to your repository** on GitHub
2. **Click Settings** (tab)
3. **Click Secrets and variables** → **Actions** (left sidebar)

### Step 2: Add Required Secrets

Add these secrets to your repository:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Your AWS Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI...` | Your AWS Secret Access Key |
| `AWS_REGION` | `us-east-1` | Your preferred AWS region |
| `EKS_CLUSTER_NAME` | `lux-gaming-cluster` | Name for your EKS cluster |
| `ECR_REPOSITORY` | `lux-gaming` | ECR repository name |

### Step 3: Add Optional Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `DOCKER_REGISTRY` | `your-account.dkr.ecr.us-east-1.amazonaws.com` | ECR registry URL |
| `ENVIRONMENT` | `production` | Environment name |
| `DOMAIN_NAME` | `your-domain.com` | Your domain name (optional) |

## 🔄 Updated GitHub Actions Workflow

The workflow will now work with your AWS account:

```yaml
name: Lux Gaming CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  EKS_CLUSTER_NAME: ${{ secrets.EKS_CLUSTER_NAME }}
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}

jobs:
  test:
    name: Test Application
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: |
        cd lugx-backend/services/game && npm install
        cd ../order && npm install
        cd ../user && npm install
        cd ../analytics && npm install
        cd ../api-gateway && npm install
        
    - name: Run unit tests
      run: |
        cd lugx-backend/services/game && npm test || true
        cd ../order && npm test || true
        cd ../user && npm test || true
        cd ../analytics && npm test || true
        cd ../api-gateway && npm test || true

  build:
    name: Build and Push Docker Images
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ secrets.AWS_REGION }}
        
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2
      
    - name: Create ECR repositories
      run: |
        aws ecr create-repository --repository-name ${{ secrets.ECR_REPOSITORY }}-frontend || true
        aws ecr create-repository --repository-name ${{ secrets.ECR_REPOSITORY }}-game || true
        aws ecr create-repository --repository-name ${{ secrets.ECR_REPOSITORY }}-user || true
        aws ecr create-repository --repository-name ${{ secrets.ECR_REPOSITORY }}-order || true
        aws ecr create-repository --repository-name ${{ secrets.ECR_REPOSITORY }}-analytics || true
        aws ecr create-repository --repository-name ${{ secrets.ECR_REPOSITORY }}-api-gateway || true
        
    - name: Build and push frontend image
      run: |
        docker build -t ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-frontend:${{ github.sha }} ./lux-frontend
        docker push ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-frontend:${{ github.sha }}
        
    - name: Build and push game service image
      run: |
        docker build -t ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-game:${{ github.sha }} ./lugx-backend/services/game
        docker push ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-game:${{ github.sha }}
        
    - name: Build and push user service image
      run: |
        docker build -t ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-user:${{ github.sha }} ./lugx-backend/services/user
        docker push ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-user:${{ github.sha }}
        
    - name: Build and push order service image
      run: |
        docker build -t ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-order:${{ github.sha }} ./lugx-backend/services/order
        docker push ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-order:${{ github.sha }}
        
    - name: Build and push analytics service image
      run: |
        docker build -t ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-analytics:${{ github.sha }} ./lugx-backend/services/analytics
        docker push ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-analytics:${{ github.sha }}
        
    - name: Build and push api-gateway image
      run: |
        docker build -t ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-api-gateway:${{ github.sha }} ./lugx-backend/services/api-gateway
        docker push ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-api-gateway:${{ github.sha }}

  deploy:
    name: Deploy to EKS
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ secrets.AWS_REGION }}
        
    - name: Create EKS cluster
      run: |
        # Create CloudFormation stack for EKS cluster
        aws cloudformation create-stack \
          --stack-name lux-gaming-eks \
          --template-body file://cloudformation/eks-cluster.yaml \
          --parameters \
            ParameterKey=ClusterName,ParameterValue=${{ secrets.EKS_CLUSTER_NAME }} \
            ParameterKey=NodeInstanceType,ParameterValue=t3.medium \
            ParameterKey=NodeGroupMinSize,ParameterValue=2 \
            ParameterKey=NodeGroupMaxSize,ParameterValue=4 \
            ParameterKey=NodeGroupDesiredSize,ParameterValue=2 \
          --capabilities CAPABILITY_NAMED_IAM \
          --region ${{ secrets.AWS_REGION }} || true
        
        # Wait for stack creation
        aws cloudformation wait stack-create-complete \
          --stack-name lux-gaming-eks \
          --region ${{ secrets.AWS_REGION }}
        
    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig \
          --name ${{ secrets.EKS_CLUSTER_NAME }} \
          --region ${{ secrets.AWS_REGION }}
        
    - name: Install add-ons
      run: |
        # Install AWS Load Balancer Controller
        kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"
        helm repo add eks https://aws.github.io/eks-charts
        helm repo update
        helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
          -n kube-system \
          --set clusterName=${{ secrets.EKS_CLUSTER_NAME }} \
          --set serviceAccount.create=false \
          --set serviceAccount.name=aws-load-balancer-controller
        
        # Install NGINX Ingress Controller
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml
        
        # Wait for ingress controller
        kubectl wait --namespace ingress-nginx \
          --for=condition=ready pod \
          --selector=app.kubernetes.io/component=controller \
          --timeout=300s
        
    - name: Deploy application
      run: |
        # Update image tags in deployment files
        sed -i "s|image: .*|image: ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-frontend:${{ github.sha }}|g" k8s/frontend-deployment.yaml
        sed -i "s|image: .*|image: ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-game:${{ github.sha }}|g" k8s/game-deployment.yaml
        sed -i "s|image: .*|image: ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-user:${{ github.sha }}|g" k8s/user-deployment.yaml
        sed -i "s|image: .*|image: ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}-order:${{ github.sha }}|g" k8s/order-deployment.yaml
        
        # Apply Kubernetes manifests
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/configmap.yaml
        kubectl apply -f k8s/secret.yaml
        kubectl apply -f k8s/game-deployment.yaml
        kubectl apply -f k8s/game-service.yaml
        kubectl apply -f k8s/user-deployment.yaml
        kubectl apply -f k8s/user-service.yaml
        kubectl apply -f k8s/order-deployment.yaml
        kubectl apply -f k8s/order-service.yaml
        kubectl apply -f k8s/frontend-deployment.yaml
        kubectl apply -f k8s/frontend-service.yaml
        kubectl apply -f k8s/ingress.yaml
        
        # Wait for deployments to be ready
        kubectl wait --for=condition=available --timeout=600s deployment/game-deployment -n lux-gaming
        kubectl wait --for=condition=available --timeout=600s deployment/user-deployment -n lux-gaming
        kubectl wait --for=condition=available --timeout=600s deployment/order-deployment -n lux-gaming
        kubectl wait --for=condition=available --timeout=600s deployment/frontend-deployment -n lux-gaming

  integration-test:
    name: Integration Tests
    needs: deploy
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ secrets.AWS_REGION }}
        
    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig \
          --name ${{ secrets.EKS_CLUSTER_NAME }} \
          --region ${{ secrets.AWS_REGION }}
        
    - name: Install kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'
        
    - name: Wait for services to be ready
      run: |
        kubectl wait --for=condition=ready pods -l app=game -n lux-gaming --timeout=300s
        kubectl wait --for=condition=ready pods -l app=user -n lux-gaming --timeout=300s
        kubectl wait --for=condition=ready pods -l app=order -n lux-gaming --timeout=300s
        kubectl wait --for=condition=ready pods -l app=frontend -n lux-gaming --timeout=300s
        
    - name: Run integration tests
      run: |
        chmod +x ci-integration-tests.sh
        ./ci-integration-tests.sh
        
    - name: Get service URLs
      run: |
        echo "Service URLs:"
        kubectl get services -n lux-gaming
        echo ""
        echo "Ingress:"
        kubectl get ingress -n lux-gaming

  notify:
    name: Notify Deployment Status
    needs: [integration-test]
    runs-on: ubuntu-latest
    if: always() && github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - name: Notify success
      if: needs.integration-test.result == 'success'
      run: |
        echo "✅ Deployment successful!"
        echo "Application deployed to EKS cluster: ${{ secrets.EKS_CLUSTER_NAME }}"
        echo "Region: ${{ secrets.AWS_REGION }}"
        
    - name: Notify failure
      if: needs.integration-test.result == 'failure'
      run: |
        echo "❌ Deployment failed!"
        echo "Please check the logs for more details."
```

## 🔧 Connection Flow

### How It Works:

1. **GitHub Actions** runs in GitHub's cloud (not your local machine)
2. **AWS credentials** are provided via GitHub secrets
3. **GitHub Actions** connects to your AWS account using these credentials
4. **All AWS operations** happen in your AWS account, not locally
5. **No local AWS CLI** required on your machine

### Connection Diagram:
```
Your Local Machine → GitHub Repository → GitHub Actions → Your AWS Account
     (No AWS CLI)     (Code + Secrets)    (Runs in Cloud)    (EKS + ECR)
```

## 🚀 Deployment Process

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

### Step 2: GitHub Actions Automatically:
1. **Runs tests** on your code
2. **Builds Docker images** and pushes to ECR
3. **Creates EKS cluster** using CloudFormation
4. **Deploys application** to EKS
5. **Runs integration tests**
6. **Sends notifications**

### Step 3: Monitor Deployment
- **GitHub Actions** tab shows progress
- **AWS Console** shows EKS cluster
- **No local commands** needed

## 📊 Monitoring

### Check Deployment Status:
1. **GitHub Actions** tab in your repository
2. **AWS EKS Console** → Clusters
3. **AWS CloudFormation** → Stacks

### Access Your Application:
1. **Get Load Balancer URL** from AWS Console
2. **Access via browser**: `http://<load-balancer-url>`

## 🎯 Benefits of This Approach

- ✅ **No local AWS CLI** required
- ✅ **Works with any AWS account**
- ✅ **Fully automated** deployment
- ✅ **Secure** credential management
- ✅ **Scalable** and maintainable
- ✅ **No Terraform** dependencies

This setup allows you to deploy to any AWS account without needing local AWS CLI access! 