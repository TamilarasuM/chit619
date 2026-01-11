#!/bin/bash

# Health check script for deployed services
# Verifies that frontend and backend are running correctly

set -e

# Default URLs (override with environment variables)
BACKEND_URL=${BACKEND_URL:-"https://your-backend.onrender.com"}
FRONTEND_URL=${FRONTEND_URL:-"https://your-frontend.vercel.app"}

echo "🏥 Running health checks..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_CHECKS=0
PASSED_CHECKS=0

# Function to check HTTP endpoint
check_http() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    echo -n "Checking $name... "

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")

    if [ "$HTTP_CODE" = "$expected_code" ]; then
        echo -e "${GREEN}✅ OK (HTTP $HTTP_CODE)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED (HTTP $HTTP_CODE, expected $expected_code)${NC}"
        return 1
    fi
}

# Function to check response time
check_response_time() {
    local name="$1"
    local url="$2"
    local max_time="${3:-2}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    echo -n "Checking $name response time... "

    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$url" || echo "99")
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d'.' -f1)

    MAX_MS=$(echo "$max_time * 1000" | bc | cut -d'.' -f1)

    if (( RESPONSE_MS < MAX_MS )); then
        echo -e "${GREEN}✅ OK (${RESPONSE_MS}ms)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${YELLOW}⚠️  SLOW (${RESPONSE_MS}ms, expected < ${MAX_MS}ms)${NC}"
        return 1
    fi
}

# Backend health checks
echo "🔧 Backend Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: $BACKEND_URL"
echo ""

check_http "Backend /health endpoint" "$BACKEND_URL/health" 200
check_http "Backend API root" "$BACKEND_URL/api" 404  # Expecting 404 for root API
check_response_time "Backend /health" "$BACKEND_URL/health" 2

# Check specific API endpoints (if not protected)
if check_http "Backend /api/auth (should exist)" "$BACKEND_URL/api/auth" 404; then
    true  # Expected to fail without proper request
fi

echo ""

# Frontend health checks
echo "⚛️  Frontend Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: $FRONTEND_URL"
echo ""

check_http "Frontend homepage" "$FRONTEND_URL" 200
check_response_time "Frontend load time" "$FRONTEND_URL" 3

# Check if frontend can reach backend
echo ""
echo "🔗 Integration Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "Checking CORS configuration... "

# Try to make a request from frontend to backend
CORS_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" \
    -X OPTIONS \
    "$BACKEND_URL/health" || echo "000")

if [ "$CORS_CHECK" = "200" ] || [ "$CORS_CHECK" = "204" ]; then
    echo -e "${GREEN}✅ OK${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  Check CORS settings (HTTP $CORS_CHECK)${NC}"
fi

echo ""

# SSL/TLS checks
echo "🔒 Security Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "Checking backend HTTPS... "
if [[ "$BACKEND_URL" == https://* ]]; then
    echo -e "${GREEN}✅ Using HTTPS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ Not using HTTPS${NC}"
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "Checking frontend HTTPS... "
if [[ "$FRONTEND_URL" == https://* ]]; then
    echo -e "${GREEN}✅ Using HTTPS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ Not using HTTPS${NC}"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Health Check Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total checks: $TOTAL_CHECKS"
echo "Passed: $PASSED_CHECKS"
echo "Failed: $((TOTAL_CHECKS - PASSED_CHECKS))"
echo ""

PASS_PERCENTAGE=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)

if [ "$PASSED_CHECKS" = "$TOTAL_CHECKS" ]; then
    echo -e "${GREEN}✅ All health checks passed! (100%)${NC}"
    exit 0
elif (( $(echo "$PASS_PERCENTAGE >= 80" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Most checks passed ($PASS_PERCENTAGE%)${NC}"
    echo "Some issues detected but system is mostly operational"
    exit 0
else
    echo -e "${RED}❌ Critical issues detected ($PASS_PERCENTAGE% passing)${NC}"
    echo "Please investigate failed checks"
    exit 1
fi
