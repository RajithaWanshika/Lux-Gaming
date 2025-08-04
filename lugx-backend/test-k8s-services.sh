#!/bin/bash

# Kubernetes Services Test Script
# Tests all services through Kubernetes port-forwarding

echo "🚀 Kubernetes Services Test"
echo "=========================="
echo "Testing all services through Kubernetes"
echo ""

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo "🧪 Testing: $test_name"
    echo "Command: $command"
    echo "────────────────────────────────────────────────────────────────────────────────"
    
    if eval "$command"; then
        echo "✅ SUCCESS"
    else
        echo "❌ FAILED"
    fi
    echo ""
}

# Start port-forwarding for all services
echo "🔌 Starting port-forwarding for all services..."

# Game Service
kubectl port-forward -n lux-gaming service/game-service 8080:80 > /dev/null 2>&1 &
GAME_PF_PID=$!

# Order Service
kubectl port-forward -n lux-gaming service/order-service 8081:80 > /dev/null 2>&1 &
ORDER_PF_PID=$!

# User Service
kubectl port-forward -n lux-gaming service/user-service 8082:80 > /dev/null 2>&1 &
USER_PF_PID=$!

# Wait for port-forwarding to establish
sleep 5

echo "✅ Port-forwarding established"
echo ""

# Test data
TEST_GAME='{
  "title": "K8s Test Game",
  "description": "A game created through Kubernetes testing",
  "price": 29.99,
  "discount": 5.0,
  "category": "Action",
  "image_url": "https://example.com/k8s-test.jpg",
  "release_date": "2024-01-15"
}'

TEST_ORDER='{
  "items": [
    {
      "game_id": 1,
      "quantity": 1,
      "unit_price": 24.99
    }
  ]
}'

TEST_USER='{
  "username": "k8suser",
  "email": "k8suser@example.com",
  "password": "password123",
  "first_name": "K8s",
  "last_name": "User"
}'

echo "📋 Game Service Tests"
echo "===================="

# Health check
run_test "GET /health (Game)" \
    "curl -s -X GET \"http://localhost:8080/health\" -H \"Content-Type: application/json\""

# Get games
run_test "GET /games (Game)" \
    "curl -s -X GET \"http://localhost:8080/games\" -H \"Authorization: Bearer rajithatesting\" -H \"Content-Type: application/json\""

# Create game
run_test "POST /games (Game)" \
    "curl -s -X POST \"http://localhost:8080/games\" -H \"Authorization: Bearer rajithatesting\" -H \"Content-Type: application/json\" -d '$TEST_GAME'"

# Get categories
run_test "GET /games/categories (Game)" \
    "curl -s -X GET \"http://localhost:8080/games/categories\" -H \"Authorization: Bearer rajithatesting\" -H \"Content-Type: application/json\""

echo "📋 User Service Tests"
echo "===================="

# Health check
run_test "GET /health (User)" \
    "curl -s -X GET \"http://localhost:8082/health\" -H \"Content-Type: application/json\""

# Register user
run_test "POST /register (User)" \
    "curl -s -X POST \"http://localhost:8082/register\" -H \"Content-Type: application/json\" -d '$TEST_USER'"

# Login user
run_test "POST /login (User)" \
    "curl -s -X POST \"http://localhost:8082/login\" -H \"Content-Type: application/json\" -d '{\"username\":\"k8suser\",\"password\":\"password123\"}'"

echo "📋 Order Service Tests"
echo "====================="

# Health check
run_test "GET /health (Order)" \
    "curl -s -X GET \"http://localhost:8081/health\" -H \"Content-Type: application/json\""

# Get orders (should fail with invalid token)
run_test "GET /orders (Order - Invalid Token)" \
    "curl -s -X GET \"http://localhost:8081/orders\" -H \"Authorization: Bearer rajithatesting\" -H \"Content-Type: application/json\""

# Get JWT token for order service
echo "🔐 Getting JWT token for order service..."
JWT_RESPONSE=$(curl -s -X POST "http://localhost:8082/login" -H "Content-Type: application/json" -d '{"username":"k8suser","password":"password123"}')
JWT_TOKEN=$(echo $JWT_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$JWT_TOKEN" ]; then
    echo "✅ JWT Token obtained: ${JWT_TOKEN:0:50}..."
    
    # Get orders with JWT token
    run_test "GET /orders (Order - JWT Token)" \
        "curl -s -X GET \"http://localhost:8081/orders\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""
    
    # Create order with JWT token
    run_test "POST /orders (Order - JWT Token)" \
        "curl -s -X POST \"http://localhost:8081/orders\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\" -d '$TEST_ORDER'"
    
    # Get order status
    run_test "GET /orders/1/status (Order - JWT Token)" \
        "curl -s -X GET \"http://localhost:8081/orders/1/status\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""
else
    echo "❌ Failed to get JWT token"
fi

echo "📋 Metrics Tests"
echo "================"

# Game metrics
run_test "GET /metrics/game" \
    "curl -s -X GET \"http://localhost:8080/metrics/game\" -H \"Authorization: Bearer rajithatesting\" -H \"Content-Type: application/json\""

# Order metrics
run_test "GET /metrics/order" \
    "curl -s -X GET \"http://localhost:8081/metrics/order\" -H \"Authorization: Bearer rajithatesting\" -H \"Content-Type: application/json\""

# User metrics
run_test "GET /metrics/user" \
    "curl -s -X GET \"http://localhost:8082/metrics/user\" -H \"Authorization: Bearer rajithatesting\" -H \"Content-Type: application/json\""

echo "🎯 Kubernetes tests completed!"
echo "============================"

# Cleanup port-forwarding
echo "🧹 Cleaning up port-forwarding..."
kill $GAME_PF_PID 2>/dev/null
kill $ORDER_PF_PID 2>/dev/null
kill $USER_PF_PID 2>/dev/null

echo "✅ Test completed!" 