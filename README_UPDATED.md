# Chit Fund Manager

A comprehensive Progressive Web Application (PWA) for managing chit funds with dynamic auctions, payment tracking, and member management.

## 🎯 Project Status: Phase 1 Complete ✓

### Current Implementation
- ✅ Backend API with Express.js
- ✅ Frontend with React + Vite + Tailwind CSS
- ✅ Mock data for testing (MongoDB disabled)
- ✅ JWT Authentication
- ✅ Admin Dashboard with payment tracking
- ✅ Member Dashboard with transaction history
- ✅ Security middleware (Helmet, CORS, Rate Limiting, XSS)
- ✅ Comprehensive mock data covering all scenarios

---

## 📚 Documentation

### Main Documentation Files
- **[MEMORY.md](./MEMORY.md)** - Complete project memory with all features, API endpoints, and test credentials
- **[REQUIREMENTS_FINAL.md](./REQUIREMENTS_FINAL.md)** - Detailed requirements document
- **[QUICK_START.md](./QUICK_START.md)** - Quick start guide
- **[MOCK_CREDENTIALS.md](./MOCK_CREDENTIALS.md)** - Test login credentials
- **[PHASE1_COMPLETION_SUMMARY.md](./PHASE1_COMPLETION_SUMMARY.md)** - Phase 1 summary

### Technical Documentation (`docs/` folder)
- **[API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** - Complete API reference
- **[COMPONENT_DOCUMENTATION.md](./docs/COMPONENT_DOCUMENTATION.md)** - React component documentation
- **[MOCK_DATA_STRUCTURE.md](./docs/MOCK_DATA_STRUCTURE.md)** - Mock data structure and business logic
- **[DEVELOPMENT_NOTES.md](./docs/DEVELOPMENT_NOTES.md)** - Development session history and decisions

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd Chit
```

2. **Install backend dependencies:**
```bash
cd backend
npm install
```

3. **Install frontend dependencies:**
```bash
cd ../frontend
npm install
```

4. **Set up environment variables:**
```bash
# Backend
cp .env.example .env
# Edit .env with your configuration
```

5. **Start the servers:**

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```
Server runs on: http://localhost:5000

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:3000 (or auto-selected port)

6. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/health

---

## 🔐 Test Credentials

### Admin Login
```
Phone: 9876543210
Password: admin123
```

### Member Login (any of these)
```
Phone: 9876543211-9876543219
Password: member123
```

**Recommended Test Users:**
- `9876543212` (Priya Sharma) - Winner scenario
- `9876543213` (Amit Patel) - Partial payment
- `9876543218` (Ramesh K) - Suspended/Overdue
- `9876543211` (Rajesh Kumar) - Multiple chits

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Express.js
- **Database:** MongoDB (disabled for Phase 1 - using mock data)
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** Helmet, CORS, XSS-Clean, Rate Limiting
- **Validation:** Express-validator
- **Logging:** Morgan
- **Environment:** dotenv

### Frontend
- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.4.2
- **Routing:** React Router DOM 6.27.0
- **HTTP Client:** Axios 1.7.7
- **Styling:** Tailwind CSS 3.4.14
- **Icons:** (to be added)

---

## 📁 Project Structure

```
Chit/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js                  # Authentication middleware
│   │   └── error.js                 # Error handling
│   ├── routes/
│   │   ├── mockAuth.js              # Mock authentication routes
│   │   └── mockDashboard.js         # Mock dashboard routes
│   ├── mockData.js                  # Comprehensive mock data
│   ├── server.js                    # Express server setup
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── common/
│   │   │       ├── Card.jsx         # Reusable card component
│   │   │       └── index.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global auth state
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboard.jsx
│   │   │   ├── member/
│   │   │   │   └── MemberDashboard.jsx
│   │   │   └── Login.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── postcss.config.cjs
│   ├── tailwind.config.js
│   └── package.json
│
├── docs/                            # Technical documentation
│   ├── API_DOCUMENTATION.md
│   ├── COMPONENT_DOCUMENTATION.md
│   ├── MOCK_DATA_STRUCTURE.md
│   └── DEVELOPMENT_NOTES.md
│
├── MEMORY.md                        # Project memory
├── REQUIREMENTS_FINAL.md
├── QUICK_START.md
├── MOCK_CREDENTIALS.md
├── PHASE1_COMPLETION_SUMMARY.md
├── .env.example
└── .gitignore
```

---

## ✨ Key Features

### Admin Dashboard
- **Quick Stats:** Active chits, total members, monthly collection, commission
- **Pending Payments:** List of all pending/overdue/partial payments
- **Member Payment Status:**
  - Dropdown to select chit groups
  - Member-wise payment table with 8 columns
  - Winner identification with 🏆 trophy icon
  - Summary stats and totals
- **Recent Activity:** Timeline of events
- **Quick Actions:** Create chit, add member, schedule auction

### Member Dashboard
- **Quick Stats:** My chit groups, next payment, total paid
- **My Chit Groups:** Grid view of all chit groups with rank
- **Monthly Transactions Table:**
  - 9 columns with full payment details
  - Winner row highlighting
  - Dividend display
  - Status badges
  - Payment method tracking
- **Upcoming Auctions:** Scheduled auctions
- **Recent Activity:** Payment history

### Security Features
- JWT authentication with httpOnly cookies
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Helmet security headers
- XSS protection
- NoSQL injection prevention

---

## 📊 Mock Data

### Users (10 total)
- 1 Admin user
- 9 Member users covering all scenarios:
  - Excellent payer
  - Winner with dividend
  - Partial payment
  - Overdue payment
  - Suspended member

### Chit Groups (4)
- 2 Active chit groups (Model A & B)
- 1 In-progress chit group
- 1 Closed chit group

### Auctions (5)
- 3 Closed auctions with winners
- 1 Scheduled auction
- 1 Live auction

### Payments (7)
- Paid (on-time)
- Paid (late)
- Partial payment
- Pending payment
- Overdue payment

---

## 🔗 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication
- `POST /auth/login` - Login user
- `POST /auth/register` - Register new member
- `POST /auth/logout` - Logout user

### Admin Dashboard
- `GET /dashboard/admin` - Get admin dashboard data

### Member Dashboard
- `GET /dashboard/member/:memberId` - Get member dashboard data

### Chit Groups
- `GET /dashboard/chits` - Get all chit groups
- `GET /dashboard/chits/:id` - Get chit group details

For complete API documentation, see [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)

---

## 🧪 Testing Scenarios

The mock data covers all these scenarios:
✅ On-time payment
✅ Late payment
✅ Partial payment
✅ Overdue payment
✅ Pending payment
✅ Winner with dividend
✅ Multiple chit groups
✅ Suspended member
✅ Active/In-progress/Closed chit groups
✅ Scheduled/Live/Closed auctions
✅ Member rankings (all categories)

---

## 🐛 Troubleshooting

### Port 5000 already in use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### PostCSS/Tailwind CSS error
- Ensure `postcss.config.cjs` exists (not `.js`)
- Use CommonJS format with `module.exports`

### Frontend not loading
- Check if backend is running on port 5000
- Check browser console for errors
- Verify CORS is enabled in backend

---

## 📈 Next Steps - Phase 2

### Database Integration
- [ ] Enable MongoDB connection
- [ ] Create Mongoose models
- [ ] Migrate mock data to database
- [ ] Update routes to use database
- [ ] Add data validation

### Advanced Features
- [ ] Real-time auction bidding (Socket.io)
- [ ] Push notifications
- [ ] Payment gateway integration
- [ ] SMS/Email notifications
- [ ] PDF report generation
- [ ] Multi-language support (Tamil, Hindi)
- [ ] Advanced analytics

---

## 🤝 Contributing

Phase 1 is complete. Ready to proceed with Phase 2: Database Integration.

---

## 📄 License

MIT License

---

## 📞 Support

For detailed information:
1. Check [MEMORY.md](./MEMORY.md) for complete project overview
2. Review [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for API reference
3. See [COMPONENT_DOCUMENTATION.md](./docs/COMPONENT_DOCUMENTATION.md) for component details
4. Check [DEVELOPMENT_NOTES.md](./docs/DEVELOPMENT_NOTES.md) for development history

---

## 🎯 Key Highlights

- **Comprehensive Mock Data:** All scenarios covered for thorough testing
- **Secure Authentication:** JWT with httpOnly cookies
- **Admin Dashboard:** Full payment tracking with dropdown selector
- **Member Dashboard:** Detailed transaction history table
- **Winner Identification:** Clear visual indicators (🏆 + green highlighting)
- **Responsive Design:** Works on mobile and desktop
- **Security Hardened:** Multiple layers of security middleware
- **Well Documented:** Extensive documentation in `docs/` folder

---

## 🏆 Achievement Summary

✅ Backend API with Express.js
✅ Frontend with React + Vite + Tailwind
✅ JWT Authentication System
✅ Admin Dashboard with Payment Tracking
✅ Member Dashboard with Transaction History
✅ Dropdown-based Chit Group Selection
✅ Winner Identification & Highlighting
✅ Color-coded Status Badges
✅ Interactive UI with Click Handlers
✅ Responsive Design
✅ Security Middleware
✅ Comprehensive Documentation

**Status:** Phase 1 Complete - Ready for Database Integration
