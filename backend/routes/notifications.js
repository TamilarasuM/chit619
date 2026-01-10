const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, type, limit = 20, page = 1 } = req.query;

    const query = { recipientId: req.user.id };

    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unread = await Notification.countDocuments({
      recipientId: req.user.id,
      status: 'pending'
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unread,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching notifications'
    });
  }
});

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Verify user can only see their own notifications
    if (notification.recipientId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this notification'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching notification'
    });
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Verify user owns this notification
    if (notification.recipientId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this notification'
      });
    }

    notification.status = 'sent'; // Mark as read/acknowledged
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating notification'
    });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user.id, status: 'pending' },
      { status: 'sent' }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating notifications'
    });
  }
});

// @desc    Send test notification
// @route   POST /api/notifications/test
// @access  Private/Admin
router.post('/test', protect, authorize('admin'), async (req, res) => {
  try {
    const { memberId, type = 'test' } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide member ID'
      });
    }

    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    const notification = await Notification.create({
      recipientId: member._id,
      recipientPhone: member.phone,
      recipientName: member.name,
      type: 'test',
      priority: 'low',
      language: member.language || 'en',
      templateId: 'test',
      templateData: {
        name: member.name,
        message: 'This is a test notification from the Chit Fund Manager system.',
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      },
      messageText: `Hi ${member.name}, this is a test notification from Chit Fund Manager sent at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      scheduledAt: new Date(),
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Test notification created and queued',
      data: notification
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while sending test notification'
    });
  }
});

// @desc    Get pending notifications (for queue processing)
// @route   GET /api/notifications/queue/pending
// @access  Private/Admin
router.get('/queue/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const pendingNotifications = await Notification.find({
      status: 'pending',
      scheduledAt: { $lte: new Date() }
    })
      .sort({ priority: -1, scheduledAt: 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: pendingNotifications.length,
      data: pendingNotifications
    });
  } catch (error) {
    console.error('Get pending notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching pending notifications'
    });
  }
});

// @desc    Update notification status (for queue processor)
// @route   PUT /api/notifications/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, deliveryStatus, failureReason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Please provide status'
      });
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    notification.status = status;

    if (status === 'sent') {
      notification.sentAt = new Date();
      notification.deliveryTimestamp = new Date();
    }

    if (deliveryStatus) {
      notification.deliveryStatus = deliveryStatus;
    }

    if (status === 'failed') {
      notification.failureReason = failureReason || 'Unknown error';
      notification.retryCount = (notification.retryCount || 0) + 1;

      // Re-queue if retry count is less than max
      if (notification.retryCount < notification.maxRetries) {
        notification.status = 'pending';
        notification.scheduledAt = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
      }
    }

    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification status updated',
      data: notification
    });
  } catch (error) {
    console.error('Update notification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating notification status'
    });
  }
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private/Admin
router.get('/stats/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const { chitId, from, to } = req.query;

    const query = {};

    if (chitId) query.chitGroupId = chitId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const stats = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalNotifications = await Notification.countDocuments(query);

    const summary = {
      total: totalNotifications,
      byStatus: stats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      byType: typeStats.reduce((acc, t) => {
        acc[t._id] = t.count;
        return acc;
      }, {}),
      successRate: totalNotifications > 0
        ? ((stats.find(s => s._id === 'sent')?.count || 0) / totalNotifications * 100).toFixed(1) + '%'
        : 'N/A'
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching notification statistics'
    });
  }
});

// @desc    Retry failed notification
// @route   POST /api/notifications/:id/retry
// @access  Private/Admin
router.post('/:id/retry', protect, authorize('admin'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    if (notification.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Can only retry failed notifications'
      });
    }

    if (notification.retryCount >= notification.maxRetries) {
      return res.status(400).json({
        success: false,
        error: 'Maximum retry attempts exceeded'
      });
    }

    notification.status = 'pending';
    notification.scheduledAt = new Date();
    notification.retryCount += 1;
    notification.failureReason = null;

    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification queued for retry',
      data: notification
    });
  } catch (error) {
    console.error('Retry notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while retrying notification'
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Users can only delete their own notifications, admins can delete any
    if (notification.recipientId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this notification'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting notification'
    });
  }
});

// @desc    Bulk send notifications
// @route   POST /api/notifications/bulk
// @access  Private/Admin
router.post('/bulk', protect, authorize('admin'), async (req, res) => {
  try {
    const { memberIds, type, templateData, message } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide array of member IDs'
      });
    }

    if (!message && !templateData) {
      return res.status(400).json({
        success: false,
        error: 'Please provide message or template data'
      });
    }

    const members = await User.find({
      _id: { $in: memberIds },
      role: 'member',
      status: 'active'
    });

    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid members found'
      });
    }

    const notifications = [];

    for (const member of members) {
      notifications.push({
        recipientId: member._id,
        recipientPhone: member.phone,
        recipientName: member.name,
        type: type || 'general',
        priority: 'medium',
        language: member.language || 'en',
        templateId: type || 'general',
        templateData: templateData || {},
        messageText: message || `Hi ${member.name}, you have a new notification.`,
        scheduledAt: new Date(),
        status: 'pending'
      });
    }

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notifications created and queued`,
      count: createdNotifications.length
    });
  } catch (error) {
    console.error('Bulk send notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while sending bulk notifications'
    });
  }
});

module.exports = router;
