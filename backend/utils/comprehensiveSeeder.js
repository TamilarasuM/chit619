const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Load models
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const MemberRanking = require('../models/MemberRanking');
const AuditLog = require('../models/AuditLog');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
});

const comprehensiveSeed = async () => {
  try {
    console.log('🗑️  Clearing existing data...'.yellow);
    await User.deleteMany();
    await ChitGroup.deleteMany();
    await Auction.deleteMany();
    await Payment.deleteMany();
    await Notification.deleteMany();
    await MemberRanking.deleteMany();
    await AuditLog.deleteMany();
    console.log('✅ Data cleared'.green);

    // Create Admin
    console.log('\n👤 Creating admin user...'.cyan);
    const admin = await User.create({
      name: 'Admin User',
      phone: '9876543210',
      email: 'admin@chitfund.com',
      password: 'admin123',
      role: 'admin',
      language: 'en',
      status: 'active'
    });
    console.log(`✅ Admin: ${admin.name}`.green);

    // Create 20 Members
    console.log('\n👥 Creating 20 members...'.cyan);
    const memberNames = [
      'Rajesh Kumar', 'Priya Sharma', 'Suresh Rajan', 'Lakshmi Devi', 'Karthik Subramanian',
      'Anjali Menon', 'Vikram Singh', 'Divya Krishnan', 'Arun Nair', 'Meena Patel',
      'Ravi Chandran', 'Kavitha Reddy', 'Prakash Iyer', 'Sangeetha Balan', 'Ramesh Pillai',
      'Deepa Varma', 'Ganesh Kumar', 'Radha Krishnan', 'Mohan Das', 'Shalini Menon'
    ];

    const members = [];
    for (let i = 0; i < 20; i++) {
      const member = await User.create({
        name: memberNames[i],
        phone: `987654${(3220 + i).toString().padStart(4, '0')}`,
        email: `member${i + 1}@example.com`,
        password: 'member123',
        role: 'member',
        language: i % 2 === 0 ? 'en' : 'ta',
        status: 'active',
        createdBy: admin._id
      });
      members.push(member);
      console.log(`✅ Member ${i + 1}: ${member.name}`.green);
    }

    // Create Chit Groups
    console.log('\n📋 Creating chit groups...'.cyan);

    // Chit Group 1 - Active (20 members, ongoing)
    const chit1Members = members.slice(0, 20).map((m, idx) => ({
      member: m._id,
      joinedDate: new Date(2024, 0, 1),
      rank: idx + 1
    }));

    const chitGroup1 = await ChitGroup.create({
      name: 'Monthly Chit - Jan 2025',
      chitAmount: 100000,
      totalMembers: 20,
      totalDuration: 20,
      currentMonth: 8,
      commissionAmount: 5000,
      model: 'A',
      gracePeriodDays: 3,
      monthlyContribution: 5000,
      monthlyDueDate: 5,
      status: 'Active',
      startDate: new Date(2025, 0, 1),
      members: chit1Members,
      winners: [members[0]._id, members[5]._id, members[10]._id],
      createdBy: admin._id
    });
    console.log(`✅ ${chitGroup1.name}`.green);

    // Chit Group 2 - Active (10 members)
    const chit2Members = members.slice(0, 10).map((m, idx) => ({
      member: m._id,
      joinedDate: new Date(2024, 6, 1),
      rank: idx + 1
    }));

    const chitGroup2 = await ChitGroup.create({
      name: 'Weekly Chit - July 2024',
      chitAmount: 50000,
      totalMembers: 10,
      totalDuration: 10,
      currentMonth: 5,
      commissionAmount: 2500,
      model: 'B',
      gracePeriodDays: 2,
      monthlyContribution: 2500,
      monthlyDueDate: 10,
      status: 'Active',
      startDate: new Date(2024, 6, 1),
      members: chit2Members,
      winners: [members[2]._id],
      createdBy: admin._id
    });
    console.log(`✅ ${chitGroup2.name}`.green);

    // Chit Group 3 - InProgress (15 members)
    const chit3Members = members.slice(5, 20).map((m, idx) => ({
      member: m._id,
      joinedDate: new Date(2024, 10, 15),
      rank: idx + 1
    }));

    const chitGroup3 = await ChitGroup.create({
      name: 'Diwali Special Chit 2024',
      chitAmount: 75000,
      totalMembers: 15,
      totalDuration: 15,
      currentMonth: 0,
      commissionAmount: 3750,
      model: 'A',
      gracePeriodDays: 5,
      monthlyContribution: 3750,
      monthlyDueDate: 15,
      status: 'InProgress',
      startDate: new Date(2024, 10, 15),
      members: chit3Members,
      winners: [],
      createdBy: admin._id
    });
    console.log(`✅ ${chitGroup3.name}`.green);

    // Create Auctions
    console.log('\n🔨 Creating auctions...'.cyan);

    // Closed Auctions for Chit Group 1
    for (let i = 1; i <= 7; i++) {
      const winnerIndex = (i - 1) % 20;
      const bidAmount = 5000 + (i * 500);
      const dividendPerMember = (bidAmount - 5000) / 19;

      const auction = await Auction.create({
        chitGroup: chitGroup1._id,
        monthNumber: i,
        auctionDate: new Date(2025, 0, i * 30),
        status: 'Closed',
        venue: 'Community Hall, Chennai',
        eligibleMembers: members.slice(0, 20).filter((_, idx) => idx !== winnerIndex).map(m => m._id),
        bids: [
          { member: members[winnerIndex]._id, bidAmount, bidTime: new Date(2025, 0, i * 30 + 1) },
          { member: members[(winnerIndex + 1) % 20]._id, bidAmount: bidAmount - 200, bidTime: new Date(2025, 0, i * 30 + 1) }
        ],
        winner: members[winnerIndex]._id,
        winningBid: bidAmount,
        dividendPerMember,
        createdBy: admin._id
      });
      console.log(`✅ Auction ${i} - Winner: ${members[winnerIndex].name}`.green);
    }

    // Scheduled Auction for Chit Group 1
    const scheduledAuction = await Auction.create({
      chitGroup: chitGroup1._id,
      monthNumber: 8,
      auctionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'Scheduled',
      venue: 'Community Hall, Chennai',
      eligibleMembers: members.slice(0, 20).filter(m => ![0, 5, 10].includes(members.indexOf(m))).map(m => m._id),
      bids: [],
      createdBy: admin._id
    });
    console.log(`✅ Scheduled Auction - 5 days from now`.green);

    // Create Payments
    console.log('\n💰 Creating payments...'.cyan);
    let paymentCount = 0;

    for (let month = 1; month <= 8; month++) {
      for (let memberIdx = 0; memberIdx < 20; memberIdx++) {
        const member = members[memberIdx];
        const dueDate = new Date(2025, 0, month * 30 + 5);
        const isOnTime = Math.random() > 0.3; // 70% on-time
        const isPaid = month < 7 || Math.random() > 0.2; // Most past payments are paid

        let status = 'Pending';
        let paymentDate = null;
        let amountPaid = 0;

        if (isPaid) {
          status = 'Paid';
          paymentDate = isOnTime ? new Date(dueDate.getTime() - 1 * 24 * 60 * 60 * 1000) : new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000);
          amountPaid = 5000;
        } else if (new Date() > dueDate) {
          status = 'Overdue';
        }

        const payment = await Payment.create({
          chitGroup: chitGroup1._id,
          member: member._id,
          installmentMonth: month,
          amountDue: 5000,
          amountPaid,
          dueDate,
          paymentDate,
          status,
          paymentMethod: isPaid ? ['Cash', 'UPI', 'Bank Transfer'][Math.floor(Math.random() * 3)] : null,
          transactionRef: isPaid ? `TXN${Date.now()}${memberIdx}` : null,
          isOnTime,
          delayDays: !isOnTime && isPaid ? 2 : 0,
          recordedBy: isPaid ? admin._id : null
        });
        paymentCount++;
      }
    }
    console.log(`✅ Created ${paymentCount} payments`.green);

    // Create Member Rankings
    console.log('\n🏆 Creating member rankings...'.cyan);
    for (let i = 0; i < 20; i++) {
      const member = members[i];
      const onTimePayments = Math.floor(Math.random() * 5) + 3;
      const delayedPayments = Math.floor(Math.random() * 3);
      const totalPayments = onTimePayments + delayedPayments;
      const onTimePercentage = (onTimePayments / totalPayments) * 100;

      let rankCategory = 'Poor';
      if (onTimePercentage >= 86) rankCategory = 'Excellent';
      else if (onTimePercentage >= 71) rankCategory = 'Good';
      else if (onTimePercentage >= 51) rankCategory = 'Average';

      await MemberRanking.create({
        chitGroup: chitGroup1._id,
        member: member._id,
        rank: i + 1,
        rankCategory,
        rankingScore: onTimePercentage,
        onTimePayments,
        delayedPayments,
        totalPayments,
        onTimePercentage,
        avgDelayDays: delayedPayments > 0 ? Math.floor(Math.random() * 5) + 1 : 0,
        lastUpdated: new Date()
      });
    }
    console.log(`✅ Created rankings for 20 members`.green);

    // Create Notifications
    console.log('\n🔔 Creating notifications...'.cyan);
    const notificationTypes = [
      { type: 'auction', title: 'Auction Scheduled', message: 'Monthly auction scheduled for 5 days from now' },
      { type: 'payment', title: 'Payment Due', message: 'Your monthly payment of ₹5,000 is due in 3 days' },
      { type: 'dividend', title: 'Dividend Credited', message: 'Dividend of ₹250 has been credited to your account' },
      { type: 'winner', title: 'Auction Winner', message: 'Congratulations! You won the auction with bid of ₹6,500' },
      { type: 'reminder', title: 'Payment Reminder', message: 'Reminder: Payment due tomorrow' }
    ];

    for (let i = 0; i < 10; i++) {
      const member = members[i];
      const notif = notificationTypes[i % notificationTypes.length];

      await Notification.create({
        user: member._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: Math.random() > 0.5,
        data: { chitGroup: chitGroup1.name, amount: 5000 },
        sentVia: ['app'],
        status: 'Delivered'
      });
    }
    console.log(`✅ Created 10 notifications`.green);

    // Create Audit Logs
    console.log('\n📝 Creating audit logs...'.cyan);
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'];
    const entities = ['ChitGroup', 'Member', 'Payment', 'Auction'];

    for (let i = 0; i < 30; i++) {
      await AuditLog.create({
        user: i % 2 === 0 ? admin._id : members[i % 20]._id,
        action: actions[Math.floor(Math.random() * actions.length)],
        entity: entities[Math.floor(Math.random() * entities.length)],
        entityId: mongoose.Types.ObjectId(),
        description: `Sample audit log entry ${i + 1}`,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      });
    }
    console.log(`✅ Created 30 audit logs`.green);

    // Summary
    console.log('\n' + '='.repeat(60).green.bold);
    console.log('🎉 COMPREHENSIVE DATABASE SEEDED SUCCESSFULLY! 🎉'.green.bold);
    console.log('='.repeat(60).green.bold);
    console.log('\n📊 Summary:'.cyan.bold);
    console.log(`  👤 Users: 21 (1 Admin + 20 Members)`.white);
    console.log(`  📋 Chit Groups: 3 (2 Active + 1 InProgress)`.white);
    console.log(`  🔨 Auctions: 8 (7 Closed + 1 Scheduled)`.white);
    console.log(`  💰 Payments: ${paymentCount}`.white);
    console.log(`  🏆 Member Rankings: 20`.white);
    console.log(`  🔔 Notifications: 10`.white);
    console.log(`  📝 Audit Logs: 30`.white);

    console.log('\n🔑 Login Credentials:'.yellow.bold);
    console.log('  Admin:'.cyan);
    console.log('    Email: admin@chitfund.com'.white);
    console.log('    Password: admin123'.white);
    console.log('\n  Members (all use password: member123):'.cyan);
    console.log('    member1@example.com to member20@example.com'.white);

    console.log('\n✨ Features Ready to Explore:'.yellow.bold);
    console.log('  ✅ Multiple chit groups in different statuses'.white);
    console.log('  ✅ Completed & scheduled auctions'.white);
    console.log('  ✅ Payment history (paid, pending, overdue)'.white);
    console.log('  ✅ Member rankings & scores'.white);
    console.log('  ✅ Notifications & alerts'.white);
    console.log('  ✅ Comprehensive reports'.white);
    console.log('  ✅ Audit trail'.white);

    console.log('\n' + '='.repeat(60).green.bold + '\n');

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red.bold);
    console.error(error);
    process.exit(1);
  }
};

comprehensiveSeed();
