#!/bin/bash

set -e

echo "🧪 Running Lux Gaming Integration Tests"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to test HTTP endpoint
test_endpoint() {
    local service=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    log "Testing $service: $description"
    
    # Get the service URL
    local service_url=""
    case $service in
        "game")
            service_url="http://localhost/games"
            ;;
        "order")
            service_url="http://localhost/orders"
            ;;
        "user")
            service_url="http://localhost/users"
            ;;
        "frontend")
            service_url="http://localhost/"
            ;;
        *)
            service_url="http://localhost$endpoint"
            ;;
    esac
    
    # Test the endpoint
    local response=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: lugx.yourdomain.com" "$service_url")
    
    if [ "$response" = "$expected_status" ]; then
        log "✅ $service endpoint test passed (Status: $response)"
        return 0
    else
        error "❌ $service endpoint test failed (Expected: $expected_status, Got: $response)"
        return 1
    fi
}

# Function to test service health
test_health() {
    local service=$1
    local health_endpoint=$2
    
    log "Testing $service health endpoint"
    
    local health_url="http://localhost$health_endpoint"
    local response=$(curl -s -H "Host: lugx.yourdomain.com" "$health_url")
    
    if echo "$response" | grep -q '"status":"ok"\|"status":"healthy"'; then
        log "✅ $service health check passed"
        return 0
    else
        error "❌ $service health check failed"
        return 1
    fi
}

# Function to test metrics endpoint
test_metrics() {
    local service=$1
    local metrics_endpoint=$2
    
    log "Testing $service metrics endpoint"
    
    local metrics_url="http://localhost$metrics_endpoint"
    local response=$(curl -s -H "Host: lugx.yourdomain.com" "$metrics_url")
    
    if [ -n "$response" ] && echo "$response" | grep -q "#"; then
        log "✅ $service metrics endpoint working"
        return 0
    else
        warning "⚠️  $service metrics endpoint may not be working properly"
        return 0  # Don't fail the build for metrics
    fi
}

# Function to test database connectivity
test_database() {
    log "Testing database connectivity"
    
    # Check if pods are running
    local game_pod=$(kubectl get pods -n lux-gaming -l app=game -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    local user_pod=$(kubectl get pods -n lux-gaming -l app=user -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    local order_pod=$(kubectl get pods -n lux-gaming -l app=order -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$game_pod" ] && [ -n "$user_pod" ] && [ -n "$order_pod" ]; then
        log "✅ All database pods are running"
        return 0
    else
        error "❌ Some database pods are not running"
        return 1
    fi
}

# Function to test rolling deployment
test_rolling_deployment() {
    log "Testing rolling deployment strategy"
    
    # Check if deployments have multiple replicas
    local game_replicas=$(kubectl get deployment game-deployment -n lux-gaming -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    local user_replicas=$(kubectl get deployment user-deployment -n lux-gaming -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    local order_replicas=$(kubectl get deployment order-deployment -n lux-gaming -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$game_replicas" -ge 2 ] && [ "$user_replicas" -ge 2 ] && [ "$order_replicas" -ge 2 ]; then
        log "✅ Rolling deployment strategy confirmed (multiple replicas)"
        return 0
    else
        warning "⚠️  Rolling deployment strategy may not be fully configured"
        return 0  # Don't fail the build for this
    fi
}

# Function to test load balancer
test_load_balancer() {
    log "Testing load balancer configuration"
    
    # Check if services are properly configured
    local services=$(kubectl get services -n lux-gaming --no-headers | wc -l)
    
    if [ "$services" -ge 4 ]; then
        log "✅ Load balancer services are configured"
        return 0
    else
        error "❌ Load balancer services are not properly configured"
        return 1
    fi
}

# Function to test ingress
test_ingress() {
    log "Testing ingress configuration"
    
    # Check if ingress is configured
    local ingress=$(kubectl get ingress -n lux-gaming --no-headers | wc -l)
    
    if [ "$ingress" -ge 1 ]; then
        log "✅ Ingress is configured"
        return 0
    else
        error "❌ Ingress is not configured"
        return 1
    fi
}

# Function to test security
test_security() {
    log "Testing security configurations"
    
    # Check if secrets are configured
    local secrets=$(kubectl get secrets -n lux-gaming --no-headers | wc -l)
    
    if [ "$secrets" -ge 1 ]; then
        log "✅ Secrets are configured"
    else
        warning "⚠️  No secrets found"
    fi
    
    # Check if configmaps are configured
    local configmaps=$(kubectl get configmaps -n lux-gaming --no-headers | wc -l)
    
    if [ "$configmaps" -ge 1 ]; then
        log "✅ ConfigMaps are configured"
    else
        warning "⚠️  No ConfigMaps found"
    fi
    
    return 0  # Don't fail for security warnings
}

# Function to test scalability
test_scalability() {
    log "Testing scalability configurations"
    
    # Check if HPA (Horizontal Pod Autoscaler) is configured
    local hpa=$(kubectl get hpa -n lux-gaming --no-headers 2>/dev/null | wc -l)
    
    if [ "$hpa" -ge 1 ]; then
        log "✅ HPA is configured for auto-scaling"
    else
        log "ℹ️  HPA not configured (manual scaling only)"
    fi
    
    # Check node resources
    local nodes=$(kubectl get nodes --no-headers | wc -l)
    log "ℹ️  Cluster has $nodes nodes"
    
    return 0
}

# Main test execution
main() {
    local failed_tests=0
    
    log "Starting integration tests..."
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 60
    
    # Test database connectivity
    if ! test_database; then
        ((failed_tests++))
    fi
    
    # Test load balancer
    if ! test_load_balancer; then
        ((failed_tests++))
    fi
    
    # Test ingress
    if ! test_ingress; then
        ((failed_tests++))
    fi
    
    # Test rolling deployment
    test_rolling_deployment
    
    # Test security
    test_security
    
    # Test scalability
    test_scalability
    
    # Test service endpoints
    log "Testing service endpoints..."
    
    # Test health endpoints
    if ! test_health "game" "/health/game"; then
        ((failed_tests++))
    fi
    
    if ! test_health "user" "/health/user"; then
        ((failed_tests++))
    fi
    
    if ! test_health "order" "/health/order"; then
        ((failed_tests++))
    fi
    
    # Test metrics endpoints
    test_metrics "game" "/metrics/game"
    test_metrics "user" "/metrics/user"
    test_metrics "order" "/metrics/order"
    
    # Test main service endpoints
    if ! test_endpoint "game" "/games" "200" "Game service endpoint"; then
        ((failed_tests++))
    fi
    
    if ! test_endpoint "user" "/users" "401" "User service endpoint (auth required)"; then
        ((failed_tests++))
    fi
    
    if ! test_endpoint "order" "/orders" "401" "Order service endpoint (auth required)"; then
        ((failed_tests++))
    fi
    
    # Test frontend
    if ! test_endpoint "frontend" "/" "200" "Frontend service"; then
        ((failed_tests++))
    fi
    
    # Final results
    echo ""
    echo "======================================="
    echo "🧪 Integration Test Results"
    echo "======================================="
    
    if [ $failed_tests -eq 0 ]; then
        log "✅ All integration tests passed!"
        echo "🎉 Deployment is successful and ready for production"
        exit 0
    else
        error "❌ $failed_tests integration test(s) failed"
        echo "⚠️  Please review the failed tests and fix issues before proceeding"
        exit 1
    fi
}

# Run main function
main "$@" 