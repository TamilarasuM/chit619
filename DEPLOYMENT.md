# Chit Fund Manager - Deployment Guide

Complete guide for deploying the Chit Fund Manager application locally and to production.

## Table of Contents
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Admin Setup](#admin-setup)
- [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 5.0 (or MongoDB Atlas account)
- npm >= 9.0.0

### Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd Chit
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_random_string_min_32_chars
   JWT_EXPIRE=30d
   CLIENT_URL=http://localhost:3001
   ```

3. **Start the Application**
   ```bash
   npm run dev
   ```

   This starts both:
   - Backend: http://localhost:5000
   - Frontend: http://localhost:3001

4. **Test the Application**
   - Health check: http://localhost:5000/health
   - Frontend: http://localhost:3001
   - Login with admin: 9942891022 / admin123

### Development Commands

```bash
# Start both servers
npm run dev

# Start backend only
cd backend && npm run dev

# Start frontend only
cd frontend && npm run dev

# Create admin user
npm run create-admin

# List all admins
npm run list-admins

# Seed database with sample data
npm run seed
```

---

## Production Deployment

### Architecture
- **Frontend**: Vercel (React + Vite PWA)
- **Backend**: Render.com (Node.js + Express)
- **Database**: MongoDB Atlas

### Step 1: MongoDB Atlas Setup

1. Create account at https://cloud.mongodb.com
2. Create a new cluster (free tier)
3. **Network Access**: Add `0.0.0.0/0` to allow all IPs
4. **Database Access**: Create user with read/write permissions
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/chitfund`

### Step 2: Deploy Backend to Render

1. **Create Account**: https://render.com
2. **New Web Service**: Connect your GitHub repository
3. **Configure Service**:
   - Name: `chitfund-backend`
   - Root Directory: Leave blank (or `backend` if needed)
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Environment Variables** (Critical!):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=<your_mongodb_atlas_connection_string>
   JWT_SECRET=<generate_secure_random_string>
   JWT_EXPIRE=30d
   BCRYPT_ROUNDS=10
   RATE_LIMIT_WINDOW=15
   RATE_LIMIT_MAX_REQUESTS=1000
   CLIENT_URL=<your_vercel_url_from_step_3>
   ```

5. Click **Create Web Service**
6. Wait for deployment (5-10 minutes)
7. Note your backend URL: `https://your-app.onrender.com`

### Step 3: Deploy Frontend to Vercel

1. **Create Account**: https://vercel.com
2. **Import Project**: Connect GitHub repository
3. **Configure Project**:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Environment Variable**:
   ```
   VITE_API_URL=<your_render_backend_url>
   ```

5. Click **Deploy**
6. Wait for deployment (2-3 minutes)
7. Note your frontend URL: `https://your-app.vercel.app`

### Step 4: Update CORS (Critical!)

1. Go to Render Dashboard
2. Open your backend service
3. Go to **Environment** tab
4. Update `CLIENT_URL` to your Vercel URL
5. Save (auto-redeploys in ~2 minutes)

### Step 5: Seed Database

**Option A: Via API** (Recommended)
```bash
curl -X POST https://your-backend.onrender.com/api/seed
```

**Option B: Via Render Shell**
1. Render Dashboard → Service → Shell
2. Run: `npm run seed`
3. Wait for completion message

### Step 6: Test Production

1. **Backend Health**: https://your-backend.onrender.com/health
2. **Frontend**: https://your-app.vercel.app
3. **Login**: Use admin credentials (see Admin Setup section)

---

## Admin Setup

### Default Admin Credentials
- **Phone**: 9942891022
- **Password**: admin123

### Create/Verify Admin User

```bash
# Create or verify default admin
npm run create-admin

# List all admin users
npm run list-admins

# Make existing user admin
node backend/utils/createAdmin.js -u <phone_number>
```

### Change Admin Password

1. Login to application
2. Go to Profile Settings
3. Change password through UI

Or via MongoDB:
```javascript
// In MongoDB shell or Atlas
db.users.updateOne(
  { phone: "9942891022" },
  { $set: { password: "<bcrypt_hashed_password>" } }
)
```

### Security Best Practices

1. **Change default password immediately** after first login
2. **Use strong passwords** (minimum 6 characters)
3. **Limit admin accounts** - only trusted users
4. **Monitor admin activity** through audit logs
5. **Never commit** passwords or secrets to git

---

## Troubleshooting

### Common Issues

#### 1. Backend Not Responding (Render)

**Check Service Status**:
1. Go to Render Dashboard
2. Check service status (Live/Deploying/Failed)

**Check Logs**:
1. Click service → Logs tab
2. Look for errors:
   - MongoDB connection errors
   - Missing environment variables
   - Port conflicts

**Common Fixes**:
- Verify all environment variables are set
- Check MongoDB Atlas allows 0.0.0.0/0
- Wait for cold start (30-60 seconds first request)
- Try manual redeploy with cache clear

#### 2. CORS Errors

**Symptoms**: "Access blocked by CORS policy" in browser console

**Fix**:
1. Verify `CLIENT_URL` in Render matches your Vercel URL exactly
2. Include protocol (https://)
3. No trailing slash
4. Save and wait for auto-redeploy (~2 minutes)

#### 3. Login Failed

**Possible Causes**:
- Database not seeded
- Wrong credentials
- Backend not running
- JWT_SECRET mismatch

**Fix**:
1. Check backend logs for errors
2. Verify database was seeded: `npm run create-admin`
3. Use correct credentials: 9942891022 / admin123
4. Check MongoDB connection in logs

#### 4. Frontend Build Fails

**Common Issues**:
- Missing `VITE_API_URL` environment variable
- Node version mismatch
- Dependency conflicts

**Fix**:
1. Verify environment variables in Vercel
2. Check Vercel build logs
3. Ensure Node.js 18+ in Vercel settings
4. Try redeploying

#### 5. Database Connection Errors

**Check MongoDB Atlas**:
1. Network Access: 0.0.0.0/0 is allowed
2. Database Access: User exists with correct permissions
3. Connection string is correct (includes password)
4. Database name is specified

**Test Connection**:
```bash
# Test locally
node -e "require('mongoose').connect('YOUR_URI').then(() => console.log('Connected')).catch(e => console.error(e))"
```

### Render Free Tier Behavior

- **Sleeps after 15 minutes** of inactivity
- **Cold start**: 30-60 seconds to wake up
- **First request** may timeout - refresh page
- **Upgrade to Starter ($7/month)** for always-on service

### Performance Tips

1. **Upgrade Render Plan**: $7/month for no cold starts
2. **Add Custom Domain**: Better branding and SSL
3. **Enable Vercel Analytics**: Track performance
4. **MongoDB Indexes**: Already configured in models
5. **Rate Limiting**: Already enabled (1000 req/15min)

### Need More Help?

1. **Check Logs**:
   - Render: Dashboard → Service → Logs
   - Vercel: Dashboard → Project → Deployments → Logs

2. **Browser Console**: F12 for frontend errors

3. **Network Tab**: Check API calls and responses

4. **Health Endpoints**:
   - Backend: https://your-backend.onrender.com/health
   - Should return JSON with success status

---

## Auto-Deployments

Both platforms support automatic deployments on git push:

```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# Automatic deployments:
# ✓ Vercel redeploys frontend automatically
# ✓ Render redeploys backend automatically
```

### Deployment Status

View deployment status:
- **Vercel**: https://vercel.com/dashboard
- **Render**: https://dashboard.render.com

---

## Monitoring

### Application Health
- Backend: https://your-backend.onrender.com/health
- Check regularly for uptime

### Database Backups
- MongoDB Atlas: Auto-backup daily (free tier)
- Download backups periodically

### Logs
- **Render**: Real-time logs in dashboard
- **Vercel**: Deployment and runtime logs
- **MongoDB Atlas**: Database slow queries

---

## Quick Reference

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| Frontend | Vercel | https://your-app.vercel.app |
| Backend | Render | https://your-app.onrender.com |
| Database | MongoDB Atlas | mongodb+srv://... |
| Admin Panel | Frontend | /admin |
| Member Portal | Frontend | /member |

### Important URLs
- Vercel Dashboard: https://vercel.com/dashboard
- Render Dashboard: https://dashboard.render.com
- MongoDB Atlas: https://cloud.mongodb.com

### Default Credentials
- Admin: 9942891022 / admin123
- Change immediately after first login!

---

## CI/CD Pipeline

The application includes GitHub Actions workflows for automated deployment. See `.github/CI_CD_GUIDE.md` for complete CI/CD setup instructions.

---

**Deployment Date**: 2026-01-12
**Documentation Version**: 1.0
**Tested Platforms**: Vercel, Render, MongoDB Atlas
