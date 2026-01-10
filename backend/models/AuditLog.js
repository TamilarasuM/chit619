const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  userRole: {
    type: String,
    enum: ['admin', 'member'],
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    maxlength: 200
  },
  entity: {
    type: String,
    required: [true, 'Entity is required'],
    enum: [
      'User',
      'ChitGroup',
      'Auction',
      'Payment',
      'MemberRanking',
      'MemberStatement',
      'Notification',
      'Settings',
      'System'
    ]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },

  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    default: null
  },

  // Context
  chitGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup',
    default: null
  },
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    default: null
  }
}, {
  timestamps: false
});

// Create indexes for better query performance
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ entity: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ entityId: 1 });
AuditLogSchema.index({ chitGroupId: 1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ success: 1 });

// Static method to log an action
AuditLogSchema.statics.logAction = async function(data) {
  try {
    const log = await this.create({
      userId: data.userId,
      userRole: data.userRole,
      userName: data.userName,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId || null,
      changes: {
        before: data.before || null,
        after: data.after || null
      },
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      timestamp: Date.now(),
      success: data.success !== undefined ? data.success : true,
      errorMessage: data.errorMessage || null,
      chitGroupId: data.chitGroupId || null,
      auctionId: data.auctionId || null
    });

    return log;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to prevent audit logging from breaking the main operation
    return null;
  }
};

// Static method to get logs by entity
AuditLogSchema.statics.getByEntity = async function(entity, entityId, limit = 50) {
  return await this.find({ entity, entityId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name phone role')
    .exec();
};

// Static method to get logs by user
AuditLogSchema.statics.getByUser = async function(userId, limit = 100) {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

// Static method to get logs by action
AuditLogSchema.statics.getByAction = async function(action, limit = 100) {
  return await this.find({ action: new RegExp(action, 'i') })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name phone role')
    .exec();
};

// Static method to get logs within date range
AuditLogSchema.statics.getByDateRange = async function(startDate, endDate, filters = {}) {
  const query = {
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    ...filters
  };

  return await this.find(query)
    .sort({ timestamp: -1 })
    .populate('userId', 'name phone role')
    .exec();
};

// Static method to get failed actions
AuditLogSchema.statics.getFailedActions = async function(limit = 50) {
  return await this.find({ success: false })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name phone role')
    .exec();
};

// Static method to get logs for a chit group
AuditLogSchema.statics.getByChitGroup = async function(chitGroupId, limit = 100) {
  return await this.find({ chitGroupId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name phone role')
    .exec();
};

// Static method to get statistics
AuditLogSchema.statics.getStatistics = async function(startDate = null, endDate = null) {
  const match = {};

  if (startDate && endDate) {
    match.timestamp = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          entity: '$entity',
          success: '$success'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.entity',
        total: { $sum: '$count' },
        successful: {
          $sum: {
            $cond: [{ $eq: ['$_id.success', true] }, '$count', 0]
          }
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ['$_id.success', false] }, '$count', 0]
          }
        }
      }
    },
    { $sort: { total: -1 } }
  ]);

  return stats;
};

// Static method to get user activity summary
AuditLogSchema.statics.getUserActivitySummary = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$entity',
        count: { $sum: 1 },
        lastAction: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return summary;
};

// Static method to cleanup old logs
AuditLogSchema.statics.cleanupOldLogs = async function(daysOld = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate },
    success: true // Keep failed logs for longer
  });

  return result;
};

// Static method to search logs
AuditLogSchema.statics.searchLogs = async function(searchParams) {
  const query = {};

  if (searchParams.userId) {
    query.userId = searchParams.userId;
  }

  if (searchParams.entity) {
    query.entity = searchParams.entity;
  }

  if (searchParams.action) {
    query.action = new RegExp(searchParams.action, 'i');
  }

  if (searchParams.success !== undefined) {
    query.success = searchParams.success;
  }

  if (searchParams.startDate && searchParams.endDate) {
    query.timestamp = {
      $gte: new Date(searchParams.startDate),
      $lte: new Date(searchParams.endDate)
    };
  }

  if (searchParams.chitGroupId) {
    query.chitGroupId = searchParams.chitGroupId;
  }

  const page = parseInt(searchParams.page) || 1;
  const limit = parseInt(searchParams.limit) || 50;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name phone role')
      .exec(),
    this.countDocuments(query)
  ]);

  return {
    logs,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// Virtual for formatted timestamp
AuditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

// Ensure virtuals are included in JSON
AuditLogSchema.set('toJSON', { virtuals: true });
AuditLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
