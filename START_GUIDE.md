# Chit Fund Manager - Quick Start Guide

## 🚀 Available NPM Scripts

### Development Scripts (Recommended)

```bash
# Start BOTH frontend and backend together (Recommended for development)
npm run dev
# or
npm run dev:full

# Start only backend (with auto-reload)
npm run backend
# or
npm run server

# Start only frontend
npm run frontend
# or
npm run client
```

### Production Scripts

```bash
# Start backend in production mode (no auto-reload)
npm start

# Build frontend for production
npm run build
```

### Setup Scripts

```bash
# Install dependencies for both frontend and backend
npm run install:all

# Seed database with sample data
npm run seed

# Clean all node_modules
npm run clean
```

### Testing

```bash
# Run tests with coverage
npm test
```

## 📋 First Time Setup

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Update MongoDB connection string and other settings

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Health: http://localhost:5000/health

## 🎯 Typical Development Workflow

### Option 1: Run Everything Together (Easiest)
```bash
npm run dev
```
This starts both backend and frontend in a single terminal with live reload.

### Option 2: Run Separately (Better for debugging)
```bash
# Terminal 1 - Backend
npm run backend

# Terminal 2 - Frontend
npm run frontend
```

## 🔧 What Each Script Does

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run dev` | Start both frontend & backend | Daily development |
| `npm run backend` | Start backend only (nodemon) | Backend debugging |
| `npm run frontend` | Start frontend only (Vite) | Frontend debugging |
| `npm start` | Start backend (production) | Production deployment |
| `npm run build` | Build frontend for production | Production deployment |
| `npm run seed` | Populate database with sample data | Testing/Demo |
| `npm run install:all` | Install all dependencies | First time setup |
| `npm test` | Run all tests | Before commits |

## 🌐 Default Ports

- **Frontend (Vite)**: http://localhost:5173
- **Backend (Express)**: http://localhost:5000

## 📝 Environment Variables

Required in `.env`:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Dependencies Not Installed
```bash
npm run install:all
```

### Database Connection Issues
- Check MongoDB is running
- Verify MONGO_URI in `.env`
- Test connection: http://localhost:5000/health

## 📚 Additional Resources

- Backend API Documentation: `/docs/BACKEND_API_COMPLETE_SUMMARY.md`
- Frontend Documentation: `/docs/FRONTEND_PROGRESS.md`
- Requirements: `/docs/REQUIREMENTS_FINAL.md`

## 🎉 Happy Coding!

For any issues, check the documentation or server logs.
