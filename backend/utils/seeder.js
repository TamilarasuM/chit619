const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');

// Load env vars from root directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Load models
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
});

// Helper function to get random date in range
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...'.yellow);
    await User.deleteMany();
    await ChitGroup.deleteMany();
    await Auction.deleteMany();
    await Payment.deleteMany();
    console.log('Data cleared'.red);

    // Create Admin User
    console.log('\nCreating admin user...'.cyan);
    const admin = await User.create({
      name: 'Admin User',
      phone: '9942891022',
      email: 'admin@chitfund.com',
      password: 'admin123',
      role: 'admin',
      language: 'en',
      status: 'active'
    });
    console.log(`Admin created: ${admin.name} (${admin.phone})`.green);

    // Create Member Users (20 members)
    console.log('\nCreating member users...'.cyan);
    const memberData = [
      { name: 'Rajesh Kumar', phone: '9876543211', email: 'rajesh@example.com', language: 'en' },
      { name: 'Priya Sharma', phone: '9876543212', email: 'priya@example.com', language: 'ta' },
      { name: 'Suresh Rajan', phone: '9876543213', email: 'suresh@example.com', language: 'en' },
      { name: 'Lakshmi Devi', phone: '9876543214', email: 'lakshmi@example.com', language: 'ta' },
      { name: 'Karthik Subramanian', phone: '9876543215', email: 'karthik@example.com', language: 'en' },
      { name: 'Anita Iyer', phone: '9876543216', email: 'anita@example.com', language: 'ta' },
      { name: 'Vijay Ramesh', phone: '9876543217', email: 'vijay@example.com', language: 'en' },
      { name: 'Deepa Krishnan', phone: '9876543218', email: 'deepa@example.com', language: 'ta' },
      { name: 'Manoj Patel', phone: '9876543219', email: 'manoj@example.com', language: 'en' },
      { name: 'Kavitha Menon', phone: '9876543220', email: 'kavitha@example.com', language: 'ta' },
      { name: 'Arun Nair', phone: '9876543221', email: 'arun@example.com', language: 'en' },
      { name: 'Radha Balaji', phone: '9876543222', email: 'radha@example.com', language: 'ta' },
      { name: 'Sandeep Reddy', phone: '9876543223', email: 'sandeep@example.com', language: 'en' },
      { name: 'Meena Sundaram', phone: '9876543224', email: 'meena@example.com', language: 'ta' },
      { name: 'Prakash Murthy', phone: '9876543225', email: 'prakash@example.com', language: 'en' },
      { name: 'Sowmya Rao', phone: '9876543226', email: 'sowmya@example.com', language: 'ta' },
      { name: 'Ramesh Chandra', phone: '9876543227', email: 'rameshc@example.com', language: 'en' },
      { name: 'Geetha Pillai', phone: '9876543228', email: 'geetha@example.com', language: 'ta' },
      { name: 'Naveen Kumar', phone: '9876543229', email: 'naveen@example.com', language: 'en' },
      { name: 'Divya Shankar', phone: '9876543230', email: 'divya@example.com', language: 'ta' }
    ];

    const members = [];
    for (const data of memberData) {
      const member = await User.create({
        ...data,
        password: 'member123',
        role: 'member',
        status: 'active',
        createdBy: admin._id
      });
      members.push(member);
      console.log(`Member created: ${member.name} (${member.phone})`.green);
    }

    // Create Chit Group 1 - Active with several completed auctions
    console.log('\nCreating chit group 1 (Active)...'.cyan);
    const chitGroup1Members = members.slice(0, 10);
    const chitGroup1 = await ChitGroup.create({
      name: 'Monthly Chit Jan 2025',
      chitAmount: 100000,
      totalMembers: 10,
      duration: 10,
      commissionAmount: 5000,
      winnerPaymentModel: 'A',
      gracePeriodDays: 3,
      monthlyContribution: 10000,
      auctionFrequency: 1,
      status: 'Active',
      startDate: new Date('2025-01-01'),
      completedAuctions: 3,
      members: chitGroup1Members.map((m, idx) => ({
        memberId: m._id,
        memberName: m.name,
        joinedDate: new Date('2025-01-01'),
        hasWon: idx < 3,
        wonInAuction: idx < 3 ? idx + 1 : null
      })),
      winners: chitGroup1Members.slice(0, 3).map(m => m._id),
      createdBy: admin._id,
      notes: 'First chit group of 2025'
    });
    console.log(`Chit Group created: ${chitGroup1.name}`.green);

    // Update users with chit group reference
    await User.updateMany(
      { _id: { $in: chitGroup1Members.map(m => m._id) } },
      { $push: { chitGroups: chitGroup1._id } }
    );

    // Create Auctions for Chit Group 1
    console.log('Creating auctions for Chit Group 1...'.cyan);
    const auctions1 = [];

    // Auction 1 - Closed
    const auction1_1 = await Auction.create({
      chitGroupId: chitGroup1._id,
      chitGroupName: chitGroup1.name,
      auctionNumber: 1,
      scheduledDate: new Date('2025-01-05'),
      scheduledTime: '10:00',
      startedAt: new Date('2025-01-05T10:00:00'),
      closedAt: new Date('2025-01-05T10:45:00'),
      status: 'Closed',
      startingBid: 1000,
      currentHighestBid: 8500,
      winningBid: 8500,
      winnerId: chitGroup1Members[0]._id,
      winnerName: chitGroup1Members[0].name,
      bids: [
        { memberId: chitGroup1Members[0]._id, memberName: chitGroup1Members[0].name, bidAmount: 8500, bidTime: new Date('2025-01-05T10:30:00') },
        { memberId: chitGroup1Members[1]._id, memberName: chitGroup1Members[1].name, bidAmount: 6000, bidTime: new Date('2025-01-05T10:15:00') },
        { memberId: chitGroup1Members[2]._id, memberName: chitGroup1Members[2].name, bidAmount: 4500, bidTime: new Date('2025-01-05T10:10:00') }
      ],
      autoExcludedMembers: [],
      manualExcludedMembers: [],
      eligibleMembers: 10,
      totalBids: 3,
      participationRate: 30,
      dividendPerMember: 388,
      totalDividend: 3500,
      commissionCollected: 5000,
      createdBy: admin._id,
      startedBy: admin._id,
      closedBy: admin._id
    });
    auctions1.push(auction1_1);

    // Auction 2 - Closed
    const auction1_2 = await Auction.create({
      chitGroupId: chitGroup1._id,
      chitGroupName: chitGroup1.name,
      auctionNumber: 2,
      scheduledDate: new Date('2025-02-05'),
      scheduledTime: '10:00',
      startedAt: new Date('2025-02-05T10:00:00'),
      closedAt: new Date('2025-02-05T10:50:00'),
      status: 'Closed',
      startingBid: 1000,
      currentHighestBid: 9200,
      winningBid: 9200,
      winnerId: chitGroup1Members[1]._id,
      winnerName: chitGroup1Members[1].name,
      bids: [
        { memberId: chitGroup1Members[1]._id, memberName: chitGroup1Members[1].name, bidAmount: 9200, bidTime: new Date('2025-02-05T10:35:00') },
        { memberId: chitGroup1Members[3]._id, memberName: chitGroup1Members[3].name, bidAmount: 7800, bidTime: new Date('2025-02-05T10:20:00') },
        { memberId: chitGroup1Members[4]._id, memberName: chitGroup1Members[4].name, bidAmount: 5500, bidTime: new Date('2025-02-05T10:12:00') },
        { memberId: chitGroup1Members[5]._id, memberName: chitGroup1Members[5].name, bidAmount: 3000, bidTime: new Date('2025-02-05T10:05:00') }
      ],
      autoExcludedMembers: [chitGroup1Members[0]._id],
      manualExcludedMembers: [],
      eligibleMembers: 9,
      totalBids: 4,
      participationRate: 44,
      dividendPerMember: 525,
      totalDividend: 4200,
      commissionCollected: 5000,
      createdBy: admin._id,
      startedBy: admin._id,
      closedBy: admin._id
    });
    auctions1.push(auction1_2);

    // Auction 3 - Closed
    const auction1_3 = await Auction.create({
      chitGroupId: chitGroup1._id,
      chitGroupName: chitGroup1.name,
      auctionNumber: 3,
      scheduledDate: new Date('2025-03-05'),
      scheduledTime: '10:00',
      startedAt: new Date('2025-03-05T10:00:00'),
      closedAt: new Date('2025-03-05T10:40:00'),
      status: 'Closed',
      startingBid: 1000,
      currentHighestBid: 7500,
      winningBid: 7500,
      winnerId: chitGroup1Members[2]._id,
      winnerName: chitGroup1Members[2].name,
      bids: [
        { memberId: chitGroup1Members[2]._id, memberName: chitGroup1Members[2].name, bidAmount: 7500, bidTime: new Date('2025-03-05T10:25:00') },
        { memberId: chitGroup1Members[6]._id, memberName: chitGroup1Members[6].name, bidAmount: 6200, bidTime: new Date('2025-03-05T10:18:00') },
        { memberId: chitGroup1Members[7]._id, memberName: chitGroup1Members[7].name, bidAmount: 4800, bidTime: new Date('2025-03-05T10:08:00') }
      ],
      autoExcludedMembers: [chitGroup1Members[0]._id, chitGroup1Members[1]._id],
      manualExcludedMembers: [],
      eligibleMembers: 8,
      totalBids: 3,
      participationRate: 37,
      dividendPerMember: 357,
      totalDividend: 2500,
      commissionCollected: 5000,
      createdBy: admin._id,
      startedBy: admin._id,
      closedBy: admin._id
    });
    auctions1.push(auction1_3);

    // Auction 4 - Scheduled (upcoming)
    const auction1_4 = await Auction.create({
      chitGroupId: chitGroup1._id,
      chitGroupName: chitGroup1.name,
      auctionNumber: 4,
      scheduledDate: new Date('2025-04-05'),
      scheduledTime: '10:00',
      status: 'Scheduled',
      startingBid: 1000,
      currentHighestBid: 0,
      bids: [],
      autoExcludedMembers: [chitGroup1Members[0]._id, chitGroup1Members[1]._id, chitGroup1Members[2]._id],
      manualExcludedMembers: [],
      eligibleMembers: 7,
      totalBids: 0,
      participationRate: 0,
      createdBy: admin._id
    });
    auctions1.push(auction1_4);

    console.log(`Created ${auctions1.length} auctions for Chit Group 1`.green);

    // Create Payment records for Chit Group 1
    console.log('Creating payment records for Chit Group 1...'.cyan);
    const payments1 = [];

    for (let auctionNum = 1; auctionNum <= 3; auctionNum++) {
      const auction = auctions1[auctionNum - 1];
      const dueDate = new Date(auction.scheduledDate);
      dueDate.setDate(dueDate.getDate() + 5);

      for (let i = 0; i < chitGroup1Members.length; i++) {
        const member = chitGroup1Members[i];
        const isWinner = auction.winnerId && auction.winnerId.toString() === member._id.toString();

        const payment = await Payment.create({
          chitGroupId: chitGroup1._id,
          memberId: member._id,
          memberName: member.name,
          auctionNumber: auctionNum,
          dueDate: dueDate,
          baseAmount: chitGroup1.monthlyContribution,
          dividendReceived: isWinner ? 0 : auction.dividendPerMember,
          dueAmount: isWinner ? 0 : (chitGroup1.monthlyContribution - auction.dividendPerMember),
          paidAmount: isWinner ? 0 : (chitGroup1.monthlyContribution - auction.dividendPerMember),
          outstandingBalance: 0,
          paymentStatus: 'Paid',
          paidDate: getRandomDate(dueDate, new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000)),
          isOnTime: true,
          gracePeriodDays: chitGroup1.gracePeriodDays,
          gracePeriodUsed: false,
          delayDays: 0,
          isWinner: isWinner,
          commissionAmount: isWinner ? chitGroup1.commissionAmount : 0,
          amountReceived: isWinner ? (chitGroup1.chitAmount - chitGroup1.commissionAmount - auction.winningBid) : 0,
          paymentMethod: 'UPI',
          recordedBy: admin._id
        });
        payments1.push(payment);
      }
    }
    console.log(`Created ${payments1.length} payment records for Chit Group 1`.green);

    // Create Chit Group 2 - Active, recently started
    console.log('\nCreating chit group 2 (Active)...'.cyan);
    const chitGroup2Members = members.slice(5, 15);
    const chitGroup2 = await ChitGroup.create({
      name: 'Quarterly Chit Dec 2024',
      chitAmount: 200000,
      totalMembers: 10,
      duration: 10,
      commissionAmount: 8000,
      winnerPaymentModel: 'B',
      gracePeriodDays: 5,
      monthlyContribution: 20000,
      auctionFrequency: 3,
      status: 'Active',
      startDate: new Date('2024-12-01'),
      completedAuctions: 1,
      members: chitGroup2Members.map((m, idx) => ({
        memberId: m._id,
        memberName: m.name,
        joinedDate: new Date('2024-12-01'),
        hasWon: idx === 0,
        wonInAuction: idx === 0 ? 1 : null
      })),
      winners: [chitGroup2Members[0]._id],
      createdBy: admin._id,
      notes: 'Quarterly auction chit'
    });
    console.log(`Chit Group created: ${chitGroup2.name}`.green);

    await User.updateMany(
      { _id: { $in: chitGroup2Members.map(m => m._id) } },
      { $push: { chitGroups: chitGroup2._id } }
    );

    // Create 1 closed auction for Chit Group 2
    const auction2_1 = await Auction.create({
      chitGroupId: chitGroup2._id,
      chitGroupName: chitGroup2.name,
      auctionNumber: 1,
      scheduledDate: new Date('2024-12-10'),
      scheduledTime: '14:00',
      startedAt: new Date('2024-12-10T14:00:00'),
      closedAt: new Date('2024-12-10T15:00:00'),
      status: 'Closed',
      startingBid: 2000,
      currentHighestBid: 15000,
      winningBid: 15000,
      winnerId: chitGroup2Members[0]._id,
      winnerName: chitGroup2Members[0].name,
      bids: [
        { memberId: chitGroup2Members[0]._id, memberName: chitGroup2Members[0].name, bidAmount: 15000, bidTime: new Date('2024-12-10T14:40:00') },
        { memberId: chitGroup2Members[2]._id, memberName: chitGroup2Members[2].name, bidAmount: 12000, bidTime: new Date('2024-12-10T14:25:00') },
        { memberId: chitGroup2Members[4]._id, memberName: chitGroup2Members[4].name, bidAmount: 9000, bidTime: new Date('2024-12-10T14:15:00') }
      ],
      autoExcludedMembers: [],
      manualExcludedMembers: [],
      eligibleMembers: 10,
      totalBids: 3,
      participationRate: 30,
      dividendPerMember: 777,
      totalDividend: 7000,
      commissionCollected: 8000,
      createdBy: admin._id,
      startedBy: admin._id,
      closedBy: admin._id
    });
    console.log(`Created 1 auction for Chit Group 2`.green);

    // Create Chit Group 3 - InProgress (not yet started)
    console.log('\nCreating chit group 3 (InProgress)...'.cyan);
    const chitGroup3Members = members.slice(10, 20);
    const chitGroup3 = await ChitGroup.create({
      name: 'Bi-Monthly Chit Feb 2025',
      chitAmount: 150000,
      totalMembers: 10,
      duration: 10,
      commissionAmount: 6000,
      winnerPaymentModel: 'A',
      gracePeriodDays: 3,
      monthlyContribution: 15000,
      auctionFrequency: 2,
      status: 'InProgress',
      completedAuctions: 0,
      members: chitGroup3Members.map(m => ({
        memberId: m._id,
        memberName: m.name,
        joinedDate: new Date('2025-01-10'),
        hasWon: false,
        wonInAuction: null
      })),
      winners: [],
      createdBy: admin._id,
      notes: 'Upcoming bi-monthly chit'
    });
    console.log(`Chit Group created: ${chitGroup3.name}`.green);

    await User.updateMany(
      { _id: { $in: chitGroup3Members.map(m => m._id) } },
      { $push: { chitGroups: chitGroup3._id } }
    );

    // Summary
    console.log('\n========== DATABASE SEEDED SUCCESSFULLY =========='.green.bold);
    console.log(`Total Users: ${members.length + 1} (1 Admin + ${members.length} Members)`.cyan);
    console.log(`Total Chit Groups: 3`.cyan);
    console.log(`Total Auctions: 5 (4 for Group 1, 1 for Group 2)`.cyan);
    console.log(`Total Payment Records: ${payments1.length}`.cyan);
    console.log('\nChit Groups:'.yellow.bold);
    console.log(`1. ${chitGroup1.name} - Active (${chitGroup1.completedAuctions}/${chitGroup1.duration} auctions)`.white);
    console.log(`2. ${chitGroup2.name} - Active (${chitGroup2.completedAuctions}/${chitGroup2.duration} auctions)`.white);
    console.log(`3. ${chitGroup3.name} - InProgress (Not started)`.white);
    console.log('\nTest Credentials:'.yellow.bold);
    console.log('Admin: 9942891022 / admin123'.white);
    members.forEach(m => {
      console.log(`Member: ${m.phone} / member123`.white);
    });
    console.log('===================================================\n'.green.bold);

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    console.error(error);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    console.log('Deleting all data...'.red);
    await User.deleteMany();
    await ChitGroup.deleteMany();
    console.log('Data Destroyed'.red.bold);
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Run based on command line argument
if (process.argv[2] === '-d') {
  deleteData();
} else {
  seedData();
}
