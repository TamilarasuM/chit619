#!/bin/bash

# Local Testing Script
# Tests the application before pushing to production

set -e

echo "🧪 Starting local tests..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) found${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm --version) found${NC}"
echo ""

# Backend tests
echo "🔧 Testing Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing backend dependencies...${NC}"
    npm install
fi

# Run backend linting
echo "📝 Running backend linting..."
if npx eslint backend/ 2>/dev/null; then
    echo -e "${GREEN}✅ Backend linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Backend linting warnings (not blocking)${NC}"
fi

# Run backend tests
echo "🧪 Running backend tests..."
if npm test 2>&1 | tee /tmp/backend-test.log; then
    echo -e "${GREEN}✅ Backend tests passed${NC}"
else
    echo -e "${RED}❌ Backend tests failed${NC}"
    echo "Check logs at: /tmp/backend-test.log"
    exit 1
fi

# Security audit
echo "🔒 Running security audit..."
if npm audit --audit-level=moderate 2>&1 | tee /tmp/backend-audit.log; then
    echo -e "${GREEN}✅ No critical security issues${NC}"
else
    echo -e "${YELLOW}⚠️  Security audit found issues (check /tmp/backend-audit.log)${NC}"
fi

echo ""

# Frontend tests
echo "⚛️  Testing Frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd frontend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing frontend dependencies...${NC}"
    npm install
fi

# Run frontend linting
echo "📝 Running frontend linting..."
if npm run lint 2>&1 | tee /tmp/frontend-lint.log; then
    echo -e "${GREEN}✅ Frontend linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend linting warnings (not blocking)${NC}"
fi

# Build frontend
echo "🏗️  Building frontend..."
if npm run build 2>&1 | tee /tmp/frontend-build.log; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    echo "Check logs at: /tmp/frontend-build.log"
    cd ..
    exit 1
fi

# Check bundle size
if [ -d "dist" ]; then
    BUNDLE_SIZE=$(du -sh dist | cut -f1)
    echo -e "${GREEN}📦 Bundle size: $BUNDLE_SIZE${NC}"
fi

# Security audit
echo "🔒 Running security audit..."
if npm audit --audit-level=moderate 2>&1 | tee /tmp/frontend-audit.log; then
    echo -e "${GREEN}✅ No critical security issues${NC}"
else
    echo -e "${YELLOW}⚠️  Security audit found issues (check /tmp/frontend-audit.log)${NC}"
fi

cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All tests completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review test coverage reports"
echo "  2. Commit your changes: git add ."
echo "  3. Create commit: git commit -m 'Your message'"
echo "  4. Push to trigger CI/CD: git push origin main"
echo ""
echo "📊 Test logs saved to:"
echo "  - /tmp/backend-test.log"
echo "  - /tmp/backend-audit.log"
echo "  - /tmp/frontend-lint.log"
echo "  - /tmp/frontend-build.log"
echo "  - /tmp/frontend-audit.log"
