#!/bin/bash

# User Service API Test Script
# Auth Token: rajithatesting

BASE_URL="http://lugx.yourdomain.com"
AUTH_TOKEN="rajithatesting"

echo "👤 User Service API Tests"
echo "========================="
echo "Base URL: $BASE_URL"
echo "Auth Token: $AUTH_TOKEN"
echo ""

# Test data
TEST_USER='{
  "username": "testuser123",
  "email": "testuser123@example.com",
  "password": "password123",
  "first_name": "Test",
  "last_name": "User"
}'

LOGIN_DATA='{
  "username": "testuser123",
  "password": "password123"
}'

UPDATE_USER='{
  "first_name": "Updated",
  "last_name": "User",
  "is_active": true
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

# 1. GET /users
run_test "GET /users" \
    "curl -X GET \"$BASE_URL/users\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 2. GET /users with pagination and search
run_test "GET /users with pagination and search" \
    "curl -X GET \"$BASE_URL/users?page=1&limit=10&search=test\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 3. GET /users/1
run_test "GET /users/1" \
    "curl -X GET \"$BASE_URL/users/1\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 4. POST /users (create user with auth)
run_test "POST /users" \
    "curl -X POST \"$BASE_URL/users\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\" -d '$TEST_USER'"

# 5. PUT /users/1
run_test "PUT /users/1" \
    "curl -X PUT \"$BASE_URL/users/1\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\" -d '$UPDATE_USER'"

# 6. DELETE /users/999 (delete non-existent user)
run_test "DELETE /users/999" \
    "curl -X DELETE \"$BASE_URL/users/999\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 7. POST /register
run_test "POST /register" \
    "curl -X POST \"$BASE_URL/register\" -H \"Content-Type: application/json\" -d '$TEST_USER'"

# 8. POST /login
run_test "POST /login" \
    "curl -X POST \"$BASE_URL/login\" -H \"Content-Type: application/json\" -d '$LOGIN_DATA'"

echo "📋 Operational Tests"
echo "==================="

# 9. GET /health/user
run_test "GET /health/user" \
    "curl -X GET \"$BASE_URL/health/user\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 10. GET /metrics/user
run_test "GET /metrics/user" \
    "curl -X GET \"$BASE_URL/metrics/user\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

echo "🎯 All tests completed!"
echo "======================" 