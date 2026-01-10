# 🎯 Vercel + Render Deployment - Quick Reference

## 📝 Deployment Checklist

### Before You Start:
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas account created
- [ ] Render account created
- [ ] Vercel account created

---

## ⚡ Quick Steps (20 minutes)

### 1️⃣ MongoDB Atlas (5 min)
```
1. cloud.mongodb.com → Create M0 cluster
2. Database Access → Create user
3. Network Access → Allow 0.0.0.0/0
4. Get connection string
```

### 2️⃣ Render Backend (10 min)
```
1. render.com → New Web Service
2. Connect GitHub repo
3. Add Environment Variables:
   - NODE_ENV=production
   - MONGODB_URI=[your connection string]
   - JWT_SECRET=[32+ char random string]
   - CLIENT_URL=[will add after Vercel]
4. Deploy → Get backend URL
```

### 3️⃣ Vercel Frontend (5 min)
```
1. Update frontend/.env.production:
   VITE_API_BASE_URL=https://your-backend.onrender.com/api

2. Push to GitHub

3. vercel.com → New Project
   - Root Directory: frontend
   - Framework: Vite
   - Add env vars

4. Deploy → Get frontend URL
```

### 4️⃣ Update Backend CORS
```
1. Render → Environment
2. Update CLIENT_URL=[Your Vercel URL]
3. Save (auto redeploys)
```

### 5️⃣ Seed & Test
```
1. Render Shell: npm run seed
2. Login: phone 1234567890, password admin123
3. Test all features
```

---

## 🔑 Environment Variables

### Render (Backend):
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chitfund
JWT_SECRET=[32+ random chars]
JWT_EXPIRE=30d
CLIENT_URL=https://chitfund-app.vercel.app
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000
```

### Vercel (Frontend):
```env
VITE_API_BASE_URL=https://chitfund-backend.onrender.com/api
VITE_USE_MOCK_DATA=false
```

---

## 🧪 Quick Tests

### Backend Health:
```bash
curl https://YOUR-BACKEND.onrender.com/health
```

### Login Test:
```bash
curl -X POST https://YOUR-BACKEND.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890","password":"admin123"}'
```

### Frontend:
```
Open: https://YOUR-APP.vercel.app
Login: 1234567890 / admin123
```

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| CORS Error | Update CLIENT_URL on Render |
| Can't connect to DB | Check MONGODB_URI format |
| API calls fail | Verify VITE_API_BASE_URL |
| 404 on routes | Check Root Directory in Vercel |
| Build fails | Check Node version (18+) |

---

## 📱 URLs Reference

After deployment, save these:

```
Frontend: https://__________.vercel.app
Backend: https://__________.onrender.com
MongoDB: mongodb+srv://__________.mongodb.net/chitfund

Admin Login:
Phone: 1234567890
Password: admin123 (change after first login!)
```

---

## 🔄 Update & Redeploy

```bash
# Make changes
git add .
git commit -m "Your update"
git push origin main

# Auto-deploys:
# ✅ Vercel redeploys frontend
# ✅ Render redeploys backend
```

---

## 💡 Pro Tips

1. **Generate JWT_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **View Logs**:
   - Render: Dashboard → Service → Logs
   - Vercel: `vercel logs` or Dashboard

3. **Custom Domain**:
   - Vercel: Project → Domains
   - Render: Service → Custom Domains

4. **Rollback**:
   - Vercel: Deployments → Previous → Promote
   - Render: Dashboard → Manual Deploy → Previous commit

---

## 📊 Free Tier Limits

| Service | Limit | Notes |
|---------|-------|-------|
| MongoDB M0 | 512MB | Good for 5000+ records |
| Render Free | 750 hrs/month | Sleeps after 15 min idle |
| Vercel Hobby | 100GB bandwidth | Generous for most apps |

**Recommendation:** Start with free tier, upgrade when needed.

---

## 🆘 Quick Help

**Deployment stuck?** Check:
1. All env vars set correctly?
2. MongoDB connection string correct?
3. GitHub repo accessible?
4. Build logs for errors?

**Still stuck?** Review full guide in `DEPLOY_VERCEL_RENDER.md`

---

**Last Updated:** 2026-01-10
**Support:** Check logs first, then review troubleshooting section
