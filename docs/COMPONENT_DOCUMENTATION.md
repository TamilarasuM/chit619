# Component Documentation - Chit Fund Manager Frontend

## Component Hierarchy

```
App.jsx
├── AuthContext (Provider)
├── Router
    ├── Login.jsx
    ├── AdminDashboard.jsx
    └── MemberDashboard.jsx

Common Components:
├── Card.jsx
└── (more to come)
```

---

## Context Components

### AuthContext (`frontend/src/context/AuthContext.jsx`)

**Purpose:** Global authentication state management

**State:**
```javascript
{
  user: {
    _id: string,
    name: string,
    phone: string,
    role: 'admin' | 'member'
  } | null,
  isAuthenticated: boolean,
  loading: boolean
}
```

**Methods:**
- `login(phone, password)` - Login user and store token
- `logout()` - Logout user and clear token
- Auto-loads user from localStorage on mount

**Usage:**
```jsx
import { useAuth } from '../../context/AuthContext';

const MyComponent = () => {
  const { user, login, logout, isAuthenticated } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user.name}</p>
      ) : (
        <button onClick={() => login(phone, password)}>Login</button>
      )}
    </div>
  );
};
```

**LocalStorage Keys:**
- `token` - JWT authentication token
- `user` - User object (JSON string)

---

## Common Components

### Card (`frontend/src/components/common/Card.jsx`)

**Purpose:** Reusable card container with optional title

**Props:**
```typescript
{
  title?: string,
  children: ReactNode,
  className?: string
}
```

**Usage:**
```jsx
import { Card } from '../../components/common';

<Card title="My Title" className="mb-4">
  <p>Card content here</p>
</Card>
```

**Styling:**
- White background
- Rounded corners
- Shadow
- Padding

---

## Page Components

### Login (`frontend/src/pages/Login.jsx`)

**Purpose:** Login page for both admin and members

**State:**
```javascript
{
  phone: string,
  password: string,
  error: string,
  loading: boolean
}
```

**Features:**
- Form validation
- Error display
- Loading state
- Role-based redirect (admin → /admin, member → /member)

**Styling:**
- Centered form
- Primary color buttons
- Error messages in red

---

### AdminDashboard (`frontend/src/pages/admin/AdminDashboard.jsx`)

**Purpose:** Main dashboard for administrators

**State:**
```javascript
{
  dashboardData: {
    stats: { activeChits, totalMembers, thisMonthCollection, totalCommission },
    pendingPayments: [],
    upcomingAuctions: [],
    recentActivity: [],
    activeChitGroups: [],
    chitGroupPayments: []
  } | null,
  loading: boolean,
  selectedChitGroup: {
    chitGroupId: string,
    chitGroupName: string,
    totalMembers: number,
    completedAuctions: number,
    payments: [],
    stats: {}
  } | null
}
```

**API Calls:**
- `GET /api/dashboard/admin` on component mount

**Sections:**

#### 1. Header
- Title: "Admin Dashboard"
- Welcome message with user name
- Logout button

#### 2. Quick Stats (4 Cards)
```jsx
<Card>
  <div className="text-center">
    <p className="text-sm text-gray-600">Active Chits</p>
    <p className="text-3xl font-bold text-primary-600">{activeChits}</p>
  </div>
</Card>
```

Stats:
- Active Chits (blue)
- Total Members (blue)
- This Month Collection (green)
- Total Commission (green)

#### 3. Pending Payments
- List of pending/overdue/partial payments
- Shows: member name, chit group, amount, status
- Click handler for details
- Hover effect

#### 4. Member Payment Status (Main Feature)

**Dropdown Selector:**
```jsx
<select
  value={selectedChitGroup?.chitGroupId}
  onChange={handleChitGroupChange}
>
  {chitGroupPayments.map(chit => (
    <option value={chit.chitGroupId}>
      {chit.chitGroupName} ({chit.totalMembers} members)
    </option>
  ))}
</select>
```

**Summary Stats (5 mini cards):**
- Total Members (blue)
- Completed Auctions (purple)
- Total Paid (green)
- Outstanding (red)
- Payment Status counts (gray with badges)

**Payment Table (8 columns):**
1. Member Name (+ delay indicator)
2. Auction # (centered)
3. Due Date (formatted)
4. Amount to Pay (+ dividend breakdown)
5. Amount Paid (green)
6. Balance (red if > 0)
7. Status (color-coded badge)
8. Winner (🏆 trophy + green row)

**Table Styling:**
- Hover effect on rows
- Green background for winners
- Color-coded status badges
- Footer with totals
- Responsive horizontal scroll

**Click Handler:**
Shows alert with detailed payment info:
- Member name
- Auction number
- Due date
- Winner status
- Payment breakdown
- Status
- Payment method
- Reference number

#### 5. Recent Activity
- Timeline of events
- Shows: message, timestamp

#### 6. Quick Actions (3 Buttons)
- Create New Chit
- Add Member
- Schedule Auction

All show "coming soon" alerts with feature description

**Event Handlers:**
```javascript
handleChitGroupChange(e) {
  const selected = chitGroupPayments.find(
    chit => chit.chitGroupId === e.target.value
  );
  setSelectedChitGroup(selected);
}
```

---

### MemberDashboard (`frontend/src/pages/member/MemberDashboard.jsx`)

**Purpose:** Dashboard for regular members

**State:**
```javascript
{
  dashboardData: {
    stats: { myChitGroups, nextPaymentAmount, nextPaymentDate, totalPaid },
    chitGroups: [],
    upcomingAuctions: [],
    paymentTransactions: [],
    rankings: [],
    recentActivity: []
  } | null,
  loading: boolean
}
```

**API Calls:**
- `GET /api/dashboard/member/${user._id}` on component mount

**Sections:**

#### 1. Header
- Title: "My Dashboard"
- Welcome message
- Logout button

#### 2. Quick Stats (3 Cards)
- My Chit Groups count
- Next Payment (amount + due date)
- Total Paid (green)

#### 3. My Chit Groups
Grid of chit group cards:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {chitGroups.map(chit => (
    <div
      className="border rounded-lg p-4 hover:shadow-md cursor-pointer"
      onClick={() => showChitDetails(chit)}
    >
      <h3>{chit.name}</h3>
      <p>Amount: ₹{chit.chitAmount}</p>
      <p>Monthly: ₹{chit.monthlyContribution}</p>
      <p>Status: {chit.status}</p>
      <p>My Rank: {chit.rank} / {chit.totalMembers}</p>
      {chit.hasWon && <p>✓ Won in Auction #{chit.wonInAuction}</p>}
    </div>
  ))}
</div>
```

Features:
- Grid layout (1 col mobile, 2 cols desktop)
- Hover effect
- Winner badge if applicable
- Rank display with category badge
- Click to view details

#### 4. My Monthly Transactions (Main Table)

**9 Columns:**
1. Date (formatted: 15-Mar-2025)
2. Chit Group (+ winner info if applicable)
3. Auction #
4. Base Amount
5. Dividend (green, negative)
6. Net Payable (calculated)
7. Paid (+ outstanding if any)
8. Status (badge + delay indicator)
9. Method

**Table Styling:**
- Winner rows: green background
- Winner info: "✓ Winner - Received ₹80,000"
- Dividend: shown as negative in green
- Outstanding: shown in red below paid amount
- Status badges: color-coded (green/yellow/orange/red)
- Delay indicator: "+5d late" in red

**Footer Totals:**
- Total Paid (green)
- Total Outstanding (red)

**Row Structure:**
```jsx
<tr className={`hover:bg-gray-50 ${txn.isWinner ? 'bg-green-50' : ''}`}>
  <td>{formatDate(txn.dueDate)}</td>
  <td>
    <div>{txn.chitGroupName}</div>
    {txn.isWinner && (
      <div className="text-xs text-green-600">
        ✓ Winner - Received ₹{txn.amountReceived}
      </div>
    )}
  </td>
  <td>#{txn.auctionNumber}</td>
  <td>₹{txn.baseAmount}</td>
  <td className="text-green-600">
    {txn.dividendReceived > 0 ? `-₹${txn.dividendReceived}` : '-'}
  </td>
  <td>₹{txn.dueAmount}</td>
  <td>
    <span className="text-green-600">₹{txn.paidAmount}</span>
    {txn.outstandingBalance > 0 && (
      <div className="text-xs text-red-600">
        Due: ₹{txn.outstandingBalance}
      </div>
    )}
  </td>
  <td>
    <span className={statusBadgeClass}>{txn.paymentStatus}</span>
    {!txn.isOnTime && txn.delayDays > 0 && (
      <div className="text-xs text-red-500">+{txn.delayDays}d late</div>
    )}
  </td>
  <td>{txn.paymentMethod || '-'}</td>
</tr>
```

#### 5. Upcoming Auctions
- List of scheduled auctions
- Shows: chit group, auction #, date, time
- Click to view details

#### 6. Recent Activity
- Payment history
- Shows: message, amount, timestamp

---

## Styling System

### Tailwind CSS Classes

#### Colors
```
Primary: primary-{50,100,300,500,600,700,800,900}
Gray: gray-{50,100,200,300,400,500,600,700,800,900}
Green: green-{50,100,600,800,900}
Red: red-{50,100,500,600,800,900}
Yellow: yellow-{100,800}
Orange: orange-{100,800}
Blue: blue-{50,600,900}
Purple: purple-{50,600,900}
```

#### Common Patterns
```css
/* Card */
.card {
  @apply bg-white rounded-lg shadow p-6;
}

/* Button Primary */
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg font-medium transition-colors;
}

/* Status Badge */
.badge {
  @apply inline-flex px-3 py-1 text-xs font-semibold rounded-full;
}

/* Table */
.table-header {
  @apply bg-gray-50 border-b-2 border-gray-200;
}

.table-cell {
  @apply px-4 py-3;
}
```

#### Responsive Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

---

## Utility Functions

### Date Formatting
```javascript
// Short format
new Date(date).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})
// Output: "15-Mar-2025"

// Full format
new Date(date).toLocaleString('en-IN')
// Output: "15/03/2025, 10:30:00 AM"
```

### Currency Formatting
```javascript
amount.toLocaleString('en-IN')
// 5000 → "5,000"
// 100000 → "1,00,000"
```

### Status Badge Classes
```javascript
const getStatusClass = (status) => {
  switch(status) {
    case 'Paid': return 'bg-green-100 text-green-800';
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'Partial': return 'bg-orange-100 text-orange-800';
    case 'Overdue': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
```

---

## Best Practices

### 1. Loading States
Always show loading indicator while fetching data:
```jsx
{loading ? (
  <div className="text-center py-8">
    <p className="text-gray-600">Loading...</p>
  </div>
) : (
  <ActualContent />
)}
```

### 2. Error Handling
```jsx
try {
  const response = await axios.get(url);
  setData(response.data.data);
} catch (error) {
  console.error('Error:', error);
  setError(error.message);
}
```

### 3. Conditional Rendering
```jsx
{data?.items && data.items.length > 0 ? (
  <ItemList items={data.items} />
) : (
  <p className="text-gray-600">No items available</p>
)}
```

### 4. Click Handlers
```jsx
<div
  onClick={() => handleClick(item)}
  className="cursor-pointer hover:bg-gray-50"
>
  {item.name}
</div>
```

### 5. Responsive Design
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Mobile: 1 col, Tablet: 2 cols, Desktop: 4 cols */}
</div>
```

---

## Future Components (Planned)

- [ ] Modal - For forms and confirmations
- [ ] Table - Reusable table component
- [ ] Button - Standardized button component
- [ ] Input - Form input with validation
- [ ] Select - Dropdown component
- [ ] Badge - Status badge component
- [ ] Toast - Notification system
- [ ] Pagination - For large data sets
- [ ] DatePicker - For date selection
- [ ] Chart - For analytics dashboard
