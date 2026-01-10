/**
 * Diagnostic script to check dividend calculation issues in test2 chit group
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

// Check test2 dividends
const checkTest2Dividends = async () => {
  try {
    console.log('\n' + '='.repeat(80).cyan);
    console.log('🔍 Checking Dividend Issues in test2 Chit Group'.yellow.bold);
    console.log('='.repeat(80).cyan + '\n');

    // Find test2 chit group
    const chitGroup = await ChitGroup.findOne({ name: /test2/i }).populate('members.memberId');

    if (!chitGroup) {
      console.log('❌ test2 chit group not found!'.red);
      return;
    }

    console.log(`✅ Found Chit Group: ${chitGroup.name}`.green);
    console.log(`   Total Members: ${chitGroup.totalMembers}`);
    console.log(`   Monthly Contribution: ₹${chitGroup.monthlyContribution}`);
    console.log(`   Commission: ₹${chitGroup.commissionAmount}`);
    console.log(`   Payment Model: ${chitGroup.winnerPaymentModel}\n`);

    // Find all closed auctions for this chit group
    const auctions = await Auction.find({
      chitGroupId: chitGroup._id,
      status: 'Closed'
    }).sort({ auctionNumber: 1 });

    console.log(`📋 Found ${auctions.length} closed auction(s)\n`.cyan);

    for (const auction of auctions) {
      console.log(`\n${'─'.repeat(80)}`.gray);
      console.log(`🏆 Auction #${auction.auctionNumber}`.yellow.bold);
      console.log(`   Winner: ${auction.winnerName}`);
      console.log(`   Winning Bid: ₹${auction.winningBid}`);
      console.log(`   Total Dividend: ₹${auction.totalDividend}`);
      console.log(`   Dividend per Member: ₹${auction.dividendPerMember}`);
      console.log(`   Eligible Members: ${auction.eligibleMembers}`);

      // Get payment records for this auction
      const payments = await Payment.find({
        chitGroupId: chitGroup._id,
        auctionNumber: auction.auctionNumber
      }).populate('memberId', 'name');

      console.log(`\n   📊 Payment Records (${payments.length} of ${chitGroup.totalMembers} members):\n`);

      // Check which members are missing payment records
      const paymentMemberIds = payments.map(p => p.memberId._id.toString());
      const allMemberIds = chitGroup.members.map(m => m.memberId._id.toString());
      const missingMembers = chitGroup.members.filter(m =>
        !paymentMemberIds.includes(m.memberId._id.toString())
      );

      if (missingMembers.length > 0) {
        console.log(`   ⚠️  MISSING PAYMENT RECORDS (${missingMembers.length}):`.red.bold);
        missingMembers.forEach(m => {
          console.log(`      • ${m.memberId.name}`.red);
        });
        console.log('');
      }

      // Separate winners and non-winners
      const winner = payments.find(p => p.isWinner);
      const nonWinners = payments.filter(p => !p.isWinner);

      // Check for issues
      const issuesFound = [];
      const correctDividends = [];
      const incorrectDividends = [];

      nonWinners.forEach(payment => {
        const expectedDividend = auction.dividendPerMember;
        if (payment.dividendReceived !== expectedDividend) {
          issuesFound.push({
            member: payment.memberId.name,
            expected: expectedDividend,
            actual: payment.dividendReceived,
            dueAmount: payment.dueAmount,
            expectedDueAmount: chitGroup.monthlyContribution - expectedDividend
          });
          incorrectDividends.push(payment.memberId.name);
        } else {
          correctDividends.push(payment.memberId.name);
        }
      });

      if (winner) {
        console.log(`   🏆 Winner: ${winner.memberId.name}`.green);
        console.log(`      Dividend: ₹${winner.dividendReceived} (should be 0)`);
        console.log(`      Due Amount: ₹${winner.dueAmount} (should be 0)`);
      }

      console.log(`\n   ✅ Correct Dividends (${correctDividends.length}):`.green);
      correctDividends.forEach(name => console.log(`      • ${name}`.green));

      if (incorrectDividends.length > 0) {
        console.log(`\n   ❌ Incorrect Dividends (${incorrectDividends.length}):`.red.bold);
        issuesFound.forEach(issue => {
          console.log(`      • ${issue.member}:`.red);
          console.log(`        Expected Dividend: ₹${issue.expected}`.gray);
          console.log(`        Actual Dividend: ₹${issue.actual}`.red);
          console.log(`        Expected Due: ₹${issue.expectedDueAmount}`.gray);
          console.log(`        Actual Due: ₹${issue.dueAmount}`.red);
        });
      } else {
        console.log(`\n   ✅ All dividends are correct!`.green.bold);
      }
    }

    console.log('\n' + '='.repeat(80).cyan);
    console.log('✅ Diagnostic Complete!'.green.bold);
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
  await checkTest2Dividends();
  process.exit(0);
};

run();
