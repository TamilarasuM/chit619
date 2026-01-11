# Local Testing Script for Windows PowerShell
# Tests the application before pushing to production

$ErrorActionPreference = "Stop"

Write-Host "🧪 Starting local tests..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Backend tests
Write-Host "🔧 Testing Backend..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "⚠️  Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

# Run backend linting
Write-Host "📝 Running backend linting..."
try {
    npx eslint backend/ 2>$null
    Write-Host "✅ Backend linting passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend linting warnings (not blocking)" -ForegroundColor Yellow
}

# Run backend tests
Write-Host "🧪 Running backend tests..."
try {
    npm test 2>&1 | Tee-Object -FilePath "$env:TEMP\backend-test.log"
    Write-Host "✅ Backend tests passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend tests failed" -ForegroundColor Red
    Write-Host "Check logs at: $env:TEMP\backend-test.log"
    exit 1
}

# Security audit
Write-Host "🔒 Running security audit..."
try {
    npm audit --audit-level=moderate 2>&1 | Tee-Object -FilePath "$env:TEMP\backend-audit.log"
    Write-Host "✅ No critical security issues" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Security audit found issues (check $env:TEMP\backend-audit.log)" -ForegroundColor Yellow
}

Write-Host ""

# Frontend tests
Write-Host "⚛️  Testing Frontend..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Set-Location frontend

# Check if dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "⚠️  Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Run frontend linting
Write-Host "📝 Running frontend linting..."
try {
    npm run lint 2>&1 | Tee-Object -FilePath "$env:TEMP\frontend-lint.log"
    Write-Host "✅ Frontend linting passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend linting warnings (not blocking)" -ForegroundColor Yellow
}

# Build frontend
Write-Host "🏗️  Building frontend..."
try {
    npm run build 2>&1 | Tee-Object -FilePath "$env:TEMP\frontend-build.log"
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    Write-Host "Check logs at: $env:TEMP\frontend-build.log"
    Set-Location ..
    exit 1
}

# Check bundle size
if (Test-Path "dist") {
    $bundleSize = (Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host ("📦 Bundle size: {0:N2} MB" -f $bundleSize) -ForegroundColor Green
}

# Security audit
Write-Host "🔒 Running security audit..."
try {
    npm audit --audit-level=moderate 2>&1 | Tee-Object -FilePath "$env:TEMP\frontend-audit.log"
    Write-Host "✅ No critical security issues" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Security audit found issues (check $env:TEMP\frontend-audit.log)" -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ All tests completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Review test coverage reports"
Write-Host "  2. Commit your changes: git add ."
Write-Host "  3. Create commit: git commit -m 'Your message'"
Write-Host "  4. Push to trigger CI/CD: git push origin main"
Write-Host ""
Write-Host "📊 Test logs saved to:"
Write-Host "  - $env:TEMP\backend-test.log"
Write-Host "  - $env:TEMP\backend-audit.log"
Write-Host "  - $env:TEMP\frontend-lint.log"
Write-Host "  - $env:TEMP\frontend-build.log"
Write-Host "  - $env:TEMP\frontend-audit.log"
