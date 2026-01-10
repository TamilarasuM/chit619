/**
 * Script to recalculate dividend and due amounts for existing payment records
 * This fixes payment records that were created with incorrect decimal calculations
 */

require('dotenv').config();
const mongoose = require('mongoose');
const colors = require('colors');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');
const ChitGroup = require('../models/ChitGroup');

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

// Recalculate all payment records
const recalculatePayments = async () => {
  try {
    console.log('🔄 Starting payment recalculation...'.yellow.bold);

    // Find all closed auctions
    const auctions = await Auction.find({ status: 'Closed' })
      .populate('chitGroupId')
      .sort({ auctionNumber: 1 });

    console.log(`Found ${auctions.length} closed auctions to process`.cyan);

    let totalAuctionsUpdated = 0;
    let totalPaymentsUpdated = 0;

    for (const auction of auctions) {
      console.log(`\n📋 Processing Auction #${auction.auctionNumber} (${auction._id})`.green);

      if (!auction.chitGroupId) {
        console.log(`  ⚠️  Skipping - ChitGroup not found`.yellow);
        continue;
      }

      const chitGroup = auction.chitGroupId;

      // Recalculate dividendPerMember with Math.floor()
      const oldDividendPerMember = auction.dividendPerMember;

      // Get dividend recipients (all members except winner)
      const dividendRecipients = chitGroup.members.filter(
        m => m.memberId.toString() !== auction.winnerId.toString()
      );

      const newDividendPerMember = dividendRecipients.length > 0
        ? Math.floor(auction.totalDividend / dividendRecipients.length)
        : 0;

      console.log(`  Old dividendPerMember: ${oldDividendPerMember}`.gray);
      console.log(`  New dividendPerMember: ${newDividendPerMember}`.green);

      // Update auction if dividend changed
      if (oldDividendPerMember !== newDividendPerMember) {
        auction.dividendPerMember = newDividendPerMember;
        await auction.save();
        totalAuctionsUpdated++;
        console.log(`  ✅ Auction updated`.green);
      } else {
        console.log(`  ℹ️  Auction already correct`.blue);
      }

      // Find and update all payment records for this auction
      const payments = await Payment.find({
        chitGroupId: chitGroup._id,
        auctionNumber: auction.auctionNumber
      });

      console.log(`  Found ${payments.length} payment records`.cyan);

      for (const payment of payments) {
        const isWinner = payment.memberId.toString() === auction.winnerId.toString();

        let newDividendReceived = 0;
        let newDueAmount = 0;

        if (isWinner) {
          // Winner doesn't receive dividend and doesn't pay monthly contribution
          newDividendReceived = 0;
          newDueAmount = 0;
        } else {
          // Check if this is a previous winner
          const memberInGroup = chitGroup.members.find(
            m => m.memberId.toString() === payment.memberId.toString()
          );

          const isPreviousWinner = memberInGroup && memberInGroup.hasWon &&
                                   memberInGroup.wonInAuction < auction.auctionNumber;

          if (chitGroup.winnerPaymentModel === 'A' && isPreviousWinner) {
            // Model A: Previous winners pay full, no dividend
            newDividendReceived = 0;
            newDueAmount = chitGroup.monthlyContribution;
          } else {
            // Model B or non-winner in Model A: Gets dividend
            newDividendReceived = newDividendPerMember;
            newDueAmount = chitGroup.monthlyContribution - newDividendReceived;
          }
        }

        // Update payment if values changed
        const dividendChanged = payment.dividendReceived !== newDividendReceived;
        const dueAmountChanged = payment.dueAmount !== newDueAmount;

        if (dividendChanged || dueAmountChanged) {
          const oldDividend = payment.dividendReceived;
          const oldDueAmount = payment.dueAmount;

          payment.dividendReceived = newDividendReceived;
          payment.dueAmount = newDueAmount;

          // Recalculate outstanding balance - handle overpayment case
          payment.outstandingBalance = Math.max(0, newDueAmount - payment.paidAmount);

          // Update payment status if needed
          if (payment.outstandingBalance === 0 && payment.paidAmount > 0) {
            payment.paymentStatus = 'Paid';
          } else if (payment.paidAmount > 0 && payment.paidAmount < newDueAmount) {
            payment.paymentStatus = 'Partial';
          }

          await payment.save();
          totalPaymentsUpdated++;

          console.log(`    ✅ Updated payment for ${payment.memberName}:`.green);
          console.log(`       Dividend: ${oldDividend} → ${newDividendReceived}`.gray);
          console.log(`       Due Amount: ${oldDueAmount} → ${newDueAmount}`.gray);
          console.log(`       Outstanding: ${payment.outstandingBalance}`.gray);
        }
      }
    }

    console.log('\n' + '='.repeat(60).cyan);
    console.log('✅ Recalculation Complete!'.green.bold);
    console.log(`📊 Auctions Updated: ${totalAuctionsUpdated}`.cyan);
    console.log(`📊 Payments Updated: ${totalPaymentsUpdated}`.cyan);
    console.log('='.repeat(60).cyan + '\n');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red.bold);
    console.error(error.stack);
    process.exit(1);
  }
};

// Main execution
const run = async () => {
  await connectDB();
  await recalculatePayments();
  process.exit(0);
};

run();
