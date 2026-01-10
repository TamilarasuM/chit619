# Mock Login Credentials

The application is currently running with MOCK DATA (MongoDB disabled for easy testing).

## Test Accounts

### Admin Account
- **Phone:** `9876543210`
- **Password:** `admin123`
- **Role:** Admin
- **Access:** Full admin dashboard, can manage chits, members, auctions

### Member Accounts

#### Member 1 - Rajesh Kumar
- **Phone:** `9876543211`
- **Password:** `member123`
- **Role:** Member
- **Language:** English
- **Chit Groups:** 1 (Monthly Chit Jan 2025)

#### Member 2 - Priya Sharma
- **Phone:** `9876543212`
- **Password:** `member123`
- **Role:** Member
- **Language:** Tamil
- **Chit Groups:** 1 (Monthly Chit Jan 2025)

## API Endpoints Available

### Authentication
- **POST** `/api/auth/login` - Login with phone & password
- **POST** `/api/auth/logout` - Logout
- **GET** `/api/auth/me` - Get current user info

### Health Check
- **GET** `/health` - Check server status
- **GET** `/api` - API information

## How to Test

### 1. Using the Frontend (Recommended)

1. Open browser: http://localhost:3000
2. You'll see the login page
3. Enter one of the credentials above
4. You'll be redirected to the appropriate dashboard

### 2. Using Postman/Thunder Client

**Login Request:**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "phone": "9876543210",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "phone": "9876543210",
    "email": "admin@chitfund.com",
    "role": "admin",
    "language": "en",
    "status": "active"
  }
}
```

**Get Current User:**
```http
GET http://localhost:5000/api/auth/me
Authorization: Bearer YOUR_TOKEN_HERE
```

### 3. Using cURL

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"admin123"}'
```

**Get Current User:**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Mock Data Included

### Chit Group
- **Name:** Monthly Chit Jan 2025
- **Amount:** ₹1,00,000
- **Members:** 20
- **Duration:** 20 months
- **Commission:** ₹5,000
- **Model:** A (Winner pays full)
- **Status:** Active
- **Completed Auctions:** 5

### Members in Chit
- Rajesh Kumar
- Priya Sharma
- (18 more slots available)

## Notes

- All data is in-memory (will reset on server restart)
- No actual database operations are performed
- Perfect for testing frontend without MongoDB setup
- JWT tokens are real and valid
- Password hashing is real (bcrypt)

## Switching to Real Database

When ready to use MongoDB:

1. Start MongoDB service
2. Edit `backend/server.js`:
   - Uncomment `connectDB();` (line 19)
   - Comment out the mock warning (line 20)
   - Change `/api/auth` route to use real auth routes
3. Server will automatically restart (nodemon)

## Security Note

⚠️ **These are test credentials only!**
- Never use these in production
- Change all passwords before deployment
- Use strong secrets for JWT_SECRET
- Enable MongoDB for production use
