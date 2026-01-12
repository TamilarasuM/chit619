# Vercel Deployment Setup Guide

## Required GitHub Secrets

To enable automatic Vercel deployment via GitHub Actions, add these secrets to your repository:

**Go to**: https://github.com/TamilarasuM/chit619/settings/secrets/actions

### 1. VERCEL_TOKEN

**How to get it**:
1. Visit: https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name: `GitHub Actions`
4. Scope: Full Account
5. Expiration: No expiration (or set as needed)
6. Click **"Create"**
7. **Copy the token immediately** (starts with `v0_...`)

**Add to GitHub**:
- Name: `VERCEL_TOKEN`
- Value: Paste the token you copied

---

### 2. VERCEL_ORG_ID

**Add to GitHub**:
- Name: `VERCEL_ORG_ID`
- Value: `team_2F3uMtrv3cFz7A3vBQNSqIMW`

---

### 3. VERCEL_PROJECT_ID

**Add to GitHub**:
- Name: `VERCEL_PROJECT_ID`
- Value: `prj_TJoLGqtWQdqAJMVwpOq4yT17RSHb`

---

## How the Workflow Works

The workflow (`.github/workflows/deploy-frontend.yml`) will:

1. **Trigger on**:
   - Push to main/master branch
   - Changes in `frontend/` directory
   - Manual trigger via GitHub Actions UI

2. **Process**:
   - Checkout code
   - Install dependencies
   - Build frontend with production environment
   - Deploy to Vercel using CLI

3. **Result**:
   - Frontend automatically deployed to: https://frontend-five-topaz-22.vercel.app
   - Deployment visible in GitHub Actions

---

## Testing the Workflow

After adding the secrets:

1. Make a small change to any frontend file
2. Commit and push to main
3. Watch deployment at: https://github.com/TamilarasuM/chit619/actions
4. Frontend will automatically deploy to Vercel

---

## Manual Trigger

You can also manually trigger the deployment:

1. Go to: https://github.com/TamilarasuM/chit619/actions
2. Click "Deploy Frontend to Vercel"
3. Click "Run workflow"
4. Select "main" branch
5. Click "Run workflow"

---

## Deployment Status

**GitHub Actions**: https://github.com/TamilarasuM/chit619/actions
**Vercel Dashboard**: https://vercel.com/tamils-projects-ec5a19e3/frontend
**Production URL**: https://frontend-five-topaz-22.vercel.app

---

## Quick Setup Checklist

- [ ] Create Vercel token at https://vercel.com/account/tokens
- [ ] Add `VERCEL_TOKEN` secret to GitHub
- [ ] Add `VERCEL_ORG_ID` secret: `team_2F3uMtrv3cFz7A3vBQNSqIMW`
- [ ] Add `VERCEL_PROJECT_ID` secret: `prj_TJoLGqtWQdqAJMVwpOq4yT17RSHb`
- [ ] Test by pushing a change or manual trigger

---

**Estimated Setup Time**: 3 minutes
