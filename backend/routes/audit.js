const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all audit logs
// @route   GET /api/audit/logs
// @access  Private/Admin
router.get('/logs', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      entity,
      action,
      userId,
      chitGroupId,
      from,
      to,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (entity) query.entity = entity;
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (chitGroupId) query.chitGroupId = chitGroupId;

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
      .populate('userId', 'name phone email role')
      .populate('chitGroupId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching audit logs'
    });
  }
});

// @desc    Get audit log by ID
// @route   GET /api/audit/logs/:id
// @access  Private/Admin
router.get('/logs/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('userId', 'name phone email role')
      .populate('chitGroupId', 'name')
      .populate('auctionId', 'auctionNumber');

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching audit log'
    });
  }
});

// @desc    Get audit logs for specific entity
// @route   GET /api/audit/entity/:entityId
// @access  Private/Admin
router.get('/entity/:entityId', protect, authorize('admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find({ entityId: req.params.entityId })
      .populate('userId', 'name phone email role')
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Get entity audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching entity audit logs'
    });
  }
});

// @desc    Get audit log statistics
// @route   GET /api/audit/stats
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const query = {};

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    // Get action statistics
    const actionStats = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get entity statistics
    const entityStats = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$entity',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get user statistics
    const userStats = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Populate user details
    const userIds = userStats.map(s => s._id);
    const User = require('../models/User');
    const users = await User.find({ _id: { $in: userIds } }, 'name role');
    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {});

    const userStatsWithDetails = userStats.map(s => ({
      userId: s._id,
      userName: userMap[s._id.toString()]?.name || 'Unknown',
      userRole: userMap[s._id.toString()]?.role || 'Unknown',
      actionCount: s.count
    }));

    // Get success/failure statistics
    const successStats = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$success',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalLogs = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        byAction: actionStats,
        byEntity: entityStats,
        topUsers: userStatsWithDetails,
        successRate: {
          successful: successStats.find(s => s._id === true)?.count || 0,
          failed: successStats.find(s => s._id === false)?.count || 0,
          percentage: totalLogs > 0
            ? ((successStats.find(s => s._id === true)?.count || 0) / totalLogs * 100).toFixed(1) + '%'
            : 'N/A'
        }
      }
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching audit statistics'
    });
  }
});

// @desc    Search audit logs
// @route   POST /api/audit/search
// @access  Private/Admin
router.post('/search', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      keyword,
      entity,
      action,
      userId,
      from,
      to,
      page = 1,
      limit = 50
    } = req.body;

    const query = {};

    if (entity) query.entity = entity;
    if (action) query.action = action;
    if (userId) query.userId = userId;

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    // Text search in userName or action or entity
    if (keyword) {
      query.$or = [
        { userName: { $regex: keyword, $options: 'i' } },
        { action: { $regex: keyword, $options: 'i' } },
        { entity: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
      .populate('userId', 'name phone email role')
      .populate('chitGroupId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    console.error('Search audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while searching audit logs'
    });
  }
});

// @desc    Export audit logs
// @route   GET /api/audit/export
// @access  Private/Admin
router.get('/export', protect, authorize('admin'), async (req, res) => {
  try {
    const { entity, action, from, to, format = 'json' } = req.query;

    const query = {};

    if (entity) query.entity = entity;
    if (action) query.action = action;

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'name phone email role')
      .populate('chitGroupId', 'name')
      .sort({ timestamp: -1 })
      .limit(10000); // Limit to 10k records for export

    if (format === 'csv') {
      // Simple CSV export
      const csv = [
        'Timestamp,User,Role,Action,Entity,Entity ID,Success,IP Address',
        ...logs.map(log => [
          new Date(log.timestamp).toLocaleString('en-IN'),
          log.userId?.name || 'Unknown',
          log.userRole,
          log.action,
          log.entity,
          log.entityId,
          log.success ? 'Yes' : 'No',
          log.ipAddress
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while exporting audit logs'
    });
  }
});

module.exports = router;
