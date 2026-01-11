# CI/CD Pipeline Guide

Complete guide for the automated CI/CD pipeline using GitHub Actions.

## Table of Contents
- [Overview](#overview)
- [Quick Setup](#quick-setup)
- [Workflows](#workflows)
- [GitHub Secrets](#github-secrets)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)

---

## Overview

The CI/CD pipeline automatically deploys your application using GitHub Actions:

- **Frontend** → Vercel (React + Vite PWA)
- **Backend** → Render.com (Node.js + Express)
- **Security** → CodeQL scanning, Dependabot
- **Testing** → Automated tests, linting, audits

### Features

✅ Automatic deployments on push to main/master
✅ Pull request validation and testing
✅ Smart change detection (only deploys what changed)
✅ Health checks after deployment
✅ Emergency rollback capability
✅ Automated releases with changelog
✅ Security scanning (CodeQL, npm audit)
✅ Dependency updates (Dependabot)

---

## Quick Setup

### Step 1: Configure GitHub Secrets

Navigate to: **Settings** → **Secrets and variables** → **Actions**

Add these required secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `MONGODB_URI_TEST` | MongoDB connection for testing | `mongodb+srv://user:pass@cluster.mongodb.net/test` |
| `JWT_SECRET` | JWT secret key (min 32 chars) | Same as production JWT_SECRET |
| `RENDER_DEPLOY_HOOK_URL` | Render deployment webhook | `https://api.render.com/deploy/srv-xxx?key=yyy` |
| `RENDER_BACKEND_URL` | Render backend URL | `https://your-app.onrender.com` |
| `VERCEL_TOKEN` | Vercel authentication token | Get from vercel.com/account/tokens |
| `VITE_API_BASE_URL` | Backend API URL for frontend | `https://your-app.onrender.com/api` |
| `VERCEL_FRONTEND_URL` | Vercel frontend URL | `https://your-app.vercel.app` |

### Step 2: Get Required Tokens

**Render Deploy Hook:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Settings → Deploy Hook → Create Deploy Hook
4. Copy the webhook URL

**Vercel Token:**
1. Go to [Vercel Tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it "GitHub Actions CI/CD"
4. Select scope: Full Account
5. Copy the token immediately (shown once)

### Step 3: Enable GitHub Actions

**Settings** → **Actions** → **General**:
- ✅ Allow all actions and reusable workflows
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

### Step 4: Test the Pipeline

```bash
# Make a small change
echo "# CI/CD Test" >> README.md

# Commit and push
git add .
git commit -m "test: CI/CD pipeline"
git push origin main

# Watch deployment in Actions tab
```

---

## Workflows

### 1. Production Deployment
**File**: `.github/workflows/production-deploy.yml`

**Trigger**: Push to main/master, manual dispatch

**Jobs**:
- Detect changes (backend/frontend)
- Run backend tests (if changed)
- Build frontend (if changed)
- Deploy to Render (if tests pass)
- Deploy to Vercel (if build succeeds)
- Health checks

**Duration**: ~5-8 minutes

### 2. PR Validation
**File**: `.github/workflows/pr-validation.yml`

**Trigger**: Pull request opened/updated

**Jobs**:
- Code formatting check
- Lint code
- Run tests
- Security audit
- PR size check
- Automated comments

**Duration**: ~3-5 minutes

### 3. Staging Deployment
**File**: `.github/workflows/staging-deploy.yml`

**Trigger**: Push to develop branch

**Jobs**:
- Deploy to staging environment
- Run smoke tests
- Health checks

**Duration**: ~4-6 minutes

### 4. Emergency Rollback
**File**: `.github/workflows/rollback.yml`

**Trigger**: Manual dispatch

**Features**:
- Rollback backend, frontend, or both
- Creates incident issue automatically
- Requires reason for rollback

**Duration**: ~1 minute + manual steps

### 5. Release Creation
**File**: `.github/workflows/release.yml`

**Trigger**: Tag push (v*.*.*)

**Jobs**:
- Generate changelog
- Create GitHub release
- Upload artifacts
- Update documentation

**Duration**: ~3-4 minutes

### 6. CodeQL Security Scanning
**File**: `.github/workflows/codeql-analysis.yml`

**Trigger**: Weekly (Monday 2 AM), pull requests

**Features**:
- JavaScript/TypeScript security scanning
- Dependency vulnerability check
- Secret scanning

**Duration**: ~5-10 minutes

### 7. Auto Changelog
**File**: `.github/workflows/auto-changelog.yml`

**Trigger**: Release published

**Jobs**:
- Updates CHANGELOG.md
- Commits changes automatically

**Duration**: ~1 minute

---

## GitHub Secrets

### Required Secrets

Configure these in: **Settings** → **Secrets and variables** → **Actions**

#### Backend Secrets

```bash
MONGODB_URI_TEST=mongodb+srv://username:password@cluster.mongodb.net/chit-test
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv-xxxxx?key=yyyyy
RENDER_BACKEND_URL=https://chitfund-backend.onrender.com
```

#### Frontend Secrets

```bash
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_BASE_URL=https://chitfund-backend.onrender.com/api
VERCEL_FRONTEND_URL=https://chitfund.vercel.app
```

### Optional Secrets

```bash
SNYK_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # For Snyk security scanning
```

### Security Best Practices

1. **Never commit secrets** to repository
2. **Use environment-specific secrets** for staging/production
3. **Rotate tokens regularly** (every 90 days)
4. **Use minimal permissions** for tokens
5. **Enable secret scanning** in repository settings

---

## Usage

### Automatic Deployments

**Production**: Push to `main` or `master`
```bash
git add .
git commit -m "feat: new feature"
git push origin main
# Auto-deploys to production
```

**Staging**: Push to `develop`
```bash
git checkout develop
git merge main
git push origin develop
# Auto-deploys to staging
```

### Manual Deployments

1. Go to **Actions** tab
2. Select workflow (e.g., "Production Deployment")
3. Click **Run workflow**
4. Select branch
5. Click **Run workflow** button

### Creating Releases

```bash
# Tag a new version
git tag -a v1.0.0 -m "Release 1.0.0: Initial release"
git push origin v1.0.0

# Workflow automatically:
# - Generates changelog from commits
# - Creates GitHub release
# - Uploads build artifacts
```

### Emergency Rollback

1. **Actions** → **Emergency Rollback**
2. Click **Run workflow**
3. Select target:
   - `backend` - Rollback backend only
   - `frontend` - Rollback frontend only
   - `both` - Rollback both
4. Enter reason (required)
5. Click **Run workflow**
6. Follow manual instructions in workflow output

### Pull Request Workflow

1. Create feature branch
```bash
git checkout -b feature/my-feature
```

2. Make changes and commit
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

3. Create pull request on GitHub

4. Automated checks run:
   - Code formatting
   - Linting
   - Tests
   - Security audit
   - Build validation

5. Review and merge (triggers production deployment)

---

## Troubleshooting

### Deployment Failed

**Check workflow logs:**
1. Go to **Actions** tab
2. Click on failed workflow run
3. Review job logs for errors

**Common issues:**
- Missing or incorrect GitHub secrets
- Render/Vercel service down
- Build errors (check local build first)
- Health check timeout (cold start)

**Fix:**
1. Verify all secrets are configured
2. Check Render/Vercel deployment logs
3. Test build locally: `npm run build`
4. Re-run workflow after fixing

### Health Check Timeout

**Symptoms**: Deployment succeeds but health check fails

**Causes**:
- Render free tier cold start (30-60 seconds)
- Database connection issues
- Environment variables missing

**Fix**:
```bash
# Check backend health manually
curl https://your-backend.onrender.com/health

# Check logs in Render dashboard
# Wait for cold start, then re-run workflow
```

### Tests Failing

**Run tests locally:**
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run lint
npm run build
```

**Common fixes:**
- Update failing tests
- Fix linting errors: `npm run lint:fix`
- Verify environment variables

### Vercel Deployment Failed

**Check:**
1. `VERCEL_TOKEN` is valid and not expired
2. `VITE_API_BASE_URL` is correct
3. Build succeeds locally: `cd frontend && npm run build`

**Get new token:**
1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Delete old token
3. Create new token
4. Update `VERCEL_TOKEN` secret in GitHub

### Render Deployment Failed

**Check:**
1. `RENDER_DEPLOY_HOOK_URL` is correct
2. Render service is running
3. Webhook is enabled in Render settings

**Get new webhook:**
1. Render Dashboard → Service → Settings
2. Deploy Hook → Delete old hook
3. Create new deploy hook
4. Update `RENDER_DEPLOY_HOOK_URL` secret in GitHub

---

## Local Testing

Test workflows locally before pushing:

**Linux/Mac:**
```bash
./scripts/local-test.sh
```

**Windows PowerShell:**
```powershell
.\scripts\local-test.ps1
```

**Manual testing:**
```bash
# Backend tests
cd backend
npm test
npm audit
npm run lint

# Frontend build
cd frontend
npm run lint
npm run build
```

---

## Monitoring

### View Workflow Status

- **Actions tab**: All workflow runs and logs
- **Environments**: Deployment history per environment
- **Releases**: Published releases and changelogs

### Add Status Badges

Add to README.md:

```markdown
[![Production Deploy](https://github.com/username/repo/actions/workflows/production-deploy.yml/badge.svg)](https://github.com/username/repo/actions/workflows/production-deploy.yml)
[![PR Validation](https://github.com/username/repo/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/username/repo/actions/workflows/pr-validation.yml)
[![CodeQL](https://github.com/username/repo/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/username/repo/actions/workflows/codeql-analysis.yml)
```

### Health Check Script

```bash
# Check if services are healthy
BACKEND_URL=https://your-backend.onrender.com \
FRONTEND_URL=https://your-frontend.vercel.app \
./scripts/health-check.sh
```

---

## Workflow Comparison

| Workflow | Trigger | Purpose | Duration | Auto/Manual |
|----------|---------|---------|----------|-------------|
| Production Deploy | Push to main | Deploy to prod | 5-8 min | Auto |
| PR Validation | Pull request | Test PR | 3-5 min | Auto |
| Staging Deploy | Push to develop | Deploy to staging | 4-6 min | Auto |
| Rollback | Manual | Emergency rollback | 1 min | Manual |
| Release | Tag v*.*.* | Create release | 3-4 min | Auto |
| CodeQL | Weekly/PR | Security scan | 5-10 min | Auto |
| Auto Changelog | Release | Update changelog | 1 min | Auto |

---

## Best Practices

### Commit Messages

Use conventional commits for automatic changelog generation:

```bash
feat: add user authentication
fix: resolve login bug
docs: update README
chore: update dependencies
test: add unit tests
refactor: improve code structure
```

### Branch Strategy

- `main` - Production (auto-deploys)
- `develop` - Staging (auto-deploys to staging)
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Pull Requests

1. Create feature branch from `main`
2. Make changes and commit
3. Push and create PR
4. Wait for automated checks
5. Request review
6. Merge to `main` (triggers deployment)

### Releases

Version format: `vMAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Example: `v1.2.3`

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Deployment Docs](https://render.com/docs/deploys)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## Support

- **Issues**: Create GitHub issue for bugs
- **Discussions**: Use GitHub discussions for questions
- **Security**: Report security issues privately
- **Documentation**: See `.github/` directory for more docs

---

**Pipeline Version**: 1.0
**Last Updated**: 2026-01-12
**Status**: Active and Ready 🚀
