# 🚀 Deploy to Vercel + Render - Complete Guide

**Frontend:** Vercel (Fast CDN, optimal performance)
**Backend:** Render (Reliable API hosting)
**Database:** MongoDB Atlas (Cloud database)

**Total Time:** 20-25 minutes
**Cost:** Free tier available for all services

---

## 📋 Prerequisites

- [ ] GitHub account
- [ ] MongoDB Atlas account (create at https://cloud.mongodb.com)
- [ ] Render account (create at https://render.com)
- [ ] Vercel account (create at https://vercel.com)
- [ ] Code pushed to GitHub

---

## Step 1: Setup MongoDB Atlas (5 minutes)

### 1.1 Create Account & Cluster
1. Go to https://cloud.mongodb.com
2. Sign up / Login
3. Click **"Build a Database"**
4. Choose **"M0 FREE"** tier
5. Select **Cloud Provider**: AWS
6. Select **Region**: Choose closest to your users (e.g., Mumbai for India)
7. **Cluster Name**: `chitfund-cluster`
8. Click **"Create"**

### 1.2 Create Database User
1. Click **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `chitfund_admin`
5. **Password**: Click "Autogenerate Secure Password" → **COPY AND SAVE THIS PASSWORD!**
6. **Database User Privileges**: Select "Read and write to any database"
7. Click **"Add User"**

### 1.3 Configure Network Access
1. Click **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"**
4. IP Address will be: `0.0.0.0/0`
5. Click **"Confirm"**

### 1.4 Get Connection String
1. Click **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. **Driver**: Node.js
5. **Version**: 4.1 or later
6. **Copy the connection string**:
   ```
   mongodb+srv://chitfund_admin:<password>@chitfund-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<password>` with the password you saved
8. Add database name: `mongodb+srv://chitfund_admin:YOUR_PASSWORD@chitfund-cluster.xxxxx.mongodb.net/chitfund?retryWrites=true&w=majority`

**✅ Save this connection string - you'll need it for Render!**

---

## Step 2: Deploy Backend to Render (10 minutes)

### 2.1 Push Code to GitHub (if not already)
```bash
# Navigate to your project
cd D:\Git\learning\Chit

# Initialize git (if needed)
git init
git add .
git commit -m "Ready for deployment"

# Create GitHub repo and push
# Go to github.com → New repository → "chitfund-manager"
git remote add origin https://github.com/YOUR_USERNAME/chitfund-manager.git
git branch -M main
git push -u origin main
```

### 2.2 Create Render Account
1. Go to https://render.com
2. Click **"Get Started"**
3. Sign up with **GitHub** (recommended)
4. Authorize Render to access your repositories

### 2.3 Create Web Service for Backend
1. Click **"New +"** (top right)
2. Select **"Web Service"**
3. Click **"Connect GitHub"** (if not connected)
4. Find and select your `chitfund-manager` repository
5. Click **"Connect"**

### 2.4 Configure Web Service
**Basic Settings:**
- **Name**: `chitfund-backend` (or any name you prefer)
- **Region**: Choose closest to MongoDB region (e.g., Singapore)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Select **"Free"** (or "Starter" for better performance - $7/month)

### 2.5 Add Environment Variables
Scroll down to **"Environment Variables"** section and add these:

Click **"Add Environment Variable"** for each:

```
Key: NODE_ENV
Value: production

Key: PORT
Value: 5000

Key: MONGODB_URI
Value: [Paste your MongoDB connection string from Step 1.4]

Key: JWT_SECRET
Value: [Generate a strong random string - minimum 32 characters]

Key: JWT_EXPIRE
Value: 30d

Key: CLIENT_URL
Value: https://chitfund-app.vercel.app
(We'll update this after deploying frontend)

Key: BCRYPT_ROUNDS
Value: 10

Key: RATE_LIMIT_WINDOW
Value: 15

Key: RATE_LIMIT_MAX_REQUESTS
Value: 1000
```

**Generate JWT_SECRET:**
```bash
# Run this in terminal to generate a secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.6 Deploy!
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Watch the logs for any errors
4. Once deployed, you'll see: ✅ **"Live"**

### 2.7 Get Backend URL
Your backend will be available at:
```
https://chitfund-backend.onrender.com
```

**✅ Copy this URL - you'll need it for Vercel!**

### 2.8 Test Backend
```bash
# Test health endpoint
curl https://chitfund-backend.onrender.com/health

# Should return:
# {"success":true,"message":"Server is running","timestamp":"..."}
```

---

## Step 3: Deploy Frontend to Vercel (5 minutes)

### 3.1 Update Frontend Environment Variables
1. Open `frontend/.env.production`
2. Update with your backend URL:

```env
VITE_API_BASE_URL=https://chitfund-backend.onrender.com/api
VITE_USE_MOCK_DATA=false
VITE_APP_NAME=Chit Fund Manager
VITE_APP_VERSION=1.0.0
```

3. Save the file
4. Commit changes:
```bash
git add frontend/.env.production
git commit -m "Update production API URL"
git push origin main
```

### 3.2 Install Vercel CLI (Optional but recommended)
```bash
npm install -g vercel
```

### 3.3 Deploy to Vercel

**Option A: Using Vercel CLI (Recommended)**
```bash
# Login to Vercel
vercel login

# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Follow the prompts:
# ? Set up and deploy "frontend"? Y
# ? Which scope? [Select your account]
# ? Link to existing project? N
# ? What's your project's name? chitfund-app
# ? In which directory is your code located? ./
# ? Want to override the settings? N

# Wait for deployment...
# You'll get a preview URL: https://chitfund-app-xxxx.vercel.app

# Deploy to production:
vercel --prod
```

**Option B: Using Vercel Dashboard**
1. Go to https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. **Import Git Repository**
4. Select your `chitfund-manager` repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. Click **"Environment Variables"**
7. Add:
   ```
   VITE_API_BASE_URL = https://chitfund-backend.onrender.com/api
   VITE_USE_MOCK_DATA = false
   ```

8. Click **"Deploy"**

### 3.4 Get Frontend URL
Your frontend will be available at:
```
https://chitfund-app.vercel.app
(or custom domain if configured)
```

**✅ Copy this URL!**

---

## Step 4: Update Backend CORS (Important!)

### 4.1 Update CLIENT_URL on Render
1. Go to Render dashboard
2. Click on your `chitfund-backend` service
3. Click **"Environment"** (left sidebar)
4. Find `CLIENT_URL` variable
5. Click **"Edit"**
6. Update value to your Vercel URL:
   ```
   https://chitfund-app.vercel.app
   ```
7. Click **"Save Changes"**
8. Service will automatically redeploy

---

## Step 5: Seed Database (One-time)

### 5.1 Connect to Database and Seed
```bash
# Option 1: Using Render Shell
# 1. Go to Render dashboard → Your service
# 2. Click "Shell" tab
# 3. Run:
npm run seed

# Option 2: Seed locally (if you want to test with specific data)
# Create a local .env file with production MongoDB URI
# Run:
npm run seed
```

This will create:
- Admin user (phone: 1234567890, password: admin123)
- 20 sample members
- 3 chit groups
- Sample auctions and payments

---

## Step 6: Test Deployment ✅

### 6.1 Test Backend
```bash
# Health check
curl https://chitfund-backend.onrender.com/health

# Login test
curl -X POST https://chitfund-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890","password":"admin123"}'
```

### 6.2 Test Frontend
1. Open: `https://chitfund-app.vercel.app`
2. Try to login:
   - **Phone**: 1234567890
   - **Password**: admin123
3. Check:
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] No console errors (F12)
   - [ ] API calls working (Network tab)

### 6.3 Full Feature Test
- [ ] Create new chit group
- [ ] Add members
- [ ] Schedule auction
- [ ] Record payment
- [ ] Generate report
- [ ] Check rankings

---

## Step 7: Custom Domain (Optional)

### 7.1 For Vercel (Frontend)
1. Go to Vercel project settings
2. Click **"Domains"**
3. Add your domain (e.g., `app.yourcompany.com`)
4. Update DNS records as instructed
5. SSL certificate auto-generated

### 7.2 For Render (Backend)
1. Go to Render service settings
2. Click **"Custom Domains"**
3. Add domain (e.g., `api.yourcompany.com`)
4. Update DNS records
5. SSL certificate auto-generated

### 7.3 Update Environment Variables
After adding custom domains:
- Update `CLIENT_URL` on Render
- Update `VITE_API_BASE_URL` on Vercel

---

## 📊 Monitoring & Maintenance

### Set Up Monitoring
1. **Render**:
   - Automatic health checks
   - View logs in dashboard
   - Email alerts available

2. **Vercel**:
   - Analytics built-in
   - Real-time logs
   - Performance metrics

3. **MongoDB Atlas**:
   - Monitoring tab
   - Set up alerts for storage
   - Performance advisor

### Regular Tasks
- [ ] Check logs weekly
- [ ] Monitor database size
- [ ] Review error reports
- [ ] Update dependencies monthly
- [ ] Test backups quarterly

---

## 🔄 Continuous Deployment

### Automatic Deployments
Both Vercel and Render auto-deploy when you push to GitHub!

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Automatic deployments:
# - Render: Backend redeploys automatically
# - Vercel: Frontend redeploys automatically
```

---

## 💰 Cost Breakdown

### Free Tier (Perfect for testing):
- **MongoDB Atlas M0**: $0 (512MB storage, 100 connections)
- **Render Free**: $0 (sleeps after inactivity, 750 hours/month)
- **Vercel Hobby**: $0 (100GB bandwidth/month)
- **Total**: $0/month

### Recommended Production:
- **MongoDB Atlas M10**: $57/month (2GB RAM, 10GB storage)
- **Render Starter**: $7/month (always on, 512MB RAM)
- **Vercel Pro**: $20/month (1TB bandwidth, better analytics)
- **Total**: $84/month

---

## 🆘 Troubleshooting

### Backend Issues:
```bash
# View Render logs
# Go to Render dashboard → Service → Logs

# Common issues:
# 1. MongoDB connection failed → Check connection string
# 2. Environment variables missing → Double-check in Render
# 3. Build failed → Check Node.js version compatibility
```

### Frontend Issues:
```bash
# View Vercel logs
vercel logs chitfund-app

# Common issues:
# 1. API calls fail → Check VITE_API_BASE_URL
# 2. CORS error → Update CLIENT_URL on Render
# 3. Build failed → Check build command and output directory
```

### CORS Issues:
If you see CORS errors in browser console:
1. Go to Render → Environment
2. Update `CLIENT_URL` to exact Vercel URL
3. Save and wait for redeploy

---

## ✅ Deployment Complete!

### Your URLs:
- **Frontend**: https://chitfund-app.vercel.app
- **Backend**: https://chitfund-backend.onrender.com
- **Database**: MongoDB Atlas (connection string in Render env vars)

### Default Login:
- **Phone**: 1234567890
- **Password**: admin123

### Next Steps:
1. Change admin password
2. Add real members
3. Create first chit group
4. Share with your team!

---

## 📞 Support & Resources

### Documentation:
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com

### Community:
- Vercel Discord: https://vercel.com/discord
- Render Community: https://community.render.com

---

**🎉 Congratulations! Your Chit Fund Manager is now live and running on a production-grade infrastructure!**

**Frontend (Vercel)**: Lightning-fast CDN delivery
**Backend (Render)**: Reliable API hosting
**Database (MongoDB Atlas)**: Secure cloud database

You now have:
- ✅ Global CDN for frontend
- ✅ Auto-scaling backend
- ✅ Managed database with backups
- ✅ SSL certificates
- ✅ Auto-deployments on git push
- ✅ Professional hosting infrastructure

**Time to celebrate and start managing chit funds! 🚀**
