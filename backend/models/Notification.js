const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required'],
    index: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  recipientPhone: {
    type: String,
    required: [true, 'Recipient phone number is required'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  recipientName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'auction_scheduled',
      'auction_starting',
      'auction_started',
      'auction_closed',
      'bid_confirmation',
      'bid_alert_admin',
      'payment_reminder',
      'payment_received',
      'payment_overdue',
      'dividend_credited',
      'welcome',
      'completion',
      'winner_announcement',
      'non_winner_result'
    ],
    required: [true, 'Notification type is required']
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  language: {
    type: String,
    enum: ['en', 'ta'],
    default: 'en'
  },

  // Template and Content
  templateId: {
    type: String,
    default: null
  },
  templateData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  messageText: {
    type: String,
    required: [true, 'Message text is required'],
    maxlength: 1000
  },

  // Scheduling
  scheduledAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'queued', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },

  // Delivery
  deliveryStatus: {
    type: String,
    default: null
  },
  deliveryTimestamp: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 5
  },

  // Reference
  chitGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup',
    default: null
  },
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    default: null
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
NotificationSchema.index({ status: 1, scheduledAt: 1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1 });
NotificationSchema.index({ chitGroupId: 1 });

// Method to mark as queued
NotificationSchema.methods.markAsQueued = async function() {
  this.status = 'queued';
  await this.save();
  return this;
};

// Method to mark as sent
NotificationSchema.methods.markAsSent = async function(deliveryStatus = null) {
  this.status = 'sent';
  this.sentAt = Date.now();
  this.deliveryStatus = deliveryStatus;
  this.deliveryTimestamp = Date.now();
  await this.save();
  return this;
};

// Method to mark as failed
NotificationSchema.methods.markAsFailed = async function(failureReason) {
  this.status = 'failed';
  this.failureReason = failureReason;
  this.retryCount += 1;

  // If max retries reached, keep it as failed
  // Otherwise, reset to pending for retry
  if (this.retryCount < this.maxRetries) {
    this.status = 'pending';
  }

  await this.save();
  return this;
};

// Method to cancel notification
NotificationSchema.methods.cancel = async function(reason = null) {
  this.status = 'cancelled';
  if (reason) {
    this.failureReason = reason;
  }
  await this.save();
  return this;
};

// Method to schedule notification
NotificationSchema.methods.schedule = async function(scheduledDate) {
  this.scheduledAt = scheduledDate;
  this.status = 'pending';
  await this.save();
  return this;
};

// Method to check if notification should be sent
NotificationSchema.methods.shouldSend = function() {
  if (this.status !== 'pending' && this.status !== 'queued') {
    return false;
  }

  if (this.retryCount >= this.maxRetries) {
    return false;
  }

  if (this.scheduledAt) {
    return new Date() >= new Date(this.scheduledAt);
  }

  return true;
};

// Static method to create notification
NotificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create({
    recipientId: data.recipientId,
    recipientPhone: data.recipientPhone,
    recipientName: data.recipientName,
    type: data.type,
    priority: data.priority || 'medium',
    language: data.language || 'en',
    templateId: data.templateId || null,
    templateData: data.templateData || {},
    messageText: data.messageText,
    scheduledAt: data.scheduledAt || null,
    chitGroupId: data.chitGroupId || null,
    auctionId: data.auctionId || null,
    paymentId: data.paymentId || null,
    status: 'pending'
  });

  return notification;
};

// Static method to get pending notifications
NotificationSchema.statics.getPendingNotifications = async function(limit = 10) {
  const now = new Date();

  return await this.find({
    status: { $in: ['pending', 'queued'] },
    $or: [
      { scheduledAt: null },
      { scheduledAt: { $lte: now } }
    ],
    retryCount: { $lt: 3 }
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .exec();
};

// Static method to get failed notifications
NotificationSchema.statics.getFailedNotifications = async function() {
  return await this.find({
    status: 'failed',
    retryCount: { $gte: 3 }
  })
    .sort({ createdAt: -1 })
    .exec();
};

// Static method to cleanup old notifications
NotificationSchema.statics.cleanupOldNotifications = async function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await this.deleteMany({
    status: { $in: ['sent', 'cancelled'] },
    createdAt: { $lt: cutoffDate }
  });

  return result;
};

// Static method to get notification statistics
NotificationSchema.statics.getStatistics = async function(chitGroupId = null) {
  const match = chitGroupId ? { chitGroupId } : {};

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    pending: 0,
    queued: 0,
    sent: 0,
    failed: 0,
    cancelled: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Virtual for is overdue
NotificationSchema.virtual('isOverdue').get(function() {
  if (!this.scheduledAt) return false;
  return new Date() > new Date(this.scheduledAt) && this.status === 'pending';
});

// Virtual for can retry
NotificationSchema.virtual('canRetry').get(function() {
  return this.retryCount < this.maxRetries && this.status === 'failed';
});

// Ensure virtuals are included in JSON
NotificationSchema.set('toJSON', { virtuals: true });
NotificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', NotificationSchema);
