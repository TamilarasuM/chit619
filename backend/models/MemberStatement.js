const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  auctionNumber: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    enum: ['Contribution', 'Dividend', 'WinAmount', 'Commission', 'PartialPayment'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  debit: {
    type: Number,
    default: 0,
    min: 0
  },
  credit: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Completed', 'Pending'],
    default: 'Completed'
  },
  referenceNumber: {
    type: String,
    default: null
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { _id: true, timestamps: false });

const AuctionWonSchema = new mongoose.Schema({
  auctionNumber: {
    type: Number,
    required: true
  },
  wonDate: {
    type: Date,
    required: true
  },
  bidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  receivedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionPaid: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const PaymentStatsSchema = new mongoose.Schema({
  totalPayments: {
    type: Number,
    default: 0,
    min: 0
  },
  onTimeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  delayedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  ranking: {
    type: Number,
    default: null
  }
}, { _id: false });

const SummarySchema = new mongoose.Schema({
  totalContributions: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDividends: {
    type: Number,
    default: 0,
    min: 0
  },
  netContributions: {
    type: Number,
    default: 0
  },
  outstandingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  auctionWon: {
    type: AuctionWonSchema,
    default: null
  },
  paymentStats: {
    type: PaymentStatsSchema,
    default: () => ({})
  }
}, { _id: false });

const MemberStatementSchema = new mongoose.Schema({
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
  chitGroupName: {
    type: String,
    required: true
  },

  transactions: [TransactionSchema],

  summary: {
    type: SummarySchema,
    default: () => ({})
  },

  generatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
MemberStatementSchema.index({ memberId: 1, chitGroupId: 1 }, { unique: true });
MemberStatementSchema.index({ chitGroupId: 1 });
MemberStatementSchema.index({ generatedAt: -1 });

// Method to add a transaction
MemberStatementSchema.methods.addTransaction = function(transactionData) {
  // Calculate new balance
  const lastBalance = this.transactions.length > 0
    ? this.transactions[this.transactions.length - 1].balance
    : 0;

  const newBalance = lastBalance + (transactionData.credit || 0) - (transactionData.debit || 0);

  const transaction = {
    date: transactionData.date || Date.now(),
    auctionNumber: transactionData.auctionNumber,
    type: transactionData.type,
    description: transactionData.description,
    debit: transactionData.debit || 0,
    credit: transactionData.credit || 0,
    balance: newBalance,
    status: transactionData.status || 'Completed',
    referenceNumber: transactionData.referenceNumber || null,
    recordedBy: transactionData.recordedBy || null
  };

  this.transactions.push(transaction);

  // Update summary
  this.updateSummary();

  this.lastUpdated = Date.now();
  return transaction;
};

// Method to update summary
MemberStatementSchema.methods.updateSummary = function() {
  let totalContributions = 0;
  let totalDividends = 0;
  let currentBalance = 0;

  this.transactions.forEach(transaction => {
    if (transaction.type === 'Contribution' || transaction.type === 'Commission' || transaction.type === 'PartialPayment') {
      totalContributions += transaction.debit;
    }
    if (transaction.type === 'Dividend') {
      totalDividends += transaction.credit;
    }
    currentBalance = transaction.balance;
  });

  this.summary.totalContributions = totalContributions;
  this.summary.totalDividends = totalDividends;
  this.summary.netContributions = totalContributions - totalDividends;
  this.summary.currentBalance = currentBalance;

  return this.summary;
};

// Method to add contribution transaction
MemberStatementSchema.methods.addContribution = function(auctionNumber, baseAmount, dividendReceived, paidDate, referenceNumber, recordedBy) {
  const netAmount = baseAmount - dividendReceived;
  const description = dividendReceived > 0
    ? `Monthly contribution for Auction #${auctionNumber} (Base ₹${baseAmount} - Dividend ₹${dividendReceived})`
    : `Monthly contribution for Auction #${auctionNumber}`;

  return this.addTransaction({
    date: paidDate,
    auctionNumber,
    type: 'Contribution',
    description,
    debit: netAmount,
    credit: 0,
    status: 'Completed',
    referenceNumber,
    recordedBy
  });
};

// Method to add dividend transaction
MemberStatementSchema.methods.addDividend = function(auctionNumber, dividendAmount, recordedBy) {
  const description = `Dividend received from Auction #${auctionNumber}`;

  return this.addTransaction({
    date: Date.now(),
    auctionNumber,
    type: 'Dividend',
    description,
    debit: 0,
    credit: dividendAmount,
    status: 'Completed',
    referenceNumber: null,
    recordedBy
  });
};

// Method to add win amount transaction
MemberStatementSchema.methods.addWinAmount = function(auctionNumber, bidAmount, receivedAmount, wonDate, recordedBy) {
  const description = `Chit amount received - Won Auction #${auctionNumber} with bid ₹${bidAmount}`;

  const transaction = this.addTransaction({
    date: wonDate,
    auctionNumber,
    type: 'WinAmount',
    description,
    debit: 0,
    credit: receivedAmount,
    status: 'Completed',
    referenceNumber: null,
    recordedBy
  });

  // Update summary with auction won details
  this.summary.auctionWon = {
    auctionNumber,
    wonDate,
    bidAmount,
    receivedAmount,
    commissionPaid: 0 // Will be set separately
  };

  return transaction;
};

// Method to add commission payment transaction
MemberStatementSchema.methods.addCommission = function(auctionNumber, commissionAmount, paidDate, recordedBy) {
  const description = `Commission payment for winning Auction #${auctionNumber}`;

  const transaction = this.addTransaction({
    date: paidDate,
    auctionNumber,
    type: 'Commission',
    description,
    debit: commissionAmount,
    credit: 0,
    status: 'Completed',
    referenceNumber: null,
    recordedBy
  });

  // Update summary with commission paid
  if (this.summary.auctionWon && this.summary.auctionWon.auctionNumber === auctionNumber) {
    this.summary.auctionWon.commissionPaid = commissionAmount;
  }

  return transaction;
};

// Method to update payment statistics
MemberStatementSchema.methods.updatePaymentStats = function(totalPayments, onTimeCount, delayedCount, ranking) {
  this.summary.paymentStats.totalPayments = totalPayments;
  this.summary.paymentStats.onTimeCount = onTimeCount;
  this.summary.paymentStats.delayedCount = delayedCount;
  this.summary.paymentStats.ranking = ranking;
  this.lastUpdated = Date.now();
  return this.summary.paymentStats;
};

// Method to get transactions for a specific auction
MemberStatementSchema.methods.getTransactionsByAuction = function(auctionNumber) {
  return this.transactions.filter(t => t.auctionNumber === auctionNumber);
};

// Method to get transactions by type
MemberStatementSchema.methods.getTransactionsByType = function(type) {
  return this.transactions.filter(t => t.type === type);
};

// Method to get transactions within date range
MemberStatementSchema.methods.getTransactionsByDateRange = function(startDate, endDate) {
  return this.transactions.filter(t => {
    const transDate = new Date(t.date);
    return transDate >= new Date(startDate) && transDate <= new Date(endDate);
  });
};

// Static method to generate statement for a member in a chit group
MemberStatementSchema.statics.generateStatement = async function(memberId, chitGroupId, memberName, chitGroupName) {
  let statement = await this.findOne({ memberId, chitGroupId });

  if (!statement) {
    statement = await this.create({
      memberId,
      memberName,
      chitGroupId,
      chitGroupName,
      transactions: [],
      summary: {},
      generatedAt: Date.now(),
      lastUpdated: Date.now()
    });
  }

  return statement;
};

// Ensure virtuals are included in JSON
MemberStatementSchema.set('toJSON', { virtuals: true });
MemberStatementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MemberStatement', MemberStatementSchema);
