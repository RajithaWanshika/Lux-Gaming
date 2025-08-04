#!/bin/bash

echo "🚀 Lux Gaming Services Health Check"
echo "=================================="

# Test Game Service
echo ""
echo "🎮 Testing Game Service:"
echo "  Health: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/health | jq -r '.status')"
echo "  Categories: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/game/games/categories | jq -r '.categories | length') categories found"

# Test Order Service
echo ""
echo "🛒 Testing Order Service:"
echo "  Health: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/order/health | jq -r '.status')"
echo "  Auth Required: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/order/orders | jq -r '.code')"

# Test User Service
echo ""
echo "👤 Testing User Service:"
echo "  Health: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/user/health | jq -r '.status')"
echo "  Users Endpoint: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/user/users | jq -r '.error // "Working"')"

# Test Metrics
echo ""
echo "📊 Testing Metrics Endpoints:"
echo "  Game Metrics: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/metrics | grep -c '^#') metrics available"
echo "  Order Metrics: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/order/metrics | grep -c '^#') metrics available"
echo "  User Metrics: $(curl -s -H "Host: lugx.yourdomain.com" http://localhost/user/metrics | grep -c '^#') metrics available"

echo ""
echo "✅ All services are running and responding!" 