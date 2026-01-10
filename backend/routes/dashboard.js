const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
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

    // Format chit groups data for member
    const chitGroupsData = memberChitGroups.map(chit => {
      const memberInfo = chit.members.find(m => m.memberId.toString() === userId);
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
        joinedDate: memberInfo ? memberInfo.joinedDate : null
      };
    });

    // Calculate summary stats
    const totalChitGroups = chitGroupsData.length;
    const activeChitGroups = chitGroupsData.filter(c => c.status === 'Active').length;
    const totalWins = chitGroupsData.filter(c => c.hasWon).length;
    const totalMonthlyDue = chitGroupsData
      .filter(c => c.status === 'Active')
      .reduce((sum, c) => sum + c.monthlyContribution, 0);

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
        chitGroups: chitGroupsData
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
