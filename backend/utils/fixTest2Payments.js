/**
 * Script to fix missing payment records for test2 chit group
 */

require('dotenv').config();
const mongoose = require('mongoose');
const colors = require('colors');
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Fix test2 missing payments
const fixTest2Payments = async () => {
  try {
    console.log('\n' + '='.repeat(80).cyan);
    console.log('🔧 Fixing Missing Payment Records for test2 Chit Group'.yellow.bold);
    console.log('='.repeat(80).cyan + '\n');

    // Find test2 chit group
    const chitGroup = await ChitGroup.findOne({ name: /test2/i }).populate('members.memberId');

    if (!chitGroup) {
      console.log('❌ test2 chit group not found!'.red);
      return;
    }

    console.log(`✅ Found Chit Group: ${chitGroup.name}`.green);
    console.log(`   Total Members: ${chitGroup.totalMembers}\n`);

    // Find the closed auction
    const auction = await Auction.findOne({
      chitGroupId: chitGroup._id,
      status: 'Closed'
    });

    if (!auction) {
      console.log('❌ No closed auction found!'.red);
      return;
    }

    console.log(`✅ Found Auction #${auction.auctionNumber}`.green);
    console.log(`   Dividend per Member: ₹${auction.dividendPerMember}\n`);

    // Get existing payment records
    const existingPayments = await Payment.find({
      chitGroupId: chitGroup._id,
      auctionNumber: auction.auctionNumber
    });

    const paymentMemberIds = existingPayments.map(p => p.memberId.toString());

    // Find missing members
    const missingMembers = chitGroup.members.filter(m =>
      !paymentMemberIds.includes(m.memberId._id.toString())
    );

    console.log(`⚠️  Found ${missingMembers.length} members without payment records`.yellow);

    if (missingMembers.length === 0) {
      console.log('✅ All members already have payment records!'.green);
      return;
    }

    // Create payment records for missing members
    const newPayments = [];
    for (const member of missingMembers) {
      const isPreviousWinner = member.hasWon && member.wonInAuction < auction.auctionNumber;

      let dividendReceived = 0;
      let dueAmount = 0;

      if (chitGroup.winnerPaymentModel === 'A' && isPreviousWinner) {
        // Model A: Previous winners pay full, no dividend
        dividendReceived = 0;
        dueAmount = chitGroup.monthlyContribution;
      } else {
        // Non-winner or Model B: Gets dividend
        dividendReceived = auction.dividendPerMember;
        dueAmount = chitGroup.monthlyContribution - dividendReceived;
      }

      const payment = {
        chitGroupId: chitGroup._id,
        memberId: member.memberId._id,
        memberName: member.memberId.name,
        auctionNumber: auction.auctionNumber,
        dueDate: new Date(auction.closedAt),
        baseAmount: chitGroup.monthlyContribution,
        dividendReceived,
        dueAmount,
        paidAmount: 0,
        outstandingBalance: dueAmount,
        paymentStatus: 'Pending',
        isOnTime: false,
        gracePeriodDays: chitGroup.gracePeriodDays,
        gracePeriodUsed: false,
        delayDays: 0,
        isWinner: false,
        isCommissionPayment: false,
        commissionAmount: 0,
        paymentMethod: null
      };

      newPayments.push(payment);

      console.log(`   ✅ Creating payment for: ${member.memberId.name}`.green);
      console.log(`      Dividend: ₹${dividendReceived}`);
      console.log(`      Due Amount: ₹${dueAmount}`);
    }

    // Insert the new payment records
    if (newPayments.length > 0) {
      await Payment.insertMany(newPayments);
      console.log(`\n✅ Successfully created ${newPayments.length} payment records!`.green.bold);
    }

    console.log('\n' + '='.repeat(80).cyan);
    console.log('✅ Fix Complete!'.green.bold);
    console.log('='.repeat(80).cyan + '\n');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red.bold);
    console.error(error.stack);
    process.exit(1);
  }
};

// Main execution
const run = async () => {
  await connectDB();
  await fixTest2Payments();
  process.exit(0);
};

run();
