#!/bin/bash

# Test with Real JWT Token
# This script uses the token received from login

BASE_URL="http://lugx.yourdomain.com"
REAL_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzQsInVzZXJuYW1lIjoidGVzdHVzZXIxMjMiLCJlbWFpbCI6InRlc3R1c2VyMTIzQGV4YW1wbGUuY29tIiwiaWF0IjoxNzU0MjgyOTAzLCJleHAiOjE3NTQzNjkzMDN9.BdrdUq52wlRkhXE0d2mjx4HRvNEjo3xpM8yggzeKLLo"

echo "🔐 Testing with Real JWT Token"
echo "==============================="
echo "Base URL: $BASE_URL"
echo "Real Token: $REAL_TOKEN"
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

echo "📋 Order Service Tests with Real Token"
echo "======================================"

# Test Order Service with real token
run_test "GET /orders" \
    "curl -X GET \"$BASE_URL/orders\" -H \"Authorization: Bearer $REAL_TOKEN\" -H \"Content-Type: application/json\""

run_test "POST /orders" \
    "curl -X POST \"$BASE_URL/orders\" -H \"Authorization: Bearer $REAL_TOKEN\" -H \"Content-Type: application/json\" -d '$TEST_ORDER'"

run_test "GET /orders/1" \
    "curl -X GET \"$BASE_URL/orders/1\" -H \"Authorization: Bearer $REAL_TOKEN\" -H \"Content-Type: application/json\""

echo "📋 User Service Tests with Real Token"
echo "====================================="

run_test "GET /users" \
    "curl -X GET \"$BASE_URL/users\" -H \"Authorization: Bearer $REAL_TOKEN\" -H \"Content-Type: application/json\""

run_test "GET /users/1" \
    "curl -X GET \"$BASE_URL/users/1\" -H \"Authorization: Bearer $REAL_TOKEN\" -H \"Content-Type: application/json\""

echo "🎯 Real token tests completed!"
echo "=============================" 