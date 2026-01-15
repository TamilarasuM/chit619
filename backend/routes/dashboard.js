const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');
const { protect, isAdmin } = require('../middleware/auth');

// @desc    Get admin dashboard data
// @route   GET /api/dashboard/admin
// @access  Private/Admin
router.get('/admin', protect, isAdmin, async (req, res) => {
  try {
    // Get counts
    const totalMembers = await User.countDocuments({ role: 'member' });
    const activeMembers = await User.countDocuments({ role: 'member', status: 'active' });
    const suspendedMembers = await User.countDocuments({ role: 'member', status: 'suspended' });

    const totalChitGroups = await ChitGroup.countDocuments();
    const activeChitGroups = await ChitGroup.countDocuments({ status: 'Active' });
    const inProgressChitGroups = await ChitGroup.countDocuments({ status: 'InProgress' });
    const closedChitGroups = await ChitGroup.countDocuments({ status: 'Closed' });

    // Get active chit groups for financial calculations (use lean() to avoid population issues)
    let chitGroups = [];
    try {
      const rawChitGroups = await ChitGroup.find({ status: { $in: ['Active', 'InProgress'] } })
        .populate('members.memberId', 'name phone')
        .lean(); // Use lean() for performance and simpler error handling

      // Filter out chit groups with invalid member data
      chitGroups = rawChitGroups.map(chit => ({
        ...chit,
        members: (chit.members || []).filter(m => m && m.memberId && m.memberId._id)
      }));
    } catch (populateError) {
      console.error('Error populating chit groups:', populateError);
      // Fallback: get chit groups without population
      chitGroups = await ChitGroup.find({ status: { $in: ['Active', 'InProgress'] } }).lean();
      chitGroups = chitGroups.map(chit => ({ ...chit, members: [] }));
    }
    const totalChitAmount = chitGroups.reduce((sum, chit) => sum + chit.chitAmount, 0);

    // Calculate this month's collection (mock data for now - will be real in Phase 4)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let thisMonthCollection = 0;
    let totalCommission = 0;

    chitGroups.forEach(chit => {
      // Calculate expected monthly collection from this chit (only count valid members)
      const validMembers = chit.members ? chit.members.filter(m => m.memberId && m.memberId._id).length : 0;
      const monthlyFromChit = chit.monthlyContribution * validMembers;
      thisMonthCollection += monthlyFromChit;

      // Add commission from this chit
      totalCommission += chit.commissionAmount || 0;
    });

    // Get recent chit groups
    const recentChitGroups = await ChitGroup.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name')
      .select('name chitAmount totalMembers status completedAuctions duration members');

    // Get active chit groups for display
    const activeChitGroupsList = chitGroups.map(chit => ({
      _id: chit._id,
      name: chit.name,
      chitAmount: chit.chitAmount,
      totalMembers: chit.totalMembers,
      currentMembers: chit.members ? chit.members.filter(m => m.memberId && m.memberId._id).length : 0,
      status: chit.status,
      completedAuctions: chit.completedAuctions,
      duration: chit.duration,
      monthlyContribution: chit.monthlyContribution,
      winners: chit.winners || []
    }));

    // Get recent members
    const recentMembers = await User.find({ role: 'member' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name phone status createdAt');

    // Generate recent activity (mock data for now - will be real from AuditLog in Phase 10)
    const recentActivity = [];

    // Add recent member activities
    recentMembers.slice(0, 3).forEach(member => {
      recentActivity.push({
        message: `New member ${member.name} joined the system`,
        time: member.createdAt,
        type: 'member_created'
      });
    });

    // Add recent chit group activities
    recentChitGroups.slice(0, 2).forEach(chit => {
      recentActivity.push({
        message: `Chit group "${chit.name}" was created`,
        time: chit.createdAt,
        type: 'chit_created'
      });
    });

    // Sort by time, most recent first
    recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Generate mock pending payments data (will be real in Phase 4)
    const pendingPayments = [];
    chitGroups.forEach(chit => {
      if (chit.members.length > 0) {
        // Mock: First 2 members have pending payments
        chit.members.slice(0, 2).forEach(member => {
          // Only add if memberId is populated
          if (member.memberId && member.memberId._id) {
            pendingPayments.push({
              id: `${chit._id}_${member.memberId._id}`,
              memberName: member.memberId.name || member.memberName,
              chitGroup: chit.name,
              amount: chit.monthlyContribution,
              status: 'Pending',
              dueDate: new Date(new Date().setDate(new Date().getDate() + 3))
            });
          }
        });
      }
    });

    // Limit to 5 pending payments
    const limitedPendingPayments = pendingPayments.slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          activeChits: activeChitGroups + inProgressChitGroups,
          totalMembers,
          activeMembers,
          suspendedMembers,
          totalChitGroups,
          activeChitGroups,
          inProgressChitGroups,
          closedChitGroups,
          totalChitAmount,
          thisMonthCollection,
          totalCommission
        },
        recentChitGroups: recentChitGroups.map(chit => ({
          _id: chit._id,
          name: chit.name,
          chitAmount: chit.chitAmount,
          totalMembers: chit.totalMembers,
          currentMembers: chit.members ? chit.members.length : 0,
          status: chit.status,
          completedAuctions: chit.completedAuctions,
          duration: chit.duration,
          progressPercentage: Math.round((chit.completedAuctions / chit.duration) * 100),
          createdBy: chit.createdBy ? chit.createdBy.name : 'Unknown'
        })),
        recentMembers: recentMembers.map(member => ({
          _id: member._id,
          name: member.name,
          phone: member.phone,
          status: member.status,
          joinedDate: member.createdAt
        })),
        activeChitGroups: activeChitGroupsList,
        pendingPayments: limitedPendingPayments,
        recentActivity: recentActivity.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get member dashboard data
// @route   GET /api/dashboard/member
// @access  Private/Member
router.get('/member', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with chit groups
    const user = await User.findById(userId).populate('chitGroups');

    // Get chit groups where user is a member
    const memberChitGroups = await ChitGroup.find({
      'members.memberId': userId
    }).select('name chitAmount status completedAuctions duration members monthlyContribution');

    // Get chit group IDs for fetching related data
    const chitGroupIds = memberChitGroups.map(chit => chit._id);

    // Get last closed auction for each chit group
    const lastAuctions = await Auction.aggregate([
      {
        $match: {
          chitGroupId: { $in: chitGroupIds },
          status: 'Closed'
        }
      },
      {
        $sort: { auctionNumber: -1 }
      },
      {
        $group: {
          _id: '$chitGroupId',
          lastAuction: { $first: '$$ROOT' }
        }
      }
    ]);

    // Create a map of last auctions by chit group ID
    const lastAuctionMap = {};
    lastAuctions.forEach(item => {
      lastAuctionMap[item._id.toString()] = item.lastAuction;
    });

    // Get member's payment transactions
    const paymentTransactions = await Payment.find({
      memberId: userId,
      chitGroupId: { $in: chitGroupIds }
    })
      .populate('chitGroupId', 'name')
      .sort({ dueDate: -1 });

    // Format payment transactions
    const formattedTransactions = paymentTransactions.map(payment => ({
      id: payment._id,
      dueDate: payment.dueDate,
      chitGroupName: payment.chitGroupId?.name || 'Unknown',
      chitGroupId: payment.chitGroupId?._id,
      auctionNumber: payment.auctionNumber,
      baseAmount: payment.baseAmount,
      dividendReceived: payment.dividendReceived,
      dueAmount: payment.dueAmount,
      paidAmount: payment.paidAmount,
      outstandingBalance: payment.outstandingBalance,
      paymentStatus: payment.paymentStatus,
      isOnTime: payment.isOnTime,
      delayDays: payment.delayDays,
      isWinner: payment.isWinner,
      amountReceived: payment.amountReceived,
      paymentMethod: payment.paymentMethod !== 'Not Paid' ? payment.paymentMethod : null
    }));

    // Get upcoming auctions for member's chit groups
    // Include all Live and Scheduled auctions (not closed)
    const upcomingAuctions = await Auction.find({
      chitGroupId: { $in: chitGroupIds },
      status: { $in: ['Live', 'Scheduled'] }
    })
      .sort({ status: -1, scheduledDate: -1 }) // Live first, then most recent scheduled
      .limit(10);


    // Format upcoming auctions
    const formattedUpcomingAuctions = upcomingAuctions.map(auction => ({
      id: auction._id,
      chitGroup: auction.chitGroupName,
      chitGroupId: auction.chitGroupId,
      auctionNumber: auction.auctionNumber,
      scheduledDate: auction.scheduledDate,
      scheduledTime: auction.scheduledTime,
      startingBid: auction.startingBid,
      status: auction.status
    }));

    // Format chit groups data for member with last auction info
    const chitGroupsData = memberChitGroups.map(chit => {
      const memberInfo = chit.members.find(m => m.memberId.toString() === userId);
      const lastAuction = lastAuctionMap[chit._id.toString()];

      return {
        _id: chit._id,
        name: chit.name,
        chitAmount: chit.chitAmount,
        monthlyContribution: chit.monthlyContribution,
        status: chit.status,
        completedAuctions: chit.completedAuctions,
        duration: chit.duration,
        progressPercentage: Math.round((chit.completedAuctions / chit.duration) * 100),
        hasWon: memberInfo ? memberInfo.hasWon : false,
        wonInAuction: memberInfo ? memberInfo.wonInAuction : null,
        joinedDate: memberInfo ? memberInfo.joinedDate : null,
        // Last auction details
        lastAuction: lastAuction ? {
          auctionNumber: lastAuction.auctionNumber,
          winnerName: lastAuction.winnerName,
          winningBid: lastAuction.winningBid,
          dividendPerMember: lastAuction.dividendPerMember,
          closedAt: lastAuction.closedAt
        } : null
      };
    });

    // Calculate summary stats
    const totalChitGroups = chitGroupsData.length;
    const activeChitGroups = chitGroupsData.filter(c => c.status === 'Active').length;
    const totalWins = chitGroupsData.filter(c => c.hasWon).length;
    const totalMonthlyDue = chitGroupsData
      .filter(c => c.status === 'Active')
      .reduce((sum, c) => sum + c.monthlyContribution, 0);

    // Generate recent activity from payments
    const recentActivity = formattedTransactions.slice(0, 5).map(txn => ({
      message: txn.isWinner
        ? `Won auction #${txn.auctionNumber} in ${txn.chitGroupName}`
        : `Payment ${txn.paymentStatus.toLowerCase()} for ${txn.chitGroupName} - Auction #${txn.auctionNumber}`,
      time: txn.dueDate,
      amount: txn.isWinner ? txn.amountReceived : (txn.paymentStatus === 'Paid' ? txn.paidAmount : null)
    }));

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          language: user.language
        },
        stats: {
          totalChitGroups,
          activeChitGroups,
          totalWins,
          totalMonthlyDue
        },
        chitGroups: chitGroupsData,
        paymentTransactions: formattedTransactions,
        upcomingAuctions: formattedUpcomingAuctions,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Member dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get all members (for admin)
// @route   GET /api/dashboard/members
// @access  Private/Admin
router.get('/members', protect, isAdmin, async (req, res) => {
  try {
    const members = await User.find({ role: 'member' })
      .populate('chitGroups', 'name status')
      .sort({ createdAt: -1 });

    const formattedMembers = members.map(member => ({
      _id: member._id,
      name: member.name,
      phone: member.phone,
      email: member.email,
      language: member.language,
      status: member.status,
      chitGroups: member.chitGroups.map(chit => ({
        _id: chit._id,
        name: chit.name,
        status: chit.status
      })),
      totalChitGroups: member.chitGroups.length,
      lastLogin: member.lastLogin,
      createdAt: member.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedMembers.length,
      data: formattedMembers
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get all chit groups (for admin)
// @route   GET /api/dashboard/chitgroups
// @access  Private/Admin
router.get('/chitgroups', protect, isAdmin, async (req, res) => {
  try {
    const chitGroups = await ChitGroup.find()
      .populate('createdBy', 'name')
      .populate('members.memberId', 'name phone')
      .sort({ createdAt: -1 });

    const formattedChitGroups = chitGroups.map(chit => ({
      _id: chit._id,
      name: chit.name,
      chitAmount: chit.chitAmount,
      totalMembers: chit.totalMembers,
      currentMembers: chit.members.length,
      duration: chit.duration,
      commissionAmount: chit.commissionAmount,
      winnerPaymentModel: chit.winnerPaymentModel,
      monthlyContribution: chit.monthlyContribution,
      status: chit.status,
      startDate: chit.startDate,
      completedAuctions: chit.completedAuctions,
      progressPercentage: Math.round((chit.completedAuctions / chit.duration) * 100),
      members: chit.members.map(m => ({
        _id: m.memberId._id,
        name: m.memberId.name || m.memberName,
        phone: m.memberId.phone,
        hasWon: m.hasWon,
        wonInAuction: m.wonInAuction
      })),
      createdBy: chit.createdBy ? chit.createdBy.name : 'Unknown',
      createdAt: chit.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedChitGroups.length,
      data: formattedChitGroups
    });
  } catch (error) {
    console.error('Get chit groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;
