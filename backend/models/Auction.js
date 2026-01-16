const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  bidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  bidTime: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    default: null
  },
  placedByAdmin: {
    type: Boolean,
    default: false
  },
  placedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  placedByUserName: {
    type: String,
    default: null
  }
}, { _id: true });

const ManualExclusionSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 200
  },
  excludedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: false });

const AuctionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required'],
    index: true
  },
  chitGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup',
    required: [true, 'Chit group is required']
  },
  chitGroupName: {
    type: String,
    required: true
  },
  auctionNumber: {
    type: Number,
    required: [true, 'Auction number is required'],
    min: 1
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  startedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Live', 'Closed'],
    default: 'Scheduled'
  },
  startingBid: {
    type: Number,
    required: [true, 'Starting bid is required'],
    min: 0
  },
  currentHighestBid: {
    type: Number,
    default: 0,
    min: 0
  },
  winningBid: {
    type: Number,
    default: null
  },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  winnerName: {
    type: String,
    default: null
  },
  bids: [BidSchema],
  autoExcludedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  manualExcludedMembers: [ManualExclusionSchema],
  eligibleMembers: {
    type: Number,
    default: 0
  },
  totalBids: {
    type: Number,
    default: 0
  },
  participationRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  dividendPerMember: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDividend: {
    type: Number,
    default: 0,
    min: 0
  },
  commissionCollected: {
    type: Number,
    default: 0,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
AuctionSchema.index({ chitGroupId: 1, auctionNumber: 1 }, { unique: true });
AuctionSchema.index({ status: 1, scheduledDate: 1 });
AuctionSchema.index({ winnerId: 1 });

// Method to start auction
AuctionSchema.methods.start = async function(startedBy) {
  if (this.status !== 'Scheduled') {
    throw new Error('Only scheduled auctions can be started');
  }

  this.status = 'Live';
  this.startedAt = Date.now();
  this.startedBy = startedBy;
  await this.save();
  return this;
};

// Method to add a bid
AuctionSchema.methods.addBid = async function(memberId, memberName, bidAmount, ipAddress = null) {
  if (this.status !== 'Live') {
    throw new Error('Auction is not currently live');
  }

  // Check if member already placed a bid
  const existingBid = this.bids.find(
    bid => bid.memberId.toString() === memberId.toString()
  );

  if (existingBid) {
    throw new Error('Member has already placed a bid in this auction');
  }

  // Check if member is excluded
  const isAutoExcluded = this.autoExcludedMembers.some(
    id => id.toString() === memberId.toString()
  );
  const isManuallyExcluded = this.manualExcludedMembers.some(
    exclusion => exclusion.memberId.toString() === memberId.toString()
  );

  if (isAutoExcluded || isManuallyExcluded) {
    throw new Error('Member is excluded from this auction');
  }

  // Check if bid is higher than current highest
  if (bidAmount <= this.currentHighestBid) {
    throw new Error(`Bid must be higher than current highest bid of ₹${this.currentHighestBid}`);
  }

  // Check if bid is at least equal to starting bid
  if (bidAmount < this.startingBid) {
    throw new Error(`Bid must be at least ₹${this.startingBid}`);
  }

  // Add the bid
  this.bids.push({
    memberId,
    memberName,
    bidAmount,
    bidTime: Date.now(),
    ipAddress
  });

  // Update current highest bid
  this.currentHighestBid = bidAmount;
  this.totalBids = this.bids.length;

  // Calculate participation rate
  if (this.eligibleMembers > 0) {
    this.participationRate = Math.round((this.totalBids / this.eligibleMembers) * 100);
  }

  await this.save();
  return this;
};

// Method to close auction and select winner
AuctionSchema.methods.close = async function(closedBy, commissionAmount) {
  if (this.status !== 'Live') {
    throw new Error('Only live auctions can be closed');
  }

  if (this.bids.length === 0) {
    throw new Error('Cannot close auction without any bids');
  }

  // Find highest bid
  const highestBid = this.bids.reduce((max, bid) =>
    bid.bidAmount > max.bidAmount ? bid : max
  , this.bids[0]);

  // Set winner details
  this.winnerId = highestBid.memberId;
  this.winnerName = highestBid.memberName;
  this.winningBid = highestBid.bidAmount;

  // Calculate dividend
  this.commissionCollected = commissionAmount;
  this.totalDividend = Math.max(0, this.winningBid - commissionAmount);

  // Calculate dividend per member (excluding winner)
  const nonWinnerCount = this.eligibleMembers - 1;
  if (nonWinnerCount > 0) {
    this.dividendPerMember = Math.floor(this.totalDividend / nonWinnerCount);
  }

  // Update status
  this.status = 'Closed';
  this.closedAt = Date.now();
  this.closedBy = closedBy;

  await this.save();
  return this;
};

// Method to manually exclude a member
AuctionSchema.methods.excludeMember = async function(memberId, reason, excludedBy) {
  if (this.status === 'Closed') {
    throw new Error('Cannot exclude members from closed auction');
  }

  // Check if already manually excluded
  const alreadyExcluded = this.manualExcludedMembers.some(
    exclusion => exclusion.memberId.toString() === memberId.toString()
  );

  if (alreadyExcluded) {
    throw new Error('Member is already manually excluded');
  }

  this.manualExcludedMembers.push({
    memberId,
    reason,
    excludedBy
  });

  // Recalculate eligible members
  this.eligibleMembers = Math.max(0, this.eligibleMembers - 1);

  await this.save();
  return this;
};

// Method to calculate eligible members
AuctionSchema.methods.calculateEligibleMembers = async function(totalMembers) {
  const excludedCount = this.autoExcludedMembers.length + this.manualExcludedMembers.length;
  this.eligibleMembers = Math.max(0, totalMembers - excludedCount);
  await this.save();
  return this.eligibleMembers;
};

module.exports = mongoose.model('Auction', AuctionSchema);
