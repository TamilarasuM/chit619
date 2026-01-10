# API Documentation - Chit Fund Manager

## Base URL
```
http://localhost:5000/api
```

---

## Authentication Endpoints

### POST /auth/login
Login user and get JWT token

**Request:**
```json
{
  "phone": "9876543210",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "phone": "9876543210",
    "role": "admin",
    "status": "active",
    "languagePreference": "english",
    "createdAt": "2025-01-15T00:00:00.000Z"
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid phone number or password"
}
```

---

### POST /auth/register
Register new member (not yet implemented)

**Request:**
```json
{
  "name": "John Doe",
  "phone": "9876543220",
  "password": "password123",
  "languagePreference": "english"
}
```

---

### POST /auth/logout
Logout user (clears cookie)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Admin Dashboard Endpoints

### GET /dashboard/admin
Get admin dashboard data with all statistics

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "activeChits": 2,
      "totalMembers": 9,
      "thisMonthCollection": 15500,
      "totalCommission": 6000
    },
    "pendingPayments": [
      {
        "id": "pay005",
        "memberName": "Vijay Kumar",
        "chitGroup": "Monthly Chit Jan 2025",
        "amount": 5000,
        "dueDate": "2025-04-05T00:00:00.000Z",
        "status": "Pending"
      }
    ],
    "upcomingAuctions": [
      {
        "id": "auc004",
        "chitGroup": "Monthly Chit Jan 2025",
        "auctionNumber": 4,
        "scheduledDate": "2025-04-05T00:00:00.000Z",
        "scheduledTime": "18:00"
      }
    ],
    "recentActivity": [
      {
        "type": "auction_closed",
        "message": "Auction #3 completed in Monthly Chit Jan 2025 - Winner: Priya Sharma",
        "time": "2025-03-15T20:10:00.000Z"
      }
    ],
    "activeChitGroups": [
      {
        "_id": "chit001",
        "name": "Monthly Chit Jan 2025",
        "chitAmount": 100000,
        "monthlyContribution": 5000,
        "duration": 20,
        "status": "Active",
        "paymentModel": "A",
        "commissionRate": 5,
        "gracePeriodDays": 3,
        "startDate": "2025-01-05T00:00:00.000Z",
        "completedAuctions": 3,
        "totalMembers": 7,
        "members": [...],
        "winners": ["507f1f77bcf86cd799439013"]
      }
    ],
    "chitGroupPayments": [
      {
        "chitGroupId": "chit001",
        "chitGroupName": "Monthly Chit Jan 2025",
        "totalMembers": 7,
        "completedAuctions": 3,
        "payments": [
          {
            "id": "pay001",
            "memberId": "507f1f77bcf86cd799439012",
            "memberName": "Rajesh Kumar",
            "auctionNumber": 3,
            "dueDate": "2025-03-05T00:00:00.000Z",
            "baseAmount": 5000,
            "dividendReceived": 0,
            "dueAmount": 5000,
            "paidAmount": 5000,
            "outstandingBalance": 0,
            "paymentStatus": "Paid",
            "paidDate": "2025-03-05T10:30:00.000Z",
            "isOnTime": true,
            "delayDays": 0,
            "paymentMethod": "UPI",
            "referenceNumber": "UPI123456789"
          }
        ],
        "stats": {
          "totalDue": 35000,
          "totalPaid": 30583,
          "totalOutstanding": 4417,
          "paidCount": 6,
          "pendingCount": 0,
          "overdueCount": 1,
          "partialCount": 0
        }
      }
    ]
  }
}
```

---

## Member Dashboard Endpoints

### GET /dashboard/member/:memberId
Get member dashboard data with chit groups and payments

**Headers:**
```
Authorization: Bearer <token>
```

**Parameters:**
- `memberId` (path): Member ID (e.g., "507f1f77bcf86cd799439012")

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "myChitGroups": 2,
      "nextPaymentAmount": 5000,
      "nextPaymentDate": "2025-04-05T00:00:00.000Z",
      "totalPaid": 15000
    },
    "chitGroups": [
      {
        "id": "chit001",
        "name": "Monthly Chit Jan 2025",
        "chitAmount": 100000,
        "monthlyContribution": 5000,
        "status": "Active",
        "hasWon": false,
        "wonInAuction": null,
        "rank": 1,
        "totalMembers": 7,
        "rankCategory": "Excellent",
        "completedAuctions": 3,
        "duration": 20
      }
    ],
    "upcomingAuctions": [
      {
        "id": "auc004",
        "chitGroup": "Monthly Chit Jan 2025",
        "auctionNumber": 4,
        "scheduledDate": "2025-04-05T00:00:00.000Z",
        "scheduledTime": "18:00",
        "startingBid": 5000
      }
    ],
    "paymentTransactions": [
      {
        "id": "pay001",
        "chitGroupName": "Monthly Chit Jan 2025",
        "auctionNumber": 3,
        "dueDate": "2025-03-05T00:00:00.000Z",
        "baseAmount": 5000,
        "dividendReceived": 0,
        "dueAmount": 5000,
        "paidAmount": 5000,
        "outstandingBalance": 0,
        "paymentStatus": "Paid",
        "paidDate": "2025-03-05T10:30:00.000Z",
        "isOnTime": true,
        "delayDays": 0,
        "paymentMethod": "UPI",
        "referenceNumber": "UPI123456789",
        "isWinner": false,
        "amountReceived": 0
      }
    ],
    "rankings": [
      {
        "chitGroup": "Monthly Chit Jan 2025",
        "rank": 1,
        "total": 7,
        "category": "Excellent",
        "score": 100
      }
    ],
    "recentActivity": [
      {
        "type": "payment",
        "message": "Payment received - Monthly Chit Jan 2025",
        "amount": 5000,
        "time": "2025-03-05T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Chit Group Endpoints

### GET /dashboard/chits
Get all chit groups

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "chit001",
      "name": "Monthly Chit Jan 2025",
      "chitAmount": 100000,
      "monthlyContribution": 5000,
      "duration": 20,
      "status": "Active",
      "paymentModel": "A",
      "commissionRate": 5,
      "gracePeriodDays": 3,
      "startDate": "2025-01-05T00:00:00.000Z",
      "completedAuctions": 3,
      "totalMembers": 7,
      "members": [...],
      "winners": [...]
    }
  ]
}
```

---

### GET /dashboard/chits/:id
Get chit group details with auctions

**Parameters:**
- `id` (path): Chit group ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chit": {
      "_id": "chit001",
      "name": "Monthly Chit Jan 2025",
      "chitAmount": 100000,
      "monthlyContribution": 5000,
      "duration": 20,
      "status": "Active",
      "paymentModel": "A",
      "commissionRate": 5,
      "gracePeriodDays": 3,
      "startDate": "2025-01-05T00:00:00.000Z",
      "completedAuctions": 3,
      "totalMembers": 7,
      "members": [...],
      "winners": [...]
    },
    "auctions": [
      {
        "_id": "auc001",
        "chitGroupId": "chit001",
        "chitGroupName": "Monthly Chit Jan 2025",
        "auctionNumber": 1,
        "scheduledDate": "2025-01-05T00:00:00.000Z",
        "scheduledTime": "18:00",
        "status": "Closed",
        "startingBid": 5000,
        "winningBid": 3500,
        "discount": 1500,
        "winnerId": "507f1f77bcf86cd799439013",
        "winnerName": "Priya Sharma",
        "amountPaidToWinner": 80000,
        "commissionCollected": 2000,
        "closedDate": "2025-01-05T18:30:00.000Z"
      }
    ]
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "message": "Chit group not found"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Server error"
}
```

---

## Rate Limiting

- Window: 15 minutes
- Max requests: 100 per window
- Applies to all `/api/*` routes

---

## CORS Policy

### Development
- Allows all `localhost` origins with any port
- Credentials: true

### Production
- Only allows origins from `CLIENT_URL` environment variable
- Credentials: true

---

## Authentication

Uses JWT (JSON Web Tokens) stored in httpOnly cookies.

**Token Expiry:** 30 days

**Cookie Options:**
```javascript
{
  expires: 30 days,
  httpOnly: true,
  secure: true (production only),
  sameSite: 'strict'
}
```

---

## Data Models

### User
```javascript
{
  _id: string,
  name: string,
  phone: string (unique),
  password: string (hashed),
  role: 'admin' | 'member',
  status: 'active' | 'suspended',
  languagePreference: 'english' | 'tamil' | 'hindi',
  createdAt: Date,
  lastLogin: Date
}
```

### Chit Group
```javascript
{
  _id: string,
  name: string,
  chitAmount: number,
  monthlyContribution: number,
  duration: number,
  status: 'Pending' | 'Active' | 'InProgress' | 'Completed' | 'Closed',
  paymentModel: 'A' | 'B',
  commissionRate: number,
  gracePeriodDays: number,
  startDate: Date,
  completedAuctions: number,
  totalMembers: number,
  members: Array<{
    memberId: string,
    memberName: string,
    joinedDate: Date,
    hasWon: boolean,
    wonInAuction: number
  }>,
  winners: string[]
}
```

### Auction
```javascript
{
  _id: string,
  chitGroupId: string,
  chitGroupName: string,
  auctionNumber: number,
  scheduledDate: Date,
  scheduledTime: string,
  status: 'Scheduled' | 'Live' | 'Closed' | 'Cancelled',
  startingBid: number,
  winningBid: number,
  discount: number,
  winnerId: string,
  winnerName: string,
  amountPaidToWinner: number,
  commissionCollected: number,
  autoExcludedMembers: string[],
  closedDate: Date
}
```

### Payment
```javascript
{
  _id: string,
  memberId: string,
  memberName: string,
  chitGroupId: string,
  auctionNumber: number,
  dueDate: Date,
  baseAmount: number,
  dividendReceived: number,
  dueAmount: number,
  paidAmount: number,
  outstandingBalance: number,
  paymentStatus: 'Pending' | 'Paid' | 'Overdue' | 'Partial',
  paidDate: Date,
  isOnTime: boolean,
  delayDays: number,
  paymentMethod: string,
  referenceNumber: string
}
```

### Member Ranking
```javascript
{
  _id: string,
  memberId: string,
  memberName: string,
  chitGroupId: string,
  chitGroupName: string,
  rank: number,
  totalMembers: number,
  rankScore: number,
  rankCategory: 'Excellent' | 'Good' | 'Fair' | 'Average' | 'Poor',
  totalPayments: number,
  onTimePayments: number,
  latePayments: number,
  missedPayments: number,
  totalAmountPaid: number,
  lastUpdated: Date
}
```

---

## Helper Functions

### getMemberChitGroups(memberId)
Returns all chit groups a member is part of

### getAuctionsByChitGroup(chitGroupId)
Returns all auctions for a specific chit group

### getPaymentsByMember(memberId)
Returns all payments for a specific member

### getMemberRanking(memberId, chitGroupId)
Returns ranking information for a member in a specific chit group
