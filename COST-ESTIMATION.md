# 💰 Cost Estimation - Lux Gaming AWS EKS Deployment

This document provides a detailed cost breakdown for running the Lux Gaming application on AWS EKS.

## 📊 Monthly Cost Breakdown

### 🏗️ Infrastructure Costs

| Component | Instance Type | Quantity | Monthly Cost |
|-----------|---------------|----------|--------------|
| **EKS Cluster** | Managed | 1 | $0.10/hour = $72 |
| **EC2 Nodes** | t3.medium | 2-4 | $0.0416/hour × 2 = $60 |
| **Load Balancer** | ALB | 1 | $16.20 + $0.0225/LCU-hour |
| **EBS Volumes** | gp3 | 4 × 20GB | $0.08/GB × 80GB = $6.40 |
| **Data Transfer** | Outbound | ~100GB | $0.09/GB × 100GB = $9 |
| **CloudWatch Logs** | Standard | ~10GB | $0.50/GB × 10GB = $5 |

**Infrastructure Total: ~$168/month**

### 🐳 Container Registry Costs

| Component | Storage | Data Transfer | Monthly Cost |
|-----------|---------|---------------|--------------|
| **ECR Storage** | 5GB | - | $0.10/GB × 5GB = $0.50 |
| **ECR Data Transfer** | - | 50GB | $0.50/GB × 50GB = $25 |

**Container Registry Total: ~$25.50/month**

### 🔧 CI/CD Pipeline Costs

| Component | Usage | Monthly Cost |
|-----------|-------|--------------|
| **CodeBuild** | 100 builds | $0.005/minute × 60min × 100 = $30 |
| **CodePipeline** | 100 executions | $1.00/execution × 100 = $100 |
| **S3 Storage** | 10GB | $0.023/GB × 10GB = $0.23 |

**CI/CD Pipeline Total: ~$130.23/month**

### 📊 Monitoring & Security Costs

| Component | Usage | Monthly Cost |
|-----------|-------|--------------|
| **CloudWatch Metrics** | Standard | $0.30/metric × 50 metrics = $15 |
| **CloudWatch Alarms** | 10 alarms | $0.10/alarm × 10 = $1 |
| **Security Scanning** | Trivy (Free) | $0 |
| **IAM** | Standard | $0 |

**Monitoring & Security Total: ~$16/month**

## 💰 Total Estimated Monthly Cost

| Category | Monthly Cost |
|----------|--------------|
| Infrastructure | $168.00 |
| Container Registry | $25.50 |
| CI/CD Pipeline | $130.23 |
| Monitoring & Security | $16.00 |
| **TOTAL** | **$339.73** |

## 🎯 Cost Optimization Strategies

### 1. **Instance Optimization**
```bash
# Use Spot Instances for non-critical workloads
kubectl scale deployment analytics-deployment --replicas=0 -n lux-gaming

# Scale down during low usage
kubectl scale deployment game-deployment --replicas=1 -n lux-gaming
```

**Potential Savings: $30-50/month**

### 2. **Auto Scaling Configuration**
```yaml
# Optimize HPA settings
spec:
  minReplicas: 1  # Reduce from 2
  maxReplicas: 5  # Reduce from 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80  # Increase from 70
```

**Potential Savings: $20-30/month**

### 3. **Storage Optimization**
```bash
# Use smaller EBS volumes
kubectl patch pvc <pvc-name> -p '{"spec":{"resources":{"requests":{"storage":"10Gi"}}}}'

# Enable EBS optimization
aws ec2 modify-instance-attribute --instance-id <instance-id> --ebs-optimized
```

**Potential Savings: $5-10/month**

### 4. **CI/CD Optimization**
```yaml
# Reduce build frequency
on:
  push:
    branches: [ main ]  # Only main branch
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
```

**Potential Savings: $50-70/month**

## 📈 Cost Monitoring

### AWS Cost Explorer Queries

```bash
# Get monthly costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# Get EKS-specific costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Elastic Container Service for Kubernetes"]}}'
```

### Kubernetes Resource Monitoring

```bash
# Check resource usage
kubectl top pods -n lux-gaming
kubectl top nodes

# Monitor HPA
kubectl get hpa -n lux-gaming
kubectl describe hpa game-hpa -n lux-gaming
```

## 🎯 Budget Alerts

### CloudWatch Alarms for Cost

```bash
# Create cost alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "MonthlyCostAlert" \
  --alarm-description "Alert when monthly cost exceeds $400" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 400 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## 💡 Cost Optimization Tips

### 1. **Right-sizing Resources**
```yaml
# Optimize resource requests
resources:
  requests:
    cpu: "100m"      # Reduce from 200m
    memory: "128Mi"   # Reduce from 256Mi
  limits:
    cpu: "500m"       # Reduce from 1000m
    memory: "512Mi"   # Reduce from 1Gi
```

### 2. **Use Spot Instances**
```yaml
# Configure spot instances for non-critical workloads
spec:
  template:
    spec:
      nodeSelector:
        node.kubernetes.io/instance-type: spot
```

### 3. **Implement Resource Quotas**
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: lux-gaming-quota
  namespace: lux-gaming
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
```

### 4. **Optimize Image Sizes**
```dockerfile
# Use multi-stage builds
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Cost Comparison

| Deployment Option | Monthly Cost | Features |
|------------------|--------------|----------|
| **AWS EKS (Current)** | $340 | Full managed, auto-scaling, high availability |
| **Self-hosted K8s** | $200 | More control, higher maintenance |
| **Docker Swarm** | $150 | Simpler, less features |
| **ECS Fargate** | $400 | Serverless, higher cost |
| **Lambda + API Gateway** | $100 | Serverless, limited functionality |

## 🎯 Recommended Budget

### **Starter Plan** ($200-300/month)
- 2 t3.medium nodes
- Basic monitoring
- Manual scaling
- Limited CI/CD

### **Production Plan** ($300-500/month)
- 2-4 t3.medium nodes
- Full monitoring
- Auto-scaling
- Complete CI/CD pipeline

### **Enterprise Plan** ($500+/month)
- 4+ t3.large nodes
- Advanced monitoring
- Multi-region deployment
- Advanced security features

## 📈 Scaling Costs

### Horizontal Scaling
- **Additional Node**: +$30/month per t3.medium
- **Additional Pod**: +$5-10/month (depending on resources)
- **Load Balancer**: +$16.20/month per ALB

### Vertical Scaling
- **t3.medium → t3.large**: +$15/month
- **t3.large → t3.xlarge**: +$30/month

## 💰 Cost Savings Summary

| Optimization | Monthly Savings | Implementation Effort |
|--------------|-----------------|----------------------|
| Spot Instances | $30-50 | Low |
| Right-sizing | $20-40 | Medium |
| CI/CD Optimization | $50-70 | Low |
| Storage Optimization | $5-10 | Low |
| **Total Potential Savings** | **$105-170** | **Medium** |

## 🎉 Final Recommendation

**Target Monthly Budget: $250-350**

This provides:
- ✅ High availability (99.9%+ uptime)
- ✅ Auto-scaling capabilities
- ✅ Comprehensive monitoring
- ✅ Security scanning
- ✅ Cost optimization features

**Implementation Priority:**
1. Deploy with current configuration
2. Monitor costs for 1-2 weeks
3. Implement spot instances for non-critical workloads
4. Optimize resource requests based on actual usage
5. Fine-tune auto-scaling parameters 