# Chit Fund Manager - Deployment Guide

This guide will help you deploy your Chit Fund Manager application to production.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables
- [ ] Copy `.env.example` to `.env`
- [ ] Update all production values in `.env`
- [ ] Set strong `JWT_SECRET` (minimum 32 characters)
- [ ] Configure production MongoDB URI
- [ ] Set correct `CLIENT_URL_PROD`
- [ ] Configure WhatsApp API credentials (if using notifications)

### 2. Database Setup
- [ ] MongoDB Atlas account created
- [ ] Database cluster created
- [ ] Network access configured (allow your server's IP)
- [ ] Database user created with appropriate permissions

### 3. Build & Test
```bash
# Install all dependencies
npm run install:all

# Run tests
npm test

# Build frontend
npm run build

# Test production build locally
NODE_ENV=production npm start
```

---

## 🚀 Deployment Options

### Option 1: Render (Recommended - Easiest)

**Best for:** Quick deployment, free tier available, automatic SSL

#### Backend Deployment:

1. **Create Render Account**
   - Go to https://render.com
   - Sign up / Login with GitHub

2. **New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** `chitfund-api`
     - **Environment:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free or Starter

3. **Environment Variables** (Add in Render dashboard):
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=[Your MongoDB Atlas URI]
   JWT_SECRET=[Your strong secret]
   CLIENT_URL=[Your frontend URL]
   JWT_EXPIRE=30d
   BCRYPT_ROUNDS=10
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://chitfund-api.onrender.com`

#### Frontend Deployment:

1. **Update Frontend Config**
   ```bash
   # Edit frontend/.env.production
   VITE_API_BASE_URL=https://chitfund-api.onrender.com/api
   VITE_USE_MOCK_DATA=false
   ```

2. **New Static Site**
   - Click "New +" → "Static Site"
   - Connect repository
   - Configure:
     - **Name:** `chitfund-app`
     - **Build Command:** `cd frontend && npm install && npm run build`
     - **Publish Directory:** `frontend/dist`

3. **Deploy**
   - Your app will be live at: `https://chitfund-app.onrender.com`

---

### Option 2: Railway

**Best for:** Full-stack deployment, good free tier

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **New Project**
   - Click "New Project"
   - Deploy from GitHub repo

3. **Add MongoDB**
   - Click "New" → "Database" → "Add MongoDB"
   - Copy connection string

4. **Configure Environment Variables**
   - Add same variables as Render option

5. **Deploy**
   - Railway auto-deploys on git push

---

### Option 3: Vercel (Frontend) + Railway/Render (Backend)

**Best for:** Optimal performance, CDN benefits

#### Frontend on Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Follow prompts:
# - Framework Preset: Vite
# - Build Command: npm run build
# - Output Directory: dist
```

#### Environment Variables (Vercel):
```
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_USE_MOCK_DATA=false
```

---

### Option 4: DigitalOcean / AWS / Azure (Self-Hosted)

**Best for:** Full control, custom requirements

#### Using Docker:

1. **Create Dockerfile** (backend):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   services:
     backend:
       build: .
       ports:
         - "5000:5000"
       environment:
         - NODE_ENV=production
         - MONGODB_URI=${MONGODB_URI}
         - JWT_SECRET=${JWT_SECRET}
       restart: always
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

---

## 🔒 Security Checklist

- [ ] Use HTTPS (SSL certificates)
- [ ] Enable CORS only for your domain
- [ ] Set secure JWT_SECRET
- [ ] Enable rate limiting
- [ ] Use environment variables (never commit secrets)
- [ ] Enable MongoDB IP whitelist
- [ ] Regular database backups
- [ ] Update dependencies regularly

---

## 🗄️ Database Setup (MongoDB Atlas)

1. **Create Cluster**
   - Go to https://cloud.mongodb.com
   - Create free M0 cluster
   - Choose region closest to your users

2. **Database Access**
   - Create database user
   - Set strong password
   - Grant read/write permissions

3. **Network Access**
   - Allow access from anywhere: `0.0.0.0/0` (for cloud platforms)
   - Or add specific IPs

4. **Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/chitfund?retryWrites=true&w=majority
   ```

5. **Seed Initial Data** (One-time):
   ```bash
   # Set MONGODB_URI in .env first
   npm run seed
   ```

---

## 📊 Post-Deployment

### 1. Test Application
- [ ] Login works
- [ ] Create chit group
- [ ] Add members
- [ ] Schedule auction
- [ ] Record payments
- [ ] Generate reports
- [ ] Check member rankings

### 2. Monitor
- Check logs for errors
- Monitor database performance
- Set up uptime monitoring (UptimeRobot, Pingdom)

### 3. Backup Strategy
- Enable automated MongoDB backups
- Export data regularly
- Test restore procedures

---

## 🆘 Troubleshooting

### Backend Issues:
```bash
# Check logs
# Render: View logs in dashboard
# Railway: railway logs
# Vercel: vercel logs

# Common fixes:
# 1. Verify environment variables
# 2. Check MongoDB connection
# 3. Ensure PORT is correct (most platforms set it automatically)
```

### Frontend Issues:
```bash
# Clear cache and rebuild
rm -rf frontend/dist
npm run build

# Check API URL in browser console
# Verify CORS settings on backend
```

### Database Connection:
```bash
# Test MongoDB connection
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✓ Connected')).catch(err => console.error('✗ Error:', err))"
```

---

## 📱 Progressive Web App (PWA)

Your app is already PWA-ready. Users can:
- Install on mobile home screen
- Use offline (limited features)
- Receive push notifications (if configured)

---

## 🔄 Continuous Deployment

### GitHub Actions (Auto-deploy on push):

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

---

## 💰 Cost Estimates

### Free Tier (Good for testing/small scale):
- **Render Free:** Backend + Frontend
- **MongoDB Atlas M0:** 512MB storage
- **Total:** $0/month (with limitations)

### Production (Recommended):
- **Render Starter:** $7/month (backend)
- **Vercel Pro:** $20/month (frontend + CDN)
- **MongoDB Atlas M10:** $57/month (dedicated)
- **Total:** ~$84/month

### Enterprise:
- DigitalOcean Droplet: $24+/month
- MongoDB Atlas M30: $285/month
- Load balancer: $12/month
- **Total:** $321+/month

---

## 📞 Support

If you encounter issues:
1. Check logs first
2. Review environment variables
3. Test database connection
4. Verify API endpoints

---

## ✅ Success!

Once deployed:
1. Share the URL with your team
2. Create admin account
3. Add initial members
4. Start first chit group

**Your Chit Fund Manager is now live! 🎉**
