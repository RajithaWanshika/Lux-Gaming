# LUGX Gaming - Complete AWS Manual Setup Guide

This guide provides step-by-step instructions for manually deploying your LUGX Gaming microservices on AWS using the AWS Console.

## 🏗️ Architecture Overview

Your final setup will include:

- **VPC** with public/private subnets across 2 AZs
- **Aurora PostgreSQL** clusters for User, Game, and Order services
- **EC2 instances** for each microservice
- **Application Load Balancer** for traffic distribution
- **Security Groups** for network isolation
- **CloudWatch** for monitoring

## 📋 Prerequisites

- AWS Account with appropriate permissions
- Domain name (optional, for custom URLs)
- SSH key pair for EC2 access

---

## 🌐 STEP 1: VPC and Networking Setup

### 1.1 Create VPC

1. **Navigate to VPC Console**

   - AWS Console → VPC → Create VPC

2. **VPC Configuration**

   ```
   Name tag: lugx-gaming-vpc
   IPv4 CIDR block: 10.0.0.0/16
   IPv6 CIDR block: No IPv6 CIDR block
   Tenancy: Default
   ```

3. **Enable DNS Settings**
   - Select your VPC → Actions → Edit VPC settings
   - ✅ Enable DNS resolution
   - ✅ Enable DNS hostnames

### 1.2 Create Internet Gateway

1. **Create Internet Gateway**

   ```
   Name tag: lugx-gaming-igw
   ```

2. **Attach to VPC**
   - Select IGW → Actions → Attach to VPC
   - Select `lugx-gaming-vpc`

### 1.3 Create Subnets

#### Public Subnets (for Load Balancer)

```
1. Name: lugx-public-subnet-1
   VPC: lugx-gaming-vpc
   Availability Zone: us-east-1a
   IPv4 CIDR: 10.0.1.0/24
   ✅ Auto-assign public IPv4 address

2. Name: lugx-public-subnet-2
   VPC: lugx-gaming-vpc
   Availability Zone: us-east-1b
   IPv4 CIDR: 10.0.2.0/24
   ✅ Auto-assign public IPv4 address
```

#### Private Subnets for Applications

```
3. Name: lugx-app-subnet-1
   VPC: lugx-gaming-vpc
   Availability Zone: us-east-1a
   IPv4 CIDR: 10.0.10.0/24

4. Name: lugx-app-subnet-2
   VPC: lugx-gaming-vpc
   Availability Zone: us-east-1b
   IPv4 CIDR: 10.0.11.0/24
```

#### Private Subnets for Databases

```
5. Name: lugx-database-subnet-1
   VPC: lugx-gaming-vpc
   Availability Zone: us-east-1a
   IPv4 CIDR: 10.0.20.0/24

6. Name: lugx-database-subnet-2
   VPC: lugx-gaming-vpc
   Availability Zone: us-east-1b
   IPv4 CIDR: 10.0.21.0/24
```

### 1.4 Create NAT Gateway

1. **Create NAT Gateway**

   ```
   Name: lugx-nat-gateway
   Subnet: lugx-public-subnet-1
   Connectivity type: Public
   ```

2. **Allocate Elastic IP** during creation

### 1.5 Setup Route Tables

#### Public Route Table

1. **Create Route Table**

   ```
   Name: lugx-public-rt
   VPC: lugx-gaming-vpc
   ```

2. **Add Route**

   ```
   Destination: 0.0.0.0/0
   Target: Internet Gateway (lugx-gaming-igw)
   ```

3. **Associate Public Subnets**
   - Subnet associations → Edit
   - Select: lugx-public-subnet-1, lugx-public-subnet-2

#### Private Route Table

1. **Create Route Table**

   ```
   Name: lugx-private-rt
   VPC: lugx-gaming-vpc
   ```

2. **Add Route**

   ```
   Destination: 0.0.0.0/0
   Target: NAT Gateway (lugx-nat-gateway)
   ```

3. **Associate Private Subnets**
   - Select all private subnets (app and database)

---

## 🔒 STEP 2: Security Groups

### 2.1 Load Balancer Security Group

```
Name: lugx-alb-sg
Description: Security group for Application Load Balancer
VPC: lugx-gaming-vpc

Inbound Rules:
- Type: HTTP, Port: 80, Source: 0.0.0.0/0
- Type: HTTPS, Port: 443, Source: 0.0.0.0/0

Outbound Rules:
- Type: All traffic, Destination: 0.0.0.0/0
```

### 2.2 API Gateway Security Group

```
Name: lugx-api-gateway-sg
Description: Security group for API Gateway
VPC: lugx-gaming-vpc

Inbound Rules:
- Type: Custom TCP, Port: 3000, Source: lugx-alb-sg
- Type: SSH, Port: 22, Source: Your IP

Outbound Rules:
- Type: All traffic, Destination: 0.0.0.0/0
```

### 2.3 Microservices Security Group

```
Name: lugx-microservices-sg
Description: Security group for microservices
VPC: lugx-gaming-vpc

Inbound Rules:
- Type: Custom TCP, Port: 3001, Source: lugx-api-gateway-sg (User Service)
- Type: Custom TCP, Port: 3002, Source: lugx-api-gateway-sg (Game Service)
- Type: Custom TCP, Port: 3004, Source: lugx-api-gateway-sg (Order Service)
- Type: Custom TCP, Port: 3005, Source: lugx-api-gateway-sg (Analytics Service)
- Type: SSH, Port: 22, Source: Your IP

Outbound Rules:
- Type: All traffic, Destination: 0.0.0.0/0
```

### 2.4 Database Security Group

```
Name: lugx-database-sg
Description: Security group for PostgreSQL databases
VPC: lugx-gaming-vpc

Inbound Rules:
- Type: PostgreSQL, Port: 5432, Source: lugx-microservices-sg

Outbound Rules:
- Type: All traffic, Destination: 0.0.0.0/0
```

---

## 🗄️ STEP 3: Database Setup

### 3.1 Create DB Subnet Group

1. **Navigate to RDS Console**
2. **Create DB Subnet Group**
   ```
   Name: lugx-db-subnet-group
   Description: Subnet group for LUGX Gaming databases
   VPC: lugx-gaming-vpc
   Availability Zones: us-east-1a, us-east-1b
   Subnets: lugx-database-subnet-1, lugx-database-subnet-2
   ```

### 3.2 Create Aurora Serverless v2 Cluster

#### Shared Serverless Cluster for All Services

1. **RDS Console** → Create database

   ```
   Engine type: Amazon Aurora
   Edition: Aurora PostgreSQL
   Version: Aurora PostgreSQL 15.4
   Templates: Serverless

   Settings:
   DB cluster identifier: lugx-main-cluster
   Master username: lugx_admin
   Master password: [Generate secure password - SAVE THIS!]

   Serverless v2 scaling configuration:
   Minimum Aurora capacity units: 0.5 (dev) / 1.0 (prod)
   Maximum Aurora capacity units: 4.0 (dev) / 8.0 (prod)

   Connectivity:
   VPC: lugx-gaming-vpc
   DB subnet group: lugx-db-subnet-group
   Public access: No
   VPC security groups: lugx-database-sg

   Database options:
   Initial database name: lugx_main_db

   Backup:
   Backup retention period: 7 days
   Backup window: 03:00-04:00 UTC

   Monitoring:
   ✅ Enable Performance Insights
   Performance Insights retention: 7 days (free)
   ```

### 3.3 Create Individual Databases

After the cluster is created, you'll create separate databases for each service:

1. **Connect to the cluster** using any PostgreSQL client
2. **Create databases** for each service:

```sql
-- Connect as lugx_admin user
CREATE DATABASE lugx_user_db;
CREATE DATABASE lugx_game_db;
CREATE DATABASE lugx_order_db;

-- Create service-specific users for better security
CREATE USER lugx_user_service WITH PASSWORD 'secure_user_password';
CREATE USER lugx_game_service WITH PASSWORD 'secure_game_password';
CREATE USER lugx_order_service WITH PASSWORD 'secure_order_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE lugx_user_db TO lugx_user_service;
GRANT ALL PRIVILEGES ON DATABASE lugx_game_db TO lugx_game_service;
GRANT ALL PRIVILEGES ON DATABASE lugx_order_db TO lugx_order_service;
```

### 3.4 Note Database Endpoint

After creation, save this single endpoint (same for all services):

```
Shared Cluster: lugx-main-cluster.cluster-xxxxxxxxx.us-east-1.rds.amazonaws.com
Port: 5432

Databases:
- lugx_user_db (for User Service)
- lugx_game_db (for Game Service)
- lugx_order_db (for Order Service)
```

---

## 🖥️ STEP 4: EC2 Instances

### 4.1 Create Key Pair

1. **EC2 Console** → Key Pairs → Create key pair
   ```
   Name: lugx-gaming-keypair
   Key pair type: RSA
   Private key file format: .pem
   ```
2. **Download** the .pem file

### 4.2 Launch EC2 Instances

Create 5 instances:

#### API Gateway Instance

```
Name: lugx-api-gateway
AMI: Amazon Linux 2023 AMI
Instance type: t3.small
Key pair: lugx-gaming-keypair
VPC: lugx-gaming-vpc
Subnet: lugx-app-subnet-1
Auto-assign public IP: Disable
Security groups: lugx-api-gateway-sg
Storage: 20 GB gp3
```

#### User Service Instance

```
Name: lugx-user-service
Subnet: lugx-app-subnet-2
Security groups: lugx-microservices-sg
[Same other settings]
```

#### Game Service Instance

```
Name: lugx-game-service
Subnet: lugx-app-subnet-1
Security groups: lugx-microservices-sg
[Same other settings]
```

#### Order Service Instance

```
Name: lugx-order-service
Subnet: lugx-app-subnet-2
Security groups: lugx-microservices-sg
[Same other settings]
```

#### Analytics Service Instance

```
Name: lugx-analytics-service
Instance type: t3.medium
Subnet: lugx-app-subnet-1
Security groups: lugx-microservices-sg
[Same other settings]
```

---

## ⚖️ STEP 5: Load Balancer

### 5.1 Create Application Load Balancer

1. **EC2 Console** → Load Balancers → Create load balancer
2. **Application Load Balancer**

   ```
   Name: lugx-gaming-alb
   Scheme: Internet-facing
   IP address type: IPv4

   Network mapping:
   VPC: lugx-gaming-vpc
   Availability Zones:
   - us-east-1a: lugx-public-subnet-1
   - us-east-1b: lugx-public-subnet-2

   Security groups: lugx-alb-sg
   ```

### 5.2 Create Target Group

```
Target group name: lugx-api-gateway-tg
Target type: Instances
Protocol: HTTP
Port: 3000
VPC: lugx-gaming-vpc

Health checks:
Protocol: HTTP
Path: /health
Port: 3000
Healthy threshold: 2
Unhealthy threshold: 3
Timeout: 5 seconds
Interval: 30 seconds
```

### 5.3 Configure Listener

```
Protocol: HTTP
Port: 80
Default action: Forward to lugx-api-gateway-tg
```

### 5.4 Register Target

- Select lugx-api-gateway-tg
- Targets tab → Edit
- Add the API Gateway EC2 instance
- Port: 3000

---

## 🚀 STEP 6: Application Deployment

### 6.1 Connect to Instances

```bash
# Make key file executable
chmod 400 lugx-gaming-keypair.pem

# Connect to each instance (use private IPs)
ssh -i lugx-gaming-keypair.pem ec2-user@10.0.10.x
```

### 6.2 Install Prerequisites (on each instance)

```bash
# Update system
sudo yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Git
sudo yum install -y git
```

### 6.3 Deploy Application Code

```bash
# Clone repository
git clone https://github.com/your-username/Lux_Gaming.git
cd Lux_Gaming/lugx-backend

# Navigate to specific service directory
cd services/api-gateway  # (or user, game, order, analytics)
npm install
```

### 6.4 Configure Environment Variables

#### API Gateway (.env)

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Service URLs (use private IPs of your EC2 instances)
USER_SERVICE_URL=http://10.0.11.x:3001
GAME_SERVICE_URL=http://10.0.10.x:3002
ORDER_SERVICE_URL=http://10.0.11.x:3004
ANALYTICS_SERVICE_URL=http://10.0.10.x:3005

JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### User Service (.env)

```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Shared cluster with user-specific database
DATABASE_URL=postgresql://lugx_user_service:secure_user_password@lugx-main-cluster.cluster-xxxxxxxxx.us-east-1.rds.amazonaws.com:5432/lugx_user_db

JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### Game Service (.env)

```bash
NODE_ENV=production
PORT=3002
HOST=0.0.0.0

# Shared cluster with game-specific database
DATABASE_URL=postgresql://lugx_game_service:secure_game_password@lugx-main-cluster.cluster-xxxxxxxxx.us-east-1.rds.amazonaws.com:5432/lugx_game_db
```

#### Order Service (.env)

```bash
NODE_ENV=production
PORT=3004
HOST=0.0.0.0

# Shared cluster with order-specific database
DATABASE_URL=postgresql://lugx_order_service:secure_order_password@lugx-main-cluster.cluster-xxxxxxxxx.us-east-1.rds.amazonaws.com:5432/lugx_order_db

JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### Analytics Service (.env)

```bash
NODE_ENV=production
PORT=3005
HOST=0.0.0.0

# ClickHouse configuration (if using EC2 ClickHouse)
CLICKHOUSE_HOST=10.0.20.x
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=lugx_analytics
```

### 6.5 Start Services

On each instance, start the respective service:

```bash
# API Gateway
pm2 start server.js --name "api-gateway"

# User Service
pm2 start server.js --name "user-service"

# Game Service
pm2 start server.js --name "game-service"

# Order Service
pm2 start server.js --name "order-service"

# Analytics Service
pm2 start app.js --name "analytics-service"
```

### 6.6 Configure PM2 Auto-Start

```bash
# On each instance
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs
```

---

## 📊 STEP 7: Analytics Database (ClickHouse)

### 7.1 Launch ClickHouse Instance

```
Name: lugx-clickhouse
AMI: Amazon Linux 2023
Instance type: t3.medium
Key pair: lugx-gaming-keypair
VPC: lugx-gaming-vpc
Subnet: lugx-database-subnet-1
Security groups: Create new (lugx-clickhouse-sg)
```

### 7.2 ClickHouse Security Group

```
Name: lugx-clickhouse-sg
Inbound Rules:
- Type: Custom TCP, Port: 8123, Source: lugx-microservices-sg
- Type: Custom TCP, Port: 9000, Source: lugx-microservices-sg
- Type: SSH, Port: 22, Source: Your IP
```

### 7.3 Install ClickHouse

```bash
# Connect to ClickHouse instance
ssh -i lugx-gaming-keypair.pem ec2-user@10.0.20.x

# Install ClickHouse
curl https://clickhouse.com/ | sh
sudo ./clickhouse install

# Start service
sudo systemctl start clickhouse-server
sudo systemctl enable clickhouse-server

# Configure for network access
sudo nano /etc/clickhouse-server/config.xml
# Uncomment: <listen_host>::</listen_host>

sudo systemctl restart clickhouse-server
```

---

## 🔍 STEP 8: Testing

### 8.1 Test Load Balancer

```bash
# Get your ALB DNS name from AWS Console
# Test health endpoint
curl http://your-alb-dns-name.us-east-1.elb.amazonaws.com/health
```

### 8.2 Test Database Connections

```bash
# Install PostgreSQL client on any instance
sudo yum install -y postgresql15

# Test main cluster connection
psql -h lugx-main-cluster.cluster-xxxxxxxxx.us-east-1.rds.amazonaws.com -U lugx_admin -d lugx_main_db

# Test service-specific database connections
psql -h lugx-main-cluster.cluster-xxxxxxxxx.us-east-1.rds.amazonaws.com -U lugx_user_service -d lugx_user_db
psql -h lugx-main-cluster.cluster-xxxxxxxxx.us-east-1.rds.amazonaws.com -U lugx_game_service -d lugx_game_db
psql -h lugx-main-cluster.cluster-xxxxxxxxx.us-east-1.rds.amazonaws.com -U lugx_order_service -d lugx_order_db
```

### 8.3 Test API Endpoints

```bash
# Register user
curl -X POST http://your-alb-dns-name/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://your-alb-dns-name/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get games
curl http://your-alb-dns-name/api/games
```

---

## 📋 Final Checklist

- [ ] VPC with 6 subnets created
- [ ] Internet Gateway and NAT Gateway configured
- [ ] Route tables properly set up
- [ ] 4 Security groups configured
- [ ] 1 Aurora PostgreSQL cluster with 3 databases running
- [ ] 5 EC2 instances launched
- [ ] Application Load Balancer created
- [ ] Target group configured and healthy
- [ ] All services deployed and running
- [ ] Environment variables configured
- [ ] Database connections working
- [ ] ClickHouse installed and running
- [ ] API endpoints responding correctly

---

## 💰 Cost Estimation (Monthly)

```
Aurora PostgreSQL (1 shared cluster): ~$42
EC2 instances (5 × t3.small/medium): ~$85
Application Load Balancer: ~$20
NAT Gateway: ~$32
Data Transfer: ~$10
Total: ~$189/month (26% savings vs separate clusters)
```

## 💡 Cost Breakdown - Shared Cluster Benefits

### **Single Cluster vs Multiple Clusters:**

```
Previous (3 clusters): 3 × db.t4g.medium = ~$110/month
New (1 shared cluster): 1 × db.t4g.large = ~$42/month
Savings: $68/month (62% database cost reduction)
```

### **Why Shared Cluster is Cost-Effective:**

- **Single instance** serving multiple databases
- **Shared resources** (CPU, memory, I/O)
- **One backup** instead of three
- **One monitoring** setup instead of three
- **Simplified management** and maintenance

## 🎉 Success!

Your LUGX Gaming platform is now running on AWS with:

- High availability across multiple AZs
- Secure network isolation
- Scalable database clusters
- Load-balanced traffic distribution

Access your application at: `http://your-alb-dns-name.us-east-1.elb.amazonaws.com`
