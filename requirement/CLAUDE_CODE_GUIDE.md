# Claude Code Development Guide - Chit Fund App

## Quick Start with Claude Code

### 1. Initialize the Project

Open your terminal and run Claude Code:

```bash
claude-code
```

Then ask Claude Code:

```
Create a complete chit fund management application based on the REQUIREMENTS.md file. 
Build it as a MERN stack PWA with the following structure:

Project: chit-fund-app/
├── server/                 # Backend Node.js
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── controllers/       # Business logic
│   ├── middleware/        # Auth, validation
│   ├── utils/             # Helpers, calculations
│   ├── config/            # DB, config files
│   └── server.js          # Entry point
├── client/                # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # State management
│   │   ├── services/     # API services
│   │   ├── utils/        # Helpers
│   │   └── App.js
│   └── package.json
├── REQUIREMENTS.md        # Full requirements
└── package.json

Please start with the backend server setup and database models.
```

---

## Phase-by-Phase Development Instructions

### Phase 1: Backend Setup & Database Models

**Ask Claude Code:**

```
Phase 1: Set up the backend server

1. Create server/config/db.js - MongoDB connection
2. Create server/models/ with these schemas:
   - User.js (admin, member with roles)
   - ChitGroup.js (all dynamic fields from requirements)
   - Auction.js (live auction with bids)
   - Payment.js (tracking with partial payments)
   - MemberRanking.js (per chit ranking)
   - MemberStatement.js (transaction history)
   - AuditLog.js (audit trail)
   - Notification.js (WhatsApp queue)

3. Create server/server.js with:
   - Express setup
   - CORS config
   - Socket.io integration
   - MongoDB connection
   - Error handling

4. Create .env file with environment variables

Follow the exact schemas in REQUIREMENTS.md section 12.
```

---

### Phase 2: Authentication & Middleware

**Ask Claude Code:**

```
Phase 2: Authentication system

1. Create server/middleware/auth.js:
   - JWT token verification
   - Role-based access (admin, member)
   - Protect routes

2. Create server/routes/auth.js:
   - POST /api/auth/login
   - POST /api/auth/logout
   - GET /api/auth/me

3. Create server/controllers/authController.js:
   - Login logic with bcrypt
   - Token generation
   - User validation

4. Create server/middleware/validate.js:
   - express-validator middleware
   - Input sanitization
```

---

### Phase 3: Admin - Chit Group Management

**Ask Claude Code:**

```
Phase 3: Chit group management

1. Create server/routes/admin/chitRoutes.js with all endpoints from REQUIREMENTS.md section 13

2. Create server/controllers/admin/chitController.js:
   - createChit (with all dynamic fields)
   - getAllChits
   - getChitById
   - updateChit
   - closeChit (after verification)
   - Validation for all fields

3. Implement business logic:
   - Calculate monthly contribution
   - Set up payment schedules
   - Initialize member rankings
   - Create first auction slot

Test with sample data.
```

---

### Phase 4: Admin - Member Management

**Ask Claude Code:**

```
Phase 4: Member management

1. Create server/routes/admin/memberRoutes.js

2. Create server/controllers/admin/memberController.js:
   - createMember (admin creates only)
   - getAllMembers
   - getMemberById
   - updateMember
   - suspendMember (with permission config)
   - getMemberRanking (per chit)

3. Add member to chit group logic
4. Handle multiple chit memberships
5. Calculate and update rankings based on payment history
```

---

### Phase 5: Auction System (Critical - Real-time)

**Ask Claude Code:**

```
Phase 5: Live auction system with Socket.io

1. Create server/routes/admin/auctionRoutes.js
2. Create server/routes/member/auctionRoutes.js

3. Create server/controllers/auctionController.js with:
   - scheduleAuction (admin sets date/time)
   - startAuction (admin triggers)
   - placeBid (member submits)
   - closeAuction (admin confirms winner)
   - excludeMember (admin exclusion)
   - Auto-exclude previous winners

4. Create server/sockets/auctionSocket.js:
   - Real-time bid updates
   - Live auction status
   - Winner announcement
   - Socket rooms per auction

5. Implement business rules:
   - Starting bid = commission amount
   - One bid per person (enforce)
   - Highest bid wins
   - Only admin sees all bids during auction
   - Members see results after close
   - Validate member eligibility before accepting bid

6. Create server/utils/auctionCalculations.js:
   - Calculate dividend (bid - commission)
   - Distribute to non-winners
   - Handle Model A vs Model B payment calculations
   - Calculate each member's due amount for the month
```

---

### Phase 6: Payment System (Complex Calculations)

**Ask Claude Code:**

```
Phase 6: Payment tracking and calculations

1. Create server/routes/admin/paymentRoutes.js
2. Create server/routes/member/paymentRoutes.js

3. Create server/controllers/paymentController.js:
   - recordPayment (admin marks paid)
   - recordPartialPayment
   - getPaymentsByChit
   - getPendingPayments
   - getOutstandingPayments
   - trackDelays (from day after due date)
   - applyGracePeriod

4. Create server/utils/paymentCalculations.js:
   - calculateMemberDue (after dividend)
   - calculateWinnerPayment (with commission)
   - calculateDividendPerMember
   - handleModelA (winner pays full)
   - handleModelB (winner gets dividend)
   - Example from REQUIREMENTS.md section 4

5. Create server/utils/rankingCalculations.js:
   - updateMemberRanking
   - calculateRankScore
   - onTimePaymentBonus
   - delayPenalty

6. Auto-create payment records when auction closes
7. Update member statements after each payment
```

---

### Phase 7: Member Passbook/Statement

**Ask Claude Code:**

```
Phase 7: Member statement and passbook

1. Create server/controllers/statementController.js:
   - getMemberStatement (per chit)
   - addTransaction (contribution, dividend, winning)
   - calculateRunningBalance
   - getSummary

2. Create transaction types:
   - Contribution (monthly payment)
   - Dividend (received from auction)
   - WinAmount (chit amount received)
   - Commission (paid when winning)

3. Auto-update statements:
   - After each payment
   - After dividend distribution
   - After auction win

4. Display format:
   Date | Type | Amount | Balance
```

---

### Phase 8: Reports & PDF Generation

**Ask Claude Code:**

```
Phase 8: All 7 reports with PDF export

1. Create server/routes/reportRoutes.js

2. Create server/controllers/reportController.js:
   - paymentHistoryReport
   - auctionHistoryReport
   - outstandingPaymentsReport
   - dividendSummaryReport
   - memberStatementReport
   - chitSummaryReport
   - financialReport

3. Create server/utils/pdfGenerator.js:
   - Use PDFKit library
   - Indian format (₹1,00,000)
   - Tamil and English support
   - Professional layout
   - Headers, footers, page numbers

4. Each report should:
   - Accept date ranges
   - Filter by chit/member
   - Show detailed breakdowns
   - Include summary statistics
   - Export as PDF

Follow REQUIREMENTS.md section 7 for report specifications.
```

---

### Phase 9: Dashboard & Analytics

**Ask Claude Code:**

```
Phase 9: Admin and member dashboards

1. Create server/routes/dashboardRoutes.js

2. Create server/controllers/dashboardController.js:
   
   Admin Dashboard:
   - getAdminDashboard (consolidated view)
   - getChitDashboard (per chit view)
   - Statistics from REQUIREMENTS.md section 8
   
   Member Dashboard:
   - getMemberDashboard
   - Show all chits joined
   - Payment status
   - Dividends received
   - Upcoming auctions
   - Ranking per chit

3. Create aggregation queries for:
   - Total collections
   - Commission earned
   - Pending payments
   - Active members
   - Upcoming auctions
```

---

### Phase 10: Notifications (WhatsApp)

**Ask Claude Code:**

```
Phase 10: WhatsApp notification system

1. Create server/services/whatsappService.js:
   - sendWhatsAppMessage
   - Queue management
   - Template messages from REQUIREMENTS.md section 9

2. Create server/controllers/notificationController.js:
   - scheduleNotification
   - sendAuctionAlert
   - sendPaymentReminder
   - sendAuctionResult
   - sendDividendNotification
   - sendWinnerNotification

3. Create server/utils/notificationTemplates.js:
   - Tamil templates
   - English templates
   - Dynamic placeholders

4. Create notification triggers:
   - Auction scheduled
   - Auction starting (1 hour before)
   - Auction results
   - Payment due
   - Payment received
   - Dividend credited
   - Member added

5. Create server/cron/scheduledNotifications.js:
   - Use node-cron
   - Daily payment reminders
   - Auction reminders
```

---

### Phase 11: Audit Logging

**Ask Claude Code:**

```
Phase 11: Complete audit trail

1. Create server/middleware/auditLogger.js:
   - Log all critical operations
   - Track changes (before/after)
   - Capture user and timestamp
   - Store IP address

2. Log these actions:
   - Chit creation/modification
   - Payment modifications
   - Auction changes
   - Member data updates
   - Bid submissions
   - Winner selection

3. Create server/routes/auditRoutes.js:
   - getAuditLogs (admin only)
   - Filter by entity, action, date
   - Search capabilities

4. Create server/controllers/auditController.js:
   - Query audit logs
   - Export audit reports
```

---

### Phase 12: Frontend - React Setup

**Ask Claude Code:**

```
Phase 12: React frontend setup

1. Create React app in client/ folder:
   npx create-react-app client

2. Install dependencies:
   - react-router-dom
   - axios
   - socket.io-client
   - i18next (translations)
   - tailwindcss or @mui/material
   - react-pdf
   - chart.js

3. Create folder structure:
   client/src/
   ├── components/
   │   ├── admin/
   │   ├── member/
   │   ├── common/
   │   └── auction/
   ├── pages/
   │   ├── admin/
   │   ├── member/
   │   └── auth/
   ├── context/
   │   ├── AuthContext.js
   │   └── SocketContext.js
   ├── services/
   │   └── api.js (axios instance)
   ├── utils/
   │   ├── formatters.js (Indian format)
   │   └── calculations.js
   └── i18n/
       ├── en.json
       └── ta.json

4. Set up routing
5. Create authentication context
6. Create axios interceptors for JWT
```

---

### Phase 13: Frontend - Admin Pages

**Ask Claude Code:**

```
Phase 13: Admin interface

1. Create admin pages:
   - Dashboard (per chit + consolidated)
   - Create Chit (with all dynamic fields)
   - Manage Chits (list, edit, close)
   - Create Member
   - Manage Members (list, edit, suspend)
   - Schedule Auction
   - Live Auction Control Panel
   - Record Payments
   - Payment Tracking
   - Reports (all 7 types)
   - Audit Logs

2. Components needed:
   - ChitForm (all configurations)
   - MemberForm
   - AuctionScheduler
   - LiveAuctionPanel (Socket.io)
   - PaymentRecorder
   - ReportGenerator
   - DashboardCards
   - StatisticsCharts

3. Use Indian formatting for all amounts and dates
4. Tamil/English toggle
```

---

### Phase 14: Frontend - Member Pages

**Ask Claude Code:**

```
Phase 14: Member interface

1. Create member pages:
   - Dashboard (all chits joined)
   - Chit Details
   - Live Auction (bidding interface)
   - Payment History
   - Digital Passbook
   - Dividend History
   - Auction History

2. Components needed:
   - ChitCard
   - LiveBidding (Socket.io)
   - PaymentStatement
   - DigitalPassbook
   - DividendCard
   - RankingBadge

3. Real-time auction updates
4. Responsive mobile-first design
```

---

### Phase 15: Frontend - Live Auction UI

**Ask Claude Code:**

```
Phase 15: Real-time auction interface

1. Create client/src/components/auction/LiveAuction.js:
   - Socket.io connection
   - Real-time bid updates
   - Countdown timer (if implemented)
   - Bid submission form
   - Current highest bid display
   
2. Admin view:
   - See all bids with names
   - Member status (eligible/excluded)
   - Close auction button
   - Select winner button
   - Exclude member controls

3. Member view:
   - Submit bid (one time only)
   - See if they're winning (without amounts)
   - Wait for results
   - Cannot see other bids during auction

4. After auction closes:
   - Show all bids
   - Show winner
   - Show dividend calculation
   - Show payment due

5. Handle socket events:
   - auction:started
   - auction:new-bid (admin only)
   - auction:status-update
   - auction:closed
   - auction:winner-announced
```

---

### Phase 16: PWA Configuration

**Ask Claude Code:**

```
Phase 16: Convert to Progressive Web App

1. Create client/public/manifest.json:
   - App name: "Chit Fund Manager"
   - Icons (192x192, 512x512)
   - Theme colors
   - Display: standalone

2. Create client/src/serviceWorker.js:
   - Cache static assets
   - Offline page handling
   - Background sync for bids

3. Add to index.html:
   - Manifest link
   - Theme color
   - Service worker registration

4. Create offline page
5. Add install prompt
6. Push notification setup
```

---

### Phase 17: Testing & Refinement

**Ask Claude Code:**

```
Phase 17: Testing and bug fixes

1. Test all payment calculations:
   - Model A vs Model B
   - Dividend distribution
   - Commission deduction
   - Partial payments
   - Delay tracking

2. Test auction flow:
   - Bidding process
   - Winner selection
   - Auto-exclusions
   - Manual exclusions
   - Socket.io real-time

3. Test reports:
   - All 7 reports
   - PDF generation
   - Indian formatting
   - Date ranges

4. Test edge cases:
   - First auction
   - Last auction
   - Multiple chits per member
   - Payment delays
   - Partial payments
   - Member suspension

5. Performance optimization
6. Security audit
7. Tamil translation verification
```

---

## Key Development Tips for Claude Code

### 1. Break Down Complex Features

For auction system:
```
First, help me create just the auction scheduling logic.
Then, help me add the bidding mechanism.
Then, help me integrate Socket.io for real-time.
Then, help me add the calculation logic.
```

### 2. Test As You Build

After each phase:
```
Create sample data and test the API endpoints we just built.
Show me example requests and responses.
```

### 3. Use the Requirements Document

Always reference:
```
Follow the payment calculation example in REQUIREMENTS.md section 4.
Use the exact API structure from REQUIREMENTS.md section 13.
Implement the business rules from REQUIREMENTS.md section 16.
```

### 4. Ask for Clarifications

If anything is unclear:
```
I need clarification on how dividend distribution works in Model B 
when the previous winner gets dividend from future auctions.
```

### 5. Request Code Comments

```
Add detailed comments explaining the payment calculation logic,
especially for Model A vs Model B differences.
```

---

## Important Calculation References

### Payment Calculation (from REQUIREMENTS.md)

**Winner's Month:**
```javascript
// Example values
const chitAmount = 100000;
const commission = 5000;
const winningBid = 12000;
const totalMembers = 20;
const nonWinners = 19;

// Winner receives
const winnerReceives = chitAmount - commission - winningBid; // 83000

// Dividend to distribute
const dividend = winningBid - commission; // 7000
const dividendPerPerson = dividend / nonWinners; // 368

// Non-winner pays
const baseContribution = 5000;
const nonWinnerPays = baseContribution - dividendPerPerson; // 4632

// Winner also pays monthly
const winnerMonthlyPay = baseContribution; // 5000
```

### Future Months:

**Model A:**
```javascript
// Winner pays full amount (no dividend)
const winnerPayment = baseContribution; // 5000
```

**Model B:**
```javascript
// Winner gets dividend from future auctions
const futureAuctionBid = 10000;
const futureDividend = (futureAuctionBid - commission) / (totalMembers - 1);
const winnerPayment = baseContribution - futureDividend;
```

---

## Deployment Checklist

### Before Deployment:

1. Change JWT secret in production
2. Set up MongoDB Atlas
3. Configure WhatsApp Business API
4. Set up automatic backups
5. Enable HTTPS
6. Set up domain
7. Configure CORS for production domain
8. Test PWA on real devices
9. Test all payment calculations
10. Verify audit logs working
11. Test notifications
12. Load testing
13. Security audit
14. Translation completeness

---

## Sample Data for Testing

```javascript
// Test Chit Group
{
  name: "Test Chit Group 1",
  chitAmount: 100000,
  totalMembers: 20,
  duration: 20,
  commissionAmount: 5000,
  winnerPaymentModel: 'A',
  gracePeriodDays: 3,
  monthlyContribution: 5000,
  status: 'Active'
}

// Test Members (create 20)
{
  name: "Member 1",
  phone: "9876543210",
  email: "member1@test.com",
  role: "member"
}

// Test Auction
{
  auctionNumber: 1,
  scheduledDate: new Date(),
  startingBid: 5000,
  status: 'Scheduled'
}
```

---

## Ready to Start?

1. Open Claude Code in your terminal
2. Point it to the REQUIREMENTS.md file
3. Follow phases 1-17 sequentially
4. Test thoroughly after each phase
5. Refer back to this guide for specific instructions

Good luck with development! 🚀
