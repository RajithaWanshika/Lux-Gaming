#!/bin/bash

# Order Service API Test Script with JWT Token
# JWT Token: rajithatesting

BASE_URL="http://lugx.yourdomain.com"
JWT_TOKEN="rajithatesting"

echo "🛒 Order Service API Tests with JWT Token"
echo "========================================="
echo "Base URL: $BASE_URL"
echo "JWT Token: $JWT_TOKEN"
echo ""

# Test data
TEST_ORDER='{
  "items": [
    {
      "game_id": 1,
      "quantity": 2,
      "unit_price": 24.99
    },
    {
      "game_id": 2,
      "quantity": 1,
      "unit_price": 16.99
    }
  ]
}'

UPDATE_ORDER='{
  "status": "confirmed"
}'

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

# Business Logic Tests

echo "📋 Business Logic Tests"
echo "======================="

# 1. GET /orders
run_test "GET /orders" \
    "curl -X GET \"$BASE_URL/orders\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""

# 2. GET /orders with pagination and status filter
run_test "GET /orders with pagination and status filter" \
    "curl -X GET \"$BASE_URL/orders?page=1&limit=10&status=pending\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""

# 3. GET /orders/1
run_test "GET /orders/1" \
    "curl -X GET \"$BASE_URL/orders/1\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""

# 4. POST /orders
run_test "POST /orders" \
    "curl -X POST \"$BASE_URL/orders\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\" -d '$TEST_ORDER'"

# 5. PUT /orders/1
run_test "PUT /orders/1" \
    "curl -X PUT \"$BASE_URL/orders/1\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\" -d '$UPDATE_ORDER'"

# 6. DELETE /orders/999 (delete non-existent order)
run_test "DELETE /orders/999" \
    "curl -X DELETE \"$BASE_URL/orders/999\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""

# 7. POST /orders/1/cancel
run_test "POST /orders/1/cancel" \
    "curl -X POST \"$BASE_URL/orders/1/cancel\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""

# 8. GET /orders/1/status
run_test "GET /orders/1/status" \
    "curl -X GET \"$BASE_URL/orders/1/status\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""

echo "📋 Operational Tests"
echo "==================="

# 9. GET /health/order
run_test "GET /health/order" \
    "curl -X GET \"$BASE_URL/health/order\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""

# 10. GET /metrics/order
run_test "GET /metrics/order" \
    "curl -X GET \"$BASE_URL/metrics/order\" -H \"Authorization: Bearer $JWT_TOKEN\" -H \"Content-Type: application/json\""

echo "🎯 All tests completed!"
echo "======================" 