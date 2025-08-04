#!/bin/bash

# Game Service API Test Script
# Auth Token: rajithatesting

BASE_URL="http://lugx.yourdomain.com"
AUTH_TOKEN="rajithatesting"

echo "🎮 Game Service API Tests"
echo "=========================="
echo "Base URL: $BASE_URL"
echo "Auth Token: $AUTH_TOKEN"
echo ""

# Test data
TEST_GAME='{
  "title": "Test Action Game",
  "description": "A thrilling action game for testing",
  "price": 49.99,
  "discount": 10.0,
  "category": "Action",
  "image_url": "https://example.com/test-game.jpg",
  "release_date": "2024-01-15"
}'

BATCH_GAMES='[
  {
    "title": "Batch Game 1",
    "description": "First batch game",
    "price": 29.99,
    "category": "Strategy"
  },
  {
    "title": "Batch Game 2",
    "description": "Second batch game",
    "price": 39.99,
    "category": "Racing"
  }
]'

UPDATE_GAME='{
  "title": "Updated Action Game",
  "price": 59.99,
  "discount": 15.0
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

# 1. GET /games
run_test "GET /games" \
    "curl -X GET \"$BASE_URL/games\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 2. GET /games with pagination and search
run_test "GET /games with pagination and search" \
    "curl -X GET \"$BASE_URL/games?page=1&limit=10&search=action\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 3. GET /games/1 (using existing game ID)
run_test "GET /games/1" \
    "curl -X GET \"$BASE_URL/games/1\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 4. GET /games/1 with reviews
run_test "GET /games/1 with reviews" \
    "curl -X GET \"$BASE_URL/games/1?with_review=true\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 5. POST /games
run_test "POST /games" \
    "curl -X POST \"$BASE_URL/games\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\" -d '$TEST_GAME'"

# 6. POST /games/batch
run_test "POST /games/batch" \
    "curl -X POST \"$BASE_URL/games/batch\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\" -d '$BATCH_GAMES'"

# 7. PUT /games/1 (update existing game)
run_test "PUT /games/1" \
    "curl -X PUT \"$BASE_URL/games/1\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\" -d '$UPDATE_GAME'"

# 8. DELETE /games/999 (delete non-existent game)
run_test "DELETE /games/999" \
    "curl -X DELETE \"$BASE_URL/games/999\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 9. GET /games/categories
run_test "GET /games/categories" \
    "curl -X GET \"$BASE_URL/games/categories\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

echo "📋 Operational Tests"
echo "==================="

# 10. GET /health/game
run_test "GET /health/game" \
    "curl -X GET \"$BASE_URL/health/game\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

# 11. GET /metrics/game
run_test "GET /metrics/game" \
    "curl -X GET \"$BASE_URL/metrics/game\" -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\""

echo "🎯 All tests completed!"
echo "======================" 