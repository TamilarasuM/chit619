# Chit Fund Management Application - Final Requirements v2.0

## Project Overview
A Progressive Web App (PWA) for managing chit funds with dynamic auction, commission management, and privacy-focused member experience.

## Technology Stack
- **Frontend**: React.js with PWA capabilities
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io (Admin only - optional for Phase 1)
- **Languages**: Tamil + English
- **Styling**: Tailwind CSS / Material-UI
- **Notifications**: WhatsApp Business API

---

## Core Features

### 1. User Management

#### Roles
- **Admin**: Full control - creates chits, manages auctions, creates members, sees all data
- **Members**: Participate in chits, bid in auctions, view only their own data
- **Future**: Employee roles with approval workflow (not in v1)

#### Member Features
- Admin creates all member accounts (no self-registration)
- Members can join multiple chit groups simultaneously
- Member suspension with configurable view permissions
- No mobile OTP verification
- Password-based login only

---

### 2. Chit Group Configuration (All Dynamic - Admin Configurable)

#### Basic Settings (Set during chit creation)
```javascript
ChitGroup {
  name: String,                    // e.g., "Monthly Chit Jan 2025"
  chitAmount: Number,              // e.g., 100000 (₹1,00,000)
  totalMembers: Number,            // e.g., 20
  duration: Number,                // e.g., 20 months
  commissionAmount: Number,        // e.g., 5000 (₹5,000) - for food/expenses
  winnerPaymentModel: 'A' | 'B',   // Model A or B
  gracePeriodDays: Number,         // e.g., 3 days before counting as delayed
  monthlyContribution: Number,     // Base amount per month (e.g., 5000)
  status: 'InProgress' | 'Active' | 'Closed',
  startDate: Date,
  members: [MemberId],
  createdBy: AdminId,
  createdAt: Date,
  updatedAt: Date
}
```

#### Chit Status Types
- **InProgress**: Accepting members, chit not started yet
- **Active**: Auctions running, payments being collected
- **Closed**: All auctions complete, chit finished

#### Payment Models
**Model A: Winner Pays Full Amount (No Future Dividend)**
- Winner pays full monthly contribution every remaining month
- Does not receive dividend from future auctions
- Pays commission only once (when winning)
- Still participates by paying, just doesn't get dividend benefit

**Model B: Winner Gets Dividend Always**
- Winner continues to receive dividend from all future auctions
- Monthly payment reduces based on dividends
- Still cannot bid again (one win per member per chit)
- Pays commission only once (when winning)

#### Base Monthly Contribution
- Admin sets during chit creation
- Common formula: Chit Amount ÷ Number of Members
- Example: ₹1,00,000 ÷ 20 = ₹5,000 per month
- Can be any custom amount admin chooses

---

### 3. Auction System

#### Auction Configuration
```javascript
Auction {
  chitGroupId: ObjectId,
  auctionNumber: Number,           // 1, 2, 3... up to duration
  scheduledDate: Date,             // Admin sets this
  scheduledTime: String,           // e.g., "19:00" (7 PM)
  startedAt: Date,                 // When admin actually starts
  closedAt: Date,                  // When admin closes
  status: 'Scheduled' | 'Live' | 'Closed',
  startingBid: Number,             // Always = commission amount
  currentHighestBid: Number,       // During auction
  winningBid: Number,              // Final winning amount
  winnerId: ObjectId,              // Member who won
  winnerName: String,              // Store for easy display
  bids: [{
    memberId: ObjectId,
    memberName: String,
    bidAmount: Number,
    bidTime: Date,
    ipAddress: String
  }],
  autoExcludedMembers: [ObjectId], // Previous winners (automatic)
  manualExcludedMembers: [ObjectId], // Admin manually excludes
  dividendPerMember: Number,       // Calculated after close
  totalDividend: Number,           // Total to distribute
  commissionCollected: Number,     // Commission amount
  createdBy: AdminId,
  closedBy: AdminId
}
```

#### Auction Rules

**1. Bidding Type**
- Open auction (highest bid wins)
- Simple form submission (no real-time for members)
- Admin sees real-time updates (optional Socket.io)

**2. Starting Bid**
- Always starts at commission amount
- Example: If commission = ₹5,000, starting bid = ₹5,000

**3. Bid Increment**
- No minimum increment rules
- Members can bid any amount above current highest
- Even ₹1 more is valid

**4. One Bid Per Person**
- Members can submit only ONE bid per auction
- Cannot change or withdraw bid once submitted
- System enforces this rule

**5. Bid Visibility**

**During Live Auction:**
- **Admin sees**: All bids with names, amounts, timestamps (real-time)
- **Members see**: Only their own bid confirmation ("Bid submitted successfully")
- **Members CANNOT see**: Other members' bids, current highest bid, who's winning

**After Auction Closes:**
- **Admin sees**: Complete history, all bids, all details
- **Members see**: 
  - Winner's name only (e.g., "Rajesh Kumar")
  - Winning bid amount
  - Their own bid amount
  - Their own payment due
  - Their dividend received
- **Members CANNOT see**: Other members' bid amounts, other members' payment details

**6. Auto-Exclusions**
- Members who already won are automatically excluded from future auctions
- System prevents them from accessing bid form
- They still pay monthly and receive dividends (based on model)

**7. Manual Exclusions**
- Admin can exclude specific members from specific auction
- Reason: Member not interested, traveling, personal reasons
- Excluded members:
  - Cannot bid in that auction
  - Still pay monthly contribution
  - Still receive dividend
  - Just cannot participate in bidding

**8. No Time Limit**
- Admin manually starts and closes auction
- Typically runs for ~1 hour (not enforced)
- No automatic closure

**9. Final Bids**
- Cannot be withdrawn once submitted
- Member sees confirmation immediately
- System locks the bid

**10. Winner Selection**
- Highest bid wins (simple rule)
- Admin closes auction and system auto-selects highest bidder
- Admin confirms and announces winner

**11. No Tie Scenario**
- Business assumption: Identical bids won't happen
- If happens (rare), first bidder wins (timestamp-based)

#### Auction Scheduling
- Admin manually schedules each auction
- Sets date and time (e.g., "15th Jan 2025, 7:00 PM")
- Calendar alerts/notifications sent to members 1 day before
- WhatsApp reminder 1 hour before auction

#### Auction Start Conditions
- Admin can start auction even if previous payments are pending
- System shows warning/notification to admin about pending amounts
- Admin decides whether to proceed or wait
- Flexibility for real-world scenarios

---

### 4. Payment & Commission System

#### Commission Rules
1. **Only winner pays commission** - one-time payment when they win
2. **Commission amount**: Set by admin per chit group during creation
3. **Purpose**: Food, meeting expenses, organizational costs
4. **Deduction**: Commission deducted from winning bid for dividend calculation

#### Payment Calculation - Complete Example

**Scenario Setup:**
```
Chit Amount: ₹1,00,000
Total Members: 20
Monthly Contribution (Base): ₹5,000
Commission (Admin set): ₹5,000
Month: 5 (Auction #5)
Winning Bid: ₹12,000
Winner: Rajesh (Member ID: M005)
Non-winners: 19 members
```

**Step 1: Winner's Receipt Calculation**
```
Winner receives in hand:
= Chit Amount - Commission - Winning Bid
= ₹1,00,000 - ₹5,000 - ₹12,000
= ₹83,000

Winner also pays monthly contribution: ₹5,000

Net amount winner gets: ₹83,000 (after paying monthly ₹5,000 from their own pocket)

Note: Winner pays commission (₹5,000) + bid (₹12,000) = ₹17,000 is deducted from chit amount
      Winner still pays monthly ₹5,000 like everyone else
      Winner walks away with ₹83,000 cash
```

**Step 2: Dividend Calculation**
```
Total Winning Bid: ₹12,000
Minus Commission: ₹5,000 (organizer keeps this)
Remaining for Dividend: ₹7,000

Dividend per non-winner:
= ₹7,000 ÷ 19 non-winners
= ₹368 per person
```

**Step 3: Monthly Payment for Non-Winners**
```
Each non-winner pays:
= Base Contribution - Dividend
= ₹5,000 - ₹368
= ₹4,632

So 19 members pay ₹4,632 each = ₹87,908 collected
Plus winner pays ₹5,000
Total collected this month: ₹92,908
```

**Step 4: Money Flow Summary (Month 5)**
```
Money IN (Collections):
- 19 non-winners: 19 × ₹4,632 = ₹87,908
- Winner pays monthly: ₹5,000
- Total: ₹92,908

Money OUT (Payouts):
- Winner receives: ₹83,000
- Organizer commission: ₹5,000
- Difference (₹4,908): Covers system costs/buffer

Note: The winning bid (₹12,000) is effectively paid by:
- ₹5,000 from commission (organizer)
- ₹7,000 from non-winners as dividend deduction
```

#### Future Months Payment (After Rajesh Won in Month 5)

**Month 6 - Model A (Winner Pays Full, No Dividend)**

Auction #6: New winner bids ₹10,000

```
Commission: ₹5,000
Dividend: (₹10,000 - ₹5,000) = ₹5,000
Non-winners (excluding both winners): 18 members
Dividend per person: ₹5,000 ÷ 18 = ₹277

Payments:
- Rajesh (Previous winner, Model A): ₹5,000 (FULL, no dividend)
- Current month winner: Pays ₹5,000 + gets ₹85,000
- 18 non-winners: ₹5,000 - ₹277 = ₹4,723 each
```

**Month 6 - Model B (Winner Gets Dividend Always)**

Same auction, but Rajesh's group uses Model B

```
Commission: ₹5,000
Dividend: ₹5,000
Recipients: 19 members (18 non-winners + 1 previous winner Rajesh)
Dividend per person: ₹5,000 ÷ 19 = ₹263

Payments:
- Rajesh (Previous winner, Model B): ₹5,000 - ₹263 = ₹4,737
- Current month winner: Pays ₹5,000 + gets ₹85,000
- 18 other non-winners: ₹5,000 - ₹263 = ₹4,737 each
```

**Key Difference:**
- Model A: Previous winners pay full ₹5,000 forever
- Model B: Previous winners keep getting dividend benefits

#### Payment Tracking Schema
```javascript
Payment {
  chitGroupId: ObjectId,
  memberId: ObjectId,
  memberName: String,              // For easy display
  auctionNumber: Number,           // Which month/auction
  dueDate: Date,                   // Auction day
  dueAmount: Number,               // After dividend deduction
  baseAmount: Number,              // Before dividend (e.g., 5000)
  dividendReceived: Number,        // Dividend amount (e.g., 368)
  paidAmount: Number,              // Actual amount paid
  paidDate: Date,                  // When payment received
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue',
  delayDays: Number,               // Days delayed (after grace period)
  gracePeriodUsed: Boolean,        // Did they use grace period
  isOnTime: Boolean,               // Paid on auction day = true
  partialPayments: [{
    amount: Number,
    date: Date,
    recordedBy: AdminId,
    notes: String
  }],
  outstandingBalance: Number,      // Remaining to pay
  
  // Special fields for winners
  isWinner: Boolean,               // True if this member won this month
  isCommissionPayment: Boolean,    // True for winner's commission
  commissionAmount: Number,        // Commission paid (if winner)
  amountReceived: Number,          // Chit amount received (if winner)
  
  paymentMethod: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque',
  referenceNumber: String,         // Transaction reference
  notes: String,                   // Admin notes
  recordedBy: AdminId,
  createdAt: Date,
  updatedAt: Date
}
```

#### Payment Rules

**1. Due Date**
- Payment due on auction day itself
- Example: Auction on 15th Jan → Payment due 15th Jan

**2. On-Time Payment**
- Payment made on auction day = On-time
- Counts toward member's good ranking

**3. Grace Period**
- Admin configurable per chit (e.g., 3 days)
- If grace = 3 days and due date = 15th
  - Payment on 15th, 16th, 17th, 18th = Not counted as delayed
  - Delay counting starts from 19th onwards
- Grace period tracked but doesn't affect ranking negatively if used

**4. Delay Tracking**
- Starts counting from day after grace period ends
- If paid on 20th (grace ended 18th) = 2 days delayed
- System tracks:
  - Total delay days (cumulative)
  - Number of delayed payments
  - Affects member ranking

**5. Partial Payments**
- Allowed
- Example: Due ₹4,632
  - Pay ₹2,000 on 15th
  - Pay ₹2,632 on 20th
- System tracks each partial payment with date
- Outstanding balance calculated automatically
- Still counts as delayed if not fully paid on time

**6. No Advance Payments**
- Members cannot pay for future months in advance
- Can only pay current month's due
- Future feature: May allow advance payment option

**7. No Interest/Penalties**
- System only tracks delays
- No automatic penalty calculation
- Admin can manually handle penalties if needed
- Focus on transparency and tracking

**8. Auction Continuity**
- Next auction can proceed even with pending payments
- Admin gets notification: "3 members have pending payments from Month 5"
- Admin decides to proceed or wait
- Real-world flexibility

---

### 5. Member Privacy & Visibility Rules

#### What Members CAN See (Their Own Data Only)

**1. Their Own Chit Groups**
- List of all chits they've joined
- Their payment status in each
- Their dividend history
- Their ranking in each group

**2. Their Own Payments**
- Monthly payment amounts
- Payment dates
- Outstanding balance
- Dividend received each month
- Transaction history

**3. Their Own Bids**
- Auctions they participated in
- Their bid amounts
- Whether they won or not

**4. Their Own Statement/Passbook**
- Complete transaction history
- Running balance
- Contributions made
- Dividends received
- Winning details (if they won)

**5. Auction Results (Limited)**
- Winner's name (e.g., "Rajesh Kumar")
- Winning bid amount
- Total dividend distributed
- Their share of dividend

#### What Members CANNOT See (Privacy Protected)

**1. Other Members' Information**
- Other members' names (except winner after auction)
- Other members' phone numbers
- Other members' payment history
- Other members' bid amounts
- Other members' dividend received
- Other members' ranking

**2. During Live Auction**
- Other members' bids
- Current highest bid amount
- Who is currently winning
- How many members have bid

**3. Group Details**
- Full member list (names hidden)
- Member count only visible
- Other members' status

**4. Financial Details**
- Other members' outstanding payments
- Other members' delay history
- Other members' partial payments

#### What Admin CAN See (Full Access)

**1. All Member Data**
- Complete member list with contact details
- All payment histories
- All bid histories
- All rankings
- All statements

**2. All Financial Data**
- Complete payment tracking
- Outstanding amounts per member
- Delay statistics
- Commission collected
- Total collections

**3. All Auction Data**
- Real-time bids during auction
- Complete bid history
- Member participation rates
- Win/loss records

**4. All Reports**
- System-wide analytics
- Per-chit breakdowns
- Member-wise reports
- Financial summaries

---

### 6. Member Ranking System

```javascript
MemberRanking {
  memberId: ObjectId,
  chitGroupId: ObjectId,
  memberName: String,
  
  // Payment Statistics
  onTimePayments: Number,          // Count of on-time payments
  delayedPayments: Number,         // Count of delayed payments
  totalPaymentsDue: Number,        // Total payments expected so far
  totalDelayDays: Number,          // Sum of all delay days
  averageDelayDays: Number,        // Average delay when late
  
  // Grace Period Usage
  gracePeriodUsed: Number,         // Times grace period was used
  
  // Ranking Score Calculation
  rankScore: Number,               // Calculated score (higher = better)
  rank: Number,                    // Position in group (1 = best)
  rankCategory: 'Excellent' | 'Good' | 'Average' | 'Poor',
  
  // Additional Stats
  totalAmountPaid: Number,
  outstandingAmount: Number,
  hasWon: Boolean,
  wonInAuction: Number,            // Which auction number
  
  lastUpdated: Date
}
```

#### Ranking Calculation Logic

**Score Calculation:**
```javascript
Base Score: 1000 points

Add Points:
+ On-time payments: +50 points each
+ Zero delays: +100 bonus
+ Paid before grace period: +20 points each

Deduct Points:
- Delayed payment: -30 points each
- Each delay day: -5 points
- Outstanding balance > 0: -100 points
- Used grace period: -10 points each

Final Score = Base + Add Points - Deduct Points
```

**Rank Categories:**
- Score 1000+: Excellent
- Score 800-999: Good  
- Score 600-799: Average
- Score <600: Poor

**Ranking Per Chit Group:**
- Each chit group has separate ranking
- Member's rank is relative to other members in same chit
- Rank 1 = Best payment record in that chit
- Displayed as: "Rank 3 out of 20"

**Display to Members:**
```
Your Ranking in Group A
Rank: 5 / 20 (Good)
On-time Payments: 15 / 18
Delayed Payments: 3
Total Delay Days: 12
```

**Display to Admin:**
```
Member Rankings - Group A
1. Rajesh Kumar (Excellent) - 1150 points
2. Priya S (Excellent) - 1050 points
3. Kumar M (Good) - 890 points
...
18. Ramesh K (Average) - 720 points
19. Suresh B (Poor) - 580 points
20. Ganesh R (Poor) - 450 points
```

---

### 7. Member Passbook/Statement

```javascript
MemberStatement {
  memberId: ObjectId,
  memberName: String,
  chitGroupId: ObjectId,
  chitGroupName: String,
  
  transactions: [{
    date: Date,
    auctionNumber: Number,         // Which month
    type: 'Contribution' | 'Dividend' | 'WinAmount' | 'Commission' | 'PartialPayment',
    description: String,           // e.g., "Monthly contribution for Auction #5"
    debit: Number,                 // Money paid
    credit: Number,                // Money received
    balance: Number,               // Running balance
    status: 'Completed' | 'Pending',
    referenceNumber: String
  }],
  
  summary: {
    totalContributions: Number,    // Total paid
    totalDividends: Number,        // Total dividends received
    netContributions: Number,      // Contributions - Dividends
    outstandingAmount: Number,     // Amount pending
    
    auctionWon: {                  // If member won
      auctionNumber: Number,
      wonDate: Date,
      bidAmount: Number,
      receivedAmount: Number,      // Net after commission & bid
      commissionPaid: Number
    },
    
    paymentStats: {
      totalPayments: Number,
      onTimeCount: Number,
      delayedCount: Number,
      ranking: Number
    }
  },
  
  generatedAt: Date
}
```

#### Digital Passbook Features

**Transaction Types:**

**1. Contribution (Debit)**
```
Date: 15-Jan-2025
Type: Monthly Contribution
Auction: #5
Amount: ₹4,632 (DR)
Description: Base ₹5,000 - Dividend ₹368
Balance: ₹23,160
```

**2. Dividend (Credit)**
```
Date: 15-Jan-2025
Type: Dividend Received
Auction: #5
Amount: ₹368 (CR)
Description: Share from winning bid ₹12,000
Balance: ₹22,792
```

**3. Win Amount (Credit - if member won)**
```
Date: 15-Jan-2025
Type: Chit Amount Received
Auction: #5
Amount: ₹83,000 (CR)
Description: Won auction, bid ₹12,000
Balance: -₹60,208 (member ahead)
```

**4. Commission (Debit - if member won)**
```
Date: 15-Jan-2025
Type: Commission Payment
Auction: #5
Amount: ₹5,000 (DR)
Description: One-time commission
Balance: ₹18,160
```

**Member View (Simplified):**
```
My Passbook - Group A

Total Contributed: ₹45,264
Total Dividends: ₹5,264
Net Paid: ₹40,000
Outstanding: ₹0

Recent Transactions:
15-Jan-2025  Monthly Payment  ₹4,632 (Paid)
10-Jan-2025  Dividend        ₹368 (Received)
05-Dec-2024  Monthly Payment  ₹4,724 (Paid)
...

[Download PDF Statement]
```

---

### 8. Reports System (All Export to PDF)

#### 1. Member Payment History Report

**Purpose:** Track individual member's payment behavior

**Contents:**
- Member name and ID
- Chit group details
- Month-wise payment breakdown
- On-time vs delayed statistics
- Grace period usage
- Outstanding amounts
- Ranking information

**Filters:**
- By member
- By chit group
- Date range
- Payment status

**PDF Format:**
```
Member Payment History Report
Member: Rajesh Kumar (M005)
Chit Group: Monthly Chit Jan 2025
Period: Jan 2025 - Dec 2025

Month | Due Date | Due Amt | Paid Amt | Paid Date | Status | Delay
1     | 15-Jan   | 5,000   | 5,000    | 15-Jan    | On-time| 0
2     | 15-Feb   | 4,632   | 4,632    | 17-Feb    | On-time| 0 (Grace)
3     | 15-Mar   | 4,724   | 4,724    | 20-Mar    | Delayed| 5 days
...

Summary:
Total Due: ₹85,000
Total Paid: ₹85,000
On-time: 15 / 18
Delayed: 3 / 18
Ranking: 5 / 20
```

#### 2. Auction History Report

**Purpose:** Complete auction records per chit

**Contents:**
- Chit group details
- Auction-wise results
- All bids with member names (admin only)
- Winner and winning bid
- Dividend distributed
- Commission collected
- Participation statistics

**Filters:**
- By chit group
- By auction number
- Date range

**PDF Format:**
```
Auction History Report
Chit Group: Monthly Chit Jan 2025
Period: Jan 2025 - May 2025

Auction #1 - 15-Jan-2025
Participants: 18 / 20
Winner: Rajesh Kumar
Winning Bid: ₹12,000
Commission: ₹5,000
Dividend: ₹7,000 (₹368 per member)

All Bids:
1. Rajesh Kumar  - ₹12,000 (Won)
2. Priya S       - ₹10,500
3. Kumar M       - ₹9,000
...

Auction #2 - 15-Feb-2025
...
```

#### 3. Outstanding Payments Report

**Purpose:** Track all pending/overdue payments

**Contents:**
- All members with pending payments
- Amount pending per member
- Days overdue (after grace)
- Grace period status
- Contact details (admin only)
- Total outstanding summary

**Filters:**
- By chit group
- By delay status (within grace, overdue)
- By amount range

**PDF Format:**
```
Outstanding Payments Report
As of: 20-Jan-2025

Chit Group A:
Member Name     | Due Amt | Paid | Balance | Days Overdue
Suresh B        | 4,632   | 2,000| 2,632   | 5 days
Ganesh R        | 4,632   | 0    | 4,632   | 5 days
Ramesh K        | 4,724   | 4,724| 0       | In Grace (2 days)

Total Outstanding: ₹7,264
Members in Grace: 1
Members Overdue: 2
```

#### 4. Dividend Distribution Summary

**Purpose:** Track dividend earnings per member

**Contents:**
- Member-wise dividend received
- Auction-wise breakdown
- Total dividends per member
- Comparison across members
- Dividend trends

**Filters:**
- By chit group
- By member
- Date range

**PDF Format:**
```
Dividend Distribution Summary
Chit Group: Monthly Chit Jan 2025

Member Name     | Auct 1 | Auct 2 | Auct 3 | Total
Rajesh Kumar    | -      | 263    | 289    | 552 (Won in Auct 1)
Priya S         | 368    | 263    | 289    | 920
Kumar M         | 368    | -      | 289    | 657 (Won in Auct 2)
...

Note: "-" indicates member won that auction
```

#### 5. Member-wise Complete Statement

**Purpose:** Comprehensive member financial statement

**Contents:**
- Complete transaction history
- All contributions paid
- All dividends received
- Winning details (if applicable)
- Running balance
- Payment punctuality
- Summary statistics

**PDF Format:**
```
Member Statement
Name: Rajesh Kumar
Chit Group: Monthly Chit Jan 2025
Statement Period: Jan 2025 - Dec 2025

Date       | Description              | Debit  | Credit | Balance
15-Jan-25  | Auction #1 Win          | -      | 83,000 | 83,000
15-Jan-25  | Commission Payment      | 5,000  | -      | 78,000
15-Jan-25  | Monthly Contribution    | 5,000  | -      | 73,000
15-Feb-25  | Monthly Contribution    | 5,000  | -      | 68,000
...

Summary:
Total Contributions: ₹90,000
Total Dividends: ₹0 (Winner - Model A)
Amount Received: ₹83,000
Net Position: +₹7,000 (Ahead)
```

#### 6. Chit Group Summary Report

**Purpose:** Overall chit group performance and status

**Contents:**
- Group configuration details
- Member list and status
- Auction completion status
- Financial summary
- Collection vs payout
- Commission earned
- Outstanding summary
- Completion percentage

**PDF Format:**
```
Chit Group Summary Report
Group: Monthly Chit Jan 2025

Configuration:
Chit Amount: ₹1,00,000
Members: 20
Duration: 20 months
Commission: ₹5,000
Model: A (Winner pays full)
Started: 15-Jan-2025
Status: Active

Progress:
Auctions Completed: 5 / 20 (25%)
Months Remaining: 15

Financial Summary:
Total Collections: ₹4,50,000
Total Payouts: ₹4,15,000
Commission Earned: ₹25,000
Outstanding: ₹7,500
Net Position: ₹7,500

Member Statistics:
Active: 20
Winners: 5
Pending Winners: 15
Average Ranking: Good

Top 5 Members (by ranking):
1. Priya S (Excellent)
2. Kumar M (Excellent)
...
```

#### 7. Financial/Revenue Report

**Purpose:** Financial analytics and revenue tracking

**Contents:**
- Commission earned (per chit and total)
- Collections vs payouts
- Month-wise breakdown
- Chit-wise performance
- Outstanding summary
- Cash flow analysis
- Profit/Loss statement

**Filters:**
- By chit group
- Date range
- Monthly/Quarterly/Yearly

**PDF Format:**
```
Financial Report
Period: Jan 2025 - May 2025

Revenue Summary:
Commission Earned:
- Chit Group A: ₹25,000 (5 auctions)
- Chit Group B: ₹30,000 (6 auctions)
- Chit Group C: ₹20,000 (4 auctions)
Total Commission: ₹75,000

Collections:
Total Collected: ₹22,50,000
Total Paid Out: ₹20,75,000
Outstanding: ₹45,000
Net Cash: ₹1,30,000

Month-wise Breakdown:
Jan 2025:
  Collections: ₹4,50,000
  Payouts: ₹4,15,000
  Commission: ₹15,000
  
Feb 2025:
...

Active Chits: 3
Total Members: 65
Average Collection Rate: 96%
```

---

### 9. Dashboard & Analytics

#### Admin Dashboard

**Overview (Consolidated View):**
```
Admin Dashboard

Quick Stats:
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Active Chits: 5 │ Total Members:  │ This Month:     │ Commission:     │
│                 │ 120             │ ₹12,50,000      │ ₹85,000         │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘

Pending Actions:
⚠ 12 pending payments (₹1,25,000)
⚠ 2 auctions scheduled today
ℹ 3 members completed all payments

Recent Activity:
• Auction #8 completed in Group C - Winner: Ramesh K
• Payment received from Priya S - Group A
• New member added: Kumar M - Group B

Upcoming:
• Auction #6 - Group A - Tomorrow 7:00 PM
• Auction #9 - Group B - 2 days

Collections This Month:
Group A: ₹2,50,000 ✓
Group B: ₹3,00,000 ✓
Group C: ₹2,00,000 ⚠ (₹25,000 pending)
```

**Per Chit Group View:**
```
Chit Group A - Monthly Chit Jan 2025

Status: Active | Progress: 6/20 (30%)

Configuration:
Chit Amount: ₹1,00,000
Members: 20
Model: A
Commission: ₹5,000

Financial Summary:
Collections: ₹5,40,000 / ₹6,00,000
Payouts: ₹4,98,000
Commission Earned: ₹30,000
Outstanding: ₹60,000

Members:
Active: 20
Winners: 6
Pending: 14
Excellent Rank: 8
Good Rank: 7
Average Rank: 3
Poor Rank: 2

Next Auction:
Auction #7
Scheduled: 15-Jul-2025, 7:00 PM
Eligible Members: 14
Starting Bid: ₹5,000

Recent Payments:
✓ Priya S - ₹4,632 (On-time)
✓ Kumar M - ₹4,724 (On-time)
⚠ Suresh B - ₹2,000 (Partial, ₹2,632 pending)

[View Full Details] [Schedule Auction] [Record Payment] [View Reports]
```

#### Member Dashboard

```
Welcome, Rajesh Kumar

My Chit Groups:

┌─────────────────────────────────────────────────────────┐
│ Monthly Chit Jan 2025                    Status: Active │
│ My Status: Winner (Auction #1)                          │
│ Next Payment: ₹5,000 due on 15-Jul-2025                 │
│ My Ranking: 5 / 20 (Good)                               │
│                                                          │
│ Total Paid: ₹30,000                                     │
│ Dividends: ₹0 (Winner - Model A)                        │
│ Outstanding: ₹0                                          │
│                                                          │
│ [View Statement] [View Auction History]                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Quarterly Chit Mar 2025                  Status: Active │
│ My Status: Active Member                                │
│ Next Payment: ₹3,450 due on 20-Jul-2025                 │
│ My Ranking: 12 / 25 (Average)                           │
│                                                          │
│ Total Paid: ₹20,700                                     │
│ Dividends: ₹2,150                                        │
│ Outstanding: ₹0                                          │
│ Next Auction: 20-Jul-2025, 6:00 PM                      │
│                                                          │
│ [Place Bid] [View Statement]                            │
└─────────────────────────────────────────────────────────┘

Recent Activity:
• Payment received - Group A - ₹5,000 (15-Jun-2025)
• Dividend received - Group B - ₹278 (20-Jun-2025)
• Auction upcoming - Group B - 20-Jul-2025

Notifications:
🔔 Auction scheduled tomorrow for Group B at 6:00 PM
🔔 Payment due in 3 days for Group A
```

---

### 10. Notifications System (WhatsApp Integration)

#### Notification Events & Templates

**1. Auction Scheduled**
```
English:
Hi [Name],
Auction #[Number] for [Chit Group] has been scheduled.
Date: [Date]
Time: [Time]
Starting Bid: ₹[Amount]
Be ready to participate!
- Chit Fund Manager

Tamil:
வணக்கம் [Name],
[Chit Group] குழுவிற்கான ஏலம் #[Number] திட்டமிடப்பட்டுள்ளது.
தேதி: [Date]
நேரம்: [Time]
தொடக்க ஏலம்: ₹[Amount]
பங்கேற்க தயாராக இருங்கள்!
```

**2. Auction Starting Soon (1 hour before)**
```
English:
Hi [Name],
Auction #[Number] for [Chit Group] is starting in 1 hour!
Time: [Time]
Starting Bid: ₹[Amount]
Login now to place your bid.

Tamil:
வணக்கம் [Name],
[Chit Group] ஏலம் #[Number] 1 மணி நேரத்தில் தொடங்குகிறது!
நேரம்: [Time]
தொடக்க ஏலம்: ₹[Amount]
உங்கள் ஏலத்தை வைக்க இப்போது உள்நுழையவும்.
```

**3. Auction Started**
```
English:
🔴 LIVE NOW
Auction #[Number] for [Chit Group] has started!
Starting Bid: ₹[Amount]
Place your bid now!
Link: [URL]

Tamil:
🔴 நேரலை
[Chit Group] ஏலம் #[Number] தொடங்கியுள்ளது!
தொடக்க ஏலம்: ₹[Amount]
இப்போது உங்கள் ஏலத்தை வைக்கவும்!
```

**4. Bid Confirmation (Member)**
```
English:
✓ Bid Submitted Successfully
Group: [Chit Group]
Auction: #[Number]
Your Bid: ₹[Amount]
Status: Confirmed
You will be notified once auction closes.

Tamil:
✓ ஏலம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது
குழு: [Chit Group]
ஏலம்: #[Number]
உங்கள் ஏலம்: ₹[Amount]
நிலை: உறுதிப்படுத்தப்பட்டது
```

**5. New Bid Alert (Admin Only)**
```
Admin Alert:
New bid received!
Group: [Chit Group]
Auction: #[Number]
Member: [Name]
Bid Amount: ₹[Amount]
Time: [Timestamp]
```

**6. Auction Closed - Winner Announcement**
```
English (Winner):
🎉 Congratulations!
You won Auction #[Number] for [Chit Group]!
Your Bid: ₹[Winning Bid]
You will receive: ₹[Net Amount]
Commission: ₹[Commission]
Please pay ₹[Monthly Payment] on [Due Date]

Tamil (Winner):
🎉 வாழ்த்துக்கள்!
[Chit Group] ஏலம் #[Number] நீங்கள் வென்றீர்கள்!
உங்கள் ஏலம்: ₹[Winning Bid]
நீங்கள் பெறுவீர்கள்: ₹[Net Amount]
கமிஷன்: ₹[Commission]
```

```
English (Non-winner):
Auction #[Number] Results - [Chit Group]
Winner: [Winner Name]
Winning Bid: ₹[Amount]
Your Payment: ₹[Amount] (after ₹[Dividend] dividend)
Due Date: [Date]
Your bid was: ₹[Member Bid]

Tamil (Non-winner):
ஏலம் #[Number] முடிவுகள் - [Chit Group]
வெற்றியாளர்: [Winner Name]
வெற்றி ஏலம்: ₹[Amount]
உங்கள் கட்டணம்: ₹[Amount] (₹[Dividend] பங்கு பிறகு)
```

**7. Payment Reminder**
```
English:
Payment Reminder
Group: [Chit Group]
Amount Due: ₹[Amount]
Due Date: [Date] (Tomorrow)
Your Rank: [Rank] - Maintain on-time payment!
Pay via: [Payment Methods]

Tamil:
கட்டண நினைவூட்டல்
குழு: [Chit Group]
செலுத்த வேண்டிய தொகை: ₹[Amount]
கெடு: [Date] (நாளை)
```

**8. Payment Received Confirmation**
```
English:
✓ Payment Received
Group: [Chit Group]
Amount: ₹[Amount]
Received on: [Date]
Status: On-time ✓
Your rank improved!
Balance: ₹0
Thank you!

Tamil:
✓ கட்டணம் பெறப்பட்டது
குழு: [Chit Group]
தொகை: ₹[Amount]
பெறப்பட்ட தேதி: [Date]
```

**9. Payment Overdue**
```
English:
⚠ Payment Overdue
Group: [Chit Group]
Amount: ₹[Amount]
Due Date: [Date]
Days Overdue: [Days]
Please pay immediately to maintain your ranking.
Grace Period: [Days] days used

Tamil:
⚠ கட்டணம் காலாவதியானது
குழு: [Chit Group]
தொகை: ₹[Amount]
```

**10. Dividend Credited**
```
English:
💰 Dividend Received
Group: [Chit Group]
Auction: #[Number]
Dividend: ₹[Amount]
Your payment reduced to: ₹[Reduced Amount]
Total dividends received: ₹[Total]

Tamil:
💰 பங்கு பெறப்பட்டது
குழு: [Chit Group]
ஏலம்: #[Number]
பங்கு: ₹[Amount]
```

**11. Welcome Message (New Member)**
```
English:
Welcome to [Chit Group]!
You have been added by Admin.
Chit Amount: ₹[Amount]
Monthly Payment: ₹[Amount]
Duration: [Months] months
First Auction: [Date]
Login: [URL]
Username: [Phone]
Password: [Temp Password]

Tamil:
[Chit Group] குழுவிற்கு வரவேற்கிறோம்!
நிர்வாகியால் சேர்க்கப்பட்டுள்ளீர்கள்.
```

**12. Chit Completion**
```
English:
🎊 Chit Completed Successfully!
Group: [Chit Group]
All auctions completed!
Final settlement pending.
Your Statement:
- Total Paid: ₹[Amount]
- Total Dividends: ₹[Amount]
- Net: ₹[Amount]
Thank you for participating!

Tamil:
🎊 சிட் வெற்றிகரமாக முடிந்தது!
குழு: [Chit Group]
```

#### Notification Queue System

```javascript
Notification {
  recipientId: ObjectId,            // Member or Admin
  recipientPhone: String,           // WhatsApp number
  type: 'auction_scheduled' | 'auction_starting' | 'auction_closed' | 
        'payment_reminder' | 'payment_received' | 'payment_overdue' |
        'dividend_credited' | 'bid_confirmation' | 'welcome' | 'completion',
  priority: 'high' | 'medium' | 'low',
  language: 'en' | 'ta',            // Based on user preference
  templateData: Object,             // Dynamic values
  status: 'pending' | 'sent' | 'failed' | 'queued',
  scheduledAt: Date,                // When to send
  sentAt: Date,
  failureReason: String,
  retryCount: Number,
  maxRetries: 3,
  createdAt: Date
}
```

---

### 11. Security & Audit System

#### Audit Trail

```javascript
AuditLog {
  userId: ObjectId,
  userRole: 'admin' | 'member',
  userName: String,
  action: String,                   // Descriptive action
  entity: String,                   // What was modified
  entityId: ObjectId,
  changes: {
    before: Object,                 // Previous state
    after: Object                   // New state
  },
  ipAddress: String,
  userAgent: String,
  timestamp: Date,
  success: Boolean,
  errorMessage: String              // If failed
}
```

#### Logged Actions

**Chit Management:**
- Create chit group
- Modify chit configuration
- Close chit group
- Add member to chit
- Remove member from chit

**Auction Operations:**
- Schedule auction
- Start auction
- Place bid
- Exclude member from auction
- Close auction
- Confirm winner

**Payment Operations:**
- Record payment
- Record partial payment
- Modify payment amount
- Mark payment as delayed
- Grant grace period extension

**Member Management:**
- Create member
- Update member details
- Suspend member
- Activate member
- Change member permissions

**Admin Actions:**
- Login/Logout
- View sensitive reports
- Export data
- Modify system settings

#### Example Audit Entries

```
[2025-01-15 14:23:45] Admin: Rajesh A
Action: CREATE_CHIT
Entity: ChitGroup (CG001)
Changes: {
  after: {
    name: "Monthly Chit Jan 2025",
    chitAmount: 100000,
    members: 20,
    commission: 5000
  }
}
IP: 192.168.1.10
Success: true

[2025-01-15 19:05:12] Member: Kumar M
Action: PLACE_BID
Entity: Auction (A005)
Changes: {
  bidAmount: 12000,
  auctionId: "A005"
}
IP: 192.168.1.25
Success: true

[2025-01-15 20:30:00] Admin: Rajesh A
Action: MODIFY_PAYMENT
Entity: Payment (P123)
Changes: {
  before: { amount: 5000, status: "pending" },
  after: { amount: 4632, status: "paid" }
}
IP: 192.168.1.10
Success: true
```

---

### 12. Database Schema Complete Reference

#### Collections Summary

```javascript
1. users                    // Admin and members
2. chitGroups               // Chit configurations
3. auctions                 // Auction records
4. bids                     // Bid submissions (can be embedded in auctions)
5. payments                 // Payment tracking
6. memberRankings           // Ranking per chit
7. memberStatements         // Transaction history
8. notifications            // WhatsApp queue
9. auditLogs                // Audit trail
10. settings                // System settings
```

#### Detailed Schemas

**1. Users Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  phone: String,                    // Unique, used for login
  email: String,
  password: String,                 // Hashed with bcrypt
  role: 'admin' | 'member',
  language: 'en' | 'ta',
  profilePhoto: String,
  status: 'active' | 'suspended' | 'inactive',
  suspensionReason: String,
  permissions: {                    // For suspended members
    canViewAuctions: Boolean,
    canViewStatements: Boolean,
    canLogin: Boolean
  },
  chitGroups: [ObjectId],           // Chits member belongs to
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

**2. ChitGroups Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  chitAmount: Number,
  totalMembers: Number,
  duration: Number,
  commissionAmount: Number,
  winnerPaymentModel: 'A' | 'B',
  gracePeriodDays: Number,
  monthlyContribution: Number,
  status: 'InProgress' | 'Active' | 'Closed',
  startDate: Date,
  endDate: Date,
  completedAuctions: Number,
  members: [{
    memberId: ObjectId,
    memberName: String,
    joinedDate: Date,
    hasWon: Boolean,
    wonInAuction: Number
  }],
  winners: [ObjectId],              // Quick lookup
  createdBy: ObjectId,
  closedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  notes: String
}
```

**3. Auctions Collection**
```javascript
{
  _id: ObjectId,
  chitGroupId: ObjectId,
  chitGroupName: String,
  auctionNumber: Number,
  scheduledDate: Date,
  scheduledTime: String,
  startedAt: Date,
  closedAt: Date,
  status: 'Scheduled' | 'Live' | 'Closed',
  startingBid: Number,              // = commission
  currentHighestBid: Number,
  winningBid: Number,
  winnerId: ObjectId,
  winnerName: String,
  bids: [{
    memberId: ObjectId,
    memberName: String,
    bidAmount: Number,
    bidTime: Date,
    ipAddress: String
  }],
  autoExcludedMembers: [ObjectId],  // Previous winners
  manualExcludedMembers: [{
    memberId: ObjectId,
    reason: String,
    excludedBy: ObjectId
  }],
  eligibleMembers: Number,
  totalBids: Number,
  participationRate: Number,        // Percentage
  dividendPerMember: Number,
  totalDividend: Number,
  commissionCollected: Number,
  createdBy: ObjectId,
  startedBy: ObjectId,
  closedBy: ObjectId,
  notes: String
}
```

**4. Payments Collection**
```javascript
{
  _id: ObjectId,
  chitGroupId: ObjectId,
  memberId: ObjectId,
  memberName: String,
  auctionNumber: Number,
  
  // Amount Details
  dueDate: Date,
  baseAmount: Number,               // Before dividend
  dividendReceived: Number,
  dueAmount: Number,                // After dividend
  paidAmount: Number,
  outstandingBalance: Number,
  
  // Payment Status
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue',
  paidDate: Date,
  isOnTime: Boolean,
  
  // Delay Tracking
  gracePeriodDays: Number,
  gracePeriodUsed: Boolean,
  delayDays: Number,                // After grace period
  
  // Partial Payments
  partialPayments: [{
    amount: Number,
    date: Date,
    recordedBy: ObjectId,
    paymentMethod: String,
    referenceNumber: String,
    notes: String
  }],
  
  // Winner Special Fields
  isWinner: Boolean,
  commissionAmount: Number,
  amountReceived: Number,           // Chit amount they got
  
  // Payment Details
  paymentMethod: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque',
  referenceNumber: String,
  receiptNumber: String,
  notes: String,
  recordedBy: ObjectId,
  
  createdAt: Date,
  updatedAt: Date
}
```

**5. MemberRankings Collection**
```javascript
{
  _id: ObjectId,
  memberId: ObjectId,
  memberName: String,
  chitGroupId: ObjectId,
  
  // Payment Statistics
  onTimePayments: Number,
  delayedPayments: Number,
  totalPaymentsDue: Number,
  totalDelayDays: Number,
  averageDelayDays: Number,
  gracePeriodUsed: Number,
  
  // Financial Stats
  totalAmountPaid: Number,
  totalDividendsReceived: Number,
  outstandingAmount: Number,
  
  // Ranking
  rankScore: Number,
  rank: Number,
  rankCategory: 'Excellent' | 'Good' | 'Average' | 'Poor',
  
  // Win Status
  hasWon: Boolean,
  wonInAuction: Number,
  
  lastUpdated: Date,
  calculatedAt: Date
}
```

**6. MemberStatements Collection**
```javascript
{
  _id: ObjectId,
  memberId: ObjectId,
  memberName: String,
  chitGroupId: ObjectId,
  chitGroupName: String,
  
  transactions: [{
    date: Date,
    auctionNumber: Number,
    type: 'Contribution' | 'Dividend' | 'WinAmount' | 'Commission' | 'PartialPayment',
    description: String,
    debit: Number,
    credit: Number,
    balance: Number,
    status: 'Completed' | 'Pending',
    referenceNumber: String,
    recordedBy: ObjectId
  }],
  
  summary: {
    totalContributions: Number,
    totalDividends: Number,
    netContributions: Number,
    outstandingAmount: Number,
    currentBalance: Number,
    
    auctionWon: {
      auctionNumber: Number,
      wonDate: Date,
      bidAmount: Number,
      receivedAmount: Number,
      commissionPaid: Number
    },
    
    paymentStats: {
      totalPayments: Number,
      onTimeCount: Number,
      delayedCount: Number,
      ranking: Number
    }
  },
  
  generatedAt: Date,
  lastUpdated: Date
}
```

**7. Notifications Collection**
```javascript
{
  _id: ObjectId,
  recipientId: ObjectId,
  recipientPhone: String,
  recipientName: String,
  type: String,
  priority: 'high' | 'medium' | 'low',
  language: 'en' | 'ta',
  
  // Template and Content
  templateId: String,
  templateData: Object,
  messageText: String,              // Final formatted message
  
  // Scheduling
  scheduledAt: Date,
  sentAt: Date,
  status: 'pending' | 'queued' | 'sent' | 'failed' | 'cancelled',
  
  // Delivery
  deliveryStatus: String,
  deliveryTimestamp: Date,
  failureReason: String,
  retryCount: Number,
  maxRetries: 3,
  
  // Reference
  chitGroupId: ObjectId,
  auctionId: ObjectId,
  paymentId: ObjectId,
  
  createdAt: Date,
  updatedAt: Date
}
```

**8. AuditLogs Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  userRole: String,
  userName: String,
  action: String,
  entity: String,
  entityId: ObjectId,
  
  changes: {
    before: Object,
    after: Object
  },
  
  ipAddress: String,
  userAgent: String,
  timestamp: Date,
  success: Boolean,
  errorMessage: String,
  
  // Context
  chitGroupId: ObjectId,
  auctionId: ObjectId,
  
  createdAt: Date
}
```

**9. Settings Collection**
```javascript
{
  _id: ObjectId,
  key: String,                      // Unique setting key
  value: Mixed,                     // Setting value
  category: String,                 // Group settings
  description: String,
  dataType: 'string' | 'number' | 'boolean' | 'object',
  isSystem: Boolean,                // System vs user configurable
  lastModifiedBy: ObjectId,
  lastModifiedAt: Date
}
```

---

### 13. API Endpoints Complete Reference

#### Base URL
```
http://localhost:5000/api
```

#### Authentication Endpoints

```
POST   /api/auth/login
Body: { phone: String, password: String }
Response: { token: String, user: Object }

POST   /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { message: "Logged out successfully" }

GET    /api/auth/me
Headers: Authorization: Bearer <token>
Response: { user: Object }

PUT    /api/auth/change-password
Headers: Authorization: Bearer <token>
Body: { oldPassword: String, newPassword: String }
Response: { message: "Password updated" }
```

#### Admin - Chit Group Management

```
POST   /api/admin/chits
Body: { name, chitAmount, totalMembers, duration, commission, model, gracePeriod, monthlyContribution }
Response: { chit: Object }

GET    /api/admin/chits
Query: ?status=Active&page=1&limit=10
Response: { chits: Array, total: Number, page: Number }

GET    /api/admin/chits/:id
Response: { chit: Object, members: Array, auctions: Array }

PUT    /api/admin/chits/:id
Body: { fields to update }
Response: { chit: Object }

POST   /api/admin/chits/:id/close
Body: { notes: String }
Response: { chit: Object, message: "Chit closed successfully" }

POST   /api/admin/chits/:id/add-member
Body: { memberId: ObjectId }
Response: { message: "Member added" }

DELETE /api/admin/chits/:id/remove-member/:memberId
Response: { message: "Member removed" }
```

#### Admin - Member Management

```
POST   /api/admin/members
Body: { name, phone, email, password, language }
Response: { member: Object }

GET    /api/admin/members
Query: ?search=name&status=active&page=1
Response: { members: Array, total: Number }

GET    /api/admin/members/:id
Response: { member: Object, chitGroups: Array, rankings: Array }

PUT    /api/admin/members/:id
Body: { fields to update }
Response: { member: Object }

POST   /api/admin/members/:id/suspend
Body: { reason: String, permissions: Object }
Response: { message: "Member suspended" }

POST   /api/admin/members/:id/activate
Response: { message: "Member activated" }

GET    /api/admin/members/:id/ranking/:chitId
Response: { ranking: Object }

GET    /api/admin/members/:id/statement/:chitId
Response: { statement: Object }
```

#### Admin - Auction Management

```
POST   /api/admin/auctions/schedule
Body: { chitGroupId, auctionNumber, scheduledDate, scheduledTime }
Response: { auction: Object }

POST   /api/admin/auctions/:id/start
Response: { auction: Object, eligibleMembers: Array }

GET    /api/admin/auctions/:id
Response: { auction: Object, bids: Array }

GET    /api/admin/auctions/:id/bids
Response: { bids: Array, highestBid: Object }

POST   /api/admin/auctions/:id/exclude-member
Body: { memberId: ObjectId, reason: String }
Response: { message: "Member excluded" }

POST   /api/admin/auctions/:id/close
Body: { notes: String }
Response: { auction: Object, winner: Object, payments: Array }

PUT    /api/admin/auctions/:id/winner
Body: { winnerId: ObjectId }
Response: { auction: Object, payments: Array }
```

#### Admin - Payment Management

```
GET    /api/admin/payments
Query: ?chitId=xxx&status=pending&memberId=xxx
Response: { payments: Array, total: Number }

POST   /api/admin/payments/:id/record
Body: { amount, paymentMethod, referenceNumber, date, notes }
Response: { payment: Object }

POST   /api/admin/payments/partial
Body: { paymentId, amount, paymentMethod, date }
Response: { payment: Object, outstandingBalance: Number }

PUT    /api/admin/payments/:id
Body: { fields to update }
Response: { payment: Object }

GET    /api/admin/payments/pending
Query: ?chitId=xxx
Response: { payments: Array, totalOutstanding: Number }

GET    /api/admin/payments/overdue
Query: ?chitId=xxx&days=5
Response: { payments: Array }

POST   /api/admin/payments/:id/extend-grace
Body: { additionalDays: Number, reason: String }
Response: { payment: Object }
```

#### Member - Chit Access

```
GET    /api/member/chits
Response: { chits: Array }

GET    /api/member/chits/:id
Response: { chit: Object, myStatus: Object, nextPayment: Object }

GET    /api/member/chits/:id/statement
Response: { statement: Object, transactions: Array }

GET    /api/member/chits/:id/ranking
Response: { ranking: Object, position: Number }
```

#### Member - Auction

```
GET    /api/member/auctions/upcoming
Response: { auctions: Array }

GET    /api/member/auctions/:id
Response: { auction: Object, canBid: Boolean, myBid: Object }

POST   /api/member/auctions/:id/bid
Body: { bidAmount: Number }
Response: { bid: Object, message: "Bid submitted successfully" }

GET    /api/member/auctions/:id/result
Response: { winner: String, winningBid: Number, myBid: Number, myPayment: Number, dividend: Number }

GET    /api/member/auctions/history
Query: ?chitId=xxx
Response: { auctions: Array }
```

#### Member - Payment

```
GET    /api/member/payments
Query: ?chitId=xxx&status=pending
Response: { payments: Array }

GET    /api/member/payments/:chitId/due
Response: { payment: Object, dueDate: Date, amount: Number }

GET    /api/member/payments/history
Query: ?chitId=xxx
Response: { payments: Array, summary: Object }
```

#### Reports (Admin Only)

```
GET    /api/reports/payment-history
Query: ?memberId=xxx&chitId=xxx&from=date&to=date&format=pdf
Response: PDF file or { report: Object }

GET    /api/reports/auction-history
Query: ?chitId=xxx&from=date&to=date&format=pdf
Response: PDF file or { report: Object }

GET    /api/reports/outstanding
Query: ?chitId=xxx&format=pdf
Response: PDF file or { report: Object }

GET    /api/reports/dividend-summary
Query: ?chitId=xxx&memberId=xxx&from=date&to=date&format=pdf
Response: PDF file or { report: Object }

GET    /api/reports/member-statement/:memberId
Query: ?chitId=xxx&format=pdf
Response: PDF file or { report: Object }

GET    /api/reports/chit-summary/:chitId
Query: ?format=pdf
Response: PDF file or { report: Object }

GET    /api/reports/financial
Query: ?from=date&to=date&chitId=xxx&format=pdf
Response: PDF file or { report: Object }
```

#### Dashboard

```
GET    /api/dashboard/admin
Response: { 
  stats: Object, 
  activeChits: Array,
  pendingPayments: Array,
  upcomingAuctions: Array,
  recentActivity: Array 
}

GET    /api/dashboard/admin/chit/:id
Response: {
  chit: Object,
  financialSummary: Object,
  memberStats: Object,
  nextAuction: Object,
  recentPayments: Array
}

GET    /api/dashboard/member
Response: {
  myChits: Array,
  upcomingPayments: Array,
  upcomingAuctions: Array,
  recentActivity: Array,
  notifications: Array
}
```

#### Audit Logs (Admin Only)

```
GET    /api/audit/logs
Query: ?entity=ChitGroup&action=CREATE&from=date&to=date&userId=xxx
Response: { logs: Array, total: Number }

GET    /api/audit/logs/:entityId
Response: { logs: Array }
```

#### Notifications

```
GET    /api/notifications
Response: { notifications: Array, unread: Number }

PUT    /api/notifications/:id/read
Response: { message: "Marked as read" }

POST   /api/notifications/test
Body: { memberId: ObjectId, type: String }
Response: { message: "Test notification sent" }
```

#### Settings (Admin Only)

```
GET    /api/settings
Response: { settings: Array }

PUT    /api/settings/:key
Body: { value: Mixed }
Response: { setting: Object }
```

---

### 14. Progressive Web App (PWA) Configuration

#### Manifest.json
```json
{
  "name": "Chit Fund Manager",
  "short_name": "ChitFund",
  "description": "Manage chit funds with dynamic auctions and real-time tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "View your dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/dashboard-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Auctions",
      "short_name": "Auctions",
      "description": "View upcoming auctions",
      "url": "/auctions",
      "icons": [{ "src": "/icons/auction-96x96.png", "sizes": "96x96" }]
    }
  ],
  "categories": ["finance", "business", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "540x720",
      "type": "image/png"
    },
    {
      "src": "/screenshots/auction.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

#### Service Worker Features
- Cache static assets
- Offline page for network failures
- Background sync for bids (if offline)
- Push notifications
- Cache API responses
- Update notification

---

### 15. Important Business Rules Summary

**Auction Rules:**
1. One bid per person per auction (cannot change/withdraw)
2. Highest bid wins
3. Starting bid always = commission amount
4. Auto-exclude previous winners
5. Admin can manually exclude members (they still pay)
6. No time limit (admin closes manually)
7. Members see only winner name after close

**Payment Rules:**
1. Only winner pays commission (once)
2. Payment due on auction day
3. Grace period configurable per chit
4. Delay counting starts after grace period
5. Partial payments allowed (tracked)
6. No advance payments (current month only)
7. No automatic interest/penalties

**Model Differences:**
- **Model A**: Winner pays full monthly amount (no future dividends)
- **Model B**: Winner gets dividend from all future auctions

**Privacy Rules:**
1. Members see only their own data + winner name
2. Members cannot see other members' bids
3. Members cannot see other members' payments
4. Admin sees everything

**One Win Rule:**
- Each member can win only once per chit group
- Still pays monthly and receives dividends (based on model)
- Automatically excluded from future auctions

**Dividend Distribution:**
- Each month independent (not cumulative)
- Calculated: (Winning Bid - Commission) ÷ Non-winners
- Reduces monthly payment for non-winners

**Ranking:**
- Per chit group (not overall)
- Based on payment punctuality
- On-time payments increase rank
- Delays decrease rank
- Grace period usage tracked but less penalty

---

### 16. Development Phases (Recommended Order)

**Phase 1: Foundation (Week 1)**
- Project setup
- Database models
- Authentication system
- Basic admin & member dashboards

**Phase 2: Chit Management (Week 1-2)**
- Create chit groups
- Add members to chits
- Chit status management
- Member listing

**Phase 3: Auction System (Week 2-3)**
- Schedule auctions
- Start/close auctions
- Bid submission (simple form)
- Winner selection
- Exclusion management

**Phase 4: Payment System (Week 3-4)**
- Payment tracking
- Dividend calculations
- Partial payments
- Delay tracking
- Grace period logic
- Model A vs B implementation

**Phase 5: Member Features (Week 4-5)**
- Member dashboard
- Bid submission interface
- Payment history
- Digital passbook
- Ranking display

**Phase 6: Reports & PDF (Week 5-6)**
- All 7 reports
- PDF generation
- Indian formatting
- Export functionality

**Phase 7: Notifications (Week 6)**
- WhatsApp integration
- Notification templates
- Event triggers
- Queue system

**Phase 8: Real-time for Admin (Week 7)**
- Socket.io setup
- Admin live auction dashboard
- Real-time bid notifications

**Phase 9: PWA Features (Week 7)**
- Service worker
- Manifest.json
- Offline capabilities
- Install prompts

**Phase 10: Audit & Security (Week 8)**
- Audit logging
- Security hardening
- Input validation
- Error handling

**Phase 11: Localization (Week 8)**
- Tamil translations
- Language switcher
- Indian formatting

**Phase 12: Testing & Polish (Week 9-10)**
- Comprehensive testing
- Bug fixes
- Performance optimization
- User acceptance testing

---

### 17. Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/chitfund
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/chitfund

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production_min_32_chars
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# WhatsApp Business API
WHATSAPP_API_KEY=your_whatsapp_business_api_key
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_PATH=/backups
BACKUP_RETENTION_DAYS=30

# Application Settings
DEFAULT_LANGUAGE=en
SUPPORT_LANGUAGES=en,ta
CURRENCY_CODE=INR
CURRENCY_SYMBOL=₹
DATE_FORMAT=DD/MM/YYYY
TIME_ZONE=Asia/Kolkata

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# File Upload (if needed)
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Email (optional for future)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@chitfund.com
FROM_NAME=Chit Fund Manager

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000
CLIENT_URL_PROD=https://yourapp.com

# Security
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Socket.io
SOCKET_CORS_ORIGIN=http://localhost:3000
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/logs
```

---

### 18. Testing Checklist

#### Payment Calculations
- [ ] Model A: Winner pays full amount
- [ ] Model B: Winner gets dividend
- [ ] Dividend distribution accuracy
- [ ] Commission deduction
- [ ] Partial payment tracking
- [ ] Outstanding balance calculation

#### Auction Flow
- [ ] Bid submission (one per member)
- [ ] Auto-exclusion of previous winners
- [ ] Manual exclusion by admin
- [ ] Winner selection (highest bid)
- [ ] Payment creation after auction close
- [ ] Notification sending

#### Member Privacy
- [ ] Members cannot see other members' bids
- [ ] Members see only winner name
- [ ] Members see only their own data
- [ ] Admin sees everything

#### Ranking System
- [ ] On-time payment increases rank
- [ ] Delay decreases rank
- [ ] Grace period handling
- [ ] Rank calculation accuracy
- [ ] Per-chit ranking isolation

#### Reports
- [ ] All 7 reports generate correctly
- [ ] PDF export works
- [ ] Indian formatting (₹1,00,000)
- [ ] Date filtering
- [ ] Data accuracy

#### Edge Cases
- [ ] First auction in chit
- [ ] Last auction in chit
- [ ] Member joins multiple chits
- [ ] Payment delay exceeds grace period
- [ ] No bids in auction (rare)
- [ ] Partial payment completion

---

### 19. Production Deployment Checklist

#### Security
- [ ] Change all default passwords
- [ ] Update JWT secret (min 32 chars)
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Input validation on all endpoints
- [ ] SQL injection protection
- [ ] XSS protection

#### Database
- [ ] MongoDB Atlas setup
- [ ] Database indexes created
- [ ] Backup strategy configured
- [ ] Connection pooling optimized

#### Environment
- [ ] All environment variables set
- [ ] Production URLs configured
- [ ] WhatsApp API keys added
- [ ] Email SMTP configured (if used)

#### Performance
- [ ] Static assets minified
- [ ] Images optimized
- [ ] CDN configured (if needed)
- [ ] Caching strategy implemented
- [ ] Database queries optimized

#### Monitoring
- [ ] Error logging setup
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Audit log retention policy

#### PWA
- [ ] Service worker registered
- [ ] Manifest.json validated
- [ ] Icons generated (all sizes)
- [ ] Offline page created
- [ ] Install prompt tested

#### Testing
- [ ] All features tested on mobile
- [ ] Cross-browser testing
- [ ] Payment calculations verified
- [ ] Auction flow tested
- [ ] Reports generation tested
- [ ] WhatsApp notifications tested
- [ ] Load testing performed

#### Documentation
- [ ] Admin user guide
- [ ] Member user guide
- [ ] API documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide

---

### 20. Future Enhancements (Post-Launch)

**Phase 2 Features:**
1. Employee roles with approval workflow
2. Advance payment option
3. Payment gateway integration (Razorpay/PhonePe)
4. SMS notifications (in addition to WhatsApp)
5. Document/KYC management
6. Biometric authentication
7. Native mobile apps (Android/iOS)
8. Interest calculation on delays (optional)
9. Refund handling for cancelled chits
10. Multiple payment method tracking
11. Advanced analytics dashboard
12. Member referral system
13. Automated auction scheduling
14. Multi-language support (Hindi, Telugu, etc.)
15. Integration with accounting software

---

## Ready for Claude Code Development!

This comprehensive requirements document contains everything needed to build the complete Chit Fund Management application. 

**To start development in Claude Code:**

1. Save this file as `REQUIREMENTS.md`
2. Open Claude Code
3. Point to this requirements file
4. Start with Phase 1: Backend Setup
5. Follow the development phases sequentially
6. Test thoroughly after each phase

**Key Files to Reference:**
- Section 4: Payment calculations (most critical)
- Section 12: Database schemas
- Section 13: API endpoints
- Section 16: Development phases

Good luck with your development! 🚀
