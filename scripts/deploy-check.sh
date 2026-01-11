#!/bin/bash

# Pre-deployment checklist script
# Verifies everything is ready for production deployment

set -e

echo "🔍 Running pre-deployment checks..."
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check and report
check() {
    local name="$1"
    local command="$2"

    echo -n "Checking $name... "
    if eval "$command" &>/dev/null; then
        echo "✅"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo "❌"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
        return 1
    fi
}

# Check Git status
echo "📂 Git Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes:"
    git status --short
    echo ""
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo "⚠️  You're not on main/master branch"
    echo "   Deployment will only trigger from main/master"
fi

echo ""

# Check Node.js and npm versions
echo "🔧 Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "Node.js version >= 18" "node --version | grep -E 'v1[8-9]|v[2-9][0-9]'"
check "npm version >= 9" "npm --version | grep -E '^[9-9]|^[1-9][0-9]'"

echo ""

# Check dependencies
echo "📦 Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "Backend dependencies installed" "[ -d node_modules ]"
check "Frontend dependencies installed" "[ -d frontend/node_modules ]"

echo ""

# Check environment files
echo "🔐 Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check ".env file exists" "[ -f .env ]"
check ".env.example exists" "[ -f .env.example ]"

if [ -f .env ]; then
    echo "Checking required environment variables..."

    required_vars=(
        "MONGODB_URI"
        "JWT_SECRET"
        "PORT"
        "NODE_ENV"
    )

    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env 2>/dev/null; then
            echo "  ✅ $var"
        else
            echo "  ❌ $var (missing)"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
        fi
    done
fi

echo ""

# Check for sensitive data
echo "🔒 Security Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Scanning for potential secrets in code..."
if grep -r -i -E "(password|secret|api[_-]?key|token)\s*=\s*['\"][^'\"]+['\"]" backend/ frontend/src --exclude-dir=node_modules 2>/dev/null; then
    echo "❌ Potential hardcoded secrets found!"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
else
    echo "✅ No obvious hardcoded secrets"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

echo ""

# Check build
echo "🏗️  Build Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Building frontend..."
cd frontend
if npm run build >/dev/null 2>&1; then
    echo "✅ Frontend builds successfully"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo "❌ Frontend build failed"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
cd ..

echo ""

# Check tests
echo "🧪 Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npm test >/dev/null 2>&1; then
    echo "✅ Tests passing"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo "❌ Tests failing"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

echo ""

# Check GitHub secrets setup
echo "🔑 GitHub Secrets (manual verification needed)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Ensure these secrets are configured in GitHub:"
echo "  - MONGODB_URI_TEST"
echo "  - JWT_SECRET"
echo "  - RENDER_DEPLOY_HOOK_URL"
echo "  - RENDER_BACKEND_URL"
echo "  - VERCEL_TOKEN"
echo "  - VITE_API_BASE_URL"
echo "  - VERCEL_FRONTEND_URL"
echo ""
echo "Verify at: https://github.com/YOUR_REPO/settings/secrets/actions"

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Checks passed: $CHECKS_PASSED"
echo "Checks failed: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo "✅ All checks passed! Ready to deploy."
    echo ""
    echo "Next steps:"
    echo "  1. git add ."
    echo "  2. git commit -m 'Your commit message'"
    echo "  3. git push origin $CURRENT_BRANCH"
    echo ""
    echo "This will trigger automatic deployment to production."
    exit 0
else
    echo "❌ Some checks failed. Please fix issues before deploying."
    exit 1
fi
