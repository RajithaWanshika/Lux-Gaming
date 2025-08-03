# LUGX Gaming - Monitoring & Deployment Setup

**Simplified Microservices Architecture for MSC-Cloud Computing**

## 🔍 Prometheus Monitoring Setup

### 1. Install Prometheus & Grafana

```bash
# Using Docker Compose for simplified demo setup
cat > docker-compose.monitoring.yml << EOF
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-storage:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

  # Optional: Add ClickHouse for Analytics Service
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"
      - "9000:9000"
    environment:
      - CLICKHOUSE_DB=lugx_analytics
    volumes:
      - clickhouse-storage:/var/lib/clickhouse

volumes:
  prometheus-storage:
  grafana-storage:
  clickhouse-storage:
EOF
```

### 2. Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: "lugx-api-gateway"
    static_configs:
      - targets: ["host.docker.internal:3000"]
    metrics_path: "/metrics"
    scrape_interval: 10s

  - job_name: "lugx-user-service"
    static_configs:
      - targets: ["host.docker.internal:3001"]
    metrics_path: "/metrics"
    scrape_interval: 10s

  - job_name: "lugx-game-service"
    static_configs:
      - targets: ["host.docker.internal:3002"]
    metrics_path: "/metrics"
    scrape_interval: 10s

  - job_name: "lugx-order-service"
    static_configs:
      - targets: ["host.docker.internal:3004"]
    metrics_path: "/metrics"
    scrape_interval: 10s

  - job_name: "lugx-analytics-service"
    static_configs:
      - targets: ["host.docker.internal:3005"]
    metrics_path: "/metrics"
    scrape_interval: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### 3. Start Monitoring Stack

```bash
# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps

# Access services:
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
# ClickHouse: http://localhost:8123
```

### 4. Current Metrics Available

#### 🔐 Authentication & User Metrics:

- `user_creations_total` - New user registrations (with bcryptjs)
- `user_logins_total` - User authentication attempts (JWT)
- `active_users_total` - Current active users
- `total_users` - Total registered users

#### 🎮 Game Service Metrics:

- `games_total` - Total games in catalog
- `reviews_total` - Total game reviews
- `http_requests_total{service="game"}` - Game API requests
- `database_operations_duration_seconds{operation="games"}` - Game DB performance

#### 🛒 Order Service Metrics:

- `order_creations_total` - New orders created
- `total_orders` - Total orders count
- `total_revenue` - Revenue from completed orders
- `database_operations_duration_seconds{operation="orders"}` - Order DB performance

#### 📊 Analytics Service Metrics:

- `analytics_events_total` - Tracked events (ClickHouse)
- `analytics_page_views_total` - Page views tracked
- `analytics_game_interactions_total` - Game interaction events
- `http_requests_total{service="analytics"}` - Analytics API requests

#### 🌐 API Gateway Metrics:

- `http_requests_total{service="gateway"}` - Gateway routing requests
- `http_request_duration_seconds` - Response times across all services
- `rate_limit_exceeded_total` - Rate limiting violations

#### 🗄️ Database Metrics:

- `database_operations_duration_seconds` - PostgreSQL query performance
- `database_connections_active` - Active DB connections (max: 5 per service)
- `clickhouse_queries_total` - ClickHouse analytics queries

#### 🛡️ Security Metrics:

- `jwt_tokens_issued_total` - JWT tokens generated
- `authentication_failures_total` - Failed login attempts
- `rate_limit_hits_total` - Rate limiting triggers

---

## 🛠️ Technology Stack Monitoring

### Current Dependencies Being Monitored:

```yaml
Core Framework:
  - Express.js: ^4.21.2
  - Node.js: 18+
  - Jest: ^30.0.5 (test metrics)

Security & Authentication:
  - bcryptjs: ^2.4.3 (password hashing metrics)
  - jsonwebtoken: ^9.0.2 (JWT token metrics)
  - Helmet: ^8.1.0 (security headers)
  - Express Rate Limit: ^8.0.1 (rate limiting metrics)

Databases:
  - PostgreSQL: ^8.16.3 (connection pool metrics)
  - ClickHouse: ^1.4.0 (analytics metrics)

Analytics & Monitoring:
  - Prometheus Client: ^15.1.3 (metrics collection)
  - ua-parser-js: ^2.0.4 (user agent detection)
  - geoip-lite: ^1.4.10 (location tracking)
```

### 5. Database Schema Metrics

#### PostgreSQL Performance:

```promql
# Connection Pool Usage (max 5 per service)
pg_pool_connections_active / pg_pool_connections_max

# Query Performance by Service
database_operations_duration_seconds{service="user"}
database_operations_duration_seconds{service="game"}
database_operations_duration_seconds{service="order"}

# Auto-Timestamp Trigger Performance
database_trigger_executions_total{trigger="update_updated_at"}
```

#### ClickHouse Analytics:

```promql
# Event Ingestion Rate
rate(clickhouse_inserts_total[5m])

# Query Performance
clickhouse_query_duration_seconds{table="user_events"}
clickhouse_query_duration_seconds{table="page_views"}

# Storage Usage by Table
clickhouse_table_size_bytes{table="user_events"}
clickhouse_table_size_bytes{table="game_interactions"}
```

---

## 📊 Simplified Grafana Dashboards

### LUGX Gaming - Demo Dashboard

```json
{
  "dashboard": {
    "title": "LUGX Gaming - MSC Cloud Computing Demo",
    "tags": ["microservices", "demo", "msc-cloud"],
    "panels": [
      {
        "title": "Service Health Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=~\"lugx-.*\"}"
          }
        ]
      },
      {
        "title": "API Requests by Service",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Authentication Activity",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(user_logins_total[5m])",
            "legendFormat": "Logins"
          },
          {
            "expr": "rate(user_creations_total[5m])",
            "legendFormat": "Registrations"
          }
        ]
      },
      {
        "title": "Game Catalog Activity",
        "type": "stat",
        "targets": [
          {
            "expr": "games_total"
          },
          {
            "expr": "reviews_total"
          }
        ]
      },
      {
        "title": "Order Processing",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(order_creations_total[1h])",
            "legendFormat": "Orders/Hour"
          },
          {
            "expr": "total_revenue",
            "legendFormat": "Revenue"
          }
        ]
      },
      {
        "title": "Analytics Events",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(analytics_events_total[5m])",
            "legendFormat": "Events/sec"
          },
          {
            "expr": "rate(analytics_page_views_total[5m])",
            "legendFormat": "Page Views/sec"
          }
        ]
      }
    ]
  }
}
```

### System Performance Dashboard

```json
{
  "dashboard": {
    "title": "LUGX Gaming - System Performance",
    "panels": [
      {
        "title": "Response Times by Service",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile - {{service}}"
          }
        ]
      },
      {
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(database_operations_duration_seconds_sum[5m]) / rate(database_operations_duration_seconds_count[5m])",
            "legendFormat": "Avg Query Time - {{service}}"
          }
        ]
      },
      {
        "title": "Rate Limiting Activity",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(rate_limit_exceeded_total[5m])",
            "legendFormat": "Rate Limits Hit - {{service}}"
          }
        ]
      }
    ]
  }
}
```

---

## 🚨 Alert Rules for Demo Environment

```yaml
# alerts.yml
groups:
  - name: lugx-demo-alerts
    rules:
      - alert: ServiceDown
        expr: up{job=~"lugx-.*"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.job }} has been down for more than 30 seconds"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time on {{ $labels.service }}"
          description: "95th percentile response time is {{ $value }}s"

      - alert: DatabaseConnectionsHigh
        expr: database_connections_active > 4
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "{{ $value }} active connections (max: 5)"

      - alert: RateLimitingActive
        expr: rate(rate_limit_exceeded_total[5m]) > 5
        for: 1m
        labels:
          severity: info
        annotations:
          summary: "Rate limiting active on {{ $labels.service }}"
          description: "{{ $value }} rate limit violations per second"

      - alert: LowOrderActivity
        expr: rate(order_creations_total[1h]) < 0.01
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Low order activity"
          description: "Less than 1 order per hour"

      - alert: ClickHouseQuerySlow
        expr: clickhouse_query_duration_seconds > 1
        for: 30s
        labels:
          severity: warning
        annotations:
          summary: "Slow ClickHouse query"
          description: "Query took {{ $value }}s to complete"
```

---

## 🎯 Demo Deployment Setup

### 1. Quick Local Setup

```bash
# Clone and start all services
git clone <your-repo>
cd lugx-backend

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Install dependencies for all services
./install-all.sh

# Start all microservices
./start-all.sh

# Run health checks
./health-check.sh
```

### 2. Environment Variables for Demo

```bash
# Create .env files for demo
cat > setup-demo-env.sh << 'EOF'
#!/bin/bash

# Common demo settings
export NODE_ENV=development
export HOST=localhost

# JWT Settings
export JWT_SECRET=demo-secret-key-for-msc-cloud-computing

# Database URLs (use local PostgreSQL)
export DATABASE_URL_DEV=postgresql://demo:demo@localhost:5432/lugx_demo
export DATABASE_URL_TEST=postgresql://demo:demo@localhost:5432/lugx_test
export DATABASE_URL=postgresql://demo:demo@localhost:5432/lugx_production

# ClickHouse Settings
export CLICKHOUSE_URL_DEV=http://localhost:8123
export CLICKHOUSE_USERNAME_DEV=default
export CLICKHOUSE_PASSWORD_DEV=
export CLICKHOUSE_DATABASE_DEV=lugx_analytics_demo

# Service URLs
export USER_SERVICE_URL=http://localhost:3001
export GAME_SERVICE_URL=http://localhost:3002
export ORDER_SERVICE_URL=http://localhost:3004
export ANALYTICS_SERVICE_URL=http://localhost:3005

echo "Demo environment configured!"
EOF

chmod +x setup-demo-env.sh
./setup-demo-env.sh
```

### 3. Demo Health Check Script

```bash
# health-check.sh
#!/bin/bash

echo "🏥 LUGX Gaming - Health Check"
echo "================================"

services=(
  "API Gateway:3000"
  "User Service:3001"
  "Game Service:3002"
  "Order Service:3004"
  "Analytics Service:3005"
  "Prometheus:9090"
  "Grafana:3001"
)

for service in "${services[@]}"; do
  name=${service%:*}
  port=${service#*:}

  if curl -s http://localhost:$port/health > /dev/null 2>&1; then
    echo "✅ $name ($port) - Healthy"
  else
    echo "❌ $name ($port) - Unhealthy"
  fi
done

echo ""
echo "📊 Access Points:"
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3001 (admin/admin)"
echo "API Gateway: http://localhost:3000"
```

---

## 📋 MSC-Cloud Computing Demo Checklist

### Phase 1: Local Development Setup

- [ ] Install Node.js 18+ and Docker
- [ ] Start monitoring stack (Prometheus + Grafana)
- [ ] Start all 5 microservices
- [ ] Verify health endpoints
- [ ] Check metrics collection

### Phase 2: Monitoring Configuration

- [ ] Configure Prometheus targets
- [ ] Import Grafana dashboards
- [ ] Set up basic alerts
- [ ] Test metric collection from all services

### Phase 3: Demo Scenarios

- [ ] User registration/login flow (JWT + bcryptjs)
- [ ] Game catalog browsing with reviews
- [ ] Order creation and processing
- [ ] Analytics event tracking with simulation
- [ ] Rate limiting demonstration

### Phase 4: Observability Demo

- [ ] Show real-time metrics in Grafana
- [ ] Demonstrate alert firing
- [ ] Show database performance metrics
- [ ] Analytics dashboard with ClickHouse data

---

## 🎓 Educational Resources

### MSC-Cloud Computing Topics Covered:

- **Microservices Architecture**: 5 independent services
- **Container Orchestration**: Docker Compose setup
- **Monitoring & Observability**: Prometheus + Grafana
- **Database Management**: PostgreSQL + ClickHouse
- **Security**: JWT, bcryptjs, rate limiting
- **Testing**: Jest + Supertest integration
- **Performance Monitoring**: Response times, throughput
- **Analytics**: Real-time event tracking

### Key Learning Outcomes:

1. **Service Discovery**: How services communicate
2. **Metrics Collection**: Business vs system metrics
3. **Alert Management**: Proactive monitoring
4. **Database Optimization**: Connection pooling, query performance
5. **Security Monitoring**: Authentication, rate limiting
6. **Analytics Processing**: Time-series data with ClickHouse

---

## 📞 Support & Resources

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **API Documentation**: http://localhost:3000/api-docs
- **Health Checks**: http://localhost:{port}/health
- **Metrics**: http://localhost:{port}/metrics

### External Documentation:

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Dashboards**: https://grafana.com/grafana/dashboards/
- **ClickHouse Docs**: https://clickhouse.com/docs/
- **Express.js Metrics**: https://expressjs.com/en/advanced/best-practice-performance.html
