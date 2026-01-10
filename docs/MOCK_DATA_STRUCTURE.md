# Mock Data Structure - Chit Fund Manager

## Location: `backend/mockData.js`

---

## Overview

The mock data represents a realistic chit fund management system with:
- 10 users (1 admin + 9 members)
- 4 chit groups (2 active, 1 in-progress, 1 closed)
- 5 auctions (various states)
- 7 payments (covering all scenarios)
- 6 member rankings
- 3 notifications
- 5 audit logs

---

## Data Structures

### 1. mockUsers (10 users)

#### Admin User
```javascript
{
  _id: '507f1f77bcf86cd799439011',
  name: 'Admin User',
  phone: '9876543210',
  password: hashPassword('admin123'),
  role: 'admin',
  status: 'active',
  languagePreference: 'english',
  createdAt: new Date('2025-01-01'),
  lastLogin: new Date()
}
```

#### Member Examples

**Excellent Payer (Rajesh Kumar):**
```javascript
{
  _id: '507f1f77bcf86cd799439012',
  name: 'Rajesh Kumar',
  phone: '9876543211',
  password: hashPassword('member123'),
  role: 'member',
  status: 'active',
  languagePreference: 'english',
  createdAt: new Date('2025-01-02'),
  lastLogin: new Date()
}
```

**Winner (Priya Sharma):**
```javascript
{
  _id: '507f1f77bcf86cd799439013',
  name: 'Priya Sharma',
  phone: '9876543212',
  // Won auction, receives dividend
}
```

**Partial Payment (Amit Patel):**
```javascript
{
  _id: '507f1f77bcf86cd799439014',
  name: 'Amit Patel',
  phone: '9876543213',
  // Paid ₹3,500 out of ₹5,000
}
```

**Suspended (Ramesh K):**
```javascript
{
  _id: '507f1f77bcf86cd799439018',
  name: 'Ramesh K',
  phone: '9876543218',
  status: 'suspended',
  // Multiple overdue payments
}
```

---

### 2. mockChitGroups (4 groups)

#### Active Chit Group - Model A
```javascript
{
  _id: 'chit001',
  name: 'Monthly Chit Jan 2025',
  chitAmount: 100000,
  monthlyContribution: 5000,
  duration: 20,
  status: 'Active',
  paymentModel: 'A',
  commissionRate: 5,
  gracePeriodDays: 3,
  startDate: new Date('2025-01-05'),
  completedAuctions: 3,
  totalMembers: 7,
  members: [
    {
      memberId: '507f1f77bcf86cd799439012',
      memberName: 'Rajesh Kumar',
      joinedDate: new Date('2025-01-02'),
      hasWon: false,
      wonInAuction: null
    },
    {
      memberId: '507f1f77bcf86cd799439013',
      memberName: 'Priya Sharma',
      joinedDate: new Date('2025-01-02'),
      hasWon: true,
      wonInAuction: 2
    }
    // ... 5 more members
  ],
  winners: ['507f1f77bcf86cd799439013']
}
```

#### Active Chit Group - Model B
```javascript
{
  _id: 'chit002',
  name: 'Quarterly Chit Q1 2025',
  chitAmount: 250000,
  monthlyContribution: 13900,
  duration: 18,
  status: 'Active',
  paymentModel: 'B', // 20% markup
  commissionRate: 4,
  gracePeriodDays: 5,
  startDate: new Date('2025-01-10'),
  completedAuctions: 2,
  totalMembers: 5,
  members: [...],
  winners: []
}
```

#### In-Progress Chit Group
```javascript
{
  _id: 'chit003',
  name: 'Weekly Chit March',
  chitAmount: 50000,
  monthlyContribution: 1100,
  duration: 50,
  status: 'InProgress',
  paymentModel: 'A',
  commissionRate: 3,
  gracePeriodDays: 2,
  startDate: new Date('2025-03-01'),
  completedAuctions: 1,
  totalMembers: 3,
  members: [...],
  winners: []
}
```

#### Closed Chit Group
```javascript
{
  _id: 'chit004',
  name: 'Closed Chit Dec 2024',
  chitAmount: 75000,
  monthlyContribution: 3750,
  duration: 20,
  status: 'Closed',
  paymentModel: 'A',
  commissionRate: 5,
  gracePeriodDays: 3,
  startDate: new Date('2024-12-01'),
  completedAuctions: 20,
  totalMembers: 4,
  members: [...],
  winners: [...]
}
```

---

### 3. mockAuctions (5 auctions)

#### Closed Auction - Auction #1
```javascript
{
  _id: 'auc001',
  chitGroupId: 'chit001',
  chitGroupName: 'Monthly Chit Jan 2025',
  auctionNumber: 1,
  scheduledDate: new Date('2025-01-05'),
  scheduledTime: '18:00',
  status: 'Closed',
  startingBid: 5000,
  winningBid: 3500,
  discount: 1500,
  winnerId: '507f1f77bcf86cd799439013',
  winnerName: 'Priya Sharma',
  amountPaidToWinner: 80000,
  commissionCollected: 2000,
  autoExcludedMembers: [],
  closedDate: new Date('2025-01-05T18:30:00')
}
```

#### Scheduled Auction
```javascript
{
  _id: 'auc004',
  chitGroupId: 'chit001',
  chitGroupName: 'Monthly Chit Jan 2025',
  auctionNumber: 4,
  scheduledDate: new Date('2025-04-05'),
  scheduledTime: '18:00',
  status: 'Scheduled',
  startingBid: 5000,
  winningBid: null,
  discount: null,
  winnerId: null,
  winnerName: null,
  amountPaidToWinner: null,
  commissionCollected: null,
  autoExcludedMembers: ['507f1f77bcf86cd799439013'], // Priya already won
  closedDate: null
}
```

#### Live Auction
```javascript
{
  _id: 'auc005',
  chitGroupId: 'chit002',
  chitGroupName: 'Quarterly Chit Q1 2025',
  auctionNumber: 3,
  scheduledDate: new Date('2025-03-25'),
  scheduledTime: '19:00',
  status: 'Live',
  startingBid: 13900,
  winningBid: null,
  discount: null,
  winnerId: null,
  winnerName: null,
  amountPaidToWinner: null,
  commissionCollected: null,
  autoExcludedMembers: [],
  closedDate: null
}
```

---

### 4. mockPayments (7 payments)

#### Paid - On Time
```javascript
{
  _id: 'pay001',
  memberId: '507f1f77bcf86cd799439012',
  memberName: 'Rajesh Kumar',
  chitGroupId: 'chit001',
  auctionNumber: 3,
  dueDate: new Date('2025-03-05'),
  baseAmount: 5000,
  dividendReceived: 0,
  dueAmount: 5000,
  paidAmount: 5000,
  outstandingBalance: 0,
  paymentStatus: 'Paid',
  paidDate: new Date('2025-03-05T10:30:00'),
  isOnTime: true,
  delayDays: 0,
  paymentMethod: 'UPI',
  referenceNumber: 'UPI123456789'
}
```

#### Paid - Late (with Winner Dividend)
```javascript
{
  _id: 'pay002',
  memberId: '507f1f77bcf86cd799439013',
  memberName: 'Priya Sharma',
  chitGroupId: 'chit001',
  auctionNumber: 3,
  dueDate: new Date('2025-03-05'),
  baseAmount: 5000,
  dividendReceived: 214, // Gets dividend as winner
  dueAmount: 4786,
  paidAmount: 4786,
  outstandingBalance: 0,
  paymentStatus: 'Paid',
  paidDate: new Date('2025-03-08T15:45:00'),
  isOnTime: false,
  delayDays: 3,
  paymentMethod: 'Bank Transfer',
  referenceNumber: 'NEFT987654321'
}
```

#### Partial Payment
```javascript
{
  _id: 'pay003',
  memberId: '507f1f77bcf86cd799439014',
  memberName: 'Amit Patel',
  chitGroupId: 'chit001',
  auctionNumber: 3,
  dueDate: new Date('2025-03-05'),
  baseAmount: 5000,
  dividendReceived: 0,
  dueAmount: 5000,
  paidAmount: 3500,
  outstandingBalance: 1500,
  paymentStatus: 'Partial',
  paidDate: new Date('2025-03-10T12:20:00'),
  isOnTime: false,
  delayDays: 5,
  paymentMethod: 'Cash',
  referenceNumber: 'CASH001'
}
```

#### Pending
```javascript
{
  _id: 'pay005',
  memberId: '507f1f77bcf86cd799439016',
  memberName: 'Vijay Kumar',
  chitGroupId: 'chit001',
  auctionNumber: 4,
  dueDate: new Date('2025-04-05'),
  baseAmount: 5000,
  dividendReceived: 0,
  dueAmount: 5000,
  paidAmount: 0,
  outstandingBalance: 5000,
  paymentStatus: 'Pending',
  paidDate: null,
  isOnTime: null,
  delayDays: 0,
  paymentMethod: null,
  referenceNumber: null
}
```

#### Overdue (Suspended Member)
```javascript
{
  _id: 'pay007',
  memberId: '507f1f77bcf86cd799439018',
  memberName: 'Ramesh K',
  chitGroupId: 'chit001',
  auctionNumber: 3,
  dueDate: new Date('2025-03-05'),
  baseAmount: 5000,
  dividendReceived: 0,
  dueAmount: 5000,
  paidAmount: 583,
  outstandingBalance: 4417,
  paymentStatus: 'Overdue',
  paidDate: null,
  isOnTime: false,
  delayDays: 25,
  paymentMethod: null,
  referenceNumber: null
}
```

---

### 5. mockMemberRankings (6 rankings)

#### Excellent Ranking
```javascript
{
  _id: 'rank001',
  memberId: '507f1f77bcf86cd799439012',
  memberName: 'Rajesh Kumar',
  chitGroupId: 'chit001',
  chitGroupName: 'Monthly Chit Jan 2025',
  rank: 1,
  totalMembers: 7,
  rankScore: 100,
  rankCategory: 'Excellent',
  totalPayments: 3,
  onTimePayments: 3,
  latePayments: 0,
  missedPayments: 0,
  totalAmountPaid: 15000,
  lastUpdated: new Date('2025-03-15')
}
```

#### Good Ranking
```javascript
{
  _id: 'rank002',
  memberId: '507f1f77bcf86cd799439013',
  memberName: 'Priya Sharma',
  chitGroupId: 'chit001',
  chitGroupName: 'Monthly Chit Jan 2025',
  rank: 2,
  totalMembers: 7,
  rankScore: 85,
  rankCategory: 'Good',
  totalPayments: 3,
  onTimePayments: 2,
  latePayments: 1,
  missedPayments: 0,
  totalAmountPaid: 14358,
  lastUpdated: new Date('2025-03-15')
}
```

#### Poor Ranking (Suspended)
```javascript
{
  _id: 'rank006',
  memberId: '507f1f77bcf86cd799439018',
  memberName: 'Ramesh K',
  chitGroupId: 'chit001',
  chitGroupName: 'Monthly Chit Jan 2025',
  rank: 7,
  totalMembers: 7,
  rankScore: 20,
  rankCategory: 'Poor',
  totalPayments: 3,
  onTimePayments: 0,
  latePayments: 2,
  missedPayments: 1,
  totalAmountPaid: 583,
  lastUpdated: new Date('2025-03-15')
}
```

---

### 6. mockNotifications (3 notifications)

```javascript
{
  _id: 'notif001',
  userId: '507f1f77bcf86cd799439012',
  type: 'payment_reminder',
  title: 'Payment Due Tomorrow',
  message: 'Your payment of ₹5,000 for Monthly Chit Jan 2025 is due tomorrow.',
  isRead: false,
  createdAt: new Date('2025-04-04'),
  relatedId: 'pay005',
  relatedType: 'payment'
}
```

---

### 7. mockAuditLogs (5 logs)

```javascript
{
  _id: 'audit001',
  userId: '507f1f77bcf86cd799439011',
  userName: 'Admin User',
  action: 'auction_closed',
  description: 'Closed Auction #3 for Monthly Chit Jan 2025',
  ipAddress: '192.168.1.100',
  timestamp: new Date('2025-03-15T20:10:00'),
  metadata: {
    auctionId: 'auc003',
    winnerId: '507f1f77bcf86cd799439013',
    winningBid: 4000
  }
}
```

---

## Helper Functions

### getMemberChitGroups(memberId)
```javascript
// Returns all chit groups where member is participant
// Used by: Member Dashboard

const memberChits = getMemberChitGroups('507f1f77bcf86cd799439012');
// Returns: [chit001, chit002]
```

### getAuctionsByChitGroup(chitGroupId)
```javascript
// Returns all auctions for a chit group
// Used by: Admin Dashboard, Chit Details

const auctions = getAuctionsByChitGroup('chit001');
// Returns: [auc001, auc002, auc003, auc004]
```

### getPaymentsByMember(memberId)
```javascript
// Returns all payments for a member
// Used by: Member Dashboard

const payments = getPaymentsByMember('507f1f77bcf86cd799439012');
// Returns: [pay001, pay004]
```

### getMemberRanking(memberId, chitGroupId)
```javascript
// Returns ranking for a member in a specific chit group
// Used by: Member Dashboard, Admin Dashboard

const ranking = getMemberRanking('507f1f77bcf86cd799439012', 'chit001');
// Returns: rank001
```

---

## Business Logic Calculations

### 1. Monthly Contribution
```javascript
// Model A: Simple division
monthlyContribution = chitAmount / duration
// Example: 100000 / 20 = 5000

// Model B: 20% markup
monthlyContribution = (chitAmount * 1.2) / duration
// Example: (250000 * 1.2) / 18 = 16667 (rounded to 13900)
```

### 2. Dividend Calculation
```javascript
// When auction closes with discount
discount = startingBid - winningBid
// Example: 5000 - 3500 = 1500

// Dividend per member
dividend = discount / totalMembers
// Example: 1500 / 7 = 214

// Winner's due amount
dueAmount = baseAmount - dividend
// Example: 5000 - 214 = 4786
```

### 3. Commission
```javascript
// Commission on chit amount
commission = (chitAmount * commissionRate) / 100
// Example: (100000 * 5) / 100 = 5000

// Commission per auction
commissionPerAuction = commission / duration
// Example: 5000 / 20 = 250 per auction
```

### 4. Rank Score
```javascript
// Score calculation
onTimePercentage = (onTimePayments / totalPayments) * 100
latePercentage = (latePayments / totalPayments) * 50
missedPenalty = missedPayments * 20

rankScore = onTimePercentage + latePercentage - missedPenalty

// Categories
// 90-100: Excellent
// 70-89: Good
// 50-69: Fair
// 30-49: Average
// 0-29: Poor
```

### 5. Auto-Exclusion Logic
```javascript
// Exclude from auction if:
// 1. Already won in this chit group
// 2. Has overdue payments (status !== 'Paid')
// 3. Account suspended

const autoExcludedMembers = chitGroup.members
  .filter(member =>
    member.hasWon ||
    hasOverduePayments(member.memberId) ||
    isSuspended(member.memberId)
  )
  .map(member => member.memberId);
```

---

## Data Relationships

```
User (1) ----< Member in Chit Group (N)
  |
  +----< Payment (N)
  +----< Ranking (N)
  +----< Notification (N)
  +----< Audit Log (N)

Chit Group (1) ----< Member (N)
  |
  +----< Auction (N)
  +----< Payment (N)
  +----< Ranking (N)

Auction (1) ----< Payment (N)
  |
  +---- Winner (1) [User]

Payment (N) ---- (1) Member [User]
  |
  +---- (1) Chit Group
  +---- (1) Auction

Ranking (1) ---- (1) Member [User]
  |
  +---- (1) Chit Group
```

---

## Test Scenarios Coverage

✅ On-time payment
✅ Late payment
✅ Partial payment
✅ Overdue payment
✅ Pending payment
✅ Winner with dividend
✅ Multiple chit groups
✅ Suspended member
✅ Active chit group
✅ Closed chit group
✅ In-progress chit group
✅ Scheduled auction
✅ Live auction
✅ Closed auction
✅ Member rankings (all categories)
✅ Notifications
✅ Audit logs
