const express = require('express');
const router = express.Router();
const MemberRanking = require('../models/MemberRanking');
const ChitGroup = require('../models/ChitGroup');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all member rankings (optionally filter by chit group)
// @route   GET /api/rankings
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { chitGroupId, category } = req.query;

    const query = {};
    if (chitGroupId) query.chitGroupId = chitGroupId;
    if (category) query.rankCategory = category;

    const rankings = await MemberRanking.find(query)
      .populate('memberId', 'name phone email')
      .populate('chitGroupId', 'name')
      .sort({ rankScore: -1, onTimePayments: -1 });

    // Calculate statistics
    const stats = {
      total: rankings.length,
      excellent: rankings.filter(r => r.rankCategory === 'Excellent').length,
      good: rankings.filter(r => r.rankCategory === 'Good').length,
      average: rankings.filter(r => r.rankCategory === 'Average').length,
      poor: rankings.filter(r => r.rankCategory === 'Poor').length,
      avgRankScore: rankings.length > 0 ? Math.round(rankings.reduce((sum, r) => sum + r.rankScore, 0) / rankings.length) : 0,
      avgOnTimeRate: rankings.length > 0 ? Math.round(rankings.reduce((sum, r) => sum + r.completionRate, 0) / rankings.length) : 0
    };

    res.status(200).json({
      success: true,
      count: rankings.length,
      data: rankings,
      stats
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching rankings'
    });
  }
});

// @desc    Get member's overall ranking (across all chit groups)
// @route   GET /api/rankings/member/:memberId
// @access  Private
router.get('/member/:memberId', protect, async (req, res) => {
  try {
    // If member, verify they can only see their own ranking
    if (req.user.role === 'member' && req.params.memberId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own rankings'
      });
    }

    const rankings = await MemberRanking.find({ memberId: req.params.memberId })
      .populate('chitGroupId', 'name status')
      .sort({ rankScore: -1 });

    // Calculate overall stats
    const overallStats = {
      totalChitGroups: rankings.length,
      avgRankScore: rankings.length > 0 ? Math.round(rankings.reduce((sum, r) => sum + r.rankScore, 0) / rankings.length) : 0,
      avgOnTimeRate: rankings.length > 0 ? Math.round(rankings.reduce((sum, r) => sum + r.completionRate, 0) / rankings.length) : 0,
      totalOnTimePayments: rankings.reduce((sum, r) => sum + r.onTimePayments, 0),
      totalDelayedPayments: rankings.reduce((sum, r) => sum + r.delayedPayments, 0),
      totalAmountPaid: rankings.reduce((sum, r) => sum + r.totalAmountPaid, 0),
      excellentCount: rankings.filter(r => r.rankCategory === 'Excellent').length,
      goodCount: rankings.filter(r => r.rankCategory === 'Good').length,
      averageCount: rankings.filter(r => r.rankCategory === 'Average').length,
      poorCount: rankings.filter(r => r.rankCategory === 'Poor').length
    };

    res.status(200).json({
      success: true,
      count: rankings.length,
      data: rankings,
      overallStats
    });
  } catch (error) {
    console.error('Get member rankings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching member rankings'
    });
  }
});

// @desc    Get rankings for a specific chit group
// @route   GET /api/rankings/chitgroup/:chitGroupId
// @access  Private
router.get('/chitgroup/:chitGroupId', protect, async (req, res) => {
  try {
    const chitGroup = await ChitGroup.findById(req.params.chitGroupId);

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    // If member, verify they're part of this chit
    if (req.user.role === 'member') {
      const isMember = chitGroup.members.some(
        m => m.memberId.toString() === req.user.id
      );

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this chit group'
        });
      }
    }

    const rankings = await MemberRanking.find({ chitGroupId: req.params.chitGroupId })
      .populate('memberId', 'name phone')
      .sort({ rank: 1 });

    // Calculate distribution
    const distribution = {
      excellent: rankings.filter(r => r.rankCategory === 'Excellent').length,
      good: rankings.filter(r => r.rankCategory === 'Good').length,
      average: rankings.filter(r => r.rankCategory === 'Average').length,
      poor: rankings.filter(r => r.rankCategory === 'Poor').length
    };

    res.status(200).json({
      success: true,
      count: rankings.length,
      data: rankings,
      distribution,
      chitGroup: {
        _id: chitGroup._id,
        name: chitGroup.name,
        status: chitGroup.status
      }
    });
  } catch (error) {
    console.error('Get chit rankings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching chit rankings'
    });
  }
});

// @desc    Get top performers (across all chit groups)
// @route   GET /api/rankings/top
// @access  Private/Admin
router.get('/top', protect, authorize('admin'), async (req, res) => {
  try {
    const { limit = 10, chitGroupId } = req.query;

    const query = {};
    if (chitGroupId) query.chitGroupId = chitGroupId;

    const topRankings = await MemberRanking.find(query)
      .populate('memberId', 'name phone')
      .populate('chitGroupId', 'name')
      .sort({ rankScore: -1, onTimePayments: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: topRankings.length,
      data: topRankings
    });
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching top performers'
    });
  }
});

// @desc    Recalculate ranks for a chit group
// @route   POST /api/rankings/recalculate/:chitGroupId
// @access  Private/Admin
router.post('/recalculate/:chitGroupId', protect, authorize('admin'), async (req, res) => {
  try {
    const rankings = await MemberRanking.recalculateRanks(req.params.chitGroupId);

    res.status(200).json({
      success: true,
      message: 'Ranks recalculated successfully',
      count: rankings.length,
      data: rankings
    });
  } catch (error) {
    console.error('Recalculate ranks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while recalculating ranks'
    });
  }
});

module.exports = router;
