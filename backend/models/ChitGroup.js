const mongoose = require('mongoose');

const ChitGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a chit group name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  chitAmount: {
    type: Number,
    required: [true, 'Please add chit amount'],
    min: [1000, 'Chit amount must be at least ₹1000']
  },
  totalMembers: {
    type: Number,
    required: [true, 'Please add total number of members'],
    min: [2, 'Minimum 2 members required']
  },
  duration: {
    type: Number,
    required: [true, 'Please add duration in months'],
    min: [2, 'Duration must be at least 2 months']
  },
  commissionAmount: {
    type: Number,
    required: [true, 'Please add commission amount'],
    min: [0, 'Commission cannot be negative']
  },
  winnerPaymentModel: {
    type: String,
    enum: ['A', 'B'],
    required: [true, 'Please select payment model (A or B)'],
    default: 'A'
  },
  gracePeriodDays: {
    type: Number,
    required: [true, 'Please add grace period days'],
    min: [0, 'Grace period cannot be negative'],
    default: 3
  },
  monthlyContribution: {
    type: Number,
    required: [true, 'Please add monthly contribution amount'],
    min: [100, 'Monthly contribution must be at least ₹100']
  },
  auctionFrequency: {
    type: Number,
    required: [true, 'Please add auction frequency in months'],
    min: [1, 'Auction frequency must be at least 1 month'],
    default: 1, // Default to monthly
    description: 'How often auctions are held (in months): 1=Monthly, 2=Bi-monthly, 3=Quarterly, etc.'
  },
  status: {
    type: String,
    enum: ['InProgress', 'Active', 'Closed'],
    default: 'InProgress'
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  completedAuctions: {
    type: Number,
    default: 0,
    min: 0
  },
  members: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    memberName: {
      type: String,
      required: true
    },
    joinedDate: {
      type: Date,
      default: Date.now
    },
    hasWon: {
      type: Boolean,
      default: false
    },
    wonInAuction: {
      type: Number,
      default: null
    }
  }],
  winners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
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

// Create index for better query performance
ChitGroupSchema.index({ status: 1, startDate: -1 });
ChitGroupSchema.index({ createdBy: 1 });
ChitGroupSchema.index({ 'members.memberId': 1 });

// Virtual for progress percentage
ChitGroupSchema.virtual('progressPercentage').get(function() {
  if (this.duration === 0) return 0;
  return Math.round((this.completedAuctions / this.duration) * 100);
});

// Method to add member to chit group
ChitGroupSchema.methods.addMember = async function(memberId, memberName) {
  // Check if member already exists
  const memberExists = this.members.some(
    member => member.memberId.toString() === memberId.toString()
  );

  if (memberExists) {
    throw new Error('Member already exists in this chit group');
  }

  // Check if maximum members reached
  if (this.members.length >= this.totalMembers) {
    throw new Error('Maximum members limit reached for this chit group');
  }

  this.members.push({
    memberId,
    memberName,
    joinedDate: Date.now(),
    hasWon: false,
    wonInAuction: null
  });

  await this.save();
  return this;
};

// Method to remove member from chit group
ChitGroupSchema.methods.removeMember = async function(memberId) {
  const memberIndex = this.members.findIndex(
    member => member.memberId.toString() === memberId.toString()
  );

  if (memberIndex === -1) {
    throw new Error('Member not found in this chit group');
  }

  // Check if member has won
  const member = this.members[memberIndex];
  if (member.hasWon) {
    throw new Error('Cannot remove member who has already won an auction');
  }

  this.members.splice(memberIndex, 1);
  await this.save();
  return this;
};

// Method to mark member as winner
ChitGroupSchema.methods.markMemberAsWinner = async function(memberId, auctionNumber) {
  const member = this.members.find(
    m => m.memberId.toString() === memberId.toString()
  );

  if (!member) {
    throw new Error('Member not found in this chit group');
  }

  member.hasWon = true;
  member.wonInAuction = auctionNumber;

  // Add to winners array if not already present
  if (!this.winners.includes(memberId)) {
    this.winners.push(memberId);
  }

  // Increment completed auctions
  this.completedAuctions += 1;

  await this.save();
  return this;
};

// Method to activate chit group
ChitGroupSchema.methods.activate = async function() {
  if (this.status !== 'InProgress') {
    throw new Error('Only InProgress chits can be activated');
  }

  if (this.members.length < 2) {
    throw new Error('At least 2 members required to activate chit');
  }

  this.status = 'Active';
  this.startDate = Date.now();
  await this.save();
  return this;
};

// Method to close chit group
ChitGroupSchema.methods.close = async function(closedBy) {
  if (this.status === 'Closed') {
    throw new Error('Chit is already closed');
  }

  this.status = 'Closed';
  this.endDate = Date.now();
  this.closedBy = closedBy;
  await this.save();
  return this;
};

// Ensure virtuals are included in JSON
ChitGroupSchema.set('toJSON', { virtuals: true });
ChitGroupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ChitGroup', ChitGroupSchema);
