#!/bin/bash

# Setup script for EKS CloudFormation infrastructure
echo "🚀 Setting up EKS CloudFormation infrastructure..."

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p infastructure/cloudformation
mkdir -p .github/workflows

# Check if CloudFormation template exists
if [ ! -f "infastructure/cloudformation/eks-cluster.yaml" ]; then
    echo "❌ CloudFormation template not found!"
    echo "Please create infastructure/cloudformation/eks-cluster.yaml with the EKS CloudFormation template"
    exit 1
fi

# Check AWS CLI installation
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found!"
    echo "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check eksctl installation
if ! command -v eksctl &> /dev/null; then
    echo "⚠️  eksctl not found. Installing..."
    
    # Install eksctl based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
        sudo mv /tmp/eksctl /usr/local/bin
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew tap weaveworks/tap
            brew install weaveworks/tap/eksctl
        else
            echo "Please install eksctl manually: https://eksctl.io/introduction/#installation"
            exit 1
        fi
    else
        echo "Please install eksctl manually: https://eksctl.io/introduction/#installation"
        exit 1
    fi
fi

# Check kubectl installation
if ! command -v kubectl &> /dev/null; then
    echo "⚠️  kubectl not found. Please install kubectl"
    echo "Installation guide: https://kubernetes.io/docs/tasks/tools/"
fi

# Check Helm installation
if ! command -v helm &> /dev/null; then
    echo "⚠️  Helm not found. Please install Helm"
    echo "Installation guide: https://helm.sh/docs/intro/install/"
fi

# Validate CloudFormation template
echo "🔍 Validating CloudFormation template..."
aws cloudformation validate-template --template-body file://infastructure/cloudformation/eks-cluster.yaml > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation template is valid"
else
    echo "❌ CloudFormation template validation failed"
    echo "Please check your template syntax"
    exit 1
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
aws sts get-caller-identity > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ AWS credentials are configured"
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo "Account ID: $ACCOUNT_ID"
else
    echo "❌ AWS credentials not configured"
    echo "Please run: aws configure"
    exit 1
fi

# Check required GitHub secrets
echo "🔑 Required GitHub Secrets:"
echo "- AWS_ACCESS_KEY_ID"
echo "- AWS_SECRET_ACCESS_KEY"
echo "- DOCKERHUB_USERNAME"
echo "- DOCKERHUB_TOKEN"
echo ""
echo "Make sure these are configured in your GitHub repository settings."

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Push the infrastructure files to your repository"
echo "2. Configure GitHub secrets"
echo "3. Run the 'EKS Infrastructure Management' workflow to create your cluster"
echo "4. Use the enhanced deploy workflow for automatic deployments"
echo ""
echo "🚀 Your complete CI/CD pipeline is now ready!"