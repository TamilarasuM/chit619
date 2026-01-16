const mongoose = require('mongoose');

const MemberRankingSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required'],
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Member is required']
  },
  memberName: {
    type: String,
    required: true
  },
  chitGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup',
    required: [true, 'Chit group is required']
  },

  // Payment Statistics
  onTimePayments: {
    type: Number,
    default: 0,
    min: 0
  },
  delayedPayments: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPaymentsDue: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDelayDays: {
    type: Number,
    default: 0,
    min: 0
  },
  averageDelayDays: {
    type: Number,
    default: 0,
    min: 0
  },

  // Grace Period Usage
  gracePeriodUsed: {
    type: Number,
    default: 0,
    min: 0
  },

  // Financial Stats
  totalAmountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDividendsReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  outstandingAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Ranking
  rankScore: {
    type: Number,
    default: 1000,
    min: 0
  },
  rank: {
    type: Number,
    default: null,
    min: 1
  },
  rankCategory: {
    type: String,
    enum: ['Excellent', 'Good', 'Average', 'Poor'],
    default: 'Good'
  },

  // Win Status
  hasWon: {
    type: Boolean,
    default: false
  },
  wonInAuction: {
    type: Number,
    default: null
  },

  lastUpdated: {
    type: Date,
    default: Date.now
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
MemberRankingSchema.index({ chitGroupId: 1, rank: 1 });
MemberRankingSchema.index({ memberId: 1, chitGroupId: 1 }, { unique: true });
MemberRankingSchema.index({ chitGroupId: 1, rankScore: -1 });

// Method to calculate rank score
MemberRankingSchema.methods.calculateRankScore = function() {
  let score = 1000; // Base score

  // Add points for on-time payments
  score += this.onTimePayments * 50;

  // Bonus for zero delays
  if (this.delayedPayments === 0 && this.totalPaymentsDue > 0) {
    score += 100;
  }

  // Add points for payments made before grace period
  const paymentsBeforeGrace = this.totalPaymentsDue - this.gracePeriodUsed;
  score += paymentsBeforeGrace * 20;

  // Deduct points for delayed payments
  score -= this.delayedPayments * 30;

  // Deduct points for each delay day
  score -= this.totalDelayDays * 5;

  // Deduct points for outstanding balance
  if (this.outstandingAmount > 0) {
    score -= 100;
  }

  // Deduct points for grace period usage
  score -= this.gracePeriodUsed * 10;

  // Ensure score is not negative
  this.rankScore = Math.max(0, score);

  // Determine rank category
  if (this.rankScore >= 1000) {
    this.rankCategory = 'Excellent';
  } else if (this.rankScore >= 800) {
    this.rankCategory = 'Good';
  } else if (this.rankScore >= 600) {
    this.rankCategory = 'Average';
  } else {
    this.rankCategory = 'Poor';
  }

  this.calculatedAt = Date.now();
  return this.rankScore;
};

// Method to update payment statistics
MemberRankingSchema.methods.updatePaymentStats = function(payment) {
  // Update total payments due
  this.totalPaymentsDue += 1;

  // Check if payment is on time
  if (payment.isOnTime) {
    this.onTimePayments += 1;
  } else if (payment.delayDays > 0) {
    this.delayedPayments += 1;
    this.totalDelayDays += payment.delayDays;
  }

  // Update grace period usage
  if (payment.gracePeriodUsed) {
    this.gracePeriodUsed += 1;
  }

  // Calculate average delay days
  if (this.delayedPayments > 0) {
    this.averageDelayDays = Math.round(this.totalDelayDays / this.delayedPayments);
  }

  // Update financial stats
  this.totalAmountPaid += payment.paidAmount;
  this.totalDividendsReceived += payment.dividendReceived;
  this.outstandingAmount += payment.outstandingBalance;

  // Recalculate rank score
  this.calculateRankScore();

  this.lastUpdated = Date.now();
  return this;
};

// Method to mark member as winner
MemberRankingSchema.methods.markAsWinner = function(auctionNumber) {
  this.hasWon = true;
  this.wonInAuction = auctionNumber;
  this.lastUpdated = Date.now();
  return this;
};

// Static method to recalculate ranks for a chit group
MemberRankingSchema.statics.recalculateRanks = async function(chitGroupId) {
  try {
    // Get all rankings for the chit group, sorted by score (descending)
    const rankings = await this.find({ chitGroupId })
      .sort({ rankScore: -1, onTimePayments: -1 })
      .exec();

    // Update ranks
    const updatePromises = rankings.map((ranking, index) => {
      ranking.rank = index + 1;
      ranking.lastUpdated = Date.now();
      return ranking.save();
    });

    await Promise.all(updatePromises);

    return rankings;
  } catch (error) {
    throw new Error(`Error recalculating ranks: ${error.message}`);
  }
};

// Static method to get top performers in a chit group
MemberRankingSchema.statics.getTopPerformers = async function(chitGroupId, limit = 5) {
  return await this.find({ chitGroupId })
    .sort({ rankScore: -1, onTimePayments: -1 })
    .limit(limit)
    .populate('memberId', 'name phone')
    .exec();
};

// Static method to get bottom performers in a chit group
MemberRankingSchema.statics.getBottomPerformers = async function(chitGroupId, limit = 5) {
  return await this.find({ chitGroupId })
    .sort({ rankScore: 1, delayedPayments: -1 })
    .limit(limit)
    .populate('memberId', 'name phone')
    .exec();
};

// Virtual for payment completion rate
MemberRankingSchema.virtual('completionRate').get(function() {
  if (this.totalPaymentsDue === 0) return 0;
  return Math.round((this.onTimePayments / this.totalPaymentsDue) * 100);
});

// Virtual for rank display
MemberRankingSchema.virtual('rankDisplay').get(function() {
  return `${this.rank} (${this.rankCategory})`;
});

// Ensure virtuals are included in JSON
MemberRankingSchema.set('toJSON', { virtuals: true });
MemberRankingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MemberRanking', MemberRankingSchema);
