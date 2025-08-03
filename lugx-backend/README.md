# LUGX Gaming - Microservices Backend

A scalable microservices architecture for the LUGX Gaming platform, designed for MSC-Cloud Computing purposes with modern technologies and comprehensive analytics.

## 🏗️ Architecture Overview

This backend consists of 5 streamlined microservices:

- **API Gateway** (Port 3000) - Request routing, authentication, rate limiting
- **User Service** (Port 3001) - User management, JWT authentication
- **Game Service** (Port 3002) - Game catalog with reviews system  
- **Order Service** (Port 3004) - Simplified order processing
- **Analytics Service** (Port 3005) - ClickHouse-powered analytics with data simulation

## 📁 Project Structure

```
lugx-backend/
├── services/
│   ├── api-gateway/          # API Gateway & Load Balancer
│   │   ├── middlewares/      # Auth, rate limiting, validation
│   │   ├── server.js         # Gateway server
│   │   ├── test.js           # Test suite
│   │   └── package.json      # Latest dependencies
│   │
│   ├── user/                 # User Management Service
│   │   ├── controllers/      # User CRUD, auth operations
│   │   ├── db/              # PostgreSQL connection & schema
│   │   ├── middlewares/      # JWT auth & validation
│   │   ├── metrics/         # Prometheus metrics
│   │   ├── routes/          # Simplified API routes
│   │   ├── server.js        # Service server
│   │   ├── test.js          # Test suite
│   │   └── package.json     # bcryptjs, JWT, latest deps
│   │
│   ├── game/                # Game Catalog Service
│   │   ├── controllers/     # Game CRUD with reviews
│   │   ├── db/             # PostgreSQL with reviews table
│   │   ├── middlewares/     # Validation & security
│   │   ├── metrics/        # Performance metrics
│   │   ├── routes/         # API routes with reviews
│   │   ├── server.js       # Service server
│   │   ├── test.js         # Test suite
│   │   └── package.json    # Latest dependencies
│   │
│   ├── order/              # Order Processing Service
│   │   ├── controllers/    # Simplified order management
│   │   ├── db/            # PostgreSQL simplified schema
│   │   ├── middlewares/    # Auth & validation
│   │   ├── metrics/       # Order metrics
│   │   ├── routes/        # API routes
│   │   ├── server.js      # Service server
│   │   ├── test.js        # Test suite
│   │   └── package.json   # JWT, latest dependencies
│   │
│   └── analytics/          # Analytics & Tracking Service
│       ├── controllers/    # Analytics + simulation logic
│       ├── db/            # ClickHouse connection
│       ├── routes/        # Analytics & simulation API
│       ├── app.js         # Service server
│       ├── test.js        # Test suite
│       └── package.json   # ClickHouse, ua-parser-js, geoip
└── README.md
```

## 🗄️ Database Schemas

### PostgreSQL Services (User, Game, Order)

**Users Table:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Games Table:**
```sql
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(5, 2) DEFAULT 0.00,
  category VARCHAR(100),
  image_url VARCHAR(500),
  release_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  user_name VARCHAR(100) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Orders Tables:**
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### ClickHouse Analytics Tables

**Event Tracking:**
```sql
CREATE TABLE user_events (
  event_id String,
  user_id Nullable(UInt32),
  session_id String,
  event_type String,
  event_category String,
  event_action String,
  page_url String,
  browser String,
  os String,
  device_type String,
  country Nullable(String),
  timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, event_type, user_id)
TTL timestamp + INTERVAL 2 YEAR;
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Docker & Docker Compose**
- **PostgreSQL** (for user, game, order services)
- **ClickHouse** (for analytics service)

### Local Development

1. **Clone and setup:**
```bash
cd lugx-backend
```

2. **Install dependencies (latest versions):**
```bash
# Install for all services
cd services/api-gateway && npm install && cd ../..
cd services/user && npm install && cd ../..
cd services/game && npm install && cd ../..
cd services/order && npm install && cd ../..
cd services/analytics && npm install && cd ../..
```

3. **Environment Configuration:**

Create `.env` files in each service:

**Game Service (.env):**
```env
NODE_ENV=development
PORT=3002
HOST=localhost
DATABASE_URL_DEV=<your dev database url>
DATABASE_URL_TEST=<your test database url>
DATABASE_URL=<your production database url>
```

**User Service (.env):**
```env
NODE_ENV=development
PORT=3001
HOST=localhost
DATABASE_URL_DEV=<your dev database url>
DATABASE_URL_TEST=<your test database url>
DATABASE_URL=<your production database url>
JWT_SECRET=<your jwt secret key>
```

**Order Service (.env):**
```env
NODE_ENV=development
PORT=3004
HOST=localhost
DATABASE_URL_DEV=<your dev database url>
DATABASE_URL_TEST=<your test database url>
DATABASE_URL=<your production database url>
JWT_SECRET=<your jwt secret key>
```

**API Gateway (.env):**
```env
NODE_ENV=development
PORT=3000
HOST=localhost
JWT_SECRET=<your jwt secret key>
USER_SERVICE_URL=<your user service url>
GAME_SERVICE_URL=<your game service url>
ORDER_SERVICE_URL=<your order service url>
ANALYTICS_SERVICE_URL=<your analytics service url>
```

**Analytics Service (.env):**
```env
NODE_ENV=development
PORT=3005
HOST=localhost
CLICKHOUSE_URL_DEV=<your dev clickhouse url>
CLICKHOUSE_USERNAME_DEV=<your dev username>
CLICKHOUSE_PASSWORD_DEV=<your dev password>
CLICKHOUSE_DATABASE_DEV=<your dev database name>
CLICKHOUSE_URL_TEST=<your test clickhouse url>
CLICKHOUSE_USERNAME_TEST=<your test username>
CLICKHOUSE_PASSWORD_TEST=<your test password>
CLICKHOUSE_DATABASE_TEST=<your test database name>
CLICKHOUSE_URL=<your production clickhouse url>
CLICKHOUSE_USERNAME=<your production username>
CLICKHOUSE_PASSWORD=<your production password>
CLICKHOUSE_DATABASE=<your production database name>
```

4. **Start services:**
```bash
# Start each service in separate terminals
cd services/api-gateway && npm start
cd services/user && npm start  
cd services/game && npm start
cd services/order && npm start
cd services/analytics && npm start
```

## 🔗 API Endpoints

### API Gateway (Port 3000)
- `GET /health` - Health check
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `GET /api/users/*` - Proxy to User Service
- `GET /api/games/*` - Proxy to Game Service
- `GET /api/orders/*` - Proxy to Order Service (protected)
- `POST /api/analytics/*` - Proxy to Analytics Service

### User Service (Port 3001)
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user (protected)
- `PUT /users/:id` - Update user (protected)
- `DELETE /users/:id` - Delete user (protected)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Game Service (Port 3002)
- `GET /games` - Get all games (with filters)
- `GET /games/:id` - Get game by ID (with optional reviews via `?with_review=true`)
- `POST /games` - Add new game
- `POST /games/batch` - Add multiple games
- `PUT /games/:id` - Update game
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Order Service (Port 3004)
- `GET /orders` - Get user orders (protected)
- `GET /orders/:id` - Get order by ID (protected)
- `POST /orders` - Create new order (protected)
- `PUT /orders/:id` - Update order (protected)
- `POST /orders/:id/cancel` - Cancel order (protected)
- `GET /orders/:id/status` - Get order status (protected)
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Analytics Service (Port 3005)
- `POST /events` - Track user events
- `POST /pageviews` - Track page views
- `POST /game-interactions` - Track game interactions
- `GET /dashboard` - Get analytics dashboard
- `GET /realtime` - Get real-time analytics
- `POST /simulate/realtime` - Simulate real-time data
- `POST /simulate/historical` - Simulate historical data
- `POST /clear` - Clear all analytics data
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth with configurable expiration
- **Password Hashing** - bcryptjs with salt rounds
- **Rate Limiting** - Express-rate-limit with configurable windows
- **CORS Protection** - Configurable cross-origin policies
- **Helmet Security** - Security headers middleware
- **Input Validation** - Express-validator with comprehensive rules
- **Route Protection** - JWT middleware on protected endpoints

## 📊 Analytics & Monitoring

### Prometheus Metrics
- **HTTP Request Duration** - Response time tracking
- **HTTP Request Total** - Request count by method/status
- **Database Operation Duration** - Query performance
- **Business Metrics** - Users, games, orders, reviews totals

### Analytics Features
- **Event Tracking** - User interactions with geo-location
- **Page View Analytics** - Traffic patterns with device detection
- **Game Interaction Tracking** - User engagement metrics  
- **Real-time Dashboard** - Live analytics data
- **Data Simulation** - Generate realistic test data for demos

### User-Agent Detection
- **ua-parser-js v2.0.4** - Latest browser/device/OS detection
- **GeoIP Integration** - Country/city detection from IP
- **Device Classification** - Desktop/mobile/tablet categorization

## 🧪 Testing

```bash
# Run tests for all services
cd services/user && npm test
cd services/game && npm test
cd services/order && npm test
cd services/api-gateway && npm test
cd services/analytics && npm test

# Development mode with auto-restart
cd services/user && npm run dev
```

**Test Coverage:**
- Unit tests with Jest & Supertest
- API endpoint testing
- Database integration tests
- Authentication flow tests
- Rate limiting tests

## 📦 Latest Dependencies

All services use the most recent stable versions:

- **Express.js** `^4.21.2` - Latest stable
- **Helmet** `^8.1.0` - Security headers
- **Express Rate Limit** `^8.0.1` - DDoS protection
- **Express Validator** `^7.2.1` - Input validation
- **Prometheus Client** `^15.1.3` - Metrics collection
- **Jest** `^30.0.5` - Testing framework
- **Supertest** `^7.1.4` - HTTP testing
- **ua-parser-js** `^2.0.4` - User agent parsing
- **ClickHouse Client** `^1.4.0` - Analytics database
- **bcryptjs** `^2.4.3` - Password hashing
- **jsonwebtoken** `^9.0.2` - JWT implementation

## 🚀 Performance Optimizations

- **Connection Pooling** - Optimized database connections (max: 5 for demo)
- **Auto-Timestamps** - Database-level triggers for `updated_at`
- **Efficient Indexing** - Strategic database indexes
- **ClickHouse Partitioning** - Monthly partitions with TTL
- **Configurable Host Binding** - Support for localhost/0.0.0.0

## 🐳 Docker Ready

Each service includes optimized package.json with:
- Production-ready dependency management
- Health check scripts
- Environment-specific configurations
- Proper dev/test/prod separation

## 📋 Development Guidelines

3. **Environment Separation** - Dev/Test/Prod database URLs
4. **Error Handling** - Consistent error responses
5. **Security First** - JWT protection on sensitive endpoints

## 🔧 Database Features

- **Auto-Timestamps** - Automatic `created_at`/`updated_at` management
- **Foreign Key Constraints** - Proper relationships with CASCADE deletes
- **Data Validation** - Check constraints (e.g., rating 1-5)
- **Sample Data** - Automated seed data for development


