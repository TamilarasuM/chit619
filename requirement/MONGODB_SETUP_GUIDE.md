# MongoDB Setup Guide for Chit Fund Application

## Table of Contents
1. [Local MongoDB Setup](#local-mongodb-setup)
2. [MongoDB Atlas (Cloud) Setup](#mongodb-atlas-cloud-setup)
3. [Database Configuration](#database-configuration)
4. [Creating Database Structure](#creating-database-structure)
5. [Sample Data for Testing](#sample-data-for-testing)
6. [MongoDB Compass (GUI Tool)](#mongodb-compass-gui-tool)

---

## Local MongoDB Setup

### Option 1: Windows Installation

**Step 1: Download MongoDB**
1. Go to https://www.mongodb.com/try/download/community
2. Select:
   - Version: Latest (7.0 or higher)
   - Platform: Windows
   - Package: MSI
3. Click "Download"

**Step 2: Install MongoDB**
1. Run the downloaded `.msi` file
2. Choose "Complete" installation
3. Install as a Service: ✓ Check this
4. Service Name: MongoDB
5. Data Directory: `C:\Program Files\MongoDB\Server\7.0\data`
6. Log Directory: `C:\Program Files\MongoDB\Server\7.0\log`
7. Install MongoDB Compass: ✓ Check this (GUI tool)
8. Click "Install"

**Step 3: Verify Installation**
```bash
# Open Command Prompt and run:
mongod --version

# Should show something like:
# db version v7.0.x
```

**Step 4: Start MongoDB Service**
```bash
# MongoDB should auto-start as a service
# To manually start:
net start MongoDB

# To stop:
net stop MongoDB

# To check status:
sc query MongoDB
```

**Step 5: Connect to MongoDB**
```bash
# Open MongoDB Shell
mongosh

# You should see:
# Current Mongosh Log ID: xxxxx
# Connecting to: mongodb://127.0.0.1:27017
# test>
```

---

### Option 2: Mac Installation

**Using Homebrew:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Update Homebrew
brew update

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify installation
mongosh --version
```

---

### Option 3: Ubuntu/Linux Installation

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Reload package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Check status
sudo systemctl status mongod

# Connect
mongosh
```

---

## MongoDB Atlas (Cloud) Setup - RECOMMENDED

### Why MongoDB Atlas?
- ✅ Free tier available (512MB storage)
- ✅ No local installation needed
- ✅ Automatic backups
- ✅ Easy scaling
- ✅ Works from anywhere
- ✅ Production-ready

### Step-by-Step Atlas Setup

**Step 1: Create Account**
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google account
3. Fill in details and verify email

**Step 2: Create a Cluster**
1. After login, click "Build a Database"
2. Choose **FREE** tier (M0 Sandbox)
3. Select Cloud Provider & Region:
   - Provider: AWS
   - Region: Mumbai (ap-south-1) - Closest to India
4. Cluster Name: `chitfund-cluster`
5. Click "Create"
6. Wait 3-5 minutes for cluster creation

**Step 3: Create Database User**
1. Click "Database Access" (left sidebar)
2. Click "Add New Database User"
3. Authentication Method: Password
4. Username: `chitfundadmin`
5. Password: Click "Autogenerate Secure Password" (SAVE THIS!)
   - Example: `Xy9Kp2mN4vB8qL`
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

**Step 4: Configure Network Access**
1. Click "Network Access" (left sidebar)
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere"
   - IP Address: `0.0.0.0/0`
   - Comment: "Allow from anywhere"
4. Click "Confirm"

**Note:** For production, add only your server's IP address

**Step 5: Get Connection String**
1. Click "Database" (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: Node.js
5. Version: 5.5 or later
6. Copy the connection string:
```
mongodb+srv://chitfundadmin:<password>@chitfund-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

7. Replace `<password>` with your actual password
8. Add database name: `chitfund`

**Final Connection String:**
```
mongodb+srv://chitfundadmin:Xy9Kp2mN4vB8qL@chitfund-cluster.xxxxx.mongodb.net/chitfund?retryWrites=true&w=majority
```

---

## Database Configuration

### Create .env File

In your project root, create `.env`:

```env
# Development (Local MongoDB)
MONGODB_URI=mongodb://localhost:27017/chitfund

# Production (MongoDB Atlas)
MONGODB_URI=mongodb+srv://chitfundadmin:YOUR_PASSWORD@chitfund-cluster.xxxxx.mongodb.net/chitfund?retryWrites=true&w=majority

# Other configurations
NODE_ENV=development
PORT=5000
JWT_SECRET=your_super_secret_key_min_32_characters_long_change_this
JWT_EXPIRE=30d
```

### Create Database Connection File

**File: `server/config/db.js`**

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 6+ doesn't need these options anymore
      // But keeping for compatibility
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    
    // Log connection status
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.log('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### Update server.js

**File: `server/server.js`**

```javascript
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Chit Fund API is running',
    database: 'MongoDB Connected',
    environment: process.env.NODE_ENV 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
```

---

## Creating Database Structure

### Install Required Packages

```bash
# In your project root
npm install mongoose dotenv
```

### Create All Models

**File: `server/models/User.js`**

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  language: {
    type: String,
    enum: ['en', 'ta'],
    default: 'en'
  },
  profilePhoto: String,
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  suspensionReason: String,
  permissions: {
    canViewAuctions: { type: Boolean, default: true },
    canViewStatements: { type: Boolean, default: true },
    canLogin: { type: Boolean, default: true }
  },
  chitGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update timestamp on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);
```

**File: `server/models/ChitGroup.js`**

```javascript
const mongoose = require('mongoose');

const ChitGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a chit group name'],
    trim: true
  },
  chitAmount: {
    type: Number,
    required: [true, 'Please add chit amount'],
    min: 1000
  },
  totalMembers: {
    type: Number,
    required: [true, 'Please add total members'],
    min: 5
  },
  duration: {
    type: Number,
    required: [true, 'Please add duration in months'],
    min: 1
  },
  commissionAmount: {
    type: Number,
    required: [true, 'Please add commission amount'],
    min: 0
  },
  winnerPaymentModel: {
    type: String,
    enum: ['A', 'B'],
    required: [true, 'Please select winner payment model'],
    default: 'A'
  },
  gracePeriodDays: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyContribution: {
    type: Number,
    required: [true, 'Please add monthly contribution'],
    min: 100
  },
  status: {
    type: String,
    enum: ['InProgress', 'Active', 'Closed'],
    default: 'InProgress'
  },
  startDate: Date,
  endDate: Date,
  completedAuctions: {
    type: Number,
    default: 0
  },
  members: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    memberName: String,
    joinedDate: {
      type: Date,
      default: Date.now
    },
    hasWon: {
      type: Boolean,
      default: false
    },
    wonInAuction: Number
  }],
  winners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
ChitGroupSchema.index({ status: 1 });
ChitGroupSchema.index({ createdBy: 1 });
ChitGroupSchema.index({ 'members.memberId': 1 });

// Update timestamp
ChitGroupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ChitGroup', ChitGroupSchema);
```

**File: `server/models/Auction.js`**

```javascript
const mongoose = require('mongoose');

const AuctionSchema = new mongoose.Schema({
  chitGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup',
    required: true
  },
  chitGroupName: String,
  auctionNumber: {
    type: Number,
    required: true,
    min: 1
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: String,
  startedAt: Date,
  closedAt: Date,
  status: {
    type: String,
    enum: ['Scheduled', 'Live', 'Closed'],
    default: 'Scheduled'
  },
  startingBid: {
    type: Number,
    required: true
  },
  currentHighestBid: Number,
  winningBid: Number,
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  winnerName: String,
  bids: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    memberName: String,
    bidAmount: {
      type: Number,
      required: true
    },
    bidTime: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }],
  autoExcludedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  manualExcludedMembers: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    excludedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    excludedAt: {
      type: Date,
      default: Date.now
    }
  }],
  eligibleMembers: Number,
  totalBids: {
    type: Number,
    default: 0
  },
  participationRate: Number,
  dividendPerMember: Number,
  totalDividend: Number,
  commissionCollected: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique auction per chit group
AuctionSchema.index({ chitGroupId: 1, auctionNumber: 1 }, { unique: true });
AuctionSchema.index({ status: 1 });
AuctionSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('Auction', AuctionSchema);
```

**File: `server/models/Payment.js`**

```javascript
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  chitGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberName: String,
  auctionNumber: {
    type: Number,
    required: true
  },
  
  // Amount Details
  dueDate: {
    type: Date,
    required: true
  },
  baseAmount: {
    type: Number,
    required: true
  },
  dividendReceived: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  outstandingBalance: {
    type: Number,
    default: 0
  },
  
  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid', 'Overdue'],
    default: 'Pending'
  },
  paidDate: Date,
  isOnTime: {
    type: Boolean,
    default: false
  },
  
  // Delay Tracking
  gracePeriodDays: Number,
  gracePeriodUsed: {
    type: Boolean,
    default: false
  },
  delayDays: {
    type: Number,
    default: 0
  },
  
  // Partial Payments
  partialPayments: [{
    amount: Number,
    date: Date,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentMethod: String,
    referenceNumber: String,
    notes: String
  }],
  
  // Winner Special Fields
  isWinner: {
    type: Boolean,
    default: false
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  amountReceived: Number,
  
  // Payment Details
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other']
  },
  referenceNumber: String,
  receiptNumber: String,
  notes: String,
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
PaymentSchema.index({ chitGroupId: 1, memberId: 1, auctionNumber: 1 }, { unique: true });
PaymentSchema.index({ paymentStatus: 1 });
PaymentSchema.index({ dueDate: 1 });
PaymentSchema.index({ memberId: 1 });

// Update timestamp
PaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate outstanding balance
  this.outstandingBalance = this.dueAmount - this.paidAmount;
  
  // Update payment status
  if (this.paidAmount === 0) {
    this.paymentStatus = 'Pending';
  } else if (this.paidAmount < this.dueAmount) {
    this.paymentStatus = 'Partial';
  } else {
    this.paymentStatus = 'Paid';
  }
  
  // Check if overdue
  const today = new Date();
  const gracePeriodEnd = new Date(this.dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (this.gracePeriodDays || 0));
  
  if (today > gracePeriodEnd && this.paymentStatus !== 'Paid') {
    this.paymentStatus = 'Overdue';
    const diffTime = Math.abs(today - gracePeriodEnd);
    this.delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
```

---

## Sample Data for Testing

### Create Seed Script

**File: `server/scripts/seed.js`**

```javascript
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Clear existing data
    await User.deleteMany();
    await ChitGroup.deleteMany();
    console.log('Cleared existing data');

    // Create Admin User
    const admin = await User.create({
      name: 'Admin User',
      phone: '9876543210',
      email: 'admin@chitfund.com',
      password: 'admin123',
      role: 'admin',
      language: 'en'
    });
    console.log('Admin created:', admin.name);

    // Create Test Members
    const members = [];
    for (let i = 1; i <= 20; i++) {
      const member = await User.create({
        name: `Member ${i}`,
        phone: `98765432${i.toString().padStart(2, '0')}`,
        email: `member${i}@test.com`,
        password: 'member123',
        role: 'member',
        language: 'en'
      });
      members.push(member);
    }
    console.log('Created 20 members');

    // Create Sample Chit Group
    const chitGroup = await ChitGroup.create({
      name: 'Test Chit Group Jan 2025',
      chitAmount: 100000,
      totalMembers: 20,
      duration: 20,
      commissionAmount: 5000,
      winnerPaymentModel: 'A',
      gracePeriodDays: 3,
      monthlyContribution: 5000,
      status: 'InProgress',
      startDate: new Date('2025-01-15'),
      members: members.map(m => ({
        memberId: m._id,
        memberName: m.name,
        joinedDate: new Date()
      })),
      createdBy: admin._id
    });
    console.log('Chit group created:', chitGroup.name);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nLogin Credentials:');
    console.log('Admin - Phone: 9876543210, Password: admin123');
    console.log('Member - Phone: 9876543201, Password: member123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
```

### Run Seed Script

```bash
# Make sure MongoDB is running
# Then run:
node server/scripts/seed.js
```

---

## MongoDB Compass (GUI Tool)

### Download and Install
1. Download from: https://www.mongodb.com/try/download/compass
2. Install for your OS

### Connect to Local MongoDB
1. Open MongoDB Compass
2. Connection String: `mongodb://localhost:27017`
3. Click "Connect"

### Connect to MongoDB Atlas
1. Get your connection string from Atlas
2. Replace `<password>` with actual password
3. Paste in Compass and click "Connect"

### Features You'll Use:
- **Browse Collections**: See your data
- **Create Indexes**: Improve performance
- **Run Queries**: Test queries
- **Import/Export**: Backup data
- **Aggregation Builder**: Visual query builder

---

## Testing MongoDB Connection

### Create Test Script

**File: `server/scripts/testConnection.js`**

```javascript
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const testConnection = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection String:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    console.log('Port:', mongoose.connection.port);
    
    // Test collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nExisting Collections:');
    collections.forEach(col => console.log(`- ${col.name}`));
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

testConnection();
```

### Run Test

```bash
node server/scripts/testConnection.js
```

---

## Common Issues and Solutions

### Issue 1: Connection Timeout (Atlas)
**Error:** `MongoServerSelectionError: connection timeout`

**Solutions:**
1. Check your internet connection
2. Verify Network Access in Atlas (IP whitelist)
3. Check if firewall is blocking MongoDB port (27017)
4. Verify connection string password (no special chars issues)

### Issue 2: Authentication Failed
**Error:** `MongoServerError: Authentication failed`

**Solutions:**
1. Double-check username and password
2. Ensure password doesn't have special characters (or URL encode them)
3. Verify user has correct permissions in Atlas

### Issue 3: Local MongoDB Not Starting
**Error:** Service won't start

**Solutions:**
```bash
# Windows - Check if port 27017 is in use
netstat -ano | findstr :27017

# Kill process using port
taskkill /PID <process_id> /F

# Restart MongoDB
net start MongoDB
```

### Issue 4: Database Not Created
**Solution:** MongoDB creates database only when you insert first document

```javascript
// The database will be created when you insert first data
const user = await User.create({ name: 'Test' });
```

---

## Quick Start Commands

### Start MongoDB Locally
```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Stop MongoDB
```bash
# Windows
net stop MongoDB

# Mac
brew services stop mongodb-community

# Linux
sudo systemctl stop mongod
```

### MongoDB Shell Commands
```bash
# Connect to MongoDB
mongosh

# Show databases
show dbs

# Use database
use chitfund

# Show collections
show collections

# Find documents
db.users.find()

# Count documents
db.users.countDocuments()

# Drop database
db.dropDatabase()

# Exit
exit
```

---

## Recommended: Use MongoDB Atlas for Development

**Advantages:**
1. ✅ No local installation
2. ✅ Automatic backups
3. ✅ Free 512MB
4. ✅ Access from anywhere
5. ✅ Production-ready

**Steps:**
1. Create Atlas account
2. Create cluster (Free M0)
3. Create database user
4. Whitelist IP (0.0.0.0/0 for development)
5. Get connection string
6. Update .env file
7. Start coding!

---

## Next Steps

1. ✅ Set up MongoDB (Atlas recommended)
2. ✅ Update .env with connection string
3. ✅ Create database connection file
4. ✅ Create all models
5. ✅ Test connection
6. ✅ Seed sample data
7. ✅ Start building API endpoints!

Need help with any specific step? Let me know! 🚀
