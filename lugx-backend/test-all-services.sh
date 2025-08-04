#!/bin/bash

# Master Test Script for All Services
# Tests Game, Order, and User Services

echo "🚀 Lux Gaming - Complete API Test Suite"
echo "========================================"
echo "Testing all services with auth token: rajithatesting"
echo ""

# Make all test scripts executable
chmod +x test-game-endpoints-working.sh
chmod +x test-order-endpoints.sh
chmod +x test-user-endpoints.sh

# Test Game Service
echo "🎮 Testing Game Service"
echo "======================="
./test-game-endpoints-working.sh

echo ""
echo ""

# Test Order Service
echo "🛒 Testing Order Service"
echo "======================="
./test-order-endpoints.sh

echo ""
echo ""

# Test User Service
echo "👤 Testing User Service"
echo "======================="
./test-user-endpoints.sh

echo ""
echo "🎯 All service tests completed!"
echo "==============================" 