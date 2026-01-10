/**
 * Script to investigate the root cause of missing payment records
 */

require('dotenv').config();
const mongoose = require('mongoose');
const colors = require('colors');
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
const Auction = require('../models/Auction');

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

// Investigate root cause
const investigateRootCause = async () => {
  try {
    console.log('\n' + '='.repeat(80).cyan);
    console.log('🔍 Investigating Root Cause of Missing Payment Records'.yellow.bold);
    console.log('='.repeat(80).cyan + '\n');

    // Find test2 chit group
    const chitGroup = await ChitGroup.findOne({ name: /test2/i }).populate('members.memberId');

    if (!chitGroup) {
      console.log('❌ test2 chit group not found!'.red);
      return;
    }

    console.log(`✅ Chit Group: ${chitGroup.name}`.green);
    console.log(`   Total Members: ${chitGroup.totalMembers}`);
    console.log(`   Members in Array: ${chitGroup.members.length}\n`);

    // Find the closed auction
    const auction = await Auction.findOne({
      chitGroupId: chitGroup._id,
      status: 'Closed'
    });

    if (!auction) {
      console.log('❌ No closed auction found!'.red);
      return;
    }

    console.log(`✅ Auction #${auction.auctionNumber}`.green);
    console.log(`   Status: ${auction.status}`);
    console.log(`   Winner: ${auction.winnerName}`);
    console.log(`   Winner ID: ${auction.winnerId}\n`);

    console.log(`📊 Eligible Members Data:`.yellow);
    console.log(`   eligibleMembers (count): ${auction.eligibleMembers}`);
    console.log(`   eligibleMembersList (array length): ${auction.eligibleMembersList?.length || 0}\n`);

    if (auction.eligibleMembersList && auction.eligibleMembersList.length > 0) {
      console.log(`   Eligible Members List (${auction.eligibleMembersList.length}):`);
      auction.eligibleMembersList.forEach((memberId, index) => {
        const member = chitGroup.members.find(m => m.memberId._id.toString() === memberId.toString());
        console.log(`      ${index + 1}. ${member ? member.memberId.name : 'Unknown'} (${memberId})`);
      });
    } else {
      console.log(`   ⚠️  eligibleMembersList is empty or undefined!`.red.bold);
    }

    console.log('\n' + '─'.repeat(80).gray);
    console.log(`📋 Manually Excluded Members:`.yellow);
    if (auction.manuallyExcludedMembers && auction.manuallyExcludedMembers.length > 0) {
      console.log(`   Count: ${auction.manuallyExcludedMembers.length}`);
      auction.manuallyExcludedMembers.forEach((excluded, index) => {
        console.log(`      ${index + 1}. ${excluded.memberName} - Reason: ${excluded.reason}`);
      });
    } else {
      console.log(`   None`);
    }

    console.log('\n' + '─'.repeat(80).gray);
    console.log(`📋 All Chit Group Members:`.yellow);
    console.log(`   Total: ${chitGroup.members.length}\n`);
    chitGroup.members.forEach((member, index) => {
      const isWinner = member.memberId._id.toString() === auction.winnerId.toString();
      const wasExcluded = auction.manuallyExcludedMembers?.some(
        ex => ex.memberId.toString() === member.memberId._id.toString()
      );
      const wasEligible = auction.eligibleMembersList?.some(
        id => id.toString() === member.memberId._id.toString()
      );

      console.log(`   ${index + 1}. ${member.memberId.name}`.cyan);
      console.log(`      Previous Winner: ${member.hasWon ? 'Yes (Auction #' + member.wonInAuction + ')' : 'No'}`);
      console.log(`      Current Winner: ${isWinner ? 'YES' : 'No'}`);
      console.log(`      Manually Excluded: ${wasExcluded ? 'YES' : 'No'}`);
      console.log(`      Was in Eligible List: ${wasEligible ? 'YES' : 'NO'}`);
    });

    console.log('\n' + '='.repeat(80).cyan);
    console.log('🔍 Root Cause Analysis:'.yellow.bold);
    console.log('='.repeat(80).cyan);

    if (!auction.eligibleMembersList || auction.eligibleMembersList.length === 0) {
      console.log(`\n❌ ROOT CAUSE FOUND:`.red.bold);
      console.log(`   The auction's eligibleMembersList array is empty or undefined!`.red);
      console.log(`   This means when the auction was closed, no members were marked as eligible.`.red);
      console.log(`   Payment records are only created for members in the eligibleMembersList.`.red);
    } else if (auction.eligibleMembersList.length < chitGroup.members.length - 1) {
      console.log(`\n❌ ROOT CAUSE FOUND:`.red.bold);
      console.log(`   The auction's eligibleMembersList only has ${auction.eligibleMembersList.length} members.`.red);
      console.log(`   It should have ${chitGroup.members.length - 1} members (total - winner).`.red);
      console.log(`   Some members were not added to the eligible list when the auction was created/started.`.red);
    } else {
      console.log(`\n✅ Eligible list looks correct (${auction.eligibleMembersList.length} members).`.green);
      console.log(`   The issue may be elsewhere in the payment creation logic.`.yellow);
    }

    console.log('\n');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red.bold);
    console.error(error.stack);
    process.exit(1);
  }
};

// Main execution
const run = async () => {
  await connectDB();
  await investigateRootCause();
  process.exit(0);
};

run();
